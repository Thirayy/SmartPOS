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
