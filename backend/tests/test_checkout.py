from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal

from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.main import app
from app.products.models import InventoryMovement, Product
from app.sales.models import Sale


def as_decimal(value) -> Decimal:
    return Decimal(str(value))


def get_products(client, headers, business_id):
    response = client.get(
        f"/api/v1/businesses/{business_id}/products", headers=headers
    )
    assert response.status_code == 200, response.text
    return response.json()


def get_sales(client, headers, business_id):
    response = client.get(
        f"/api/v1/businesses/{business_id}/sales", headers=headers
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_checkout_success_reduces_stock_and_records_sale(
    client, owner_factory, product_factory, checkout
):
    session, headers = owner_factory()
    business_id = session["business_id"]
    product = product_factory(
        headers,
        business_id,
        name="Kopi Susu",
        sku="KOPI-001",
        selling_price="18000.00",
        cost_price="10000.00",
        stock=10,
    )

    response = checkout(
        headers,
        business_id,
        {
            "payment_method": "CASH",
            "amount_received": "50000.00",
            "discount": "0.00",
            "items": [{"product_id": product["id"], "quantity": 2}],
        },
    )

    assert response.status_code == 200, response.text
    sale = response.json()
    assert sale["transaction_number"].startswith("TRX-")
    assert as_decimal(sale["total_amount"]) == Decimal("36000.00")
    assert as_decimal(sale["change_amount"]) == Decimal("14000.00")
    assert sale["payment_method"] == "CASH"
    assert sale["status"] == "COMPLETED"
    assert sale["items"][0]["product_name"] == "Kopi Susu"
    assert sale["items"][0]["quantity"] == 2

    products = get_products(client, headers, business_id)
    assert products[0]["stock"] == 8

    sales = get_sales(client, headers, business_id)
    assert len(sales) == 1
    assert sales[0]["transaction_number"] == sale["transaction_number"]

    with SessionLocal() as db:
        movements = (
            db.query(InventoryMovement)
            .filter(
                InventoryMovement.business_id == business_id,
                InventoryMovement.movement_type == "SALE",
            )
            .all()
        )
        assert len(movements) == 1
        assert movements[0].quantity == 2
        assert movements[0].reference_sale_id == sale["id"]
        assert movements[0].user_id == session["user_id"]


def test_checkout_rejects_insufficient_stock_without_changing_data(
    client, owner_factory, product_factory, checkout
):
    session, headers = owner_factory()
    business_id = session["business_id"]
    product = product_factory(headers, business_id, name="Terakhir", stock=1)

    response = checkout(
        headers,
        business_id,
        {
            "payment_method": "CASH",
            "amount_received": "50000.00",
            "discount": "0.00",
            "items": [{"product_id": product["id"], "quantity": 2}],
        },
    )

    assert response.status_code == 400
    assert "tidak mencukupi" in response.json()["detail"]

    assert get_products(client, headers, business_id)[0]["stock"] == 1
    assert get_sales(client, headers, business_id) == []

    with SessionLocal() as db:
        assert (
            db.query(InventoryMovement)
            .filter(InventoryMovement.business_id == business_id)
            .count()
            == 1  # hanya mutasi STOCK_IN dari stok awal
        )


def test_checkout_rejects_inactive_product(
    client, owner_factory, product_factory, checkout
):
    session, headers = owner_factory()
    business_id = session["business_id"]
    product = product_factory(headers, business_id, name="Produk Lama", stock=5)

    with SessionLocal() as db:
        db.query(Product).filter(Product.id == product["id"]).update(
            {"is_active": False}
        )
        db.commit()

    response = checkout(
        headers,
        business_id,
        {
            "payment_method": "CASH",
            "amount_received": "20000.00",
            "discount": "0.00",
            "items": [{"product_id": product["id"], "quantity": 1}],
        },
    )

    assert response.status_code == 400
    assert "tidak aktif" in response.json()["detail"]

    with SessionLocal() as db:
        assert db.query(Product).filter(Product.id == product["id"]).one().stock == 5


def test_checkout_is_idempotent_for_same_key(
    client, owner_factory, product_factory, checkout
):
    session, headers = owner_factory()
    business_id = session["business_id"]
    product = product_factory(headers, business_id, name="Es Teh", stock=10)

    payload = {
        "payment_method": "CASH",
        "amount_received": "20000.00",
        "discount": "0.00",
        "idempotency_key": "demo-double-001",
        "items": [{"product_id": product["id"], "quantity": 2}],
    }

    first = checkout(headers, business_id, payload)
    second = checkout(headers, business_id, payload)

    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    assert first.json()["id"] == second.json()["id"]
    assert (
        first.json()["transaction_number"]
        == second.json()["transaction_number"]
    )

    assert get_products(client, headers, business_id)[0]["stock"] == 8
    assert len(get_sales(client, headers, business_id)) == 1

    with SessionLocal() as db:
        assert (
            db.query(Sale).filter(Sale.business_id == business_id).count() == 1
        )
        movements = (
            db.query(InventoryMovement)
            .filter(
                InventoryMovement.business_id == business_id,
                InventoryMovement.movement_type == "SALE",
            )
            .all()
        )
        assert len(movements) == 1
        assert movements[0].quantity == 2


def test_two_concurrent_checkouts_cannot_sell_last_stock(
    client, owner_factory, product_factory
):
    session, headers = owner_factory()
    business_id = session["business_id"]
    product = product_factory(
        headers, business_id, name="Stok Terakhir", stock=1
    )

    def attempt_checkout(key: str):
        thread_client = TestClient(app)
        try:
            return thread_client.post(
                f"/api/v1/businesses/{business_id}/sales/checkout",
                headers=headers,
                json={
                    "payment_method": "CASH",
                    "amount_received": "20000.00",
                    "discount": "0.00",
                    "idempotency_key": key,
                    "items": [{"product_id": product["id"], "quantity": 1}],
                },
            )
        finally:
            thread_client.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(attempt_checkout, ["race-a", "race-b"]))

    statuses = sorted(response.status_code for response in responses)
    assert statuses == [200, 400], [response.text for response in responses]

    failed = next(response for response in responses if response.status_code == 400)
    assert "tidak mencukupi" in failed.json()["detail"]

    assert get_products(client, headers, business_id)[0]["stock"] == 0
    assert len(get_sales(client, headers, business_id)) == 1

    with SessionLocal() as db:
        movements = (
            db.query(InventoryMovement)
            .filter(
                InventoryMovement.business_id == business_id,
                InventoryMovement.movement_type == "SALE",
            )
            .all()
        )
        assert len(movements) == 1
        assert movements[0].quantity == 1


def test_checkout_rejects_discount_above_subtotal(
    client, owner_factory, product_factory, checkout
):
    session, headers = owner_factory()
    business_id = session["business_id"]
    product = product_factory(
        headers, business_id, name="Roti", selling_price="10000.00", stock=5
    )

    response = checkout(
        headers,
        business_id,
        {
            "payment_method": "CASH",
            "amount_received": "10000.00",
            "discount": "15000.00",
            "items": [{"product_id": product["id"], "quantity": 1}],
        },
    )

    assert response.status_code == 400
    assert "Diskon" in response.json()["detail"]
    assert get_sales(client, headers, business_id) == []


def test_checkout_rejects_empty_cart_and_invalid_quantity(
    client, owner_factory, product_factory, checkout
):
    session, headers = owner_factory()
    business_id = session["business_id"]
    product = product_factory(headers, business_id, stock=5)

    empty_response = checkout(
        headers,
        business_id,
        {
            "payment_method": "CASH",
            "amount_received": "10000.00",
            "discount": "0.00",
            "items": [],
        },
    )
    assert empty_response.status_code == 422

    zero_quantity_response = checkout(
        headers,
        business_id,
        {
            "payment_method": "CASH",
            "amount_received": "10000.00",
            "discount": "0.00",
            "items": [{"product_id": product["id"], "quantity": 0}],
        },
    )
    assert zero_quantity_response.status_code == 422

    assert get_sales(client, headers, business_id) == []
    assert get_products(client, headers, business_id)[0]["stock"] == 5


def _create_member_and_login(
    client, owner_headers, business_id, *, role, email, full_name
):
    response = client.post(
        f"/api/v1/businesses/{business_id}/members/",
        headers=owner_headers,
        json={
            "email": email,
            "full_name": full_name,
            "password": "MemberPassword123!",
            "role": role,
        },
    )
    assert response.status_code == 200, response.text

    login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "MemberPassword123!"},
    )
    assert login.status_code == 200, login.text
    session = login.json()
    return session, {"Authorization": f"Bearer {session['access_token']}"}


def _open_shift(client, headers, business_id, opening_cash="100000.00"):
    response = client.post(
        f"/api/v1/businesses/{business_id}/shifts/open",
        headers=headers,
        json={"opening_cash": opening_cash},
    )
    assert response.status_code == 200, response.text
    return response.json()


def _close_shift(client, headers, business_id, shift_id, actual_cash):
    response = client.post(
        f"/api/v1/businesses/{business_id}/shifts/{shift_id}/close",
        headers=headers,
        json={"actual_cash": actual_cash},
    )
    assert response.status_code == 200, response.text
    return response.json()


def _checkout_payload(product_id, *, amount_received="20000.00", key=None):
    payload = {
        "payment_method": "CASH",
        "amount_received": amount_received,
        "discount": "0.00",
        "items": [{"product_id": product_id, "quantity": 2}],
    }
    if key:
        payload["idempotency_key"] = key
    return payload


def test_cashier_checkout_requires_open_shift(
    client, owner_factory, product_factory, checkout
):
    owner_session, owner_headers = owner_factory()
    business_id = owner_session["business_id"]
    product = product_factory(headers=owner_headers, business_id=business_id, stock=5)
    _, cashier_headers = _create_member_and_login(
        client,
        owner_headers,
        business_id,
        role="CASHIER",
        email="cashier-no-shift@example.com",
        full_name="Kasir Tanpa Shift",
    )

    response = checkout(
        cashier_headers,
        business_id,
        _checkout_payload(product["id"]),
    )

    assert response.status_code == 400
    assert "shift" in response.json()["detail"].lower()
    assert get_sales(client, owner_headers, business_id) == []
    assert get_products(client, owner_headers, business_id)[0]["stock"] == 5


def test_cashier_can_checkout_after_opening_shift(
    client, owner_factory, product_factory, checkout
):
    owner_session, owner_headers = owner_factory()
    business_id = owner_session["business_id"]
    product = product_factory(headers=owner_headers, business_id=business_id, stock=5)
    _, cashier_headers = _create_member_and_login(
        client,
        owner_headers,
        business_id,
        role="CASHIER",
        email="cashier-with-shift@example.com",
        full_name="Kasir Shift",
    )
    shift = _open_shift(client, cashier_headers, business_id)

    response = checkout(
        cashier_headers,
        business_id,
        _checkout_payload(product["id"]),
    )

    assert response.status_code == 200, response.text
    assert as_decimal(response.json()["total_amount"]) == Decimal("20000.00")

    active = client.get(
        f"/api/v1/businesses/{business_id}/shifts/active",
        headers=cashier_headers,
    )
    assert active.status_code == 200
    shift_summary = active.json()
    assert shift_summary["id"] == shift["id"]
    assert as_decimal(shift_summary["expected_cash"]) == Decimal("120000.00")
    assert as_decimal(shift_summary["total_cash_sales"]) == Decimal("20000.00")
    assert shift_summary["total_transactions"] == 1

    closed = _close_shift(
        client,
        cashier_headers,
        business_id,
        shift["id"],
        "120000.00",
    )
    assert as_decimal(closed["expected_cash"]) == Decimal("120000.00")
    assert as_decimal(closed["actual_cash"]) == Decimal("120000.00")
    assert as_decimal(closed["difference"]) == Decimal("0.00")
    assert get_products(client, owner_headers, business_id)[0]["stock"] == 3


def test_manager_can_checkout_without_open_shift(
    client, owner_factory, product_factory, checkout
):
    owner_session, owner_headers = owner_factory()
    business_id = owner_session["business_id"]
    product = product_factory(headers=owner_headers, business_id=business_id, stock=5)
    _, manager_headers = _create_member_and_login(
        client,
        owner_headers,
        business_id,
        role="MANAGER",
        email="manager-no-shift@example.com",
        full_name="Manajer Tanpa Shift",
    )

    response = checkout(
        manager_headers,
        business_id,
        _checkout_payload(product["id"]),
    )

    assert response.status_code == 200, response.text
    assert get_products(client, owner_headers, business_id)[0]["stock"] == 3


def test_cashier_idempotent_checkout_replays_after_shift_closed(
    client, owner_factory, product_factory, checkout
):
    owner_session, owner_headers = owner_factory()
    business_id = owner_session["business_id"]
    product = product_factory(headers=owner_headers, business_id=business_id, stock=5)
    _, cashier_headers = _create_member_and_login(
        client,
        owner_headers,
        business_id,
        role="CASHIER",
        email="cashier-idempotent@example.com",
        full_name="Kasir Idempoten",
    )
    shift = _open_shift(client, cashier_headers, business_id)
    payload = _checkout_payload(product["id"], key="cashier-shift-replay")

    first = checkout(cashier_headers, business_id, payload)
    assert first.status_code == 200, first.text

    _close_shift(
        client,
        cashier_headers,
        business_id,
        shift["id"],
        "120000.00",
    )

    replay = checkout(cashier_headers, business_id, payload)
    assert replay.status_code == 200, replay.text
    assert replay.json()["id"] == first.json()["id"]

    new_transaction = checkout(
        cashier_headers,
        business_id,
        _checkout_payload(product["id"], key="cashier-after-close"),
    )
    assert new_transaction.status_code == 400
    assert "shift" in new_transaction.json()["detail"].lower()
