import json

from app.ai.models import HcbKnowledgeBase
from app.ai.provider import _row_to_item
from app.core.database import SessionLocal


EMBEDDING = [1.0] + [0.0] * 383


def _seed_hcb() -> None:
    with SessionLocal() as db:
        db.add_all(
            [
                HcbKnowledgeBase(
                    source_file="006. Take Action.pptx",
                    module_name="006. Take Action",
                    slide_number=6,
                    slide_title="Harga",
                    content="Harga harus adil dan transparan kepada pelanggan.",
                    full_chunk_text="Harga harus adil dan transparan kepada pelanggan.",
                    principle="Harga adil dan transparan",
                    ethics_topics="Harga",
                    business_relevance="Relevan saat menetapkan harga jual.",
                    ethics_focus=True,
                    embedding=EMBEDDING,
                ),
                HcbKnowledgeBase(
                    source_file="008b. Konsumsi.pptx",
                    module_name="008b. Konsumsi",
                    slide_number=5,
                    slide_title="Tidak boros",
                    content="Hindari pemborosan dalam biaya operasional.",
                    full_chunk_text="Hindari pemborosan dalam biaya operasional.",
                    principle="Hindari pemborosan",
                    ethics_topics="Tidak boros",
                    business_relevance="Relevan saat mengendalikan biaya.",
                    ethics_focus=True,
                    embedding=EMBEDDING,
                ),
            ]
        )
        db.commit()


def _events(response) -> list[dict]:
    return [
        json.loads(line)
        for line in response.text.splitlines()
        if line.strip()
    ]


class FakeAIResponse:
    closed = False

    def iter_lines(self, decode_unicode: bool = True):
        yield 'data: {"choices":[{"delta":{"content":"Halo"}}]}'
        yield ""
        yield 'data: {"choices":[{"delta":{"content":" dunia"}}]}'
        yield "data: [DONE]"

    def close(self) -> None:
        self.closed = True


def test_chat_streams_local_answer_and_persists_history(
    client, owner_factory, monkeypatch
):
    _seed_hcb()
    monkeypatch.setattr("app.ai.provider.get_embedding", lambda _text: EMBEDDING)
    monkeypatch.setattr("app.ai.router.open_ai_stream", lambda _messages: None)

    session, headers = owner_factory()
    business_id = session["business_id"]

    response = client.post(
        f"/api/v1/businesses/{business_id}/ai/chat",
        headers=headers,
        json={"message": "Bagaimana etika menetapkan harga jual?"},
    )

    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("application/x-ndjson")
    events = _events(response)
    assert events[0]["type"] == "meta"
    assert events[0]["analysis_mode"] == "LOCAL"
    assert events[0]["sources"]
    assert events[-1]["type"] == "done"

    streamed = "".join(
        event.get("content", "") for event in events if event["type"] == "token"
    )
    assert streamed.strip()
    conversation_id = events[0]["conversation_id"]

    history = client.get(
        f"/api/v1/businesses/{business_id}/ai/chat/{conversation_id}",
        headers=headers,
    )
    assert history.status_code == 200, history.text
    payload = history.json()
    assert len(payload["messages"]) == 2
    assert payload["messages"][0]["role"] == "user"
    assert payload["messages"][1]["role"] == "assistant"
    assert payload["messages"][1]["analysis_mode"] == "LOCAL"
    assert payload["messages"][1]["sources"]

    conversations = client.get(
        f"/api/v1/businesses/{business_id}/ai/chat/conversations",
        headers=headers,
    )
    assert conversations.status_code == 200, conversations.text
    assert conversations.json()[0]["id"] == conversation_id


def test_chat_streams_ai_tokens_and_scopes_history_to_user(
    client, owner_factory, monkeypatch
):
    _seed_hcb()
    monkeypatch.setattr("app.ai.provider.get_embedding", lambda _text: EMBEDDING)
    fake_response = FakeAIResponse()
    monkeypatch.setattr(
        "app.ai.router.open_ai_stream", lambda _messages: fake_response
    )

    session, headers = owner_factory()
    business_id = session["business_id"]
    response = client.post(
        f"/api/v1/businesses/{business_id}/ai/chat",
        headers=headers,
        json={"message": "Jelaskan margin saya."},
    )

    assert response.status_code == 200, response.text
    events = _events(response)
    assert events[0]["analysis_mode"] == "AI"
    assert (
        "".join(
            event.get("content", "") for event in events if event["type"] == "token"
        )
        == "Halo dunia"
    )
    assert fake_response.closed is True
    conversation_id = events[0]["conversation_id"]

    _, other_headers = owner_factory("Toko Lain")
    forbidden = client.get(
        f"/api/v1/businesses/{business_id}/ai/chat/{conversation_id}",
        headers=other_headers,
    )
    assert forbidden.status_code == 404


def test_hcb_excerpt_is_not_truncated_for_ui():
    long_content = "Penjelasan etika dagang lengkap. " * 100
    row = HcbKnowledgeBase(
        source_file="006. Take Action.pptx",
        module_name="006. Take Action",
        slide_number=6,
        slide_title="Harga",
        content=long_content,
        full_chunk_text=long_content,
        principle="Harga adil",
        ethics_topics="Harga",
        business_relevance="Relevan dengan harga.",
        ethics_focus=True,
    )

    item = _row_to_item(row)

    assert item["source_excerpt"] == long_content.strip()
    assert item["full_text"] == long_content.strip()
