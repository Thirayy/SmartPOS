from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Iterator, List

import requests

from app.ai.provider import (
    _find_source,
    _format_percent,
    _format_rupiah,
    _ratio,
    _source_basis,
    build_business_signals,
)
from app.ai.schemas import ChatSource
from app.core.config import settings

logger = logging.getLogger(__name__)

CHAT_SYSTEM_PROMPT = """
Anda adalah Asisten Bisnis & Etika Dagang HCB untuk SmartPOS.

ATURAN:
1. Jawab dalam bahasa Indonesia yang jelas, ringkas, dan praktis.
2. Gunakan DATA BISNIS dan BASIS HCB yang diberikan. Jangan mengarang angka.
3. Saat memakai prinsip HCB, sebutkan nama modul dan nomor slide sumbernya.
4. Jangan mengarang modul, slide, kutipan, atau data keuangan.
5. Jika pertanyaan di luar cakupan data/HCB, jawab secara umum dan jelaskan keterbatasannya.
6. Hubungkan jawaban dengan kondisi bisnis pengguna, bukan hanya teori.
7. Akhiri dengan langkah konkret yang bisa dilakukan pemilik toko.
""".strip()

MAX_HISTORY_MESSAGES = 10
SOURCE_LIMIT = 5


def build_chat_sources(items: List[dict[str, Any]]) -> List[ChatSource]:
    return [
        ChatSource(
            module_name=item["module_name"],
            slide_number=int(item["slide_number"]),
            slide_title=item.get("slide_title") or f"Slide {item['slide_number']}",
            source_file=item.get("source_file") or None,
            ethics_topic=item.get("ethics_topic") or None,
            principle=item.get("principle") or None,
            source_excerpt=item.get("source_excerpt") or item.get("full_text") or "",
            business_relevance=item.get("business_relevance") or None,
        )
        for item in items
    ]


def build_chat_retrieval_query(
    message: str,
    metrics: dict[str, Any],
    best_sellers: List[dict[str, Any]],
) -> str:
    signals = build_business_signals(metrics, best_sellers)
    return (
        "Pertanyaan pengguna: "
        f"{message}. Etika dagang HCB: niat, kejujuran, amanah, harga adil, "
        "promosi jujur, produk dibutuhkan pasar, distribusi adil, konsumsi tidak boros, "
        "tidak menimbun, menjauhi riba maisir gharar. Kondisi bisnis: "
        + " ".join(signals)
    )


def format_business_context(
    metrics: dict[str, Any], best_sellers: List[dict[str, Any]]
) -> str:
    omzet = float(metrics.get("total_omzet", 0) or 0)
    gross = float(metrics.get("estimated_gross_profit", 0) or 0)
    expenses = float(metrics.get("total_expenses", 0) or 0)
    net = float(metrics.get("estimated_operating_result", 0) or 0)
    transactions = int(metrics.get("total_transactions", 0) or 0)
    gross_margin = _ratio(gross, omzet)
    expense_ratio = _ratio(expenses, omzet)

    lines = [
        f"- Omzet: {_format_rupiah(omzet)} dari {transactions} transaksi selesai.",
        f"- HPP: {_format_rupiah(float(metrics.get('total_cogs', 0) or 0))}.",
        f"- Laba kotor: {_format_rupiah(gross)} ({_format_percent(gross_margin)} dari omzet).",
        f"- Beban operasional: {_format_rupiah(expenses)} ({_format_percent(expense_ratio)} dari omzet).",
        f"- Hasil operasional: {_format_rupiah(net)}.",
    ]
    if best_sellers:
        lines.append(
            "- Produk terlaris: "
            + ", ".join(
                f"{item.get('product_name', '-')} ({item.get('total_sold', 0)} unit)"
                for item in best_sellers[:5]
            )
            + "."
        )
    else:
        lines.append("- Belum ada data produk terlaris.")
    return "\n".join(lines)


def format_sources_for_prompt(items: List[dict[str, Any]]) -> str:
    if not items:
        return "Tidak ada sumber HCB yang relevan."
    blocks = []
    for index, item in enumerate(items, start=1):
        blocks.append(
            f"[SUMBER {index}]\n"
            f"Modul: {item['module_name']}\n"
            f"Slide: {item['slide_number']}\n"
            f"File: {item.get('source_file') or '-'}\n"
            f"Topik: {item.get('ethics_topic') or '-'}\n"
            f"Prinsip: {item.get('principle') or '-'}\n"
            f"Relevansi bisnis: {item.get('business_relevance') or '-'}\n"
            f"Isi materi: {item.get('full_text') or ''}"
        )
    return "\n\n".join(blocks)


def build_chat_messages(
    message: str,
    metrics: dict[str, Any],
    best_sellers: List[dict[str, Any]],
    hcb_items: List[dict[str, Any]],
    history: List[dict[str, str]],
) -> List[dict[str, str]]:
    context = (
        "=== DATA BISNIS SAAT INI ===\n"
        f"{format_business_context(metrics, best_sellers)}\n\n"
        "=== BASIS KNOWLEDGE RAG HCB ===\n"
        f"{format_sources_for_prompt(hcb_items)}\n\n"
        f"=== PERTANYAAN PENGGUNA ===\n{message}"
    )
    return [
        {"role": "system", "content": CHAT_SYSTEM_PROMPT},
        *history[-MAX_HISTORY_MESSAGES:],
        {"role": "user", "content": context},
    ]


def chat_suggestions(
    metrics: dict[str, Any],
    best_sellers: List[dict[str, Any]],
    hcb_items: List[dict[str, Any]],
) -> List[str]:
    omzet = float(metrics.get("total_omzet", 0) or 0)
    gross = float(metrics.get("estimated_gross_profit", 0) or 0)
    net = float(metrics.get("estimated_operating_result", 0) or 0)
    transactions = int(metrics.get("total_transactions", 0) or 0)
    gross_margin = _ratio(gross, omzet)

    suggestions: list[str] = []
    if transactions == 0:
        suggestions.append("Bagaimana memulai penjualan pertama dengan produk yang tepat?")
    elif net < 0:
        suggestions.append("Biaya apa yang paling perlu dipangkas agar tidak defisit?")
    elif gross_margin < 0.2:
        suggestions.append("Bagaimana mengevaluasi HPP dan harga jual saya?")
    if best_sellers:
        suggestions.append("Bagaimana mengurangi ketergantungan pada produk terlaris?")
    if hcb_items:
        topic = hcb_items[0].get("ethics_topic") or "etika dagang"
        suggestions.append(f"Bagaimana menerapkan prinsip {topic} di toko saya?")
    suggestions.append("Langkah konkret apa yang harus saya lakukan minggu ini?")
    return list(dict.fromkeys(suggestions))[:3]


def _local_chat_answer(
    message: str,
    metrics: dict[str, Any],
    best_sellers: List[dict[str, Any]],
    hcb_items: List[dict[str, Any]],
) -> str:
    lower = message.lower()
    omzet = float(metrics.get("total_omzet", 0) or 0)
    gross = float(metrics.get("estimated_gross_profit", 0) or 0)
    expenses = float(metrics.get("total_expenses", 0) or 0)
    net = float(metrics.get("estimated_operating_result", 0) or 0)
    transactions = int(metrics.get("total_transactions", 0) or 0)
    gross_margin = _ratio(gross, omzet)
    expense_ratio = _ratio(expenses, omzet)

    paragraphs: list[str] = []
    if transactions == 0:
        paragraphs.append(
            "Belum ada transaksi selesai pada data saat ini, jadi analisis laba belum bisa dihitung. "
            "Mulai dengan mencatat produk yang paling sering ditanyakan pelanggan, lalu uji stok dan harga untuk beberapa produk prioritas."
        )
    else:
        paragraphs.append(
            f"Dari data saat ini, omzet {_format_rupiah(omzet)} menghasilkan laba kotor "
            f"{_format_rupiah(gross)} ({_format_percent(gross_margin)} dari omzet). "
            f"Beban operasional {_format_rupiah(expenses)} ({_format_percent(expense_ratio)} dari omzet), "
            f"sehingga hasil operasional {'positif' if net >= 0 else 'defisit'} {_format_rupiah(abs(net))}."
        )

    source = None
    if any(word in lower for word in ("margin", "harga", "hpp", "untung", "laba", "profit")):
        paragraphs.append(
            f"Untuk margin, HPP menyerap {_format_percent(1 - gross_margin)} dari omzet. "
            "Tinjau HPP per produk dan lakukan penyesuaian harga secara bertahap, bukan dengan menurunkan kualitas atau menyembunyikan biaya."
        )
        source = _find_source(hcb_items, "harga", "margin", "keuntungan", "hpp")
    elif any(word in lower for word in ("biaya", "beban", "pengeluaran", "boros", "hemat")):
        paragraphs.append(
            f"Beban operasional saat ini {_format_rupiah(expenses)} atau {_format_percent(expense_ratio)} dari omzet. "
            "Pisahkan pengeluaran per kategori, hentikan biaya yang tidak menghasilkan penjualan, lalu tetapkan batas belanja mingguan."
        )
        source = _find_source(hcb_items, "konsumsi", "boros", "beban")
    elif any(word in lower for word in ("produk", "stok", "jual", "pelanggan", "pasar")):
        if best_sellers:
            top = best_sellers[0]
            paragraphs.append(
                f"Produk terlaris saat ini adalah {top.get('product_name', '-')} "
                f"dengan {top.get('total_sold', 0)} unit. Jangan hanya menambah stok produk itu; "
                "siapkan satu produk pendamping agar risiko penjualan tidak terpusat pada satu barang."
            )
        else:
            paragraphs.append(
                "Belum ada data produk terlaris. Catat produk yang paling sering ditanyakan dan paling cepat habis, "
                "lalu prioritaskan pembelian berdasarkan permintaan nyata."
            )
        source = _find_source(hcb_items, "produk", "pasar", "distribusi")
    elif any(word in lower for word in ("etika", "halal", "riba", "jujur", "amanah", "promosi")):
        source = _find_source(hcb_items, "jujur", "amanah", "halal", "riba", "promosi", "etika")

    if source:
        basis = _source_basis(source)
        relevance = source.get("business_relevance") or ""
        paragraphs.append(
            f"Panduan HCB: {source.get('principle') or 'prinsip etika dagang'} "
            f"[{basis}]. {relevance} "
            "Terapkan prinsip ini pada keputusan harga, promosi, dan pengelolaan biaya, bukan hanya sebagai teori."
        )
    elif hcb_items:
        paragraphs.append(
            "Rujukan HCB yang paling dekat adalah "
            f"{_source_basis(hcb_items[0])}. Gunakan prinsip tersebut sebagai pertimbangan etis, "
            "tetapi tetap sesuaikan dengan data dan kebutuhan operasional toko."
        )
    else:
        paragraphs.append(
            "Belum ada rujukan HCB yang benar-benar cocok untuk pertanyaan ini. "
            "Saya sarankan mencatat data tambahan agar analisis berikutnya lebih tepat."
        )

    if transactions > 0 and (net < 0 or expense_ratio > 0.5):
        paragraphs.append(
            "Langkah prioritas: audit 3 kategori pengeluaran terbesar, bandingkan dengan penjualan yang dihasilkan, "
            "lalu hentikan atau kurangi biaya yang tidak berdampak langsung pada pelanggan."
        )
    elif best_sellers:
        paragraphs.append(
            "Langkah prioritas: tinjau margin dan perputaran stok produk terlaris, lalu uji satu produk pendamping minggu ini."
        )
    else:
        paragraphs.append(
            "Langkah prioritas: catat penjualan dan pengeluaran secara konsisten agar analisis berikutnya punya dasar yang kuat."
        )

    return "\n\n".join(paragraphs)


def open_ai_stream(messages: List[dict[str, str]]) -> requests.Response | None:
    if not settings.AI_API_KEY:
        return None

    payload = {
        "model": settings.AI_MODEL,
        "messages": messages,
        "temperature": 0.3,
        "stream": True,
    }
    headers = {
        "Authorization": f"Bearer {settings.AI_API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        response = requests.post(
            settings.AI_BASE_URL,
            json=payload,
            headers=headers,
            timeout=(10, 120),
            stream=True,
        )
        if response.status_code == 200:
            return response
        logger.warning("AI chat provider mengembalikan HTTP %s", response.status_code)
        response.close()
    except Exception as error:
        logger.warning("AI chat provider gagal: %s", error)
    return None


def iter_ai_tokens(response: requests.Response) -> Iterator[str]:
    try:
        for raw_line in response.iter_lines(decode_unicode=True):
            if not raw_line:
                continue
            line = raw_line.strip()
            if not line.startswith("data:"):
                continue
            data = line[5:].strip()
            if data == "[DONE]":
                break
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                continue
            choices = payload.get("choices") or []
            if not choices:
                continue
            delta = choices[0].get("delta") or {}
            content = delta.get("content")
            if content:
                yield str(content)
    finally:
        response.close()


def iter_local_text(
    text: str, chunk_size: int = 28, delay_seconds: float = 0.012
) -> Iterator[str]:
    words = re.findall(r"\S+\s*", text)
    buffer = ""
    for word in words:
        buffer += word
        if len(buffer) >= chunk_size:
            yield buffer
            if delay_seconds:
                time.sleep(delay_seconds)
            buffer = ""
    if buffer:
        yield buffer
