from __future__ import annotations

import json
import logging
import re
from functools import lru_cache
from typing import Any, Dict, Iterable, List

import requests
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.curriculum import canonical_module_name
from app.ai.models import HcbKnowledgeBase
from app.ai.schemas import (
    ActionRecommendation,
    BusinessAnalysisResponse,
    HcbGuidance,
    HypothesisItem,
    ObservationItem,
    SYSTEM_PROMPT_ANALYST,
)
from app.core.config import settings

logger = logging.getLogger(__name__)

_STOPWORDS = {
    "dan",
    "atau",
    "yang",
    "untuk",
    "dengan",
    "dari",
    "pada",
    "dalam",
    "adalah",
    "akan",
    "agar",
    "ini",
    "itu",
    "tidak",
    "jangan",
    "bisa",
    "harus",
    "secara",
    "serta",
    "sebagai",
    "oleh",
    "ke",
    "di",
    "per",
    "rp",
    "total",
}
_TOKEN = re.compile(r"[a-zA-Z0-9]+")
_CODE_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.I)


@lru_cache(maxsize=1)
def _load_embedding_model():
    from sentence_transformers import SentenceTransformer

    errors: list[str] = []
    candidates = [settings.AI_EMBEDDING_MODEL, "all-MiniLM-L6-v2"]
    seen: set[str] = set()
    for name in candidates:
        if not name or name in seen:
            continue
        seen.add(name)
        try:
            logger.info("Memuat model embedding %s", name)
            return SentenceTransformer(name)
        except Exception as error:  # pragma: no cover - depends on local model cache
            errors.append(f"{name}: {error}")

    raise RuntimeError("Model embedding tidak dapat dimuat: " + " | ".join(errors))


def get_embedding(text: str) -> List[float]:
    model = _load_embedding_model()
    return model.encode(text or "", normalize_embeddings=True).tolist()


def _tokens(text: str) -> set[str]:
    return {
        token
        for token in _TOKEN.findall((text or "").lower())
        if len(token) > 2 and token not in _STOPWORDS
    }


def _keyword_score(query: str, text: str) -> float:
    query_tokens = _tokens(query)
    if not query_tokens:
        return 0.0
    text_tokens = _tokens(text)
    if not text_tokens:
        return 0.0
    return len(query_tokens & text_tokens) / len(query_tokens)


def _format_rupiah(value: float) -> str:
    return f"Rp{value:,.0f}"


def _format_percent(value: float) -> str:
    return f"{value * 100:.1f}%"


def _ratio(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return 0.0
    return numerator / denominator


def build_business_signals(
    metrics: Dict[str, Any], best_sellers: List[Dict[str, Any]]
) -> List[str]:
    omzet = float(metrics.get("total_omzet", 0) or 0)
    gross = float(metrics.get("estimated_gross_profit", 0) or 0)
    expenses = float(metrics.get("total_expenses", 0) or 0)
    net = float(metrics.get("estimated_operating_result", 0) or 0)
    transactions = int(metrics.get("total_transactions", 0) or 0)
    gross_margin = _ratio(gross, omzet)
    expense_ratio = _ratio(expenses, omzet)

    signals: list[str] = []
    if transactions == 0:
        signals.append("Belum ada transaksi selesai pada periode data.")
    else:
        signals.append(f"Terdapat {transactions} transaksi dengan omzet {_format_rupiah(omzet)}.")
    signals.append(
        f"Laba kotor {_format_rupiah(gross)} atau {_format_percent(gross_margin)} dari omzet."
    )
    signals.append(
        f"Beban operasional {_format_rupiah(expenses)} atau {_format_percent(expense_ratio)} dari omzet."
    )
    if net < 0:
        signals.append(f"Hasil operasional bersih negatif {_format_rupiah(net)}.")
    else:
        signals.append(f"Hasil operasional bersih positif {_format_rupiah(net)}.")

    if gross_margin and gross_margin < 0.2:
        signals.append("Margin kotor tipis sehingga harga jual atau HPP perlu ditinjau.")
    if expense_ratio and expense_ratio > 0.5:
        signals.append("Beban operasional menyerap lebih dari separuh omzet.")

    if best_sellers:
        top = best_sellers[0]
        signals.append(
            f"Produk terlaris: {top.get('product_name', 'tidak diketahui')} "
            f"({top.get('total_sold', 0)} unit)."
        )
    return signals


def _build_retrieval_query(
    metrics: Dict[str, Any], best_sellers: List[Dict[str, Any]]
) -> str:
    ethics_themes = (
        "Etika dagang HCB: niat benar, kejujuran shiddiq, amanah, transparansi harga, "
        "harga adil, promosi jujur, produk yang dibutuhkan pasar, distribusi adil, "
        "konsumsi tidak boros, tidak menimbun, menjauhi riba maisir gharar."
    )
    return f"{ethics_themes} Kondisi bisnis: {' '.join(build_business_signals(metrics, best_sellers))}"


def _row_text(row: HcbKnowledgeBase) -> str:
    return " ".join(
        part
        for part in (
            row.module_name,
            row.slide_title,
            row.ethics_topics,
            row.principle,
            row.business_relevance,
            row.full_chunk_text,
        )
        if part
    )


def _row_to_item(row: HcbKnowledgeBase, semantic_score: float = 0.0) -> Dict[str, Any]:
    raw_text = (row.content or row.full_chunk_text or "").strip()
    return {
        "module_name": canonical_module_name(row.module_name),
        "slide_number": int(row.slide_number or 1),
        "slide_title": row.slide_title or f"Slide {row.slide_number or 1}",
        "source_file": row.source_file or "",
        "ethics_topic": row.ethics_topics or row.slide_title or "",
        "principle": row.principle or row.slide_title or "Prinsip etika dagang HCB",
        "business_relevance": row.business_relevance or "",
        "source_excerpt": raw_text,
        "full_text": raw_text,
        "semantic_score": float(semantic_score),
    }


def _select_diverse(items: Iterable[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
    ranked = list(items)
    selected: list[Dict[str, Any]] = []
    seen_sources: set[tuple[str, int]] = set()
    seen_excerpts: set[str] = set()
    module_counts: dict[str, int] = {}

    def add(item: Dict[str, Any], max_per_module: int) -> bool:
        module = canonical_module_name(item.get("module_name"))
        key = (module, int(item.get("slide_number") or 0))
        excerpt_key = re.sub(r"\W+", "", (item.get("source_excerpt") or "").lower())[:180]
        if key in seen_sources or (excerpt_key and excerpt_key in seen_excerpts):
            return False
        if module_counts.get(module, 0) >= max_per_module:
            return False
        selected.append(item)
        seen_sources.add(key)
        if excerpt_key:
            seen_excerpts.add(excerpt_key)
        module_counts[module] = module_counts.get(module, 0) + 1
        return True

    for item in ranked:
        if len(selected) >= limit:
            break
        add(item, max_per_module=2)

    for item in ranked:
        if len(selected) >= limit:
            break
        add(item, max_per_module=limit)

    return selected[:limit]


class HcbRagRetriever:
    def retrieve_relevant_hcb(
        self,
        context_query: str,
        db_session: Session,
        limit: int = 4,
    ) -> List[Dict[str, Any]]:
        focus_count = (
            db_session.query(func.count(HcbKnowledgeBase.id))
            .filter(HcbKnowledgeBase.ethics_focus.is_(True))
            .scalar()
            or 0
        )

        def base_query():
            query = db_session.query(HcbKnowledgeBase)
            if focus_count:
                query = query.filter(HcbKnowledgeBase.ethics_focus.is_(True))
            return query

        items: list[Dict[str, Any]] = []
        try:
            query_embedding = get_embedding(context_query)
            distance = HcbKnowledgeBase.embedding.cosine_distance(
                query_embedding
            ).label("distance")
            query = db_session.query(HcbKnowledgeBase, distance).filter(
                HcbKnowledgeBase.embedding.isnot(None)
            )
            if focus_count:
                query = query.filter(HcbKnowledgeBase.ethics_focus.is_(True))
            rows = query.order_by(distance).limit(max(limit * 4, 16)).all()

            for row, raw_distance in rows:
                distance_value = float(raw_distance) if raw_distance is not None else 1.0
                semantic_score = max(0.0, 1.0 - distance_value)
                keyword_score = _keyword_score(context_query, _row_text(row))
                score = (0.8 * semantic_score) + (0.2 * keyword_score)
                item = _row_to_item(row, semantic_score=score)
                items.append(item)
        except Exception as error:
            logger.warning("Embedding retrieval gagal, memakai pencarian leksikal: %s", error)

        if not items:
            candidates = base_query().all()
            scored = []
            for row in candidates:
                score = _keyword_score(context_query, _row_text(row))
                scored.append((score, row))
            scored.sort(key=lambda pair: pair[0], reverse=True)
            items = [
                _row_to_item(row, semantic_score=score)
                for score, row in scored
                if score > 0
            ]

        items.sort(
            key=lambda item: (
                item["semantic_score"],
                _keyword_score(context_query, item.get("full_text", "")),
            ),
            reverse=True,
        )
        return _select_diverse(items, limit)


hcb_retriever = HcbRagRetriever()


def _source_basis(item: Dict[str, Any] | None) -> str | None:
    if not item:
        return None
    return (
        f"{item['module_name']} (Slide {item['slide_number']}): "
        f"{item['principle']}"
    )


def _find_source(
    hcb_items: List[Dict[str, Any]], *keywords: str
) -> Dict[str, Any] | None:
    ranked: list[tuple[int, Dict[str, Any]]] = []
    for item in hcb_items:
        metadata = " ".join(
            str(item.get(field, ""))
            for field in ("ethics_topic", "principle", "slide_title")
        ).lower()
        full_text = str(item.get("full_text", "")).lower()
        metadata_hits = sum(keyword in metadata for keyword in keywords)
        text_hits = sum(keyword in full_text for keyword in keywords)
        score = (metadata_hits * 10) + text_hits
        if score:
            ranked.append((score, item))
    if not ranked:
        return None
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    return ranked[0][1]


def _reflection_for(item: Dict[str, Any], signals: List[str]) -> str:
    if not signals:
        signal = "Data operasional toko menjadi dasar analisis."
    else:
        item_tokens = _tokens(
            " ".join(
                str(item.get(field, ""))
                for field in ("ethics_topic", "principle", "business_relevance")
            )
        )
        signal = max(signals, key=lambda value: len(item_tokens & _tokens(value)))
    relevance = item.get("business_relevance") or ""
    return f"{signal} Prinsip HCB yang relevan: {item['principle']} {relevance}".strip()


def _build_grounded_guidance(
    hcb_items: List[Dict[str, Any]],
    signals: List[str],
    exclude: set[tuple[str, int]] | None = None,
    limit: int = 2,
) -> List[HcbGuidance]:
    exclude = exclude or set()
    guidance: list[HcbGuidance] = []
    for item in hcb_items:
        key = (canonical_module_name(item["module_name"]), int(item["slide_number"]))
        if key in exclude:
            continue
        guidance.append(
            HcbGuidance(
                principle=item["principle"],
                reflection=_reflection_for(item, signals),
                source_module=item["module_name"],
                slide_number=item["slide_number"],
                source_file=item.get("source_file") or None,
                source_excerpt=item.get("source_excerpt") or None,
                ethics_topic=item.get("ethics_topic") or None,
                business_relevance=item.get("business_relevance") or None,
            )
        )
        if len(guidance) >= limit:
            break
    return guidance


def _health_score(metrics: Dict[str, Any]) -> int:
    omzet = float(metrics.get("total_omzet", 0) or 0)
    gross = float(metrics.get("estimated_gross_profit", 0) or 0)
    expenses = float(metrics.get("total_expenses", 0) or 0)
    net = float(metrics.get("estimated_operating_result", 0) or 0)
    transactions = int(metrics.get("total_transactions", 0) or 0)

    if transactions == 0 or omzet <= 0:
        return 30

    gross_margin = _ratio(gross, omzet)
    expense_ratio = _ratio(expenses, omzet)
    score = 55.0
    score += max(-25.0, min(20.0, gross_margin * 60))
    score += 10.0 if net > 0 else -20.0
    score -= max(0.0, min(25.0, expense_ratio * 30))
    return max(1, min(100, round(score)))


def _build_recommendations(
    metrics: Dict[str, Any],
    best_sellers: List[Dict[str, Any]],
    hcb_items: List[Dict[str, Any]],
) -> List[ActionRecommendation]:
    omzet = float(metrics.get("total_omzet", 0) or 0)
    gross = float(metrics.get("estimated_gross_profit", 0) or 0)
    expenses = float(metrics.get("total_expenses", 0) or 0)
    net = float(metrics.get("estimated_operating_result", 0) or 0)
    transactions = int(metrics.get("total_transactions", 0) or 0)
    gross_margin = _ratio(gross, omzet)
    expense_ratio = _ratio(expenses, omzet)

    recommendations: list[ActionRecommendation] = []

    if transactions == 0:
        source = _find_source(hcb_items, "produk", "pasar", "ikhtiar")
        recommendations.append(
            ActionRecommendation(
                title="Uji produk yang paling dibutuhkan pasar",
                action_plan=(
                    "Catat 10 produk yang paling sering ditanyakan pelanggan, lalu uji stok "
                    "dan harga untuk 3 produk prioritas sebelum menambah pembelian."
                ),
                expected_impact="Mengurangi risiko stok mati dan membuka peluang transaksi pertama.",
                hcb_basis=_source_basis(source),
            )
        )
    else:
        source = _find_source(hcb_items, "jujur", "amanah", "transparan", "promosi")
        recommendations.append(
            ActionRecommendation(
                title="Jaga transparansi harga dan pencatatan",
                action_plan=(
                    "Samakan harga di label, kasir, dan promosi; catat setiap diskon serta "
                    "pembatalan transaksi agar laporan dan kepercayaan pelanggan terjaga."
                ),
                expected_impact="Menurunkan sengketa harga dan meningkatkan akurasi laporan harian.",
                hcb_basis=_source_basis(source),
            )
        )

    if expenses > 0 and (net < 0 or expense_ratio > 0.5):
        source = _find_source(hcb_items, "konsumsi", "boros", "beban", "konsumsi bijak")
        recommendations.append(
            ActionRecommendation(
                title="Audit beban operasional non-HPP",
                action_plan=(
                    f"Pisahkan pengeluaran {_format_rupiah(expenses)} per kategori, hentikan "
                    "biaya yang tidak menghasilkan penjualan, lalu tetapkan batas belanja mingguan."
                ),
                expected_impact="Menekan rasio beban terhadap omzet dan memperbaiki hasil operasional.",
                hcb_basis=_source_basis(source),
            )
        )

    if omzet > 0 and gross_margin < 0.2:
        source = _find_source(hcb_items, "harga", "margin", "keuntungan", "hpp")
        recommendations.append(
            ActionRecommendation(
                title="Evaluasi HPP dan harga jual",
                action_plan=(
                    f"Margin kotor saat ini {_format_percent(gross_margin)}. Hitung ulang HPP "
                    "per produk, lalu naikkan harga secara bertahap pada produk dengan margin terendah."
                ),
                expected_impact="Meningkatkan margin kotor tanpa mengorbankan transparansi harga.",
                hcb_basis=_source_basis(source),
            )
        )

    if best_sellers and len(best_sellers) >= 2:
        total_sold = sum(int(item.get("total_sold", 0) or 0) for item in best_sellers)
        top_share = _ratio(float(best_sellers[0].get("total_sold", 0) or 0), total_sold)
        if top_share > 0.5:
            source = _find_source(hcb_items, "fathanah", "produk", "distribusi")
            recommendations.append(
                ActionRecommendation(
                    title="Kurangi ketergantungan pada satu produk",
                    action_plan=(
                        f"Produk terlaris menyumbang {_format_percent(top_share)} dari unit "
                        "terjual. Siapkan satu produk pendamping dan uji promosi terbatas."
                    ),
                    expected_impact="Menyebar risiko penjualan dan menjaga stabilitas omzet.",
                    hcb_basis=_source_basis(source),
                )
            )

    return recommendations[:3]


def _generate_local_analysis(
    metrics: Dict[str, Any],
    best_sellers: List[Dict[str, Any]],
    hcb_items: List[Dict[str, Any]],
) -> BusinessAnalysisResponse:
    omzet = float(metrics.get("total_omzet", 0) or 0)
    gross = float(metrics.get("estimated_gross_profit", 0) or 0)
    expenses = float(metrics.get("total_expenses", 0) or 0)
    net = float(metrics.get("estimated_operating_result", 0) or 0)
    transactions = int(metrics.get("total_transactions", 0) or 0)
    gross_margin = _ratio(gross, omzet)
    expense_ratio = _ratio(expenses, omzet)
    signals = build_business_signals(metrics, best_sellers)

    observations = [
        ObservationItem(
            category="Penjualan",
            fact=(
                f"Omzet {_format_rupiah(omzet)} dari {transactions} transaksi selesai."
                if transactions
                else "Belum ada transaksi selesai pada data yang tersedia."
            ),
        ),
        ObservationItem(
            category="Profitabilitas",
            fact=(
                f"Laba kotor {_format_rupiah(gross)} ({_format_percent(gross_margin)} dari omzet); "
                f"beban operasional {_format_rupiah(expenses)} ({_format_percent(expense_ratio)} dari omzet)."
            ),
        ),
        ObservationItem(
            category="Hasil Operasional",
            fact=(
                f"Hasil operasional {'positif ' + _format_rupiah(net) if net >= 0 else 'defisit ' + _format_rupiah(abs(net))}."
            ),
        ),
    ]

    if best_sellers:
        observations.append(
            ObservationItem(
                category="Produk",
                fact=(
                    f"Produk terlaris {best_sellers[0].get('product_name', 'tidak diketahui')} "
                    f"dengan {best_sellers[0].get('total_sold', 0)} unit terjual."
                ),
            )
        )

    hypotheses: list[HypothesisItem] = []
    if transactions == 0:
        hypotheses.append(
            HypothesisItem(
                issue="Belum ada penjualan tercatat",
                root_cause="Data transaksi selesai belum tersedia atau produk belum tersentuh pembeli.",
            )
        )
    elif net < 0 or expense_ratio > 0.5:
        hypotheses.append(
            HypothesisItem(
                issue="Beban operasional menekan laba",
                root_cause=(
                    f"Beban {_format_rupiah(expenses)} menyerap {_format_percent(expense_ratio)} "
                    f"dari omzet, sementara laba kotor {_format_rupiah(gross)}."
                ),
            )
        )
    if omzet > 0 and gross_margin < 0.2:
        hypotheses.append(
            HypothesisItem(
                issue="Margin kotor tipis",
                root_cause=(
                    f"HPP menyerap {_format_percent(1 - gross_margin)} dari omzet; "
                    "harga jual atau komposisi produk perlu ditinjau."
                ),
            )
        )
    if not hypotheses:
        hypotheses.append(
            HypothesisItem(
                issue="Stabilitas penjualan perlu dijaga",
                root_cause="Belum ada anomali besar, tetapi ketergantungan pada produk terlaris tetap perlu dipantau.",
            )
        )

    if transactions == 0:
        summary = "Belum ada transaksi selesai sehingga analisis laba belum dapat dihitung."
    elif net >= 0:
        summary = (
            f"Omzet {_format_rupiah(omzet)} menghasilkan laba kotor {_format_rupiah(gross)}; "
            f"setelah beban {_format_rupiah(expenses)}, hasil operasional positif {_format_rupiah(net)}."
        )
    else:
        summary = (
            f"Omzet {_format_rupiah(omzet)} menghasilkan laba kotor {_format_rupiah(gross)}; "
            f"setelah beban {_format_rupiah(expenses)}, hasil operasional defisit {_format_rupiah(abs(net))}."
        )
    if not hcb_items:
        summary += " Rujukan HCB belum tersedia di database."

    return BusinessAnalysisResponse(
        health_score=_health_score(metrics),
        summary=summary,
        observations=observations,
        hypotheses=hypotheses,
        hcb_guidance=_build_grounded_guidance(hcb_items, signals, limit=2),
        recommendations=_build_recommendations(metrics, best_sellers, hcb_items),
        analysis_mode="LOCAL",
    )


def _module_key(value: object) -> str:
    return canonical_module_name(value).removesuffix(".pptx").strip()


def _ground_ai_response(
    response: BusinessAnalysisResponse,
    hcb_items: List[Dict[str, Any]],
    metrics: Dict[str, Any],
    best_sellers: List[Dict[str, Any]],
) -> BusinessAnalysisResponse:
    allowed = {
        (_module_key(item["module_name"]), int(item["slide_number"])): item
        for item in hcb_items
    }
    signals = build_business_signals(metrics, best_sellers)
    grounded: list[HcbGuidance] = []
    used: set[tuple[str, int]] = set()

    for guidance in response.hcb_guidance:
        key = (_module_key(guidance.source_module), int(guidance.slide_number or 0))
        item = allowed.get(key)
        if item is None:
            continue

        guidance.source_module = item["module_name"]
        guidance.slide_number = item["slide_number"]
        guidance.source_file = item.get("source_file") or None
        guidance.source_excerpt = item.get("source_excerpt") or None
        guidance.ethics_topic = item.get("ethics_topic") or None
        guidance.business_relevance = item.get("business_relevance") or None
        if not guidance.reflection or "tidak tersedia" in guidance.reflection.lower():
            guidance.reflection = _reflection_for(item, signals)

        grounded.append(guidance)
        used.add(key)

    if len(grounded) < 2:
        grounded.extend(
            _build_grounded_guidance(hcb_items, signals, exclude=used, limit=2 - len(grounded))
        )

    for recommendation in response.recommendations:
        if not recommendation.hcb_basis or "tidak tersedia" in recommendation.hcb_basis.lower():
            source = _find_source(hcb_items, "harga", "jujur", "amanah", "produk", "konsumsi")
            recommendation.hcb_basis = _source_basis(source)

    response.hcb_guidance = grounded[:3]
    response.analysis_mode = "AI"
    return response


def _parse_json_content(content: str) -> Dict[str, Any]:
    cleaned = _CODE_FENCE.sub("", content.strip())
    return json.loads(cleaned)


def run_business_analysis(
    metrics: Dict[str, Any],
    best_sellers: List[Dict[str, Any]],
    db: Session,
) -> BusinessAnalysisResponse:
    signals = build_business_signals(metrics, best_sellers)
    retrieval_query = _build_retrieval_query(metrics, best_sellers)
    hcb_items = hcb_retriever.retrieve_relevant_hcb(retrieval_query, db, limit=4)

    pos_context = f"""
=== DATA KEUANGAN POS ===
- Total Omzet Penjualan: {_format_rupiah(float(metrics['total_omzet']))}
- Total Transaksi Selesai: {metrics['total_transactions']} transaksi
- Total HPP / COGS: {_format_rupiah(float(metrics['total_cogs']))}
- Estimated Gross Profit (Laba Kotor): {_format_rupiah(float(metrics['estimated_gross_profit']))}
- Total Pengeluaran Operasional (Expenses): {_format_rupiah(float(metrics['total_expenses']))}
- Net Operating Result (Hasil Operasional Bersih): {_format_rupiah(float(metrics['estimated_operating_result']))}

=== SINYAL KONDISI BISNIS ===
{chr(10).join(f'- {signal}' for signal in signals)}

=== PRODUK TERLARIS (TOP SELLERS) ===
{json.dumps(best_sellers, indent=2, ensure_ascii=False)}
"""

    formatted_sources = []
    for index, item in enumerate(hcb_items, start=1):
        formatted_sources.append(
            f"[SUMBER RUJUKAN {index}]\n"
            f"- Nama Modul Wajib: {item['module_name']}\n"
            f"- Nama File: {item['source_file'] or '-'}\n"
            f"- Nomor Slide Wajib: {item['slide_number']}\n"
            f"- Judul Slide: {item['slide_title']}\n"
            f"- Topik Etika Dagang: {item['ethics_topic']}\n"
            f"- Prinsip: {item['principle']}\n"
            f"- Relevansi Bisnis: {item['business_relevance']}\n"
            f"- Isi Materi: {item['full_text']}"
        )
    hcb_context = "\n\n".join(formatted_sources) or "Tidak ada sumber HCB yang berhasil diambil."

    user_prompt = f"""
{pos_context}

=== BASIS KNOWLEDGE RAG HCB (SUMBER UTAMA WAJIB) ===
{hcb_context}

INSTRUKSI KHUSUS:
1. Gunakan hanya [SUMBER RUJUKAN] di atas.
2. Untuk setiap `hcb_guidance`, salin `source_module`, `slide_number`, `source_file`, dan `source_excerpt` dari sumber yang dipilih. `source_excerpt` harus potongan asli dari `Isi Materi`.
3. Jelaskan korelasi konkret dengan angka dan sinyal bisnis di atas, lalu turunkan rekomendasi yang memiliki `hcb_basis`.
"""

    api_key = settings.AI_API_KEY
    if not api_key:
        return _generate_local_analysis(metrics, best_sellers, hcb_items)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.AI_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT_ANALYST},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
    }

    try:
        response = requests.post(
            settings.AI_BASE_URL,
            json=payload,
            headers=headers,
            timeout=45,
        )
        if response.status_code == 200:
            content = response.json()["choices"][0]["message"]["content"]
            parsed = _parse_json_content(content)
            result = BusinessAnalysisResponse(**parsed)
            return _ground_ai_response(result, hcb_items, metrics, best_sellers)
        logger.warning("AI provider mengembalikan HTTP %s", response.status_code)
    except Exception as error:
        logger.warning("AI provider gagal, memakai analisis lokal: %s", error)

    return _generate_local_analysis(metrics, best_sellers, hcb_items)
