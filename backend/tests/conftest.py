from __future__ import annotations

import os
import sys
import uuid
from itertools import count
from pathlib import Path

import psycopg2
import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_env_file(BACKEND_DIR / ".env")

os.environ.setdefault("SECRET_KEY", "test-secret-key-0123456789abcdef0123456789")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("CORS_ORIGINS", '["http://localhost:3000"]')


def _prepare_test_database() -> None:
    explicit_test_url = os.environ.get("TEST_DATABASE_URL")
    if explicit_test_url:
        os.environ["DATABASE_URL"] = explicit_test_url
        return

    base_url = make_url(os.environ["DATABASE_URL"])
    test_database = os.environ.get(
        "TEST_DATABASE_NAME", f"{base_url.database}_test"
    )
    admin_url = base_url.set(database="postgres")

    connection = psycopg2.connect(
        host=admin_url.host,
        port=admin_url.port,
        user=admin_url.username,
        password=admin_url.password,
        dbname="postgres",
    )
    connection.autocommit = True
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s", (test_database,)
            )
            if cursor.fetchone() is None:
                safe_name = test_database.replace('"', '""')
                cursor.execute(f'CREATE DATABASE "{safe_name}"')
    finally:
        connection.close()

    os.environ["DATABASE_URL"] = base_url.set(
        database=test_database
    ).render_as_string(hide_password=False)


_prepare_test_database()

from fastapi.testclient import TestClient  # noqa: E402

from app.core.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def reset_database():
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


_email_counter = count(1)


def _register_owner(client: TestClient, business_name: str | None = None):
    index = next(_email_counter)
    email = f"owner{index}-{uuid.uuid4().hex[:6]}@example.com"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": f"Owner {index}",
            "business_name": business_name or f"Toko Test {index}",
            "email": email,
            "password": "TestPassword123!",
        },
    )
    assert response.status_code == 200, response.text
    session = response.json()
    headers = {"Authorization": f"Bearer {session['access_token']}"}
    return session, headers


@pytest.fixture
def owner_factory(client):
    def _create(business_name: str | None = None):
        return _register_owner(client, business_name)

    return _create


@pytest.fixture
def product_factory(client):
    def _create(headers: dict, business_id: int, **overrides):
        payload = {
            "name": "Produk Test",
            "sku": None,
            "selling_price": "10000.00",
            "cost_price": "6000.00",
            "stock": 10,
            "low_stock_threshold": 3,
        }
        payload.update(overrides)
        response = client.post(
            f"/api/v1/businesses/{business_id}/products/",
            headers=headers,
            json=payload,
        )
        assert response.status_code == 200, response.text
        return response.json()

    return _create


@pytest.fixture
def checkout(client):
    def _checkout(headers: dict, business_id: int, payload: dict):
        return client.post(
            f"/api/v1/businesses/{business_id}/sales/checkout",
            headers=headers,
            json=payload,
        )

    return _checkout
