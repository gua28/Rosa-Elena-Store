import os
import shutil
import datetime
from typing import List, Optional

import google.generativeai as genai
from fastapi import FastAPI, HTTPException, Body, Depends, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from database import engine, get_db
from google.oauth2 import id_token
from google.auth.transport import requests
import secrets

# ==========================================
# CONFIGURACIÓN DE IA (GEMINI)
# ==========================================
import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY", "")

if GOOGLE_API_KEY and GOOGLE_API_KEY.strip() and GOOGLE_API_KEY != "tu_clave_aqui":
    genai.configure(api_key=GOOGLE_API_KEY)
    model_ai = genai.GenerativeModel('gemini-2.0-flash')
else:
    model_ai = None



# ==========================================
# MODELOS DE DATOS (PYDANTIC)
# ==========================================
class ChatMessage(BaseModel):
    role: str  # "user" o "bot"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class UserBase(BaseModel):
    email: str
    password: str
    role: str = "client"
    name: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""

class User(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ProductItemBase(BaseModel):
    name: str
    price: float
    category: str
    image: Optional[str] = ""
    description: Optional[str] = ""
    stock: int = 10

class ProductItem(ProductItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class OrderItem(BaseModel):
    id: int # productId
    name: str
    price: float
    quantity: int

class OrderRequest(BaseModel):
    user_id: Optional[int] = None
    customer_name: Optional[str] = "Invitado"
    customer_phone: Optional[str] = ""
    customer_address: Optional[str] = ""
    items: List[OrderItem]
    total: float
    status: str = "procesando"
    timestamp: Optional[str] = None
    payment_proof: Optional[str] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None

# ==========================================
# INICIALIZACIÓN DE APP Y DB
# ==========================================
models.Base.metadata.create_all(bind=engine)
os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="Creaciones Rosa Elena API")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    if "uploads" in request.url.path:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response

def init_db(db: Session):
    if db.query(models.User).count() == 0:
        # Developer / Technical Role
        db.add(models.User(email="soporte@rosa.com", password="admin123", role="admin", name="Soporte Técnico"))
        # Business Owner Role
        db.add(models.User(email="dueno@rosa.com", password="dueno123", role="owner", name="Dueño Rosa Elena"))
        # Test Client
        db.add(models.User(email="cliente@test.com", password="user123", role="client", name="Juan Pérez"))
        db.commit()

        db.commit()

    if db.query(models.Product).count() == 0:
        db.add_all([
            models.Product(name="Lazo Rosa Encanto", category="Lazos", price=3.50, stock=15, image="https://images.unsplash.com/photo-1590502120012-de59b563459e?q=80&w=400&auto=format&fit=crop", description="Hermoso lazo hecho a mano con cinta de raso premium."),
            models.Product(name="Piñata Estrella Pastel", category="Piñatas", price=15.00, stock=3, image="https://images.unsplash.com/photo-1620173834206-c029bf322dba?q=80&w=400&auto=format&fit=crop", description="Piñata personalizada en forma de estrella."),
            models.Product(name="Birrete Graduación Oro", category="Birretes", price=12.00, stock=0, image="https://images.unsplash.com/photo-1523050853023-8c2d2909f4d3?q=80&w=400&auto=format&fit=crop", description="Birrete decorado de lujo con detalles dorados."),
            models.Product(name="Set de Decoración Fiesta", category="Decoraciones", price=25.00, stock=20, image="https://images.unsplash.com/photo-1533294485618-f58a741ef0b2?q=80&w=400&auto=format&fit=crop", description="Kit completo de guirnaldas y flores de papel.")
        ])
        db.commit()

    # Default Settings
    default_settings = {
        "payment_movil_bank": "Banco Mercantil (0105)",
        "payment_movil_doc": "V-12.345.678",
        "payment_movil_phone": "0412-7827734",
        "payment_binance_id": "245678901",
        "payment_paypal_email": "rosaelena@email.com",
        "payment_paypal_url": "https://paypal.me/RosaElenaCreaciones",
        "contact_address": "Valencia, Venezuela",
        "contact_instagram": "@creacionesrosaelena",
        "contact_instagram_url": "https://instagram.com/creacionesrosaelena",
        "contact_gmail": "creacionesrosaelena@gmail.com",
        "contact_phone": "584127827734"
    }
    
    for key, value in default_settings.items():
        if not db.query(models.Setting).filter(models.Setting.key == key).first():
            db.add(models.Setting(key=key, value=value))
    db.commit()

@app.on_event("startup")
def startup_event():
    db = next(get_db())
    init_db(db)

# ==========================================
# ENDPOINT DEL CHATBOT INTELIGENTE
# ==========================================
@app.post("/chat")
async def chat_with_ia(request: ChatRequest, db: Session = Depends(get_db)):
    if not model_ai:
        return {"reply": "El asistente inteligente de Rosa Elena necesita ser configurado. Por favor, asegúrate de haber creado tu archivo `.env` en el backend con la clave `GEMINI_API_KEY=tu_clave_aqui`."}

    # 1. Consultamos el inventario real de la base de datos
    products = db.query(models.Product).all()
    inventory_context = ""
    for p in products:
        status = "Disponible" if p.stock > 0 else "SIN STOCK (Agotado)"
        inventory_context += f"- {p.name} ({p.category}): ${p.price}. Stock: {p.stock} ({status}). Desc: {p.description}\n"

    # 2. Definimos las instrucciones del sistema (La "personalidad" del bot)
    system_instruction = f"""
    Eres el asistente virtual avanzado de venta de 'Creaciones Rosa Elena'. Tu nombre es Rosa Bot.
    Tu objetivo es ser verdaderamente inteligente, llevar el hilo de la conversación de forma natural y persuasiva, y ayudar al cliente a tomar decisiones de compra basándote en el inventario real y responder a cualquier duda sobre tus productos.

    ¡NO USES RESPUESTAS ROBÓTICAS O PREPROGRAMADAS! Habla de forma conversacional, amena y carismática y MUY ÚTIL.
    Usa emojis con estilo sin saturar (✨🎀😊).
    Si un cliente duda entre dos opciones, recomiéndale según el stock.
    
    INFORMACIÓN DE PRODUCTOS EN TIEMPO REAL:
    {inventory_context}
    
    REGLAS ESTRICTAS DE INVENTARIO:
    - SIEMPRE verifica el stock antes de hablar de un producto.
    - Si algo está SIN STOCK ("Agotado"), díselo sutilmente y ofrece enseguida crearlo "Bajo pedido" 100% personalizado.
    - Anima constantemente a que si ya están decididos, presionen "Añadir al Carrito" en la tarjeta del producto, o si quieren algo muy específico, que usen el botón de "WhatsApp" que te programaron.
    """

    # 3. Formateamos el historial para Gemini
    gemini_history = []
    
    filtered_history = request.history
    # Gemini error if history doesn't start with User or has consecutive roles
    # We remove the initial "bot" greeting to fix this
    if filtered_history and filtered_history[0].role == "bot":
        filtered_history = filtered_history[1:]
        
    for msg in filtered_history:
        role = "user" if msg.role == "user" else "model"
        if gemini_history and gemini_history[-1]["role"] == role:
            # Append to the previous message to prevent consecutive role errors
            gemini_history[-1]["parts"][0] += f"\n{msg.content}"
        else:
            gemini_history.append({"role": role, "parts": [msg.content]})

    try:
        # Create an ephemeral model instance with the dynamic system instruction
        dynamic_model = genai.GenerativeModel('gemini-flash-lite-latest', system_instruction=system_instruction)
        
        # Iniciamos el chat con memoria usando la history filtrada
        chat_session = dynamic_model.start_chat(history=gemini_history)
        
        response = chat_session.send_message(request.message)
        
        return {"reply": response.text}
    except Exception as e:
        print(f"Error IA: {e}")
        return {"reply": "Uy, tuve un pequeño parpadeo procesando tantas ideas creativas para ti. 🎀 ¿Podrías repetirme tu consultita?"}
# ==========================================
# AUTH ENDPOINTS
# ==========================================
@app.post("/login")
async def login(credentials: dict = Body(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.email == credentials.get("email"),
        models.User.password == credentials.get("password")
    ).first()
    if not user: raise HTTPException(status_code=401, detail="Credenciales inválidas")
    return {"status": "success", "user": {"id": user.id, "email": user.email, "role": user.role, "name": user.name, "phone": user.phone, "address": user.address}}

@app.post("/register")
async def register(user: UserBase, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    new_user = models.User(email=user.email, password=user.password, role=user.role, name=user.name, phone=user.phone, address=user.address)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"status": "success", "user": {"id": new_user.id, "email": new_user.email, "role": new_user.role, "name": new_user.name, "phone": new_user.phone, "address": new_user.address}}

@app.post("/google-login")
async def google_login(data: dict = Body(...), db: Session = Depends(get_db)):
    token = data.get("token")
    client_id = os.getenv("GOOGLE_CLIENT_ID", "731998525046-3j0rvs1e8eb9v2m0j5c6p7v8p9q0r1s2.apps.googleusercontent.com")
    
    try:
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), client_id)
        email = idinfo['email']
        name = idinfo.get('name', '')
        
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if not user:
            # Create user if it doesn't exist
            user = models.User(
                email=email,
                password=secrets.token_urlsafe(16), # Random pass for safety
                name=name,
                role="client"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        return {
            "status": "success", 
            "user": {
                "id": user.id, 
                "email": user.email, 
                "role": user.role, 
                "name": user.name, 
                "phone": user.phone, 
                "address": user.address
            }
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Token de Google inválido")

# ==========================================
# PRODUCT ENDPOINTS
# ==========================================
@app.get("/products")
async def get_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    return [{"id": p.id, "name": p.name, "category": p.category, "price": p.price, "stock": p.stock, "image": p.image, "description": p.description} for p in products]

@app.post("/admin/products")
async def add_product(product: ProductItemBase, db: Session = Depends(get_db)):
    new_prod = models.Product(name=product.name, price=product.price, category=product.category, image=product.image, description=product.description, stock=product.stock)
    db.add(new_prod)
    db.commit()
    db.refresh(new_prod)
    return {"status": "success", "product": {"id": new_prod.id, "name": new_prod.name, "category": new_prod.category, "price": new_prod.price, "stock": new_prod.stock}}

@app.patch("/admin/products/{prod_id}")
async def update_stock(prod_id: int, stock: int = Body(embed=True), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == prod_id).first()
    if not product: raise HTTPException(status_code=404, detail="Producto no encontrado")
    prev_stock = product.stock
    product.stock = stock
    log_inventory_change(db, product.id, prev_stock, product.stock, "manual")
    db.commit()
    return {"status": "success"}

@app.put("/admin/products/{prod_id}")
async def update_product(prod_id: int, product: ProductItemBase, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == prod_id).first()
    if not db_product: raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    db_product.name = product.name
    db_product.price = product.price
    db_product.category = product.category
    db_product.image = product.image
    db_product.description = product.description
    db_product.stock = product.stock
    
    db.commit()
    db.refresh(db_product)
    return {"status": "success", "product": {"id": db_product.id, "name": db_product.name}}

@app.post("/admin/upload-image")
async def upload_image(file: UploadFile = File(...)):
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    new_filename = f"prod_{timestamp}.{file_extension}"
    file_location = f"uploads/{new_filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    return {"status": "success", "url": f"/uploads/{new_filename}"}

# ==========================================
# INVENTORY LOGGING
# ==========================================
def log_inventory_change(db: Session, product_id: int, previous_stock: int, new_stock: int, change_type: str, reason: str = None):
    log = models.InventoryLog(
        product_id=product_id, change_type=change_type, quantity_changed=new_stock - previous_stock,
        previous_stock=previous_stock, new_stock=new_stock, reason=reason,
        timestamp=datetime.datetime.now().isoformat()
    )
    db.add(log)

# ==========================================
# ORDER ENDPOINTS
# ==========================================
@app.post("/order")
async def create_order(order: OrderRequest, db: Session = Depends(get_db)):
    new_order = models.Order(
        user_id=order.user_id, customer_name=order.customer_name, customer_phone=order.customer_phone,
        customer_address=order.customer_address, total=order.total, status=order.status,
        timestamp=datetime.datetime.now().isoformat(), payment_proof=order.payment_proof,
        payment_method=order.payment_method, payment_reference=order.payment_reference
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    for item in order.items:
        product = db.query(models.Product).filter(models.Product.id == item.id).first()
        if not product or product.stock < item.quantity:
            db.delete(new_order)
            db.commit()
            raise HTTPException(status_code=400, detail=f"Problema con stock de {item.name}")
        
        prev_stock = product.stock
        product.stock -= item.quantity
        log_inventory_change(db, product.id, prev_stock, product.stock, "sale", f"Pedido #{new_order.id}")
        
        db.add(models.OrderItemDB(order_id=new_order.id, product_id=product.id, product_name=item.name, price=item.price, quantity=item.quantity))
    
    db.commit()
    return {"status": "success", "order_id": new_order.id}

@app.get("/user/orders/{user_id}")
async def get_user_orders(user_id: int, db: Session = Depends(get_db)):
    orders = db.query(models.Order).filter(models.Order.user_id == user_id).order_by(models.Order.id.desc()).all()
    result = []
    for order in orders:
        items = [{"id": i.product_id, "name": i.product_name, "price": i.price, "quantity": i.quantity} for i in order.items]
        result.append({
            "id": order.id,
            "total": order.total,
            "status": order.status,
            "timestamp": order.timestamp,
            "items": items,
            "payment_proof": order.payment_proof,
            "payment_method": order.payment_method,
            "payment_reference": order.payment_reference,
            "customer_phone": order.customer_phone,
            "customer_address": order.customer_address
        })
    return result

@app.get("/admin/stats")
async def get_stats(db: Session = Depends(get_db)):
    total_sales = db.query(func.sum(models.Order.total)).filter(models.Order.status == "completado").scalar() or 0
    active_products = db.query(func.count(models.Product.id)).scalar() or 0
    
    orders = db.query(models.Order).order_by(models.Order.id.desc()).all()
    recent_orders = []
    
    for order in orders:
        items = [{"id": i.product_id, "name": i.product_name, "price": i.price, "quantity": i.quantity} for i in order.items]
        recent_orders.append({
            "id": order.id,
            "user_id": order.user_id,
            "customer_name": order.customer_name,
            "customer_phone": order.customer_phone,
            "customer_address": order.customer_address,
            "total": order.total,
            "status": order.status,
            "timestamp": order.timestamp,
            "items": items,
            "payment_proof": order.payment_proof,
            "payment_method": order.payment_method,
            "payment_reference": order.payment_reference,
            "customer_phone": order.customer_phone,
            "customer_address": order.customer_address
        })
        
    return {
        "totalSales": f"${total_sales:,.2f}",
        "activeProducts": str(active_products),
        "recentOrders": recent_orders
    }

@app.patch("/admin/orders/{order_id}")
async def update_order(order_id: int, update_data: dict = Body(...), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    if "status" in update_data:
        order.status = update_data["status"]
    if "payment_proof" in update_data:
        order.payment_proof = update_data["payment_proof"]
    if "payment_method" in update_data:
        order.payment_method = update_data["payment_method"]
    if "payment_reference" in update_data:
        order.payment_reference = update_data["payment_reference"]
        
    db.commit()
    db.refresh(order)
    return {"status": "success"}

@app.delete("/admin/orders/{order_id}")
async def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
        
    # Eliminar ítems relacionados
    db.query(models.OrderItemDB).filter(models.OrderItemDB.order_id == order_id).delete()
    
    db.delete(order)
    db.commit()
    return {"status": "success"}

@app.patch("/order/{order_id}/report-payment")
async def report_payment(order_id: int, report: dict = Body(...), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    order.payment_proof = report.get("payment_proof")
    order.payment_method = report.get("payment_method")
    order.payment_reference = report.get("payment_reference")
    order.status = "pagado_pendiente_revision"
    
    db.commit()
    return {"status": "success"}

@app.get("/admin/inventory/history")
async def get_inventory_history(db: Session = Depends(get_db)):
    logs = db.query(models.InventoryLog).order_by(models.InventoryLog.id.desc()).limit(150).all()
    
    return [{
        "id": log.id,
        "product_id": log.product_id,
        "product_name": log.product.name if log.product else "Desconocido",
        "change_type": log.change_type,
        "quantity_changed": log.quantity_changed,
        "previous_stock": log.previous_stock,
        "new_stock": log.new_stock,
        "reason": log.reason,
        "timestamp": log.timestamp
    } for log in logs]

@app.get("/admin/inventory/report")
async def get_inventory_report(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    total_items = sum([p.stock for p in products])
    total_value = sum([p.stock * p.price for p in products])
    
    category_summary = {}
    for p in products:
        if p.category not in category_summary:
            category_summary[p.category] = {"count": 0, "value": 0}
        category_summary[p.category]["count"] += p.stock
        category_summary[p.category]["value"] += p.stock * p.price

    low_stock = [{"id": p.id, "name": p.name, "stock": p.stock} for p in products if 0 < p.stock <= 5]
    out_of_stock = [{"id": p.id, "name": p.name, "stock": p.stock} for p in products if p.stock == 0]
    
    return {
        "totalItems": total_items,
        "totalValue": total_value,
        "lowStock": low_stock,
        "outOfStock": out_of_stock,
        "categorySummary": category_summary
    }

@app.post("/admin/inventory/bulk-load")
async def bulk_load_inventory(bulk_data: List[dict] = Body(...), db: Session = Depends(get_db)):
    updated = []
    for item in bulk_data:
        product_id = item.get("id")
        quantity_change = item.get("quantity", 0)
        reason = item.get("reason", "Carga masiva")

        product = db.query(models.Product).filter(models.Product.id == product_id).first()
        if not product:
            continue

        prev_stock = product.stock
        new_stock = max(0, prev_stock + quantity_change)
        product.stock = new_stock

        log_inventory_change(
            db, product.id, prev_stock, new_stock,
            "bulk_upload", reason
        )
        updated.append({"id": product.id, "name": product.name, "new_stock": new_stock})

    db.commit()
    return {"status": "success", "updated": len(updated), "details": updated}

# ==========================================
# SETTINGS ENDPOINTS
# ==========================================
@app.get("/settings")
async def get_settings(db: Session = Depends(get_db)):
    settings = db.query(models.Setting).all()
    return {s.key: s.value for s in settings}

@app.patch("/admin/settings")
async def update_settings(updates: dict = Body(...), db: Session = Depends(get_db)):
    for key, value in updates.items():
        setting = db.query(models.Setting).filter(models.Setting.key == key).first()
        if setting:
            setting.value = str(value)
        else:
            db.add(models.Setting(key=key, value=str(value)))
    db.commit()
    return {"status": "success"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)