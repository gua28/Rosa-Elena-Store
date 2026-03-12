from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String, default="client")
    name = Column(String, default="")
    phone = Column(String, default="")
    address = Column(String, default="")
    
    orders = relationship("Order", back_populates="user")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    price = Column(Float)
    category = Column(String)
    image = Column(String, default="")
    description = Column(String, default="")
    stock = Column(Integer, default=10)

    inventory_logs = relationship("InventoryLog", back_populates="product")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    customer_name = Column(String, default="Invitado")
    total = Column(Float)
    status = Column(String, default="procesando")
    timestamp = Column(String, default=datetime.datetime.now().isoformat())
    payment_proof = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)
    payment_reference = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    customer_address = Column(String, nullable=True)
    
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItemDB", back_populates="order")

class OrderItemDB(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_name = Column(String)
    product_id = Column(Integer)
    price = Column(Float)
    quantity = Column(Integer)
    
    order = relationship("Order", back_populates="items")

class InventoryLog(Base):
    __tablename__ = "inventory_logs"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    change_type = Column(String)  # 'sale', 'restock', 'manual', 'bulk_upload'
    quantity_changed = Column(Integer)
    previous_stock = Column(Integer)
    new_stock = Column(Integer)
    reason = Column(String, nullable=True)
    timestamp = Column(String, default=datetime.datetime.now().isoformat())
    
    product = relationship("Product", back_populates="inventory_logs")

class Setting(Base):
    __tablename__ = "settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(String)
