import os
import requests

def call_ai_llm(metrics_summary: str) -> str:
    api_key = os.getenv("AI_API_KEY", "mock-api-key")
    
    if api_key == "mock-api-key" or not api_key:
        return (
            "### 1. Observasi\n"
            f"- Berdasarkan data metrik saat ini: {metrics_summary}\n"
            "- Performa penjualan menunjukkan tren stabil dengan kontribusi produk unggulan yang konsisten.\n\n"
            "### 2. Hipotesis\n"
            "- Margin laba kotor terpelihara dengan baik, namun kontrol terhadap biaya operasional rutin perlu dioptimalkan.\n\n"
            "### 3. Rekomendasi\n"
            "- Tingkatkan promosi untuk produk dengan perputaran stok rendah guna mempercepat arus kas.\n"
            "- Evaluasi efisiensi pengeluaran utilitas secara berkala."
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "deepseek/deepseek-chat",
        "messages": [
            {
                "role": "system",
                "content": "Anda adalah AI Business Analyst untuk UMKM. Berikan analisis bisnis terstruktur ke dalam: Observasi, Hipotesis, dan Rekomendasi berdasarkan metrik keuangan."
            },
            {
                "role": "user",
                "content": f"Analisis data metrik bisnis berikut:\n{metrics_summary}"
            }
        ],
        "temperature": 0.7
    }
    
    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers, timeout=30)
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]
    except Exception:
        pass
        
    return "Gagal mendapatkan analisis AI saat ini."