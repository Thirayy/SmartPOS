import os
import json
import requests
from typing import Dict, Any, List
from app.ai.schemas import (
    BusinessAnalysisResponse,
    ObservationItem,
    HypothesisItem,
    HcbGuidance,
    ActionRecommendation,
    SYSTEM_PROMPT_ANALYST
)
class HcbRagRetriever:
    """
    Placeholder RAG Retriever untuk materi HCB (Hadits Character Building / Ekonomi Islam).
    Nanti saat materi HCB berupa PDF/Text siap, tinggal hubungkan ke Vector DB (ChromaDB/FAISS/pgvector).
    """
    def __init__(self):
        self.is_active = False # Set True jika Vector DB HCB sudah di-load

    def retrieve_relevant_hcb(self, context_query: str) -> List[str]:
        if not self.is_active:
            # Fallback default HCB principles jika Vector DB belum diisi materi
            return [
                "Prinsip Siddiq & Amanah: Kejujuran dan ketelitian dalam pencatatan setiap arus transaksi keuangan dan persediaan barang.",
                "Prinsip Al-Adl: Penetapan margin harga yang adil bagi konsumen tanpa eksploitasi (ghabn).",
                "Prinsip Anti-Tabdzir: Efisiensi operasional dan pencegahan pemborosan stok atau pengeluaran yang tidak berdaya guna."
            ]
        # TODO: Implementasi pencarian vector similarity search di sini
        return []

hcb_retriever = HcbRagRetriever()


def run_business_analysis(metrics: Dict[str, Any], best_sellers: List[Dict[str, Any]]) -> BusinessAnalysisResponse:
    api_key = os.getenv("AI_API_KEY")
    
    # Format data POS menjadi konteks prompt yang rapi
    pos_context = f"""
=== DATA KEUANGAN POS (RELAXED AGGREGATION) ===
- Total Omzet Penjualan: Rp{metrics['total_omzet']:,.2f}
- Total Transaksi Selesai: {metrics['total_transactions']} transaksi
- Total HPP / COGS: Rp{metrics['total_cogs']:,.2f}
- Estimated Gross Profit (Laba Kotor): Rp{metrics['estimated_gross_profit']:,.2f}
- Total Pengeluaran Operasional (Expenses): Rp{metrics['total_expenses']:,.2f}
- Net Operating Result (Hasil Operasional Bersih): Rp{metrics['estimated_operating_result']:,.2f}

=== PRODUK TERLARIS (TOP SELLERS) ===
{json.dumps(best_sellers, indent=2, ensure_ascii=False)}
"""

    # Retrieve Konteks HCB
    hcb_chunks = hcb_retriever.retrieve_relevant_hcb(pos_context)
    hcb_context = "\n".join([f"- {chunk}" for chunk in hcb_chunks])

    user_prompt = f"""
{pos_context}

=== BASIS KNOWLEDGE HCB (ETIKA MUAMALAH) ===
{hcb_context}

Berdasarkan data kuantitatif POS dan prinsip HCB di atas, buatlah analisis bisnis terstruktur sesuai format JSON skema target.
"""

    # 1. Fallback Mock Data jika API Key tidak diset (Untuk Pengujian Lokal)
    if not api_key:
        return _generate_mock_structured_response(metrics)

    # 2. Panggilan Production ke OpenRouter / DeepSeek / OpenAI dengan JSON Schema
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "deepseek/deepseek-chat", # atau "gpt-4o-mini"
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT_ANALYST},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3
    }

    try:
        res = requests.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers, timeout=30)
        if res.status_code == 200:
            content = res.json()["choices"][0]["message"]["content"]
            parsed_json = json.loads(content)
            return BusinessAnalysisResponse(**parsed_json)
    except Exception as e:
        print(f"[AI Provider Error]: {e}")
        
    return _generate_mock_structured_response(metrics)


def _generate_mock_structured_response(metrics: Dict[str, Any]) -> BusinessAnalysisResponse:
    net_res = metrics.get('estimated_operating_result', 0)
    health = 85 if net_res > 0 else 45
    
    return BusinessAnalysisResponse(
        health_score=health,
        summary="Kondisi arus kas toko berjalan stabil dengan perputaran produk utama yang positif.",
        observations=[
            ObservationItem(category="Penjualan", fact=f"Total omzet tercatat Rp{metrics.get('total_omzet', 0):,.0f} dari {metrics.get('total_transactions', 0)} transaksi."),
            ObservationItem(category="Profitabilitas", fact=f"Laba kotor mencapai Rp{metrics.get('estimated_gross_profit', 0):,.0f} setelah dikurangi HPP.")
        ],
        hypotheses=[
            HypothesisItem(issue="Beban Operasional", root_cause="Perlu pemantauan efisiensi pada biaya rutin pengeluaran mingguan.")
        ],
        hcb_guidance=[
            HcbGuidance(principle="Siddiq & Amanah", reflection="Selalu konsisten mencatat setiap transaksi keluar-masuk barang agar laporan keuangan valid dan terhindar dari ketidakpastian (Gharar)."),
            HcbGuidance(principle="Anti-Tabdzir", reflection="Hindari penimbunan barang (Ihtikar) berlebih yang berpotensi rusak atau menjadi dana mengendap.")
        ],
        recommendations=[
            ActionRecommendation(
                title="Evaluasi Efisiensi Utilitas",
                action_plan="Lakukan audit pengeluaran operasional non-HPP untuk menjaga rasio laba bersih.",
                expected_impact="Meningkatkan marjin operasional bersih hingga 5-10%."
            )
        ]
    )