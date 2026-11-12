import json
import logging
from datetime import datetime
from typing import Iterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.ai.chat import (
    MAX_HISTORY_MESSAGES,
    SOURCE_LIMIT,
    build_chat_messages,
    build_chat_retrieval_query,
    build_chat_sources,
    chat_suggestions,
    iter_ai_tokens,
    iter_local_text,
    open_ai_stream,
    _local_chat_answer,
)
from app.ai.context import build_business_context
from app.ai.models import AIChatMessage, AIConversation
from app.ai.provider import hcb_retriever, run_business_analysis
from app.ai.schemas import (
    BusinessAnalysisResponse,
    ChatConversationOut,
    ChatConversationSummary,
    ChatMessageOut,
    ChatRequest,
    ChatSource,
)
from app.auth.dependencies import authorize_business_access, get_current_user, require_roles
from app.auth.models import User
from app.core.database import SessionLocal, get_db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/businesses/{business_id}/ai",
    tags=["AI Analyst"],
    dependencies=[
        Depends(authorize_business_access),
        Depends(require_roles("OWNER", "MANAGER")),
    ],
)


def _get_conversation(
    db: Session, business_id: int, user_id: int, conversation_id: int
) -> AIConversation:
    conversation = (
        db.query(AIConversation)
        .filter(
            AIConversation.id == conversation_id,
            AIConversation.business_id == business_id,
            AIConversation.user_id == user_id,
        )
        .first()
    )
    if conversation is None:
        raise HTTPException(status_code=404, detail="Percakapan tidak ditemukan")
    return conversation


def _message_out(message: AIChatMessage) -> ChatMessageOut:
    sources = []
    for item in message.sources or []:
        try:
            sources.append(ChatSource(**item))
        except (TypeError, ValueError):
            continue
    return ChatMessageOut(
        id=message.id,
        role=message.role,
        content=message.content,
        sources=sources,
        analysis_mode=message.analysis_mode,
        created_at=message.created_at,
    )


def _ndjson(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False) + "\n"


def _stream_chat_response(
    conversation_id: int,
    mode: str,
    upstream,
    local_answer: str | None,
    source_payload: list[dict],
    suggestions: list[str],
) -> Iterator[str]:
    yield _ndjson(
        {
            "type": "meta",
            "conversation_id": conversation_id,
            "analysis_mode": mode,
            "sources": source_payload,
        }
    )

    content_parts: list[str] = []
    try:
        if mode == "AI" and upstream is not None:
            try:
                for token in iter_ai_tokens(upstream):
                    content_parts.append(token)
                    yield _ndjson({"type": "token", "content": token})
            except Exception as error:
                logger.warning("Streaming AI terputus: %s", error)
                yield _ndjson(
                    {
                        "type": "error",
                        "message": "Koneksi AI terputus. Sebagian jawaban mungkin belum lengkap.",
                    }
                )
        else:
            for chunk in iter_local_text(local_answer or ""):
                content_parts.append(chunk)
                yield _ndjson({"type": "token", "content": chunk})
    finally:
        if upstream is not None:
            upstream.close()

    final_content = "".join(content_parts).strip()
    if final_content:
        with SessionLocal() as save_db:
            save_db.add(
                AIChatMessage(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=final_content,
                    sources=source_payload,
                    analysis_mode=mode,
                )
            )
            conversation = (
                save_db.query(AIConversation)
                .filter(AIConversation.id == conversation_id)
                .first()
            )
            if conversation is not None:
                conversation.updated_at = datetime.utcnow()
            save_db.commit()

    yield _ndjson({"type": "done", "suggested_questions": suggestions})


@router.post("/analyze", response_model=BusinessAnalysisResponse)
def analyze_business(business_id: int, db: Session = Depends(get_db)):
    try:
        metrics, best_sellers = build_business_context(db, business_id)
        return run_business_analysis(metrics, best_sellers, db)
    except Exception as error:
        raise HTTPException(
            status_code=500, detail=f"Gagal melakukan analisis AI: {str(error)}"
        ) from error


@router.get("/chat/conversations", response_model=list[ChatConversationSummary])
def list_conversations(
    business_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversations = (
        db.query(AIConversation)
        .filter(
            AIConversation.business_id == business_id,
            AIConversation.user_id == current_user.id,
        )
        .order_by(AIConversation.updated_at.desc())
        .limit(30)
        .all()
    )
    result = []
    for conversation in conversations:
        last_message = (
            db.query(AIChatMessage)
            .filter(AIChatMessage.conversation_id == conversation.id)
            .order_by(AIChatMessage.id.desc())
            .first()
        )
        result.append(
            ChatConversationSummary(
                id=conversation.id,
                title=conversation.title,
                updated_at=conversation.updated_at,
                last_message=last_message.content[:140] if last_message else None,
            )
        )
    return result


@router.get("/chat/{conversation_id}", response_model=ChatConversationOut)
def get_conversation(
    business_id: int,
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = _get_conversation(
        db, business_id, current_user.id, conversation_id
    )
    messages = (
        db.query(AIChatMessage)
        .filter(AIChatMessage.conversation_id == conversation.id)
        .order_by(AIChatMessage.id)
        .all()
    )
    return ChatConversationOut(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[_message_out(message) for message in messages],
    )


@router.post("/chat")
def chat_with_ai(
    business_id: int,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Pesan tidak boleh kosong")

    if payload.conversation_id is None:
        conversation = AIConversation(
            business_id=business_id,
            user_id=current_user.id,
            title=message[:80],
        )
        db.add(conversation)
        db.flush()
        history: list[dict[str, str]] = []
    else:
        conversation = _get_conversation(
            db, business_id, current_user.id, payload.conversation_id
        )
        history_rows = (
            db.query(AIChatMessage)
            .filter(AIChatMessage.conversation_id == conversation.id)
            .order_by(AIChatMessage.id.desc())
            .limit(MAX_HISTORY_MESSAGES)
            .all()
        )
        history = [
            {"role": item.role, "content": item.content}
            for item in reversed(history_rows)
            if item.role in {"user", "assistant"} and item.content.strip()
        ]

    db.add(
        AIChatMessage(
            conversation_id=conversation.id,
            role="user",
            content=message,
        )
    )
    conversation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(conversation)

    metrics, best_sellers = build_business_context(db, business_id)
    hcb_items = hcb_retriever.retrieve_relevant_hcb(
        build_chat_retrieval_query(message, metrics, best_sellers),
        db,
        limit=SOURCE_LIMIT,
    )
    sources = build_chat_sources(hcb_items)
    source_payload = [source.model_dump() for source in sources]
    prompt_messages = build_chat_messages(
        message, metrics, best_sellers, hcb_items, history
    )
    upstream = open_ai_stream(prompt_messages)
    mode = "AI" if upstream is not None else "LOCAL"
    local_answer = (
        _local_chat_answer(message, metrics, best_sellers, hcb_items)
        if mode == "LOCAL"
        else None
    )
    suggestions = chat_suggestions(metrics, best_sellers, hcb_items)

    return StreamingResponse(
        _stream_chat_response(
            conversation_id=conversation.id,
            mode=mode,
            upstream=upstream,
            local_answer=local_answer,
            source_payload=source_payload,
            suggestions=suggestions,
        ),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
