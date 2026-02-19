from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import datetime

app = FastAPI(title="Creaciones Rosa Elena API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class User(BaseModel):
    id: int
    email: str
    password: str
    role: str = "client"
    name: Optional[str] = ""

class ProductItem(BaseModel):
    id: int
    name: str
    price: float
    category: str
    image: Optional[str] = ""
    description: Optional[str] = ""
    stock: int = 10

class OrderItem(BaseModel):
    id: int
    name: str
    price: float
    quantity: int

class OrderRequest(BaseModel):
    user_id: Optional[int] = None
    customer_name: Optional[str] = "Invitado"
    items: List[OrderItem]
    total: float
    status: str = "procesando" # 'procesando', 'completado', 'cancelado'
    timestamp: Optional[str] = None
    payment_proof: Optional[str] = None

# --- Mock Databases ---
users_db = [
    {"id": 1, "email": "admin@rosa.com", "password": "admin", "role": "admin", "name": "Rosa Elena"},
    {"id": 2, "email": "cliente@test.com", "password": "user", "role": "client", "name": "Juan Pérez"}
]

products_db = [
    {
        "id": 1,
        "name": "Lazo Rosa Encanto",
        "category": "Lazos",
        "price": 3.50,
        "stock": 15,
        "image": "https://images.unsplash.com/photo-1590502120012-de59b563459e?q=80&w=400&auto=format&fit=crop",
        "description": "Hermoso lazo hecho a mano con cinta de raso premium."
    },
    {
        "id": 2,
        "name": "Piñata Estrella Pastel",
        "category": "Piñatas",
        "price": 15.00,
        "stock": 3,
        "image": "https://images.unsplash.com/photo-1620173834206-c029bf322dba?q=80&w=400&auto=format&fit=crop",
        "description": "Piñata personalizada en forma de estrella."
    },
    {
        "id": 3,
        "name": "Birrete Graduación Oro",
        "category": "Birretes",
        "price": 12.00,
        "stock": 0,
        "image": "https://images.unsplash.com/photo-1523050853023-8c2d2909f4d3?q=80&w=400&auto=format&fit=crop",
        "description": "Birrete decorado de lujo con detalles dorados."
    },
    {
        "id": 4,
        "name": "Set de Decoración Fiesta",
        "category": "Decoraciones",
        "price": 25.00,
        "stock": 20,
        "image": "https://images.unsplash.com/photo-1533294485618-f58a741ef0b2?q=80&w=400&auto=format&fit=crop",
        "description": "Kit completo de guirnaldas y flores de papel."
    }
]

orders_db = []

# --- Auth Endpoints ---
@app.post("/login")
async def login(credentials: dict = Body(...)):
    user = next((u for u in users_db if u["email"] == credentials.get("email") and u["password"] == credentials.get("password")), None)
    if not user: raise HTTPException(status_code=401, detail="Credenciales inválidas")
    return {"status": "success", "user": user}

@app.post("/register")
async def register(user: User):
    if any(u["email"] == user.email for u in users_db):
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    user_dict = user.dict()
    user_dict["id"] = len(users_db) + 1
    users_db.append(user_dict)
    return {"status": "success", "user": user_dict}

# --- Product Endpoints ---
@app.get("/products")
async def get_products():
    return products_db

@app.post("/admin/products")
async def add_product(product: ProductItem):
    product_dict = product.dict()
    product_dict["id"] = len(products_db) + 1
    products_db.append(product_dict)
    return {"status": "success", "product": product_dict}

@app.patch("/admin/products/{prod_id}")
async def update_stock(prod_id: int, stock: int = Body(embed=True)):
    product = next((p for p in products_db if p["id"] == prod_id), None)
    if not product: raise HTTPException(status_code=404, detail="Producto no encontrado")
    product["stock"] = stock
    return {"status": "success", "product": product}

# --- Order Endpoints ---
@app.post("/order")
async def create_order(order: OrderRequest):
    # Validation and Stock Deduction
    for item in order.items:
        product = next((p for p in products_db if p["id"] == item.id), None)
        if not product: raise HTTPException(status_code=404, detail=f"Producto {item.name} no encontrado")
        if product["stock"] < item.quantity:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {product['name']}")
        product["stock"] -= item.quantity

    order.timestamp = datetime.datetime.now().isoformat()
    order_data = order.dict()
    order_data["id"] = len(orders_db) + 1
    orders_db.append(order_data)
    return {"status": "success", "order_id": order_data["id"]}

@app.get("/user/orders/{user_id}")
async def get_user_orders(user_id: int):
    return [o for o in orders_db if o["user_id"] == user_id]

# --- Admin Stats & Control ---
@app.get("/admin/stats")
async def get_stats():
    total_sales = sum(o["total"] for o in orders_db if o["status"] == "completado")
    new_orders = len([o for o in orders_db if o["status"] == "procesando"])
    
    # Stock Alert Logic
    low_stock = [p["name"] for p in products_db if 0 < p["stock"] < 5]
    out_of_stock = [p["name"] for p in products_db if p["stock"] == 0]
    
    return {
        "totalSales": f"${total_sales:,.2f}",
        "newOrders": str(new_orders),
        "activeProducts": str(len(products_db)),
        "recentOrders": orders_db[-10:],
        "alerts": {
            "low": low_stock,
            "out": out_of_stock
        }
    }

@app.patch("/admin/orders/{order_id}")
async def update_order(order_id: int, update_data: dict = Body(...)):
    order = next((o for o in orders_db if o["id"] == order_id), None)
    if not order: raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    if "status" in update_data: order["status"] = update_data["status"]
    if "payment_proof" in update_data: order["payment_proof"] = update_data["payment_proof"]
    
    return {"status": "success", "order": order}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
