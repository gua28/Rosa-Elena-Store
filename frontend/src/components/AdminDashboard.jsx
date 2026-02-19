import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Package, ShoppingCart, LogOut, Search,
    Plus, Edit2, Check, X, AlertTriangle, FileText,
    Upload, Trash2, Eye, TrendingUp, Users, Box,
    ChevronRight, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('stats');
    const [stats, setStats] = useState({ totalSales: '$0.00', newOrders: '0', activeProducts: '0', recentOrders: [], alerts: { low: [], out: [] } });
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, prodRes] = await Promise.all([
                fetch('http://localhost:8000/admin/stats'),
                fetch('http://localhost:8000/products')
            ]);
            setStats(await statsRes.json());
            setProducts(await prodRes.json());
        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStock = async (id, newStock) => {
        try {
            await fetch(`http://localhost:8000/admin/products/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock: newStock })
            });
            fetchData();
        } catch (error) {
            console.error('Error updating stock:', error);
        }
    };

    const handleUpdateOrderStatus = async (id, updates) => {
        try {
            await fetch(`http://localhost:8000/admin/orders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            fetchData();
            setSelectedOrder(prev => prev ? { ...prev, ...updates } : null);
        } catch (error) {
            console.error('Error updating order:', error);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productData = {
            id: 0,
            name: formData.get('name'),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            stock: parseInt(formData.get('stock')),
            image: formData.get('image'),
            description: formData.get('description')
        };

        try {
            await fetch('http://localhost:8000/admin/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
            setIsProductModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error adding product:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F2F5] flex font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-gray-900 text-white p-8 flex flex-col fixed h-full z-20">
                <div className="flex items-center gap-3 mb-12">
                    <div className="p-2 bg-primary rounded-xl">
                        <Package className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-xl font-black tracking-tight">Rosa Elena <span className="text-primary text-xs block uppercase tracking-widest font-bold">Admin Panel</span></h1>
                </div>

                <nav className="space-y-2 flex-grow">
                    <SidebarItem icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
                    <SidebarItem icon={<Box />} label="Inventario" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
                    <SidebarItem icon={<ShoppingCart />} label="Pedidos" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
                </nav>

                <button onClick={onLogout} className="mt-auto flex items-center gap-3 p-4 text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                    <LogOut className="h-5 w-5" />
                    <span className="font-bold">Cerrar Sesión</span>
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-grow ml-72 p-10">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center text-gray-400">Cargando panel...</div>
                ) : (
                    <>
                        {activeTab === 'stats' && <StatsView stats={stats} onDetail={(order) => { setActiveTab('orders'); setSelectedOrder(order); }} />}
                        {activeTab === 'inventory' && <InventoryView products={products} onUpdateStock={handleUpdateStock} onAdd={() => setIsProductModalOpen(true)} />}
                        {activeTab === 'orders' && <OrdersView orders={stats.recentOrders} onSelect={setSelectedOrder} />}
                    </>
                )}
            </main>

            {/* Order Receipt Modal */}
            <AnimatePresence>
                {selectedOrder && (
                    <OrderModal
                        order={selectedOrder}
                        onClose={() => setSelectedOrder(null)}
                        onUpdateStatus={handleUpdateOrderStatus}
                    />
                )}
            </AnimatePresence>

            {/* Product Modal */}
            <AnimatePresence>
                {isProductModalOpen && (
                    <ProductModal
                        onClose={() => setIsProductModalOpen(false)}
                        onSubmit={handleAddProduct}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Sub-components ---

const SidebarItem = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 font-bold ${active ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-400 hover:bg-white/5'
            }`}
    >
        {React.cloneElement(icon, { className: 'h-5 w-5' })}
        <span>{label}</span>
    </button>
);

const StatsView = ({ stats, onDetail }) => (
    <div className="space-y-10">
        <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-gray-900">Resumen General</h2>
            <div className="bg-white px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2 text-sm font-bold text-gray-500">
                {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <MetricCard icon={<TrendingUp />} label="Ventas Totales" value={stats.totalSales} color="bg-emerald-500" />
            <MetricCard icon={<ShoppingCart />} label="Pedidos Pendientes" value={stats.newOrders} color="bg-primary" />
            <MetricCard icon={<Box />} label="Productos Activos" value={stats.activeProducts} color="bg-slate-800" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Alerts */}
            <div className="glass p-8 rounded-[2.5rem] bg-white shadow-sm border-white">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <AlertTriangle className="text-amber-500 h-6 w-6" /> Alertas de Inventario
                </h3>
                <div className="space-y-4">
                    {stats.alerts.out.map((name, i) => (
                        <div key={i} className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-center justify-between font-bold text-sm">
                            <span>{name} AGOTADO</span>
                            <span className="bg-red-200 px-2 py-1 rounded-lg text-[10px] uppercase">URGENTE: Reponer</span>
                        </div>
                    ))}
                    {stats.alerts.low.map((name, i) => (
                        <div key={i} className="p-4 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-between font-bold text-sm">
                            <span>{name} por agotar</span>
                            <span className="text-[10px] uppercase underline">Ver en inventario</span>
                        </div>
                    ))}
                    {stats.alerts.out.length === 0 && stats.alerts.low.length === 0 && (
                        <p className="text-center py-10 text-gray-400">No hay alertas pendientes</p>
                    )}
                </div>
            </div>

            {/* Recent Orders List */}
            <div className="glass p-8 rounded-[2.5rem] bg-white shadow-sm border-white">
                <h3 className="text-xl font-bold mb-6">Pedidos Recientes</h3>
                <div className="space-y-3">
                    {stats.recentOrders.map(order => (
                        <button key={order.id} onClick={() => onDetail(order)} className="w-full p-4 bg-gray-50 rounded-2xl flex items-center justify-between hover:bg-gray-100 transition-all border border-transparent hover:border-primary/20">
                            <div className="text-left">
                                <span className="text-xs font-bold text-gray-400 block tracking-widest uppercase">#{order.id}</span>
                                <span className="font-bold text-gray-800">{order.customer_name}</span>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-primary block">${order.total.toFixed(2)}</span>
                                <span className={`text-[10px] uppercase font-black ${order.status === 'completado' ? 'text-emerald-500' : 'text-primary'}`}>{order.status}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const MetricCard = ({ icon, label, value, color }) => (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6 relative overflow-hidden group">
        <div className={`p-5 rounded-2xl text-white ${color} relative z-10 shadow-lg`}>
            {React.cloneElement(icon, { className: 'h-8 w-8' })}
        </div>
        <div className="relative z-10">
            <p className="text-gray-500 font-bold text-sm uppercase tracking-wider mb-1">{label}</p>
            <p className="text-4xl font-black text-gray-900">{value}</p>
        </div>
        <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-[0.03] rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`}></div>
    </div>
);

const InventoryView = ({ products, onUpdateStock, onAdd }) => (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-gray-900">Gestión de Inventario</h2>
            <button onClick={onAdd} className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all">
                <Plus className="h-5 w-5" /> Nuevo Producto
            </button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-white">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Producto</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Stock</th>
                        <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {products.map(prod => (
                        <tr key={prod.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                    <img src={prod.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
                                    <div>
                                        <span className="font-bold text-gray-900 block">{prod.name}</span>
                                        <span className="text-xs text-gray-400">{prod.category}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                {prod.stock === 0 ? (
                                    <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-lg uppercase">Agotado</span>
                                ) : prod.stock < 5 ? (
                                    <span className="px-3 py-1 bg-amber-100 text-amber-600 text-[10px] font-bold rounded-lg uppercase">Por Agotar</span>
                                ) : (
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded-lg uppercase">En Stock</span>
                                )}
                            </td>
                            <td className="px-8 py-6">
                                <div className="flex items-center justify-center gap-4 bg-gray-50 rounded-xl px-4 py-2 w-max mx-auto border border-gray-100">
                                    <button onClick={() => onUpdateStock(prod.id, Math.max(0, prod.stock - 1))} className="text-gray-400 hover:text-red-500 transition-colors"><Minus className="h-4 w-4" /></button>
                                    <span className="font-bold text-gray-900 min-w-[2rem] text-center">{prod.stock}</span>
                                    <button onClick={() => onUpdateStock(prod.id, prod.stock + 1)} className="text-gray-400 hover:text-emerald-500 transition-colors"><Plus className="h-4 w-4" /></button>
                                </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                                <button className="p-3 text-gray-400 hover:text-primary rounded-xl hover:bg-primary/5 transition-all"><Edit2 className="h-5 w-5" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const OrdersView = ({ orders, onSelect }) => (
    <div className="space-y-8">
        <h2 className="text-3xl font-black text-gray-900">Gestión de Pedidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map(order => (
                <button
                    key={order.id}
                    onClick={() => onSelect(order)}
                    className="bg-white p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all text-left group border border-transparent hover:border-primary/20 flex flex-col h-full"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-primary/10 transition-colors">
                            <ShoppingCart className="h-6 w-6 text-gray-400 group-hover:text-primary" />
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${order.status === 'completado' ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary'
                            }`}>
                            {order.status}
                        </span>
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Pedido #{order.id}</span>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{order.customer_name}</h3>
                    <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                        <span className="text-xs text-gray-500">{order.items.length} productos</span>
                        <span className="text-lg font-black text-primary">${order.total.toFixed(2)}</span>
                    </div>
                </button>
            ))}
        </div>
    </div>
);

const OrderModal = ({ order, onClose, onUpdateStatus }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden shadow-black/20">
            {/* Header / Receipt Branding */}
            <div className="bg-gray-900 p-8 text-white relative">
                <button onClick={onClose} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"><X className="h-6 w-6" /></button>
                <div className="flex items-center gap-3 mb-2">
                    <Package className="h-8 w-8 text-primary" />
                    <h4 className="text-2xl font-black">Recibo de Pedido</h4>
                </div>
                <p className="text-gray-400 text-sm font-bold tracking-widest uppercase">ID: RosaElena-{order.id}-{new Date(order.timestamp).getFullYear()}</p>
            </div>

            <div className="p-10 space-y-8">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Cliente</span>
                        <p className="font-bold text-lg text-gray-900">{order.customer_name}</p>
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Fecha</span>
                        <p className="font-bold text-lg text-gray-900">{new Date(order.timestamp).toLocaleString('es-VE')}</p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Detalle de Compra</span>
                    <div className="space-y-3">
                        {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-xs font-bold text-primary shadow-sm">{item.quantity}</span>
                                    <span className="font-bold text-gray-700">{item.name}</span>
                                </div>
                                <span className="font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                        <div className="pt-4 mt-4 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-lg font-black text-gray-900 uppercase tracking-widest">Total</span>
                            <span className="text-3xl font-black text-primary">${order.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Proof Upload Simulation */}
                <div className="space-y-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Comprobante de Pago</span>
                    {order.payment_proof ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3 text-emerald-700 font-bold">
                                <Check className="h-5 w-5" /> Comprobante recibido
                            </div>
                            <button className="text-emerald-700 underline text-sm font-bold">Ver imagen</button>
                        </div>
                    ) : (
                        <button
                            onClick={() => onUpdateStatus(order.id, { payment_proof: "proof_placeholder.jpg" })}
                            className="w-full p-8 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 hover:border-primary/40 hover:text-primary transition-all flex flex-col items-center gap-3"
                        >
                            <Upload className="h-8 w-8" />
                            <span className="font-bold">Subir Comprobante (JPG/PNG)</span>
                        </button>
                    )}
                </div>

                {/* Status Toggle */}
                <div className="flex gap-4">
                    <button
                        onClick={() => onUpdateStatus(order.id, { status: "completado" })}
                        className={`flex-grow py-5 rounded-2xl font-bold transition-all shadow-xl flex items-center justify-center gap-3 ${order.status === 'completado' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
                            }`}
                    >
                        <Check className="h-6 w-6" /> Completar Pedido
                    </button>
                    <button className="p-5 bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all">
                        <Trash2 className="h-6 w-6" />
                    </button>
                </div>
            </div>
        </motion.div>
    </motion.div>
);

const ProductModal = ({ onClose, onSubmit }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Nuevo Producto</h3>
            <form onSubmit={onSubmit} className="space-y-4">
                <input name="name" placeholder="Nombre del producto" required className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" />
                <div className="grid grid-cols-2 gap-4">
                    <input name="category" placeholder="Categoría" required className="bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" />
                    <input name="price" type="number" step="0.01" placeholder="Precio ($)" required className="bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" />
                </div>
                <input name="stock" type="number" placeholder="Cantidad Inicial" required className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" />
                <input name="image" placeholder="URL de la imagen" required className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" />
                <textarea name="description" placeholder="Descripción" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 h-32 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"></textarea>

                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={onClose} className="flex-grow py-4 rounded-xl font-bold text-gray-500 bg-gray-50">Cancelar</button>
                    <button type="submit" className="flex-grow py-4 rounded-xl font-bold text-white bg-primary shadow-lg shadow-primary/20 uppercase tracking-widest">Crear Producto</button>
                </div>
            </form>
        </motion.div>
    </motion.div>
);

export default AdminDashboard;
