from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.products.models import Product, InventoryMovement
from app.products.schemas import ProductCreate, ProductResponse, StockAdjustment

router = APIRouter(prefix="/api/v1/businesses/{business_id}/products", tags=["Products"])

@router.post("/", response_model=ProductResponse)
def create_product(business_id: int, product: ProductCreate, db: Session = Depends(get_db)):
    db_product = Product(
        business_id=business_id,
        **product.dict()
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    # Catat initial stock-in movement jika ada stok awal
    if product.stock > 0:
        movement = InventoryMovement(
            product_id=db_product.id,
            business_id=business_id,
            movement_type="STOCK_IN",
            quantity=product.stock,
            reason="Initial Stock"
        )
        db.add(movement)
        db.commit()
        
    return db_product

@router.get("/", response_model=list[ProductResponse])
def list_products(business_id: int, db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.business_id == business_id, Product.is_active == True).all()

@router.post("/{product_id}/adjust", response_model=ProductResponse)
def adjust_stock(business_id: int, product_id: int, adj: StockAdjustment, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id, Product.business_id == business_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
        
    if adj.movement_type == "STOCK_IN":
        product.stock += adj.quantity
    elif adj.movement_type in ["STOCK_OUT", "ADJUSTMENT"]:
        if product.stock < adj.quantity and adj.movement_type == "STOCK_OUT":
            raise HTTPException(status_code=400, detail="Stok tidak mencukupi")
        product.stock = max(0, product.stock - adj.quantity)
        
    movement = InventoryMovement(
        product_id=product.id,
        business_id=business_id,
        movement_type=adj.movement_type,
        quantity=adj.quantity,
        reason=adj.reason
    )
    db.add(movement)
    db.commit()
    db.refresh(product)
    return product