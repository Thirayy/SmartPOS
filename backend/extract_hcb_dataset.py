import os
import re

import pandas as pd
from pptx import Presentation
from pptx.enum.shapes import PP_PLACEHOLDER

DATASET_DIR = os.path.join(os.path.dirname(__file__), "dataset")
OUTPUT_CSV = os.path.join(DATASET_DIR, "hcb_knowledge_base.csv")

_GENERIC_TITLE = re.compile(r"^(slide\s*)?\d+$", re.I)


def clean_text(text: str) -> str:
    if not text:
        return ""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return " ".join(lines)


def clean_cell(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.lower() in {"nan", "none", "null"}:
        return ""
    return text


def clean_module_title(file_name: str) -> str:
    return clean_text(os.path.splitext(file_name)[0]).rstrip(", ")


def _title_from_shape(shape, slide) -> str:
    try:
        if shape == slide.shapes.title:
            return clean_text(shape.text)
    except Exception:
        pass

    try:
        if shape.is_placeholder and shape.placeholder_format.type in {
            PP_PLACEHOLDER.TITLE,
            PP_PLACEHOLDER.CENTER_TITLE,
        }:
            return clean_text(shape.text)
    except Exception:
        pass

    return ""


def _fallback_title(texts: list[str]) -> str:
    if not texts:
        return ""

    first_line = texts[0].splitlines()[0].strip() if texts[0] else ""
    first_line = first_line.strip("\"' ")
    if not first_line or _GENERIC_TITLE.match(first_line):
        return ""
    return first_line[:140]


def extract_pptx_to_dataset(dataset_dir: str, output_csv_path: str):
    extracted_data = []
    files = sorted(f for f in os.listdir(dataset_dir) if f.endswith(".pptx"))
    print(f"Menemukan {len(files)} file PPTX HCB di {dataset_dir}")

    for file_name in files:
        file_path = os.path.join(dataset_dir, file_name)
        module_title = clean_module_title(file_name)

        try:
            prs = Presentation(file_path)
            print(f"Memproses: {file_name} ({len(prs.slides)} slide)")

            for slide_idx, slide in enumerate(prs.slides, start=1):
                slide_title = ""
                raw_texts: list[str] = []
                slide_texts: list[str] = []

                for shape in slide.shapes:
                    if not getattr(shape, "has_text_frame", False):
                        continue
                    raw_text = str(shape.text or "").strip()
                    text = clean_text(raw_text)
                    if not text:
                        continue

                    raw_texts.append(raw_text)
                    slide_texts.append(text)

                    if not slide_title:
                        slide_title = _title_from_shape(shape, slide)

                if not slide_title:
                    slide_title = _fallback_title(raw_texts)

                notes_text = ""
                if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                    notes_text = clean_text(slide.notes_slide.notes_text_frame.text)
                    if notes_text.lower() in {"nan", "none", "null"}:
                        notes_text = ""

                content_text = " | ".join(slide_texts) if slide_texts else slide_title
                if not slide_title:
                    slide_title = f"Slide {slide_idx}"
                if not content_text and not notes_text:
                    continue

                full_chunk = (
                    f"Modul: {module_title}. "
                    f"Slide {slide_idx}: {slide_title}. "
                    f"Konten: {content_text}"
                )
                if notes_text:
                    full_chunk += f". Catatan: {notes_text}"

                extracted_data.append(
                    {
                        "file_name": file_name,
                        "module_name": module_title,
                        "slide_number": slide_idx,
                        "slide_title": slide_title,
                        "content": content_text,
                        "notes": notes_text,
                        "full_chunk_text": full_chunk,
                    }
                )
        except Exception as error:
            print(f"Gagal membaca {file_name}: {error}")

    df = pd.DataFrame(extracted_data)
    df.to_csv(output_csv_path, index=False, encoding="utf-8-sig")

    print("Ekstraksi selesai.")
    print(f"Total slide terpindai: {len(df)} baris")
    print(f"Dataset tersimpan di: {output_csv_path}")


if __name__ == "__main__":
    extract_pptx_to_dataset(DATASET_DIR, OUTPUT_CSV)
