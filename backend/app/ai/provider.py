import requests
from fastapi import HTTPException

from app.core.config import settings


def call_ai_llm(metrics_summary: str) -> str:
    if not settings.AI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Analisis AI belum dikonfigurasi. Isi AI_API_KEY di backend/.env.",
        )

    headers = {
        "Authorization": f"Bearer {settings.AI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.AI_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Anda adalah AI Business Analyst untuk UMKM. Berikan analisis bisnis "
                    "terstruktur ke dalam: Observasi, Hipotesis, dan Rekomendasi berdasarkan "
                    "metrik keuangan."
                ),
            },
            {
                "role": "user",
                "content": f"Analisis data metrik bisnis berikut:\n{metrics_summary}",
            },
        ],
        "temperature": 0.7,
    }

    try:
        response = requests.post(
            settings.AI_BASE_URL,
            json=payload,
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()
    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail="Layanan AI gagal dihubungi. Periksa konfigurasi dan koneksi AI.",
        ) from error

    try:
        content = response.json()["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as error:
        raise HTTPException(
            status_code=502,
            detail="Layanan AI mengirim respons dengan format yang tidak valid.",
        ) from error

    if not isinstance(content, str) or not content.strip():
        raise HTTPException(status_code=502, detail="Layanan AI mengirim analisis kosong.")
    return content
