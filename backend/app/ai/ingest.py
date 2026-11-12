from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.engine import Connection


HCB_SCHEMA_STATEMENTS = (
    "ALTER TABLE hcb_knowledge_bases ADD COLUMN IF NOT EXISTS source_file VARCHAR(255)",
    "ALTER TABLE hcb_knowledge_bases ADD COLUMN IF NOT EXISTS notes TEXT",
    "ALTER TABLE hcb_knowledge_bases ADD COLUMN IF NOT EXISTS principle VARCHAR(255)",
    "ALTER TABLE hcb_knowledge_bases ADD COLUMN IF NOT EXISTS ethics_topics TEXT",
    "ALTER TABLE hcb_knowledge_bases ADD COLUMN IF NOT EXISTS business_relevance TEXT",
    "ALTER TABLE hcb_knowledge_bases ADD COLUMN IF NOT EXISTS ethics_focus BOOLEAN NOT NULL DEFAULT FALSE",
    "CREATE INDEX IF NOT EXISTS ix_hcb_knowledge_bases_ethics_focus ON hcb_knowledge_bases (ethics_focus)",
)


def ensure_hcb_schema(connection: Connection) -> None:
    connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    for statement in HCB_SCHEMA_STATEMENTS:
        connection.execute(text(statement))
