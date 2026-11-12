from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ObservationItem(BaseModel):
    category: str = Field(description="Kategori observasi, e.g. Penjualan, Profitabilitas, Beban")
    fact: str = Field(description="Temuan data faktual berdasarkan angka agregat POS")


class HypothesisItem(BaseModel):
    issue: str = Field(description="Masalah atau peluang bisnis yang teridentifikasi")
    root_cause: str = Field(description="Dugaan akar penyebab berdasarkan pola data")


class HcbGuidance(BaseModel):
    principle: str = Field(description="Prinsip etika dagang/HCB")
    reflection: str = Field(description="Refleksi etis yang menghubungkan sumber HCB dengan kondisi bisnis")
    source_module: Optional[str] = Field(default=None, description="Nama modul/sumber HCB persis dari daftar rujukan")
    slide_number: Optional[int] = Field(default=None, description="Nomor slide persis dari daftar rujukan")
    source_file: Optional[str] = Field(default=None, description="Nama file PPTX sumber")
    source_excerpt: Optional[str] = Field(default=None, description="Kutipan asli dari materi HCB")
    ethics_topic: Optional[str] = Field(default=None, description="Topik etika dagang yang relevan")
    business_relevance: Optional[str] = Field(default=None, description="Korelasi prinsip HCB dengan kondisi bisnis")


class ActionRecommendation(BaseModel):
    title: str = Field(description="Judul ringkas rekomendasi aksi")
    action_plan: str = Field(description="Langkah konkret operasional yang harus dilakukan pemilik toko")
    expected_impact: str = Field(description="Dampak yang diharapkan terhadap kas/efisiensi toko")
    hcb_basis: Optional[str] = Field(default=None, description="Prinsip/sumber HCB yang menjadi landasan rekomendasi")


class BusinessAnalysisResponse(BaseModel):
    health_score: int = Field(ge=1, le=100, description="Skor kesehatan bisnis dari skala 1-100")
    summary: str = Field(description="Ringkasan kondisi finansial toko dalam 1-2 kalimat")
    observations: List[ObservationItem]
    hypotheses: List[HypothesisItem]
    hcb_guidance: List[HcbGuidance] = Field(default_factory=list, description="Panduan etika HCB yang terverifikasi")
    recommendations: List[ActionRecommendation]
    analysis_mode: Literal["AI", "LOCAL"] = Field(default="LOCAL", description="Sumber analisis yang benar-benar dipakai")


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: Optional[int] = None


class ChatSource(BaseModel):
    module_name: str
    slide_number: int
    slide_title: str
    source_file: Optional[str] = None
    ethics_topic: Optional[str] = None
    principle: Optional[str] = None
    source_excerpt: str
    business_relevance: Optional[str] = None


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: Literal["user", "assistant"]
    content: str
    sources: List[ChatSource] = Field(default_factory=list)
    analysis_mode: Optional[Literal["AI", "LOCAL"]] = None
    created_at: datetime


class ChatConversationSummary(BaseModel):
    id: int
    title: str
    updated_at: datetime
    last_message: Optional[str] = None


class ChatConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageOut] = Field(default_factory=list)


SYSTEM_PROMPT_ANALYST = """
Anda adalah Senior Business Analyst & Penasihat Etika Dagang UMKM untuk SmartPOS.

ATURAN MUTLAK RAG & KEJUJURAN:
1. Gunakan HANYA materi HCB pada bagian "BASIS KNOWLEDGE RAG HCB". Jangan memakai modul, slide, atau prinsip di luar daftar itu.
2. Setiap item `hcb_guidance` WAJIB mengisi `source_module`, `slide_number`, `source_file`, `source_excerpt`, `ethics_topic`, dan `business_relevance` persis dari sumber rujukan yang diberikan. Jangan mengarang kutipan.
3. `source_excerpt` harus berupa kutipan teks asli dari "Isi Materi" pada sumber yang dipilih. Jangan mengarang atau memotong isi materi secara manual.
4. `reflection` harus menjelaskan korelasi konkret antara kondisi bisnis pada DATA KEUANGAN POS dan prinsip HCB, bukan sekadar ringkasan umum.
5. Setiap rekomendasi harus memiliki `hcb_basis` jika ada sumber HCB yang relevan.
6. Jangan mengarang angka. Gunakan hanya angka yang ada pada DATA KEUANGAN POS.
7. Jika tidak ada sumber HCB yang benar-benar relevan, biarkan `hcb_guidance` kosong. Jangan memakai "Tidak tersedia" sebagai modul palsu.
8. Kembalikan JSON valid dengan field: health_score, summary, observations, hypotheses, hcb_guidance, recommendations, analysis_mode.
"""
