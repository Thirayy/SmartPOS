"""Seed data demo SmartPOS yang konsisten dan bisa diulang.

Jalankan dari mana saja:
    python backend/scripts/seed_demo.py --reset

Script ini hanya menyentuh data demo dengan email owner@demo.smartpos.id.
Data bisnis lain tidak dihapus.
"""

from __future__ import annotations

import argparse
import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from passlib.context import CryptContext  # noqa: E402

from app.auth.models import Session, User  # noqa: E402
from app.businesses.models import Business  # noqa: E402
from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.expenses.models import Expense  # noqa: E402
from app.products.models import InventoryMovement, Product  # noqa: E402
from app.sales.models import Sale, SaleItem  # noqa: E402

DEMO_EMAIL = "owner@demo.smartpos.id"
DEMO_PASSWORD = "DemoSmartPOS123!"
DEMO_NAME = "Owner Demo"
DEMO_BUSINESS_NAME = "Toko Demo SmartPOS"
DEMO_BUSINESS_CATEGORY = "Makanan & Minuman"
DEMO_BUSINESS_LOCATION = "Jakarta (data demo)"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_PRODUCTS = [
    {
        "name": "Kopi Susu Gula Aren",
        "sku": "KOPI-001",
        "cost_price": Decimal("10000.00"),
        "selling_price": Decimal("18000.00"),
        "stock": 40,
        "low_stock_threshold": 8,
    },
    {
        "name": "Es Teh Manis",
        "sku": "TEH-001",
        "cost_price": Decimal("3000.00"),
        "selling_price": Decimal("8000.00"),
        "stock": 80,
        "low_stock_threshold": 10,
    },
    {
        "name": "Roti Bakar Cokelat",
        "sku": "ROTI-001",
        "cost_price": Decimal("8000.00"),
        "selling_price": Decimal("15000.00"),
        "stock": 25,
        "low_stock_threshold": 5,
    },
    {
        "name": "Air Mineral 600 ml",
        "sku": "AIR-001",
        "cost_price": Decimal("2500.00"),
        "selling_price": Decimal("5000.00"),
        "stock": 100,
        "low_stock_threshold": 12,
    },
    {
        "name": "Keripik Singkong",
        "sku": "SNACK-001",
        "cost_price": Decimal("6000.00"),
        "selling_price": Decimal("12000.00"),
        "stock": 6,
        "low_stock_threshold": 6,
    },
    {
        "name": "Nasi Goreng Spesial",
        "sku": "NASI-001",
        "cost_price": Decimal("12000.00"),
        "selling_price": Decimal("22000.00"),
        "stock": 0,
        "low_stock_threshold": 5,
    },
]

DEMO_EXPENSES = [
    ("SUPPLIES", Decimal("20000.00"), "Bahan baku (1 hari lalu)", 1),
]


def find_demo_owner(db) -> User | None:
    return db.query(User).filter(User.email == DEMO_EMAIL).first()


def find_demo_business(db, owner: User) -> Business | None:
    return db.query(Business).filter(
        Business.owner_user_id == owner.id,
        Business.name == DEMO_BUSINESS_NAME,
    ).first()


def delete_demo_data(db, owner: User | None) -> None:
    if owner is None:
        return

    business_ids = [
        row[0]
        for row in db.query(Business.id).filter(Business.owner_user_id == owner.id).all()
    ]
    if business_ids:
        sale_ids = [
            row[0]
            for row in db.query(Sale.id).filter(Sale.business_id.in_(business_ids)).all()
        ]
        if sale_ids:
            db.query(SaleItem).filter(SaleItem.sale_id.in_(sale_ids)).delete(
                synchronize_session=False
            )
        db.query(Sale).filter(Sale.business_id.in_(business_ids)).delete(
            synchronize_session=False
        )
        db.query(InventoryMovement).filter(
            InventoryMovement.business_id.in_(business_ids)
        ).delete(synchronize_session=False)
        db.query(Product).filter(Product.business_id.in_(business_ids)).delete(
            synchronize_session=False
        )
        db.query(Expense).filter(Expense.business_id.in_(business_ids)).delete(
            synchronize_session=False
        )
        db.query(Business).filter(Business.id.in_(business_ids)).delete(
            synchronize_session=False
        )

    db.query(Session).filter(Session.user_id == owner.id).delete(synchronize_session=False)
    db.query(User).filter(User.id == owner.id).delete(synchronize_session=False)
    db.commit()


def seed(db) -> Business:
    owner = User(
        email=DEMO_EMAIL,
        password_hash=pwd_context.hash(DEMO_PASSWORD),
        full_name=DEMO_NAME,
        role="OWNER",
    )
    db.add(owner)
    db.flush()

    business = Business(
        owner_user_id=owner.id,
        name=DEMO_BUSINESS_NAME,
        category=DEMO_BUSINESS_CATEGORY,
        location=DEMO_BUSINESS_LOCATION,
    )
    db.add(business)
    db.flush()

    for item in DEMO_PRODUCTS:
        product = Product(business_id=business.id, **item)
        db.add(product)
        db.flush()

        if product.stock > 0:
            db.add(
                InventoryMovement(
                    product_id=product.id,
                    business_id=business.id,
                    movement_type="STOCK_IN",
                    quantity=product.stock,
                    reason="Initial Stock (demo)",
                    user_id=owner.id,
                )
            )

    today = date.today()
    for category, amount, description, days_ago in DEMO_EXPENSES:
        db.add(
            Expense(
                business_id=business.id,
                category=category,
                amount=amount,
                date=today - timedelta(days=days_ago),
                description=description,
                user_id=owner.id,
            )
        )

    db.commit()
    return business


def print_summary(db, business: Business) -> None:
    print("\nData demo siap.")
    print(f"  Bisnis   : {business.name} (business_id={business.id})")
    print(f"  Login    : {DEMO_EMAIL}")
    print(f"  Password : {DEMO_PASSWORD}")
    print("\nStok awal:")
    products = (
        db.query(Product)
        .filter(Product.business_id == business.id)
        .order_by(Product.id)
        .all()
    )
    for product in products:
        print(
            f"  - {product.name:<24} stok {product.stock:>3} "
            f"(SKU {product.sku or '-'})"
        )
    print("\nLangkah berikutnya:")
    print("  1. Jalankan backend : cd backend && ../venv/bin/uvicorn app.main:app --reload")
    print("  2. Jalankan frontend: cd frontend && npm run dev")
    print("  3. Buka http://localhost:3000/auth/login lalu masuk dengan akun di atas.")
    print("  4. Ikuti docs/DEMO.md.\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed data demo SmartPOS")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Hapus data demo lama lalu buat ulang dari nol.",
    )
    args = parser.parse_args()

    try:
        Base.metadata.create_all(bind=engine)
    except Exception as error:  # pragma: no cover - pesan setup
        print(f"Gagal terhubung ke database: {error}", file=sys.stderr)
        print(
            "Periksa DATABASE_URL di backend/.env dan pastikan PostgreSQL berjalan.",
            file=sys.stderr,
        )
        return 1

    db = SessionLocal()
    try:
        owner = find_demo_owner(db)
        existing_business = find_demo_business(db, owner) if owner else None

        if existing_business and not args.reset:
            print("Data demo sudah ada. Gunakan --reset untuk membuat ulang.")
            print_summary(db, existing_business)
            return 0

        if args.reset and (owner or existing_business):
            print("Menghapus data demo lama...")
            delete_demo_data(db, owner)

        business = seed(db)
        print_summary(db, business)
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
