from app.ai.curriculum import build_rag_text, get_ethics_meta
from app.ai.models import HcbKnowledgeBase
from app.ai.provider import (
    _generate_local_analysis,
    _ground_ai_response,
    hcb_retriever,
)
from app.ai.schemas import (
    ActionRecommendation,
    BusinessAnalysisResponse,
    HcbGuidance,
    HypothesisItem,
    ObservationItem,
)
from app.core.database import SessionLocal


METRICS = {
    "total_omzet": 1_000_000.0,
    "total_transactions": 20,
    "total_cogs": 850_000.0,
    "estimated_gross_profit": 150_000.0,
    "total_expenses": 250_000.0,
    "estimated_operating_result": -100_000.0,
}
BEST_SELLERS = [
    {"product_name": "Kopi", "total_sold": 15},
    {"product_name": "Roti", "total_sold": 5},
]


def _hcb_item(module: str, slide: int, topic: str, principle: str) -> dict:
    return {
        "module_name": module,
        "slide_number": slide,
        "slide_title": topic,
        "source_file": f"{module}.pptx",
        "ethics_topic": topic,
        "principle": principle,
        "business_relevance": "Relevan dengan kondisi biaya dan harga toko.",
        "source_excerpt": f"Kutipan asli {topic}.",
        "full_text": f"Materi {topic}.",
        "semantic_score": 1.0,
    }


def test_curriculum_marks_only_trading_ethics_slides():
    meta = get_ethics_meta(
        "005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses",
        6,
        "3. Bisa dipercaya (Al-Amanah)",
        "",
    )
    assert meta is not None
    assert meta.topic == "Amanah"
    assert "kepercayaan" in meta.principle.lower()

    assert get_ethics_meta("001. Tujuan Belajar HCB", 2, "Distorsi", "") is None
    assert "Topik etika dagang" in build_rag_text("Teks asli", meta)


def test_grounding_drops_sources_outside_retrieved_context():
    items = [
        _hcb_item("006. Take Action", 24, "Batas keuntungan", "Keuntungan harus halal."),
        _hcb_item("005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses", 6, "Amanah", "Jaga amanah."),
    ]
    response = BusinessAnalysisResponse(
        health_score=40,
        summary="Ringkasan",
        observations=[ObservationItem(category="Penjualan", fact="Omzet tercatat.")],
        hypotheses=[HypothesisItem(issue="Margin", root_cause="Beban tinggi.")],
        hcb_guidance=[
            HcbGuidance(
                principle="Keuntungan halal",
                reflection="Omzet perlu dijaga dengan margin yang halal.",
                source_module="006. Take Action,",
                slide_number=24,
            ),
            HcbGuidance(
                principle="Sumber palsu",
                reflection="Tidak boleh dipakai.",
                source_module="004. Nabi Saw adalah pelaku ekonomi yang terbaik",
                slide_number=4,
            ),
        ],
        recommendations=[
            ActionRecommendation(
                title="Evaluasi harga",
                action_plan="Tinjau HPP.",
                expected_impact="Margin membaik.",
            )
        ],
        analysis_mode="LOCAL",
    )

    grounded = _ground_ai_response(response, items, METRICS, BEST_SELLERS)
    allowed = {(item["module_name"], item["slide_number"]) for item in items}

    assert grounded.analysis_mode == "AI"
    assert grounded.hcb_guidance
    assert all(
        (guidance.source_module, guidance.slide_number) in allowed
        for guidance in grounded.hcb_guidance
    )
    assert all(guidance.source_excerpt for guidance in grounded.hcb_guidance)
    assert all(item.source_module != "004. Nabi Saw adalah pelaku ekonomi yang terbaik" for item in grounded.hcb_guidance)


def test_local_analysis_uses_actual_retrieved_sources():
    items = [
        _hcb_item("008b. Konsumsi", 5, "Tidak boros", "Hindari pemborosan."),
        _hcb_item("005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses", 6, "Amanah", "Jaga amanah."),
    ]

    result = _generate_local_analysis(METRICS, BEST_SELLERS, items)

    assert result.analysis_mode == "LOCAL"
    assert result.hcb_guidance
    assert result.hcb_guidance[0].source_module == "008b. Konsumsi"
    assert result.hcb_guidance[0].slide_number == 5
    assert "defisit Rp100,000" in result.summary
    assert all(guidance.source_module != "Tidak tersedia" for guidance in result.hcb_guidance)
    allowed_basis = {
        f"{item['module_name']} (Slide {item['slide_number']})" for item in items
    }
    assert any(rec.hcb_basis for rec in result.recommendations)
    assert all(
        rec.hcb_basis is None
        or any(rec.hcb_basis.startswith(basis) for basis in allowed_basis)
        for rec in result.recommendations
    )


def test_retriever_prefers_ethics_focus_and_diversifies(monkeypatch):
    embedding = [1.0] + [0.0] * 383
    with SessionLocal() as db:
        db.add_all(
            [
                HcbKnowledgeBase(
                    source_file="006.pptx",
                    module_name="006. Take Action",
                    slide_number=6,
                    slide_title="Harga",
                    content="Harga adil dan transparan",
                    full_chunk_text="Harga adil dan transparan",
                    principle="Harga adil",
                    ethics_topics="Harga",
                    business_relevance="Relevan dengan harga jual.",
                    ethics_focus=True,
                    embedding=embedding,
                ),
                HcbKnowledgeBase(
                    source_file="006.pptx",
                    module_name="006. Take Action",
                    slide_number=7,
                    slide_title="Biaya",
                    content="Harga berbasis biaya",
                    full_chunk_text="Harga berbasis biaya",
                    principle="Harga berbasis biaya",
                    ethics_topics="Biaya",
                    business_relevance="Relevan dengan HPP.",
                    ethics_focus=True,
                    embedding=embedding,
                ),
                HcbKnowledgeBase(
                    source_file="008b.pptx",
                    module_name="008b. Konsumsi",
                    slide_number=5,
                    slide_title="Tidak boros",
                    content="Hindari pemborosan biaya",
                    full_chunk_text="Hindari pemborosan biaya",
                    principle="Tidak boros",
                    ethics_topics="Konsumsi",
                    business_relevance="Relevan dengan beban.",
                    ethics_focus=True,
                    embedding=embedding,
                ),
                HcbKnowledgeBase(
                    source_file="004.pptx",
                    module_name="004. Nabi Saw adalah pelaku ekonomi yang terbaik",
                    slide_number=4,
                    slide_title="Bukan fokus",
                    content="Materi umum",
                    full_chunk_text="Materi umum",
                    principle="Umum",
                    ethics_topics="Umum",
                    business_relevance="Umum",
                    ethics_focus=False,
                    embedding=embedding,
                ),
            ]
        )
        db.commit()

        monkeypatch.setattr("app.ai.provider.get_embedding", lambda _text: embedding)
        items = hcb_retriever.retrieve_relevant_hcb(
            "harga adil beban operasional tidak boros", db, limit=3
        )

    modules = [item["module_name"] for item in items]
    assert items
    assert "004. Nabi Saw adalah pelaku ekonomi yang terbaik" not in modules
    assert modules.count("006. Take Action") <= 2
