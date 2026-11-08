from pydantic import BaseModel, Field
from typing import List, Optional

class ObservationItem(BaseModel):
    category: str = Field(description="Kategori observasi, e.g. Penjualan, Profitabilitas, Beban, Stok")
    fact: str = Field(description="Temuan data faktual berdasarkan angka agregat POS")

class HypothesisItem(BaseModel):
    issue: str = Field(description="Masalah atau peluang bisnis yang teridentifikasi")
    root_cause: str = Field(description="Dugaan akar penyebab berdasarkan pola data")

class HcbGuidance(BaseModel):
    principle: str = Field(description="Prinsip etika muamalah/HCB (e.g. Siddiq, Al-Adl, Amanah, Prohibition of Tabdzir)")
    reflection: str = Field(description="Refleksi etis terkait pengelolaan keuangan/stok bisnis")

class ActionRecommendation(BaseModel):
    title: str = Field(description="Judul ringkas rekomendasi aksi")
    action_plan: str = Field(description="Langkah konkret operasional yang harus dilakukan pemilik toko")
    expected_impact: str = Field(description="Dampak yang diharapkan terhadap kas/efisiensi toko")

class BusinessAnalysisResponse(BaseModel):
    health_score: int = Field(description="Skor kesehatan bisnis dari skala 1-100")
    summary: str = Field(description="Ringkasan kondisi finansial toko dalam 1-2 kalimat")
    observations: List[ObservationItem]
    hypotheses: List[HypothesisItem]
    hcb_guidance: Optional[List[HcbGuidance]] = Field(default=[], description="Panduan etika HCB (jika RAG aktif)")
    recommendations: List[ActionRecommendation]


SYSTEM_PROMPT_ANALYST = """
Anda adalah Senior Business Analyst & Penasihat Etika Muamalah UMKM profesional untuk sistem SmartPOS.

TUGAS ANDA:
Menganalisis data keuangan riil toko UMKM (Omzet, HPP/COGS, Laba Kotor, Pengeluaran Operasional, Hasil Operasional Bersih, dan Performa Produk) serta konteks Etika Muamalah (HCB), lalu memberikan analisis bisnis yang tajam, faktual, dan dapat dieksekusi (actionable).

ATURAN ANALISIS:
1. JANGAN PERNAH mengarang angka yang tidak ada di dalam konteks data metrik.
2. Jika Laba Bersih negatif atau pengeluaran tinggi, berikan peringatan tegas namun konstruktif.
3. Strukturkan jawaban persis sesuai dengan format JSON skema yang diminta.
4. Hubungkan rekomendasi bisnis dengan efisiensi stok, kontrol beban, dan transparansi pencatatan.
"""