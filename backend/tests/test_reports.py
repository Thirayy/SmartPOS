from datetime import date, datetime

from app.core.database import SessionLocal
from app.sales.models import Sale


def _checkout(client, headers, business_id, product_id, key):
    response = client.post(
        f"/api/v1/businesses/{business_id}/sales/checkout",
        headers=headers,
        json={
            "payment_method": "CASH",
            "amount_received": "10000.00",
            "discount": "0.00",
            "idempotency_key": key,
            "items": [{"product_id": product_id, "quantity": 1}],
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def _create_expense(client, headers, business_id, amount, expense_date):
    response = client.post(
        f"/api/v1/businesses/{business_id}/expenses/",
        headers=headers,
        json={
            "category": "SUPPLIES",
            "amount": amount,
            "date": expense_date,
            "description": "Pengeluaran uji periode",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_dashboard_report_filters_sales_and_expenses_by_period(
    client, owner_factory, product_factory
):
    session, headers = owner_factory()
    business_id = session["business_id"]
    product = product_factory(
        headers,
        business_id,
        name="Kopi Filter",
        selling_price="10000.00",
        cost_price="6000.00",
        stock=10,
    )

    old_sale = _checkout(
        client, headers, business_id, product["id"], "period-old"
    )
    _checkout(client, headers, business_id, product["id"], "period-new")

    with SessionLocal() as db:
        db.query(Sale).filter(Sale.id == old_sale["id"]).update(
            {"created_at": datetime(2020, 1, 15, 10, 0, 0)}
        )
        db.commit()

    _create_expense(client, headers, business_id, "20000.00", "2020-01-10")
    _create_expense(
        client, headers, business_id, "5000.00", date.today().isoformat()
    )

    endpoint = f"/api/v1/businesses/{business_id}/reports/dashboard"

    all_time = client.get(endpoint, headers=headers)
    assert all_time.status_code == 200, all_time.text
    all_data = all_time.json()
    assert all_data["total_transactions"] == 2
    assert all_data["total_omzet"] == 20000.0
    assert all_data["total_expenses"] == 25000.0
    assert all_data["best_sellers"][0]["total_sold"] == 2
    assert all_data["start_date"] is None
    assert all_data["end_date"] is None

    period = client.get(
        endpoint,
        headers=headers,
        params={"start_date": "2020-01-01", "end_date": "2020-01-31"},
    )
    assert period.status_code == 200, period.text
    period_data = period.json()
    assert period_data["total_transactions"] == 1
    assert period_data["total_omzet"] == 10000.0
    assert period_data["total_cogs"] == 6000.0
    assert period_data["estimated_gross_profit"] == 4000.0
    assert period_data["total_expenses"] == 20000.0
    assert period_data["estimated_operating_result"] == -16000.0
    assert period_data["best_sellers"][0]["total_sold"] == 1
    assert period_data["start_date"] == "2020-01-01"
    assert period_data["end_date"] == "2020-01-31"

    empty = client.get(
        endpoint,
        headers=headers,
        params={"start_date": "2019-01-01", "end_date": "2019-12-31"},
    )
    assert empty.status_code == 200, empty.text
    assert empty.json()["total_transactions"] == 0
    assert empty.json()["total_expenses"] == 0.0


def test_dashboard_report_uses_configured_business_timezone(
    client, owner_factory, product_factory
):
    session, headers = owner_factory()
    business_id = session["business_id"]
    product = product_factory(
        headers,
        business_id,
        name="Kopi Zona Waktu",
        selling_price="10000.00",
        cost_price="6000.00",
        stock=10,
    )

    january_sale = _checkout(
        client, headers, business_id, product["id"], "timezone-january"
    )
    february_sale = _checkout(
        client, headers, business_id, product["id"], "timezone-february"
    )

    with SessionLocal() as db:
        db.query(Sale).filter(Sale.id == january_sale["id"]).update(
            {"created_at": datetime(2020, 1, 15, 10, 0, 0)}
        )
        db.query(Sale).filter(Sale.id == february_sale["id"]).update(
            {"created_at": datetime(2020, 1, 31, 18, 30, 0)}
        )
        db.commit()

    endpoint = f"/api/v1/businesses/{business_id}/reports/dashboard"

    january = client.get(
        endpoint,
        headers=headers,
        params={"start_date": "2020-01-01", "end_date": "2020-01-31"},
    )
    assert january.status_code == 200, january.text
    assert january.json()["total_transactions"] == 1
    assert january.json()["total_omzet"] == 10000.0

    february = client.get(
        endpoint,
        headers=headers,
        params={"start_date": "2020-02-01", "end_date": "2020-02-29"},
    )
    assert february.status_code == 200, february.text
    assert february.json()["total_transactions"] == 1
    assert february.json()["total_omzet"] == 10000.0


def test_dashboard_report_rejects_inverted_period(client, owner_factory):
    session, headers = owner_factory()
    business_id = session["business_id"]

    response = client.get(
        f"/api/v1/businesses/{business_id}/reports/dashboard",
        headers=headers,
        params={"start_date": "2020-02-01", "end_date": "2020-01-01"},
    )

    assert response.status_code == 400
    assert "Tanggal mulai" in response.json()["detail"]
