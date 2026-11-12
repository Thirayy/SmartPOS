from __future__ import annotations

import os

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.ai.curriculum import (
    build_rag_text,
    canonical_module_name,
    clean_cell,
    get_ethics_meta,
    resolve_slide_title,
)
from app.ai.ingest import ensure_hcb_schema
from app.ai.models import HcbKnowledgeBase
from app.ai.provider import get_embedding
from app.core.database import Base, SessionLocal, engine

load_dotenv()

CSV_PATH = os.path.join(os.path.dirname(__file__), "dataset", "hcb_knowledge_base.csv")


def _read_rows(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df.columns = [str(column).strip().lstrip("\ufeff") for column in df.columns]
    required = {
        "file_name",
        "module_name",
        "slide_number",
        "slide_title",
        "content",
        "notes",
        "full_chunk_text",
    }
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Kolom CSV tidak lengkap: {', '.join(sorted(missing))}")
    return df


def _record_from_row(row: pd.Series) -> HcbKnowledgeBase:
    module_name = canonical_module_name(row["module_name"])
    slide_number = int(row["slide_number"])
    content = clean_cell(row["content"])
    notes = clean_cell(row["notes"])
    slide_title = resolve_slide_title(row["slide_title"], content, slide_number)
    meta = get_ethics_meta(module_name, slide_number, slide_title, content)
    full_chunk = build_rag_text(row["full_chunk_text"], meta)

    return HcbKnowledgeBase(
        source_file=clean_cell(row["file_name"]),
        module_name=module_name,
        slide_number=slide_number,
        slide_title=slide_title,
        content=content,
        notes=notes,
        full_chunk_text=full_chunk,
        principle=meta.principle if meta else None,
        ethics_topics=meta.topic if meta else None,
        business_relevance=meta.business_relevance if meta else None,
        ethics_focus=meta is not None,
        embedding=get_embedding(full_chunk),
    )


def import_csv_to_pgvector() -> None:
    print("Memeriksa skema pgvector dan tabel HCB...")
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        ensure_hcb_schema(connection)

    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"File CSV tidak ditemukan di {CSV_PATH}")

    df = _read_rows(CSV_PATH)
    print(f"Memproses {len(df)} baris HCB dari {CSV_PATH}")

    records: list[HcbKnowledgeBase] = []
    errors: list[str] = []
    focus_count = 0
    for index, row in df.iterrows():
        try:
            record = _record_from_row(row)
            records.append(record)
            focus_count += int(bool(record.ethics_focus))
            if (index + 1) % 25 == 0 or index + 1 == len(df):
                print(f"  Embedding {index + 1}/{len(df)}")
        except Exception as error:
            errors.append(f"baris {index + 2}: {error}")

    if errors:
        raise RuntimeError("Import dibatalkan karena ada baris gagal: " + " | ".join(errors))

    db: Session = SessionLocal()
    try:
        db.execute(text("TRUNCATE TABLE hcb_knowledge_bases RESTART IDENTITY"))
        db.add_all(records)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print(
        f"Selesai: {len(records)} baris masuk, {focus_count} baris ditandai fokus etika dagang."
    )


if __name__ == "__main__":
    import_csv_to_pgvector()
