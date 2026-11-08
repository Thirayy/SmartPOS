from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.audit.service import record_audit, snapshot
from app.auth.dependencies import (
    authorize_business_access,
    get_current_user,
    require_roles,
)
from app.auth.models import User
from app.core.database import get_db
from app.products.models import InventoryMovement, Product
from app.products.schemas import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    StockAdjustment,
)

router = APIRouter(
    prefix="/businesses/{business_id}/products",
    tags=["Products"],
    dependencies=[Depends(authorize_business_access)],
)

PRODUCT_AUDIT_FIELDS = (
    "name",
    "sku",
    "selling_price",
    "cost_price",
    "stock",
    "low_stock_threshold",
    "is_active",
)


@router.post(
    "/",
    response_model=ProductResponse,
    dependencies=[Depends(require_roles("OWNER", "MANAGER"))],
)
def create_product(
    business_id: int,
    product: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_product = Product(business_id=business_id, **product.model_dump())
    db.add(db_product)
    db.flush()

    if product.stock > 0:
        db.add(
            InventoryMovement(
                product_id=db_product.id,
                business_id=business_id,
                movement_type="STOCK_IN",
                quantity=product.stock,
                reason="Initial Stock",
                user_id=current_user.id,
            )
        )

    record_audit(
        db,
        business_id=business_id,
        user_id=current_user.id,
        action="CREATE",
        entity_type="PRODUCT",
        entity_id=db_product.id,
        description=f"Menambahkan produk {db_product.name}",
        after_data=snapshot(db_product, PRODUCT_AUDIT_FIELDS),
    )
    db.commit()
    db.refresh(db_product)
    return db_product


@router.get("/", response_model=list[ProductResponse])
def list_products(business_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Product)
        .filter(Product.business_id == business_id, Product.is_active.is_(True))
        .all()
    )


@router.patch(
    "/{product_id}",
    response_model=ProductResponse,
    dependencies=[Depends(require_roles("OWNER", "MANAGER"))],
)
def update_product(
    business_id: int,
    product_id: int,
    payload: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.business_id == business_id)
        .first()
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")

    before = snapshot(product, PRODUCT_AUDIT_FIELDS)
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(product, field, value)

    record_audit(
        db,
        business_id=business_id,
        user_id=current_user.id,
        action="UPDATE",
        entity_type="PRODUCT",
        entity_id=product.id,
        description=f"Mengubah produk {product.name}",
        before_data=before,
        after_data=snapshot(product, PRODUCT_AUDIT_FIELDS),
    )
    db.commit()
    db.refresh(product)
    return product


@router.delete(
    "/{product_id}",
    response_model=ProductResponse,
    dependencies=[Depends(require_roles("OWNER", "MANAGER"))],
)
def deactivate_product(
    business_id: int,
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.business_id == business_id)
        .first()
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    if not product.is_active:
        return product

    before = snapshot(product, PRODUCT_AUDIT_FIELDS)
    product.is_active = False
    record_audit(
        db,
        business_id=business_id,
        user_id=current_user.id,
        action="DEACTIVATE",
        entity_type="PRODUCT",
        entity_id=product.id,
        description=f"Menonaktifkan produk {product.name}",
        before_data=before,
        after_data=snapshot(product, PRODUCT_AUDIT_FIELDS),
    )
    db.commit()
    db.refresh(product)
    return product


@router.post(
    "/{product_id}/adjust",
    response_model=ProductResponse,
    dependencies=[Depends(require_roles("OWNER", "MANAGER"))],
)
def adjust_stock(
    business_id: int,
    product_id: int,
    adj: StockAdjustment,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.business_id == business_id)
        .first()
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")

    before = snapshot(product, PRODUCT_AUDIT_FIELDS)

    if adj.movement_type == "STOCK_IN":
        product.stock += adj.quantity
    elif adj.movement_type == "STOCK_OUT":
        if product.stock < adj.quantity:
            raise HTTPException(status_code=400, detail="Stok tidak mencukupi")
        product.stock -= adj.quantity
    else:
        if product.stock < adj.quantity:
            raise HTTPException(
                status_code=400,
                detail="Stok tidak mencukupi untuk penyesuaian",
            )
        product.stock -= adj.quantity

    db.add(
        InventoryMovement(
            product_id=product.id,
            business_id=business_id,
            movement_type=adj.movement_type,
            quantity=adj.quantity,
            reason=adj.reason,
            user_id=current_user.id,
        )
    )
    record_audit(
        db,
        business_id=business_id,
        user_id=current_user.id,
        action="STOCK_ADJUST",
        entity_type="PRODUCT",
        entity_id=product.id,
        description=f"Penyesuaian stok {product.name} ({adj.movement_type})",
        before_data=before,
        after_data=snapshot(product, PRODUCT_AUDIT_FIELDS),
    )
    db.commit()
    db.refresh(product)
    return product
