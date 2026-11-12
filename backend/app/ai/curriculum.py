from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class EthicsMeta:
    topic: str
    principle: str
    business_relevance: str


CURATED_SLIDES: dict[str, set[int]] = {
    "002. Menepis kesan yang keliru terhadap Nabi Saw.": {9},
    "003. Menepis kesan buruk terhadap pasar": {2, 3, 4},
    "005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses": {
        3,
        4,
        5,
        6,
        7,
        8,
        13,
        14,
        15,
        17,
        19,
    },
    "006. Take Action": {
        2,
        3,
        6,
        7,
        8,
        9,
        10,
        11,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        22,
        23,
        24,
    },
    "008. 3 elemen perekonomian": {2, 4, 5, 6, 7, 8, 9},
    "008a. Distribusi": {2, 4, 6, 9, 10, 11, 12, 13},
    "008b. Konsumsi": {2, 3, 4, 5, 6, 7},
    "009. Distorsi Perekonomian": set(range(2, 17)),
    "010. Ekonomi Islam adalah solusi": {2},
}


MODULE_DEFAULTS: dict[str, tuple[str, str]] = {
    "002. Menepis kesan yang keliru terhadap Nabi Saw.": (
        "Orientasi harta",
        "Cari, kelola, dan belanjakan harta dengan cara yang benar; kekayaan bukan tujuan yang menghalalkan segala cara.",
        "Relevan saat menilai orientasi pertumbuhan usaha dan cara memperoleh harta.",
    ),
    "003. Menepis kesan buruk terhadap pasar": (
        "Etika pasar",
        "Pasar adalah tempat mencari rezeki halal; hindari najasy, ihtikar, dan kecurangan yang merusak kepercayaan pasar.",
        "Relevan saat meninjau promosi, penimbunan stok, dan pengaruh tidak wajar terhadap pembeli.",
    ),
    "005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses": (
        "Karakter pedagang",
        "Bangun niat benar, kejujuran, amanah, komunikasi yang baik, kecerdasan, ketangguhan, optimisme, dan kesabaran.",
        "Relevan saat membangun kepercayaan pelanggan, menjaga janji, dan mengevaluasi kualitas layanan.",
    ),
    "006. Take Action": (
        "Praktik dagang yang etis",
        "Pilih produk yang dibutuhkan pasar, tentukan harga yang adil dan transparan, serta promosikan tanpa menipu.",
        "Relevan saat menetapkan harga, memilih produk, dan merancang promosi.",
    ),
    "008. 3 elemen perekonomian": (
        "Produksi produktif",
        "Bekerja dan memproduktifkan modal atau aset; jangan membiarkan sumber daya menganggur.",
        "Relevan saat menilai produktivitas aset, stok mati, dan kapasitas usaha.",
    ),
    "008a. Distribusi": (
        "Distribusi adil",
        "Salurkan barang dan jasa yang halal dengan saling ridha, tanpa menimbun, dan tanpa merugikan pihak lain.",
        "Relevan saat mengelola stok, rantai pasok, dan akses pelanggan.",
    ),
    "008b. Konsumsi": (
        "Konsumsi bijak",
        "Hindari boros, kikir, dan bermewah-mewah; utamakan kebutuhan produktif dan kepentingan umum.",
        "Relevan saat mengendalikan biaya operasional dan pembelian yang tidak produktif.",
    ),
    "009. Distorsi Perekonomian": (
        "Riba, maisir, dan gharar",
        "Hindari tambahan yang tidak adil, spekulasi untung-untungan, dan transaksi yang tidak jelas.",
        "Relevan saat meninjau utang, bunga, skema kredit, promo untung-untungan, dan syarat transaksi.",
    ),
    "010. Ekonomi Islam adalah solusi": (
        "Orientasi ekonomi",
        "Orientasi ekonomi yang benar menghilangkan ketamakan, lalu menutup jalan riba, maisir, dan gharar.",
        "Relevan saat menyeimbangkan pertumbuhan laba dengan orientasi etika.",
    ),
}


SLIDE_OVERRIDES: dict[tuple[str, int], tuple[str, str]] = {
    ("002. Menepis kesan yang keliru terhadap Nabi Saw.", 9): (
        "Orientasi harta",
        "Kaum muslimin dianjurkan kaya dan harus mencari, mengelola, serta membelanjakan harta dengan cara yang benar.",
    ),
    ("003. Menepis kesan buruk terhadap pasar", 2): (
        "Etika pasar",
        "Pasar bukan tempat yang buruk; yang buruk adalah kecurangan dan akhlak buruk di dalamnya.",
    ),
    ("003. Menepis kesan buruk terhadap pasar", 3): (
        "Etika pasar",
        "Hindari najasy, ihtikar, dan kecurangan yang merusak keadilan pasar.",
    ),
    ("003. Menepis kesan buruk terhadap pasar", 4): (
        "Doa masuk pasar",
        "Memohon kebaikan pasar dan berlindung dari keburukannya; pasar harus diisi dengan niat dan akhlak baik.",
    ),
    ("005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses", 3): (
        "Delapan karakter pedagang",
        "Bangun karakter pedagang: niat benar, jujur, amanah, komunikatif, cerdas, tangguh, optimis, dan sabar.",
    ),
    ("005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses", 4): (
        "Niat benar",
        "Niat berbisnis harus benar: menjalankan perintah Allah, mengikuti sunah Nabi, dan mencari harta secara halal.",
    ),
    ("005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses", 5): (
        "Shiddiq (kejujuran)",
        "Jujur pada ucapan, tidak menyembunyikan cacat barang, dan menepati janji.",
    ),
    ("005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses", 6): (
        "Amanah",
        "Menjaga kepercayaan, menepati janji, dan memenuhi komitmen layanan seperti garansi.",
    ),
    ("005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses", 7): (
        "Tabligh (komunikasi)",
        "Sampaikan informasi produk dengan jelas, jujur, dan tidak berlebihan.",
    ),
    ("005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses", 8): (
        "Fathanah (kecerdasan usaha)",
        "Gunakan riset, inovasi, dan strategi untuk membaca peluang secara bertanggung jawab.",
    ),
    ("005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses", 13): (
        "Tangguh",
        "Hitung risiko dengan seksama dan tetap bekerja dengan semangat serta tanggung jawab.",
    ),
    ("005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses", 14): (
        "Husnuzan",
        "Hadapi fluktuasi usaha dengan sikap positif tanpa mengabaikan evaluasi data.",
    ),
    ("005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses", 15): (
        "Sabar dan ikhtiar",
        "Terus berikhtiar, tidak putus asa, dan evaluasi kegagalan dengan muhasabah.",
    ),
    ("005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses", 17): (
        "Skill",
        "Bangun keahlian yang jelas sebelum memperbesar usaha.",
    ),
    ("005. Roadmap Nabi Saw sebagai pelaku ekonomi yang sukses", 19): (
        "Modal",
        "Kelola modal dengan sadar: milik sendiri, patungan, atau utang; hindari utang yang memberatkan.",
    ),
    ("006. Take Action", 2): (
        "Perencanaan usaha",
        "Riset situasi pasar dan susun rencana sebelum bertindak.",
    ),
    ("006. Take Action", 3): (
        "Produk yang dibutuhkan pasar",
        "Jual produk yang benar-benar dibutuhkan pasar, kenali kelebihan-kekurangannya, dan jaga kualitas.",
    ),
    ("006. Take Action", 6): (
        "Harga jual",
        "Tentukan harga yang menutup biaya, wajar bagi pembeli, dan transparan.",
    ),
    ("006. Take Action", 7): (
        "Harga berbasis biaya",
        "Hitung HPP dan biaya operasional sebelum menetapkan margin.",
    ),
    ("006. Take Action", 8): (
        "Harga berbasis kompetisi",
        "Bandingkan harga pasar tanpa mengabaikan biaya dan kualitas.",
    ),
    ("006. Take Action", 9): (
        "Harga berbasis pelanggan",
        "Pahami persepsi nilai pelanggan tanpa mengabaikan biaya.",
    ),
    ("006. Take Action", 10): (
        "Harga jual ala Nabi",
        "Gunakan lelang atau penawaran terbuka yang adil dan jelas.",
    ),
    ("006. Take Action", 11): (
        "Harga jual ala Nabi",
        "Sampaikan modal dan harga secara jujur; ambil keuntungan wajar.",
    ),
    ("006. Take Action", 13): (
        "Promosi jujur",
        "Promosikan produk dengan informasi benar, tanpa janji palsu, dan tanpa menekan pembeli.",
    ),
    ("006. Take Action", 14): (
        "Etika promosi",
        "Jangan bersumpah berlebihan dan jangan berjanji atau menipu.",
    ),
    ("006. Take Action", 15): (
        "Etika promosi",
        "Hindari sumpah berlebihan yang menghilangkan keberkahan.",
    ),
    ("006. Take Action", 16): (
        "Menguasai produk",
        "Kenali keunggulan dan kekurangan produk yang dijual.",
    ),
    ("006. Take Action", 17): (
        "Komunikasi jelas",
        "Jelaskan produk dengan bahasa yang mudah dipahami.",
    ),
    ("006. Take Action", 18): (
        "Memahami kebutuhan pembeli",
        "Posisikan diri sebagai pembeli dan pahami kebutuhannya.",
    ),
    ("006. Take Action", 19): (
        "Komunikasi positif",
        "Hindari kalimat negatif yang menekan pembeli.",
    ),
    ("006. Take Action", 20): (
        "Beri waktu pembeli",
        "Beri ruang untuk mempertimbangkan tanpa tekanan.",
    ),
    ("006. Take Action", 22): (
        "Lokasi/kanal penjualan",
        "Pilih tempat atau kanal yang mudah diakses pelanggan.",
    ),
    ("006. Take Action", 23): (
        "Promosi",
        "Pilih promosi yang menyampaikan informasi benar, bukan menyesatkan.",
    ),
    ("006. Take Action", 24): (
        "Batas keuntungan",
        "Keuntungan tidak dibatasi selama halal dan tidak menzalimi konsumen.",
    ),
    ("008. 3 elemen perekonomian", 2): (
        "Tiga elemen ekonomi",
        "Produksi, distribusi, dan konsumsi harus berjalan seimbang.",
    ),
    ("008. 3 elemen perekonomian", 4): (
        "Produksi produktif",
        "Bekerja mencari rezeki, tetapi jangan berlebihan.",
    ),
    ("008. 3 elemen perekonomian", 5): (
        "Produksi produktif",
        "Bekerja lebih mulia daripada mengemis.",
    ),
    ("008. 3 elemen perekonomian", 6): (
        "Produksi produktif",
        "Produksi menjadi fondasi distribusi dan konsumsi.",
    ),
    ("008. 3 elemen perekonomian", 7): (
        "Produksi produktif",
        "Wiraswasta lebih utama daripada menjadi pekerja.",
    ),
    ("008. 3 elemen perekonomian", 8): (
        "Produksi produktif",
        "Meski bekerja, orientasi tetap dibangun menuju wirausaha.",
    ),
    ("008. 3 elemen perekonomian", 9): (
        "Produksi produktif",
        "Aset atau modal wajib diproduktifkan.",
    ),
    ("008a. Distribusi", 2): (
        "Distribusi",
        "Distribusi mencakup perdagangan dan pemerataan ekonomi.",
    ),
    ("008a. Distribusi", 4): (
        "Motivasi pedagang",
        "Pedagang memiliki peran mulia dalam menyalurkan kebutuhan.",
    ),
    ("008a. Distribusi", 6): (
        "Peringatan pedagang",
        "Waspadai risiko kecurangan dan ketamakan dalam perdagangan.",
    ),
    ("008a. Distribusi", 9): (
        "Distribusi",
        "Salurkan barang/jasa dari produsen ke konsumen secara adil.",
    ),
    ("008a. Distribusi", 10): (
        "Prinsip perdagangan",
        "Perdagangan harus halal, saling ridha, dan bebas riba/gharar/maisir.",
    ),
    ("008a. Distribusi", 11): (
        "Pemerataan ekonomi",
        "Harta tidak boleh hanya terkonsentrasi pada segelintir orang.",
    ),
    ("008a. Distribusi", 12): (
        "Pemerataan ekonomi",
        "Pemerataan bertujuan menyatukan hati dan menyucikan jiwa.",
    ),
    ("008a. Distribusi", 13): (
        "Pemerataan ekonomi",
        "Perlu aturan kepemilikan dan distribusi yang adil.",
    ),
    ("008b. Konsumsi", 2): (
        "Konsumsi",
        "Konsumsi menghabiskan nilai guna barang/jasa.",
    ),
    ("008b. Konsumsi", 3): (
        "Norma konsumsi",
        "Belanjakan harta untuk kebaikan, tidak kikir, dan tidak boros.",
    ),
    ("008b. Konsumsi", 4): (
        "Kesederhanaan",
        "Hidup sederhana, tidak berlebihan.",
    ),
    ("008b. Konsumsi", 5): (
        "Tidak boros",
        "Hindari pemborosan.",
    ),
    ("008b. Konsumsi", 6): (
        "Tidak bermewah-mewah",
        "Hindari gaya hidup bermewah-mewahan.",
    ),
    ("008b. Konsumsi", 7): (
        "Kepentingan umum",
        "Dahulukan kepentingan umum/sosial di atas pribadi.",
    ),
    ("009. Distorsi Perekonomian", 2): (
        "Tiga perusak ekonomi",
        "Riba, maisir, dan gharar merusak perekonomian.",
    ),
    ("009. Distorsi Perekonomian", 3): (
        "Riba",
        "Riba adalah tambahan yang tidak adil.",
    ),
    ("009. Distorsi Perekonomian", 4): (
        "Hukum riba",
        "Riba haram berdasarkan Al-Qur'an dan hadis.",
    ),
    ("009. Distorsi Perekonomian", 5): (
        "Dalil larangan riba",
        "Al-Qur'an memerintahkan meninggalkan riba dan memperingatkan akibatnya.",
    ),
    ("009. Distorsi Perekonomian", 6): (
        "Dosa riba",
        "Riba termasuk dosa besar; hadis memperingatkan beratnya akibat riba.",
    ),
    ("009. Distorsi Perekonomian", 7): (
        "Dampak riba",
        "Riba merusak masyarakat dan mendatangkan azab.",
    ),
    ("009. Distorsi Perekonomian", 8): (
        "Bisnis mengandung riba",
        "Waspadai kredit, bunga, dan skema bisnis yang mengandung riba.",
    ),
    ("009. Distorsi Perekonomian", 9): (
        "Maisir",
        "Maisir adalah untung-untungan tanpa kerja keras.",
    ),
    ("009. Distorsi Perekonomian", 10): (
        "Larangan maisir",
        "Maisir dilarang dalam muamalah.",
    ),
    ("009. Distorsi Perekonomian", 11): (
        "Contoh maisir",
        "Spekulasi pasar modal, asuransi konvensional, dan kupon berhadiah.",
    ),
    ("009. Distorsi Perekonomian", 12): (
        "Gharar",
        "Gharar adalah ketidakjelasan objek, harga, atau penyerahan.",
    ),
    ("009. Distorsi Perekonomian", 13): (
        "Gharar",
        "Hindari jual beli barang yang tidak jelas penyerahannya.",
    ),
    ("009. Distorsi Perekonomian", 14): (
        "Gharar yang dibolehkan",
        "Gharar ringan yang dimaklumi dapat ditoleransi.",
    ),
    ("009. Distorsi Perekonomian", 15): (
        "Gharar yang dimaklumi",
        "Ulama menoleransi gharar ringan yang lazim dan tidak menimbulkan sengketa.",
    ),
    ("009. Distorsi Perekonomian", 16): (
        "Kesimpulan",
        "Riba, maisir, dan gharar adalah distorsi yang harus dihindari.",
    ),
    ("010. Ekonomi Islam adalah solusi", 2): (
        "Orientasi ekonomi",
        "Orientasi benar menghilangkan ketamakan, lalu menutup riba, maisir, dan gharar.",
    ),
}


PRINCIPLE_RULES: list[tuple[re.Pattern[str], str, str]] = [
    (
        re.compile(r"\bniat\b", re.I),
        "Niat benar",
        "Niat berbisnis harus benar: menjalankan perintah Allah, mengikuti sunah Nabi, dan mencari harta secara halal.",
    ),
    (
        re.compile(r"jujur|shiddiq|siddiq", re.I),
        "Shiddiq (kejujuran)",
        "Jujur pada ucapan, tidak menyembunyikan cacat barang, dan menepati janji.",
    ),
    (
        re.compile(r"amanah|dipercaya", re.I),
        "Amanah",
        "Menjaga kepercayaan, menepati janji, dan memenuhi komitmen layanan seperti garansi.",
    ),
    (
        re.compile(r"tabligh|komunikasi", re.I),
        "Tabligh (komunikasi)",
        "Sampaikan informasi produk dengan jelas, jujur, dan tidak berlebihan.",
    ),
    (
        re.compile(r"fathanah|cerdas", re.I),
        "Fathanah (kecerdasan usaha)",
        "Gunakan riset, inovasi, dan strategi untuk membaca peluang secara bertanggung jawab.",
    ),
    (
        re.compile(r"jihad|tangguh", re.I),
        "Tangguh",
        "Hitung risiko dengan seksama dan tetap bekerja dengan semangat serta tanggung jawab.",
    ),
    (
        re.compile(r"positive|bersangka baik", re.I),
        "Husnuzan",
        "Hadapi fluktuasi usaha dengan sikap positif tanpa mengabaikan evaluasi data.",
    ),
    (
        re.compile(r"sabar|ikhtiar", re.I),
        "Sabar dan ikhtiar",
        "Terus berikhtiar, tidak putus asa, dan evaluasi kegagalan dengan muhasabah.",
    ),
    (
        re.compile(r"harga|pricing|margin|keuntungan", re.I),
        "Harga adil dan transparan",
        "Hindari manipulasi harga, takaran, kualitas, dan sumpah berlebihan; ambil keuntungan secara wajar.",
    ),
    (
        re.compile(r"produk|dagangan", re.I),
        "Produk yang dibutuhkan pasar",
        "Jual produk yang benar-benar dibutuhkan pasar, kenali kelebihan-kekurangannya, dan jaga kualitas.",
    ),
    (
        re.compile(r"marketing|promosi|menjual|closing|komunikasi negatif", re.I),
        "Promosi jujur",
        "Promosikan produk dengan informasi benar, tanpa janji palsu, dan tanpa menekan pembeli secara tidak wajar.",
    ),
    (
        re.compile(r"tempat|lokasi|jualannya", re.I),
        "Tempat usaha yang tepat",
        "Pilih lokasi atau kanal penjualan yang mudah diakses dan sesuai kebutuhan pelanggan.",
    ),
    (
        re.compile(r"riba", re.I),
        "Menjauhi riba",
        "Hindari tambahan nominal pada pinjaman atau pertukaran yang tidak adil.",
    ),
    (
        re.compile(r"maisir|maysir|judi", re.I),
        "Menjauhi maisir",
        "Hindari transaksi yang bergantung pada spekulasi atau keberuntungan tanpa kerja dan nilai nyata.",
    ),
    (
        re.compile(r"gharar|ghoror|ketidakjelasan", re.I),
        "Menjauhi gharar",
        "Pastikan objek, harga, penyerahan, dan syarat transaksi jelas serta tidak menimbulkan sengketa.",
    ),
    (
        re.compile(r"distribusi", re.I),
        "Distribusi adil",
        "Salurkan barang secara adil, jangan menimbun, dan jaga hak produsen maupun konsumen.",
    ),
    (
        re.compile(r"konsumsi|boros|kikir|mewah|sederhana", re.I),
        "Konsumsi bijak",
        "Belanjakan harta secara seimbang: tidak boros, tidak kikir, dan tidak bermewah-mewah.",
    ),
    (
        re.compile(r"produksi|produktif|asset|modal", re.I),
        "Produksi produktif",
        "Bekerja dan kelola modal agar produktif, bukan menganggur atau mengendap tanpa manfaat.",
    ),
    (
        re.compile(r"pasar|najasy|ihtikar|menimbun", re.I),
        "Etika pasar",
        "Jaga pasar dari transaksi palsu, penimbunan, dan kecurangan yang merusak keadilan.",
    ),
    (
        re.compile(r"ketamakan|stabil", re.I),
        "Orientasi ekonomi",
        "Kendalikan ketamakan agar transaksi bersih dari riba, maisir, dan gharar.",
    ),
]


_GENERIC_TITLE = re.compile(r"^(slide\s*)?\d+$", re.I)
_WHITESPACE = re.compile(r"\s+")


def canonical_module_name(value: object) -> str:
    text = _WHITESPACE.sub(" ", str(value or "")).strip()
    return text.rstrip(", ")


def clean_cell(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.lower() in {"nan", "none", "null"}:
        return ""
    return text


def resolve_slide_title(slide_title: object, content: object, slide_number: int) -> str:
    title = clean_cell(slide_title)
    if title and not _GENERIC_TITLE.match(title):
        return title

    content_text = clean_cell(content)
    if content_text:
        first_segment = content_text.split("|", 1)[0].strip()
        first_segment = first_segment.strip("\"' ")
        if first_segment:
            return first_segment[:140]

    return f"Slide {slide_number}"


def get_ethics_meta(
    module_name: object,
    slide_number: int,
    slide_title: object,
    content: object,
) -> EthicsMeta | None:
    module = canonical_module_name(module_name)
    curated = CURATED_SLIDES.get(module)
    if not curated or slide_number not in curated:
        return None

    _default_topic, default_principle, default_relevance = MODULE_DEFAULTS[module]
    title = resolve_slide_title(slide_title, content, slide_number)
    override = SLIDE_OVERRIDES.get((module, slide_number))
    if override:
        topic, principle = override
    else:
        topic = title
        principle = default_principle
        for pattern, rule_topic, rule_principle in PRINCIPLE_RULES:
            if pattern.search(title):
                topic = rule_topic
                principle = rule_principle
                break

    return EthicsMeta(
        topic=topic,
        principle=principle,
        business_relevance=default_relevance,
    )


def build_rag_text(full_chunk_text: object, meta: EthicsMeta | None) -> str:
    text = clean_cell(full_chunk_text)
    if meta is None:
        return text
    return (
        f"{text} Topik etika dagang: {meta.topic}. "
        f"Prinsip: {meta.principle}. "
        f"Relevansi dengan kondisi bisnis: {meta.business_relevance}"
    )
