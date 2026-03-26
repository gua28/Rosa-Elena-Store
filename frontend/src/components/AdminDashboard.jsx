import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Package, ShoppingCart, LogOut, Search,
    Plus, Minus, Edit2, Check, X, AlertTriangle, FileText,
    Upload, Trash2, Eye, TrendingUp, Users, Box, Menu, Heart,
    ChevronRight, ArrowLeft, Loader2, History, BarChart3, Database, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatImageUrl } from '../utils/imageUrl';
import { supabase } from '../utils/supabaseClient';
import { API_BASE_URL } from '../utils/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminDashboard = ({ onLogout, onBack, fetchSettings, settings, user }) => {
    const isTechnicalAdmin = user?.role?.toLowerCase() === 'admin';
    const [activeTab, setActiveTab] = useState('stats');
    const [stats, setStats] = useState({
        totalSales: '$0.00',
        salesToday: '$0.00',
        salesWeek: '$0.00',
        newOrders: '0',
        activeProducts: '0',
        recentOrders: [],
        alerts: { low: [], out: [] }
    });
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [metricDetail, setMetricDetail] = useState(null); // 'sales', 'pending', 'products'
    const [salesSubView, setSalesSubView] = useState('overview'); // 'overview', 'weekly', 'monthly'
    const [viewingMonth, setViewingMonth] = useState(new Date().getMonth());
    const [viewingYear, setViewingYear] = useState(new Date().getFullYear());
    const [selectedDayDate, setSelectedDayDate] = useState(null);

    // New Inventory States
    const [inventoryHistory, setInventoryHistory] = useState([]);
    const [inventoryReport, setInventoryReport] = useState(null);
    const [inventoryTab, setInventoryTab] = useState('list'); // 'list', 'report', 'history', 'bulk'
    const [configData, setConfigData] = useState({ ...settings });
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [inventorySearch, setInventorySearch] = useState('');
    const [orderSearch, setOrderSearch] = useState('');
    const [historySearch, setHistorySearch] = useState('');
    const [systemUsers, setSystemUsers] = useState([]);

    // Helper to calculate totals from recentOrders to ensure consistency
    const calculateLiveTotals = () => {
        if (!stats?.recentOrders) return { today: '$0.00', week: '$0.00', month: '$0.00' };
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA');

        // Start of week (Monday)
        const weekDate = new Date();
        weekDate.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
        const weekStartStr = weekDate.toLocaleDateString('en-CA');

        // Start of month
        const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        const completed = (stats.recentOrders || []).filter(o => o.status === 'completado');

        const todayRes = completed
            .filter(o => o.timestamp?.startsWith(todayStr))
            .reduce((sum, o) => sum + (o.total || 0), 0);

        const weekRes = completed
            .filter(o => o.timestamp >= weekStartStr)
            .reduce((sum, o) => sum + (o.total || 0), 0);

        const monthRes = completed
            .filter(o => o.timestamp >= monthStartStr)
            .reduce((sum, o) => sum + (o.total || 0), 0);

        return {
            today: `$${todayRes.toFixed(2)}`,
            week: `$${weekRes.toFixed(2)}`,
            month: `$${monthRes.toFixed(2)}`
        };
    };

    const liveTotals = calculateLiveTotals();

    useEffect(() => {
        fetchData();
        setConfigData({ ...settings });
    }, [settings]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Stage 1: Critical UI Data
            const { data: prodData, error: prodError } = await supabase.from('products').select('*').order('id');
            if (prodError) throw prodError;

            const { data: ordersData, error: ordersError } = await supabase.from('orders').select('*').order('timestamp', { ascending: false });
            if (ordersError) throw ordersError;

            // Mocking stats normally provided by backend
            const completedOrders = ordersData.filter(o => o.status === 'completado');
            const totalSalesSum = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            
            const statsData = {
                totalSales: `$${totalSalesSum.toFixed(2)}`,
                newOrders: ordersData.filter(o => o.status === 'procesando').length.toString(),
                activeProducts: prodData.length.toString(),
                recentOrders: ordersData.map(o => ({ ...o, items: JSON.parse(o.items_json || '[]') }))
            };

            // Compute alerts directly from the products list
            const lowStockNames = prodData.filter(p => p.stock > 0 && p.stock <= 5).map(p => p.name);
            const outStockNames = prodData.filter(p => p.stock === 0).map(p => p.name);

            setStats(prev => ({
                ...prev,
                ...statsData,
                alerts: { low: lowStockNames, out: outStockNames }
            }));
            setProducts(prodData);
            setIsLoading(false); // UI is now usable

            // Stage 2: Background Data (Inventory)
            const { data: historyData, error: historyError } = await supabase.from('inventory_logs')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(200); // Limitamos a los últimos 200 para mejorar rendimiento

            if (historyError) {
                console.error('History fetch error:', historyError);
                // No lanzamos error para que el resto del panel funcione
            }

            // Simple report calculation logic that was in backend
            const reportData = {
                totalValue: prodData.reduce((sum, p) => sum + (p.price * p.stock), 0),
                totalItems: prodData.reduce((sum, p) => sum + p.stock, 0),
                categorySummary: prodData.reduce((acc, p) => {
                    if (!acc[p.category]) acc[p.category] = { count: 0, value: 0 };
                    acc[p.category].count += p.stock;
                    acc[p.category].value += (p.price * p.stock);
                    return acc;
                }, {}),
                lowStock: lowStockNames,
                outOfStock: outStockNames
            };

            setInventoryHistory(historyData || []);
            setInventoryReport(reportData);

            // Fetch users for system tab
            const { data: usersData, error: usersError } = await supabase.from('users').select('*').order('id', { ascending: false });
            if (!usersError) setSystemUsers(usersData || []);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            setIsLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSavingConfig(true);
        try {
            const updates = Object.entries(configData).map(([key, value]) => ({ key, value }));
            const { error } = await supabase.from('settings').upsert(updates);
            
            if (!error) {
                alert('Configuración guardada exitosamente.');
                fetchSettings();
            } else {
                throw error;
            }
        } catch (err) {
            console.error('Save config error:', err);
            alert('Error al guardar la configuración.');
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleUpdateStock = async (id, newStock) => {
        try {
            const product = products.find(p => p.id === id);
            const prevStock = product?.stock || 0;

            const { error: updateError } = await supabase.from('products').update({ stock: newStock }).eq('id', id);
            if (updateError) throw updateError;
            
            // Log the change - USANDO SOLO COLUMNAS EXISTENTES PARA EVITAR FALLOS
            const { error: logError } = await supabase.from('inventory_logs').insert([{
                product_id: id,
                change_type: 'manual',
                quantity_changed: newStock - prevStock,
                previous_stock: prevStock,
                new_stock: newStock,
                timestamp: new Date().toISOString(),
                reason: `Modificado por ${user?.name || 'Administrador'}`
            }]);

            if (logError) {
                console.warn('Logging error:', logError);
                // Si falla el log, avisamos pero no bloqueamos la actualización del stock física
            }

            // Refrescar todo DESPUÉS de loguear - ESPERANDO confirmación
            await fetchData();
            alert('Inventario actualizado y registrado.');
        } catch (error) {
            console.error('Error updating stock:', error);
            // Fallback: Si no funcionó, forzamos recarga visual
            fetchData();
        }
    };

    const handleUpdateOrderStatus = async (id, updates) => {
        try {
            const { error } = await supabase.from('orders').update(updates).eq('id', id);
            if (error) throw error;
            
            if (updates.status) alert('Estado del pedido actualizado');
            if (updates.payment_proof) alert('Comprobante subido correctamente');
            
            fetchData();
            setSelectedOrder(prev => prev ? { ...prev, ...updates } : null);
        } catch (error) {
            console.error('Error updating order:', error);
            alert('Error al actualizar el pedido');
        }
    };

    const handleDeleteOrder = async (id) => {
        if (!id) return;
        if (!window.confirm('¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.')) return;

        try {
            // 1. Limpieza Manual de Cascada: Eliminamos los items del pedido primero para evitar error de Llave Foránea
            await supabase.from('order_items').delete().eq('order_id', id);

            // 2. Ahora sí podemos borrar la orden maestra sin que la BD se queje
            const { error } = await supabase.from('orders').delete().eq('id', id);
            if (error) throw error;
            
            alert('Pedido y sus artículos eliminados correctamente.');
            setSelectedOrder(null);
            fetchData();
        } catch (error) {
            console.error('Error deleting order:', error);
            alert('Error al eliminar el pedido: ' + (error.message || 'Error de base de datos'));
        }
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productData = {
            name: formData.get('name'),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            stock: parseInt(formData.get('stock')),
            image: formData.get('image'),
            description: formData.get('description')
        };

        try {
            const isEditing = !!editingProduct;
            const { error, data } = isEditing 
                ? await supabase.from('products').update(productData).eq('id', editingProduct.id).select().single()
                : await supabase.from('products').insert([productData]).select().single();

            if (error) throw error;

            // Log if stock changed or it's new
            const stockChanged = !isEditing || (editingProduct.stock !== productData.stock);
            if (stockChanged || !isEditing) {
                await supabase.from('inventory_logs').insert([{
                    product_id: data.id,
                    change_type: isEditing ? 'manual' : 'new_product',
                    quantity_changed: isEditing ? (productData.stock - editingProduct.stock) : productData.stock,
                    previous_stock: isEditing ? editingProduct.stock : 0,
                    new_stock: productData.stock,
                    timestamp: new Date().toISOString(),
                    reason: `[${productData.name}] - ${isEditing ? 'Editado' : 'Creado'} por ${user?.name || 'Administrador'}`
                }]);
            }

            alert(isEditing ? 'Producto actualizado correctamente' : 'Producto creado con éxito');
            setIsProductModalOpen(false);
            setEditingProduct(null);
            await fetchData();
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error al guardar el producto: ' + (error.message || 'Error desconocido'));
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!id) return;
        if (!window.confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer y el producto desaparecerá de la tienda.')) return;

        try {
            const productToDelete = Array.isArray(products) ? products.find(p => p.id === id) : null;
            
            // 1. Limpiamos manualmente todos los registros del Kardex que tiene este producto.
            // Esto evita que Supabase bloquee la eliminación por su "Foreign Key Constraint".
            await supabase.from('inventory_logs').delete().eq('product_id', id);

            // 2. Eliminamos el producto
            const { error } = await supabase.from('products').delete().eq('id', id);
            
            if (error) {
                if (error.code === '23503') {
                    alert('No se puede eliminar: Este producto está amarrado a facturas existentes. Elimina los pedidos de este producto primero.');
                    return;
                }
                throw error;
            }
            
            // 3. (Opcional) Intentamos dejar un registro "fantasma" sin ID de producto para que se sepa que se borró
            supabase.from('inventory_logs').insert([{
                change_type: 'delete',
                quantity_changed: 0,
                previous_stock: productToDelete?.stock || 0,
                new_stock: 0,
                timestamp: new Date().toISOString(),
                reason: `[${productToDelete?.name || 'Producto Desconocido'}] - ELIMINADO TOTALMENTE por ${user?.name || 'Administrador'}`
            }]).then(() => {}).catch(() => {});

            alert('Producto eliminado exitosamente.');
            fetchData();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('No se pudo eliminar el producto: ' + (error.message || 'Error desconocido'));
        }
    };

    return (
        <div className="min-h-screen bg-primary-light flex font-sans">
            {/* Mobile Header Toggle */}
            <div className="lg:hidden fixed top-0 left-0 right-0 bg-primary-dark text-white p-4 flex items-center justify-between z-30 shadow-xl">
                <div className="flex items-center gap-2">
                    <Heart className="text-accent h-5 w-5" />
                    <span className="font-bold text-sm">Rosa Elena Admin</span>
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    {isSidebarOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Metric Detail Modal */}
            <AnimatePresence>
                {metricDetail && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMetricDetail(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl glass bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900">
                                        {metricDetail === 'sales' && 'Detalles de Ventas'}
                                        {metricDetail === 'pending' && 'Pedidos por Procesar'}
                                        {metricDetail === 'products' && 'Resumen de Inventario'}
                                    </h3>
                                    <p className="text-gray-500 text-sm font-medium">Información detallada en tiempo real</p>
                                </div>
                                <button onClick={() => setMetricDetail(null)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                {metricDetail === 'sales' && (
                                    <div className="space-y-6">
                                        {/* Back button if in subview */}
                                        {salesSubView !== 'overview' && (
                                            <button
                                                onClick={() => {
                                                    if (salesSubView === 'daily_detail') {
                                                        setSalesSubView('weekly');
                                                    } else {
                                                        setSalesSubView('overview');
                                                    }
                                                }}
                                                className="flex items-center gap-2 text-accent font-bold hover:bg-accent/5 px-4 py-2 rounded-xl transition-all w-fit"
                                            >
                                                <ArrowLeft className="h-4 w-4" /> Volver {salesSubView === 'daily_detail' ? 'a la Semana' : 'al Resumen'}
                                            </button>
                                        )}

                                        {salesSubView === 'overview' && (
                                            <>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="p-4 bg-emerald-50 rounded-3xl border border-emerald-100 col-span-2 md:col-span-1">
                                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Hoy</span>
                                                        <span className="text-xl font-black text-emerald-700">{liveTotals.today}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setSalesSubView('weekly')}
                                                        className="p-4 bg-blue-50 rounded-3xl border border-blue-100 md:col-span-1 text-left hover:bg-blue-100 transition-all group"
                                                    >
                                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Semana</span>
                                                        <span className="text-xl font-black text-blue-700">{liveTotals.week}</span>
                                                        <span className="text-[8px] font-bold text-blue-400 mt-1 block group-hover:block">Ver cada día →</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setSalesSubView('monthly')}
                                                        className="p-4 bg-purple-50 rounded-3xl border border-purple-100 md:col-span-1 text-left hover:bg-purple-100 transition-all group"
                                                    >
                                                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block mb-1">Este Mes</span>
                                                        <span className="text-xl font-black text-purple-700">{liveTotals.month}</span>
                                                        <span className="text-[8px] font-bold text-purple-400 mt-1 block group-hover:block">Ver detalles →</span>
                                                    </button>
                                                    <div className="p-4 bg-gray-900 rounded-3xl shadow-lg md:col-span-1">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Histórico</span>
                                                        <span className="text-xl font-black text-white">{stats.totalSales}</span>
                                                    </div>
                                                </div>

                                                <h4 className="font-bold text-gray-900 mt-8 mb-4">Últimas Ventas Realizadas</h4>
                                                <div className="space-y-3">
                                                    {stats.recentOrders.filter(o => o.status === 'completado').slice(0, 10).map(order => (
                                                        <button
                                                            key={order.id}
                                                            onClick={() => { setSelectedOrder(order); setMetricDetail(null); }}
                                                            className="w-full p-4 bg-gray-50 rounded-2xl flex items-center justify-between border border-emerald-100/50 hover:bg-emerald-50 transition-all text-left"
                                                        >
                                                            <div>
                                                                <span className="font-bold text-gray-800">{order.customer_name}</span>
                                                                <span className="text-[10px] text-gray-400 block">{new Date(order.timestamp).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="font-bold text-emerald-600 block">${order.total.toFixed(2)}</span>
                                                                <span className="text-[10px] text-primary underline font-bold">Ver Recibo</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {salesSubView === 'weekly' && (
                                            <div className="space-y-4">
                                                <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight">Ventas Diarias de esta Semana</h4>
                                                <div className="space-y-2">
                                                    {[...Array(7)].map((_, i) => {
                                                        const date = new Date();
                                                        date.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1) + i);
                                                        const dayName = date.toLocaleDateString('es-VE', { weekday: 'long' });
                                                        const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
                                                        const dayTotal = (stats.recentOrders || [])
                                                            .filter(o => o.status === 'completado' && o.timestamp?.startsWith(dateStr))
                                                            .reduce((sum, o) => sum + (o.total || 0), 0);

                                                        return (
                                                            <button
                                                                key={i}
                                                                onClick={() => {
                                                                    if (dayTotal > 0) {
                                                                        setSelectedDayDate(dateStr);
                                                                        setSalesSubView('daily_detail');
                                                                    }
                                                                }}
                                                                className={`w-full p-5 rounded-2xl border flex items-center justify-between transition-all ${date.toDateString() === new Date().toDateString() ? 'bg-accent/5 border-accent/20' : 'bg-white border-gray-100'} ${dayTotal > 0 ? 'hover:bg-accent/5 cursor-pointer shadow-sm' : 'cursor-default'}`}
                                                            >
                                                                <div className="text-left">
                                                                    <span className="font-bold text-gray-700 capitalize">{dayName} <span className="text-gray-400 font-medium ml-2">{date.getDate()}</span></span>
                                                                    {dayTotal > 0 && <span className="text-[10px] text-accent block font-bold">Ver pedidos →</span>}
                                                                </div>
                                                                <span className={`font-black ${dayTotal > 0 ? 'text-accent' : 'text-gray-300'}`}>${dayTotal.toFixed(2)}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                    {(() => {
                                                        const timeframeProducts = {};
                                                        // Initialize all products with 0
                                                        products.forEach(p => timeframeProducts[p.name] = 0);
                                                        
                                                        const now = new Date();
                                                        const weekDate = new Date();
                                                        weekDate.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
                                                        const weekStartStr = weekDate.toLocaleDateString('en-CA');
                                                        
                                                        stats.recentOrders
                                                            .filter(o => o.status === 'completado' && o.timestamp >= weekStartStr)
                                                            .forEach(order => {
                                                                order.items.forEach(item => {
                                                                    timeframeProducts[item.name] = (timeframeProducts[item.name] || 0) + item.quantity;
                                                                });
                                                            });

                                                        const sorted = Object.entries(timeframeProducts)
                                                            .map(([name, value]) => ({ name, value }))
                                                            .sort((a, b) => b.value - a.value);

                                                        const mostSold = sorted.filter(p => p.value > 0).slice(0, 5);
                                                        const leastSold = sorted.slice(-5).reverse();

                                                        return (
                                                            <>
                                                                <SalesPieChart 
                                                                    title="Más Vendidos (Semana)" 
                                                                    data={mostSold} 
                                                                    colors={['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6']} 
                                                                />
                                                                <SalesPieChart 
                                                                    title="Menos Vendidos (Semana)" 
                                                                    data={leastSold} 
                                                                    colors={['#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0', '#F8FAFC']} 
                                                                />
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        )}

                                        {salesSubView === 'daily_detail' && (
                                            <div className="space-y-6">
                                                <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight">
                                                    Pedidos del {new Date(selectedDayDate + "T00:00:00").toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </h4>
                                                <div className="space-y-3">
                                                    {(stats.recentOrders || [])
                                                        .filter(o => o.status === 'completado' && o.timestamp?.startsWith(selectedDayDate))
                                                        .map(order => (
                                                            <button
                                                                key={order.id}
                                                                onClick={() => { setSelectedOrder(order); setMetricDetail(null); }}
                                                                className="w-full p-4 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100 hover:border-primary/30 hover:bg-white transition-all text-left"
                                                            >
                                                                <div>
                                                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">Pedido #{order.id}</span>
                                                                    <span className="font-bold text-gray-800 text-sm block">{order.customer_name}</span>
                                                                    <span className="text-[10px] text-gray-400 block">{order.timestamp && new Date(order.timestamp).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="font-black text-gray-900 block">${(order.total || 0).toFixed(2)}</span>
                                                                    <span className="text-[9px] text-primary font-bold underline">Ver Detalles</span>
                                                                </div>
                                                            </button>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        )}

                                        {salesSubView === 'monthly' && (
                                            <div className="space-y-6">
                                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight">Reporte Mensual</h4>
                                                        <ExportButtons 
                                                            type="sales" 
                                                            title={`Reporte de Ventas - ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][viewingMonth]} ${viewingYear}`}
                                                            filename={`Ventas_${viewingMonth + 1}_${viewingYear}`}
                                                            data={stats.recentOrders.filter(o => {
                                                                const d = new Date(o.timestamp);
                                                                return o.status === 'completado' && d.getMonth() === viewingMonth && d.getFullYear() === viewingYear;
                                                            })}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                                                        <select
                                                            value={viewingMonth}
                                                            onChange={(e) => setViewingMonth(parseInt(e.target.value))}
                                                            className="bg-transparent font-bold text-sm px-2 py-1 outline-none"
                                                        >
                                                            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                                                <option key={i} value={i}>{m}</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            value={viewingYear}
                                                            onChange={(e) => setViewingYear(parseInt(e.target.value))}
                                                            className="bg-transparent font-bold text-sm px-2 py-1 outline-none"
                                                        >
                                                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="p-6 bg-accent rounded-3xl text-white shadow-xl shadow-accent/20">
                                                    <span className="text-xs font-bold opacity-80 uppercase tracking-widest block mb-2">Total del Mes Seleccionado</span>
                                                    <span className="text-4xl font-black">
                                                        ${stats.recentOrders
                                                            .filter(o => {
                                                                const d = new Date(o.timestamp);
                                                                return o.status === 'completado' && d.getMonth() === viewingMonth && d.getFullYear() === viewingYear;
                                                            })
                                                            .reduce((sum, o) => sum + o.total, 0)
                                                            .toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>

                                                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                                    <h5 className="text-sm font-black text-gray-400 uppercase tracking-widest">Desglose por Venta</h5>
                                                    {stats.recentOrders
                                                        .filter(o => {
                                                            const d = new Date(o.timestamp);
                                                            return o.status === 'completado' && d.getMonth() === viewingMonth && d.getFullYear() === viewingYear;
                                                        })
                                                        .map(order => (
                                                            <button
                                                                key={order.id}
                                                                onClick={() => { setSelectedOrder(order); setMetricDetail(null); }}
                                                                className="w-full p-4 bg-white rounded-2xl flex items-center justify-between border border-gray-100 hover:border-accent/30 hover:bg-accent/5 transition-all text-left"
                                                            >
                                                                <div>
                                                                    <span className="font-bold text-gray-800 text-sm block">{order.customer_name}</span>
                                                                    <span className="text-[10px] text-gray-400 block">{new Date(order.timestamp).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}</span>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="font-black text-gray-900 block">${order.total.toFixed(2)}</span>
                                                                    <span className="text-[9px] text-accent font-bold underline">Ver Recibo</span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    {stats.recentOrders.filter(o => {
                                                        const d = new Date(o.timestamp);
                                                        return o.status === 'completado' && d.getMonth() === viewingMonth && d.getFullYear() === viewingYear;
                                                    }).length === 0 && (
                                                            <p className="text-center py-10 text-gray-400 italic">No hay datos para este periodo</p>
                                                        )}
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-8">
                                                    {(() => {
                                                        const timeframeProducts = {};
                                                        // Initialize all products with 0
                                                        products.forEach(p => timeframeProducts[p.name] = 0);
                                                        
                                                        stats.recentOrders
                                                            .filter(o => {
                                                                const d = new Date(o.timestamp);
                                                                return o.status === 'completado' && d.getMonth() === viewingMonth && d.getFullYear() === viewingYear;
                                                            })
                                                            .forEach(order => {
                                                                order.items.forEach(item => {
                                                                    timeframeProducts[item.name] = (timeframeProducts[item.name] || 0) + item.quantity;
                                                                });
                                                            });

                                                        const sorted = Object.entries(timeframeProducts)
                                                            .map(([name, value]) => ({ name, value }))
                                                            .sort((a, b) => b.value - a.value);

                                                        const mostSold = sorted.filter(p => p.value > 0).slice(0, 5);
                                                        const leastSold = sorted.slice(-5).reverse();

                                                        return (
                                                            <>
                                                                <SalesPieChart 
                                                                    title="Más Vendidos (Mes)" 
                                                                    data={mostSold} 
                                                                    colors={['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6']} 
                                                                />
                                                                <SalesPieChart 
                                                                    title="Menos Vendidos (Mes)" 
                                                                    data={leastSold} 
                                                                    colors={['#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0', '#F8FAFC']} 
                                                                />
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {metricDetail === 'pending' && (
                                    <div className="space-y-4">
                                        {stats.recentOrders.filter(o => o.status === 'procesando' || o.status === 'esperando pago').map(order => (
                                            <button
                                                key={order.id}
                                                onClick={() => { setSelectedOrder(order); setMetricDetail(null); }}
                                                className="w-full p-6 bg-accent/5 rounded-[2rem] border border-accent/10 flex items-center justify-between hover:bg-accent/10 transition-all text-left"
                                            >
                                                <div>
                                                    <span className="text-[10px] font-black text-accent uppercase tracking-widest block mb-1">Pedido #{order.id}</span>
                                                    <span className="text-lg font-bold text-gray-900">{order.customer_name}</span>
                                                    <div className="flex gap-2 mt-2">
                                                        {order.items.slice(0, 2).map((item, i) => (
                                                            <span key={i} className="text-[10px] bg-white px-2 py-0.5 rounded-lg border border-accent/10 text-gray-500">
                                                                {item.quantity}x {item.name}
                                                            </span>
                                                        ))}
                                                        {order.items.length > 2 && <span className="text-[10px] text-gray-400">+{order.items.length - 2} más</span>}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-black text-gray-900 block">${order.total.toFixed(2)}</span>
                                                    <span className="text-[10px] font-bold text-accent uppercase px-3 py-1 bg-white rounded-lg border border-accent/20">Ver Pedido</span>
                                                </div>
                                            </button>
                                        ))}
                                        {stats.recentOrders.filter(o => o.status === 'procesando' || o.status === 'esperando pago').length === 0 && (
                                            <div className="text-center py-20">
                                                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Check className="h-10 w-10" />
                                                </div>
                                                <h4 className="text-xl font-bold text-gray-900">¡Todo al día!</h4>
                                                <p className="text-gray-500">No hay pedidos pendientes por procesar.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {metricDetail === 'products' && (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Catálogo</span>
                                                <span className="text-3xl font-black">{stats.activeProducts}</span>
                                            </div>
                                            <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100">
                                                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-1">Alertas de Stock</span>
                                                <span className="text-3xl font-black text-amber-700">{stats.alerts.low.length + stats.alerts.out.length}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="font-bold text-gray-900">Estado Crítico</h4>
                                            {stats.alerts.out.map((name, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
                                                    <span className="font-bold text-red-700">{name}</span>
                                                    <span className="text-[10px] bg-red-600 text-white px-2 py-1 rounded-lg font-black uppercase">Agotado</span>
                                                </div>
                                            ))}
                                            {stats.alerts.low.map((name, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                                    <span className="font-bold text-amber-700">{name}</span>
                                                    <span className="text-[10px] bg-amber-600 text-white px-2 py-1 rounded-lg font-black uppercase">Stock Bajo</span>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => { setActiveTab('inventory'); setMetricDetail(null); }}
                                            className="w-full bg-gray-900 hover:bg-black text-white py-5 rounded-2xl font-bold transition-all shadow-xl"
                                        >
                                            Ir al Inventario Completo
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <aside className={`w-72 bg-primary-dark text-white p-8 flex flex-col fixed h-full z-50 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-white/60 hover:text-accent transition-colors font-bold mb-8 w-fit text-sm"
                >
                    <ArrowLeft className="h-4 w-4" /> Volver a la Tienda
                </button>

                <div className="flex items-center gap-3 mb-12">
                    <div className="p-2 bg-accent rounded-xl" onClick={() => setIsSidebarOpen(false)}>
                        <Package className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-xl font-black tracking-tight">Rosa Elena 
                        <span className="text-accent text-[10px] block uppercase tracking-widest font-black">
                            {isTechnicalAdmin ? 'Technical Panel' : 'Business Panel'}
                        </span>
                    </h1>
                </div>

                <nav className="space-y-2 flex-grow">
                    <SidebarItem icon={<LayoutDashboard />} label="Resumen" active={activeTab === 'stats'} onClick={() => { setActiveTab('stats'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<Box />} label="Inventario" active={activeTab === 'inventory'} onClick={() => { setActiveTab('inventory'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<ShoppingCart />} label="Pedidos" active={activeTab === 'orders'} onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }} />
                    <SidebarItem icon={<Database />} label="Configuración" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} />
                    
                    {isTechnicalAdmin && (
                        <SidebarItem icon={<TrendingUp />} label="Soporte Técnico" active={activeTab === 'system'} onClick={() => { setActiveTab('system'); setIsSidebarOpen(false); }} />
                    )}
                </nav>

                <button onClick={onLogout} className="mt-auto flex items-center gap-3 p-4 text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                    <LogOut className="h-5 w-5" />
                    <span className="font-bold">Cerrar Sesión</span>
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-grow lg:ml-72 p-6 md:p-10 pt-24 lg:pt-10">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center text-gray-400">Cargando panel...</div>
                ) : (
                    <>
                        {activeTab === 'stats' && <StatsView stats={stats} liveTotals={liveTotals} setMetricDetail={setMetricDetail} onDetail={(order) => { setActiveTab('orders'); setSelectedOrder(order); }} settings={settings} setActiveTab={setActiveTab} setInventorySearch={setInventorySearch} setOrderSearch={setOrderSearch} />}

                        {activeTab === 'inventory' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Sub-navigation for Inventory */}
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                    <div className="flex gap-2 p-1 bg-gray-200/50 rounded-2xl w-fit">
                                        <button onClick={() => setInventoryTab('list')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${inventoryTab === 'list' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'}`}>Lista</button>
                                        <button onClick={() => setInventoryTab('report')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${inventoryTab === 'report' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'}`}>Informes</button>
                                        <button onClick={() => { setInventoryTab('history'); fetchData(); }} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${inventoryTab === 'history' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'}`}>Histórico</button>
                                        <button onClick={() => setInventoryTab('bulk')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${inventoryTab === 'bulk' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'}`}>Carga Masiva</button>
                                    </div>

                                    {inventoryTab === 'list' && (
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar producto..." 
                                                value={inventorySearch}
                                                onChange={(e) => setInventorySearch(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium"
                                            />
                                        </div>
                                    )}
                                </div>

                                {inventoryTab === 'list' && (
                                    <InventoryView 
                                        products={products.filter(p => p.name.toLowerCase().includes(inventorySearch.toLowerCase()) || p.category.toLowerCase().includes(inventorySearch.toLowerCase()))} 
                                        onUpdateStock={handleUpdateStock} 
                                        onAdd={() => { setEditingProduct(null); setIsProductModalOpen(true); }} 
                                        onEdit={(prod) => { setEditingProduct(prod); setIsProductModalOpen(true); }}
                                        onDelete={handleDeleteProduct}
                                    />
                                )}
                                {inventoryTab === 'history' && (
                                    <InventoryHistoryView 
                                        logs={inventoryHistory.filter(l => {
                                            const matchName = l.reason?.match(/\[(.*?)\]/);
                                            const pNameFromReason = matchName ? matchName[1] : '';
                                            const pName = products.find(p => p.id === l.product_id)?.name || pNameFromReason || 'Producto Elimi.';
                                            
                                            return pName.toLowerCase().includes(historySearch.toLowerCase()) ||
                                                   (l.change_type || '').toLowerCase().includes(historySearch.toLowerCase());
                                        })}
                                        products={products}
                                        search={historySearch}
                                        onSearch={setHistorySearch}
                                    />
                                )}
                                {inventoryTab === 'report' && <InventoryReportView report={inventoryReport} />}
                                {inventoryTab === 'bulk' && <InventoryBulkView products={products} onBulkUpdate={async (data) => {
                                    for (const p of data) {
                                        const original = products.find(prod => prod.id === p.id);
                                        await supabase.from('products').update({ stock: p.stock }).eq('id', p.id);
                                        
                                        // Log each change
                                        await supabase.from('inventory_logs').insert([{
                                            product_id: p.id,
                                            change_type: 'bulk_upload',
                                            quantity_changed: p.stock - (original?.stock || 0),
                                            previous_stock: original?.stock || 0,
                                            new_stock: p.stock,
                                            timestamp: new Date().toISOString(),
                                            reason: `Carga masiva por ${user?.name || 'Administrador'}`
                                        }]);
                                    }
                                    alert('Inventario actualizado masivamente.');
                                    await fetchData();
                                    setInventoryTab('list');
                                }} />}
                            </div>
                        )}

                        {activeTab === 'orders' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                    <h2 className="text-3xl font-black text-gray-900">Gestión de Pedidos</h2>
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar pedido o cliente..." 
                                            value={orderSearch}
                                            onChange={(e) => setOrderSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium"
                                        />
                                    </div>
                                </div>
                                <OrdersView orders={stats.recentOrders.filter(o => o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) || o.id.toString().includes(orderSearch))} onSelect={setSelectedOrder} />
                            </div>
                        )}
                        
                        {activeTab === 'settings' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <h1 className="text-3xl font-black text-gray-900">Configuración Web</h1>
                                    <button onClick={handleSaveConfig} disabled={isSavingConfig} className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-2xl font-bold shadow-lg transition-all flex items-center gap-2">
                                        {isSavingConfig ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Guardar Cambios
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-white p-8 rounded-[2rem] border border-accent/10 shadow-sm space-y-6">
                                        <h3 className="text-lg font-black text-primary flex items-center gap-2 uppercase tracking-widest">Pago Móvil</h3>
                                        <div className="space-y-4">
                                            <input type="text" placeholder="Banco" value={configData.payment_movil_bank || ''} onChange={(e) => setConfigData({...configData, payment_movil_bank: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-gray-800" />
                                            <input type="text" placeholder="Cédula / RIF" value={configData.payment_movil_doc || ''} onChange={(e) => setConfigData({...configData, payment_movil_doc: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-gray-800" />
                                            <input type="text" placeholder="Teléfono" value={configData.payment_movil_phone || ''} onChange={(e) => setConfigData({...configData, payment_movil_phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-gray-800" />
                                        </div>
                                    </div>
                                    <div className="bg-white p-8 rounded-[2rem] border border-accent/10 shadow-sm space-y-6">
                                        <h3 className="text-lg font-black text-yellow-600 flex items-center gap-2 uppercase tracking-widest">Binance & PayPal</h3>
                                        <div className="space-y-4">
                                            <input type="text" placeholder="Binance ID" value={configData.payment_binance_id || ''} onChange={(e) => setConfigData({...configData, payment_binance_id: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-gray-800" />
                                            <input type="text" placeholder="Email PayPal" value={configData.payment_paypal_email || ''} onChange={(e) => setConfigData({...configData, payment_paypal_email: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-gray-800" />
                                            <input type="text" placeholder="Link PayPal" value={configData.payment_paypal_url || ''} onChange={(e) => setConfigData({...configData, payment_paypal_url: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-gray-800" />
                                        </div>
                                    </div>
                                    <div className="bg-white p-8 rounded-[2rem] border border-accent/10 shadow-sm space-y-6 md:col-span-2">
                                        <h3 className="text-lg font-black text-accent flex items-center gap-2 uppercase tracking-widest">Ajustes de Moneda & Contacto</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="col-span-1 md:col-span-2 bg-accent/5 p-4 rounded-2xl border border-accent/20 mb-2">
                                                <label className="text-xs font-black text-accent uppercase tracking-widest mb-2 block">Tasa de Cambio (BS por 1$)</label>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-500">1$ = </span>
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        placeholder="Ej: 36.50" 
                                                        value={configData.currency_rate || ''} 
                                                        onChange={(e) => setConfigData({...configData, currency_rate: e.target.value})} 
                                                        className="flex-grow bg-white border border-accent/20 rounded-xl p-3 font-black text-accent text-xl focus:ring-2 focus:ring-accent/20 outline-none" 
                                                    />
                                                    <span className="font-bold text-gray-500">BS</span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-2 italic">* Esta tasa se usará para mostrar los montos en Bolívares en el carrito de compras.</p>
                                            </div>
                                            <input type="text" placeholder="Dirección" value={configData.contact_address || ''} onChange={(e) => setConfigData({...configData, contact_address: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-gray-800" />
                                            <input type="text" placeholder="Instagram User" value={configData.contact_instagram || ''} onChange={(e) => setConfigData({...configData, contact_instagram: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-gray-800" />
                                            <input type="text" placeholder="Instagram URL" value={configData.contact_instagram_url || ''} onChange={(e) => setConfigData({...configData, contact_instagram_url: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-gray-800" />
                                            <input type="text" placeholder="Gmail" value={configData.contact_gmail || ''} onChange={(e) => setConfigData({...configData, contact_gmail: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-gray-800" />
                                            <input type="text" placeholder="WhatsApp (formato: 58412xxxxxxx)" value={configData.contact_phone || ''} onChange={(e) => setConfigData({...configData, contact_phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-gray-800" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'system' && isTechnicalAdmin && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div>
                                    <h2 className="text-3xl font-black mb-2 italic">Soporte Técnico</h2>
                                    <p className="text-gray-500">Herramientas de diagnóstico y control del sistema.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-gray-100">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                                <Database className="h-6 w-6" />
                                            </div>
                                            <h3 className="text-xl font-bold">Estado del Sistema</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                                                <span className="text-gray-500 font-medium">Base de Datos</span>
                                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-tighter">Conectado (Supabase)</span>
                                            </div>
                                            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                                                <span className="text-gray-500 font-medium">Versión API</span>
                                                <span className="text-gray-900 font-bold">1.2.0-cloud</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-gray-100">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                                                <Users className="h-6 w-6" />
                                            </div>
                                            <h3 className="text-xl font-bold">Sesión Actual</h3>
                                        </div>
                                        <p className="text-gray-500 text-sm mb-6 italic">Iniciado como {user?.role}:</p>
                                        <div className="p-4 bg-gray-900 text-white rounded-2xl">
                                            <p className="font-bold">{user?.name}</p>
                                            <p className="text-xs text-gray-400">{user?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* VISUAL DATABASE FOR ADMINS */}
                                <div className="p-8 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 mt-8 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
                                     <div className="flex items-center justify-between mb-6">
                                         <h3 className="text-xl font-bold flex items-center gap-3 text-gray-900 border-l-4 border-accent pl-4">
                                             Terminal de Datos: Usuarios
                                         </h3>
                                     </div>
                                     <div className="overflow-x-auto">
                                        <table className="w-full text-left bg-gray-50 rounded-3xl overflow-hidden min-w-[700px] shadow-inner">
                                            <thead className="bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-6 py-4">ID</th>
                                                    <th className="px-6 py-4">Nombre</th>
                                                    <th className="px-6 py-4">Email</th>
                                                    <th className="px-6 py-4">Rol</th>
                                                    <th className="px-6 py-4 border-l border-gray-200">Hash de Seguridad</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-sm">
                                                {systemUsers.map((u) => (
                                                    <tr key={u.id} className="hover:bg-white transition-colors group">
                                                        <td className="px-6 py-4 font-black text-gray-400">{u.id}</td>
                                                        <td className="px-6 py-4 font-bold text-gray-800">{u.name || 'Usuario ' + u.id}</td>
                                                        <td className="px-6 py-4 text-gray-500 font-medium">
                                                            {u.email ? u.email.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => a + "*".repeat(b.length) + c) : 'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                                                u.role === 'dueño' ? 'bg-purple-100 text-purple-700' :
                                                                u.role === 'administrador' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                                {u.role || 'cliente'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 border-l border-gray-100">
                                                            <div className="flex items-center gap-2">
                                                                <Lock className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                                                <span className="font-mono text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                                                                    {u.password ? '•••••••• ••••' : 'SESIÓN EXTERNA'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {systemUsers.length === 0 && (
                                                    <tr>
                                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-400 italic">Cargando base de datos segura...</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                     </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Product Modal */}
            <AnimatePresence>
                {isProductModalOpen && (
                    <ProductModal
                        editingProduct={editingProduct}
                        onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
                        onSubmit={handleSaveProduct}
                        categories={Array.isArray(products) ? [...new Set(products.map(p => p.category))] : []}
                    />
                )}
            </AnimatePresence>

            {/* Order Receipt Modal */}
            <AnimatePresence>
                {selectedOrder && (
                    <OrderModal
                        order={selectedOrder}
                        onClose={() => setSelectedOrder(null)}
                        onUpdateStatus={handleUpdateOrderStatus}
                        onDelete={() => handleDeleteOrder(selectedOrder.id)}
                        settings={settings}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Sales Analysis Components ---

const SalesPieChart = ({ data, title, colors }) => {
    const [hoveredProduct, setHoveredProduct] = useState(null);
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    // Always use 100 for percentage calculation relative to the segments shown
    if (total === 0 || !data.length) return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center opacity-60 h-full">
            <Package className="h-10 w-10 text-gray-300 mb-3" />
            <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">{title}</h4>
            <p className="text-[10px] text-gray-400 font-bold mt-2">Sin ventas registradas</p>
        </div>
    );

    let currentRotation = 0;

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center h-full"
        >
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-8 text-center">{title}</h4>
            
            <div className="relative w-48 h-48 mb-8">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {data.map((item, i) => {
                        const percentage = (item.value / total) * 100;
                        const strokeDasharray = `${percentage} ${100 - percentage}`;
                        const rotation = currentRotation;
                        currentRotation += percentage;
                        
                        return (
                            <g 
                                key={i} 
                                onMouseEnter={() => setHoveredProduct(item)}
                                onMouseLeave={() => setHoveredProduct(null)}
                                className="cursor-pointer"
                            >
                                <motion.circle
                                    cx="50" cy="50" r="15.9155"
                                    fill="transparent"
                                    stroke={colors[i % colors.length]}
                                    strokeWidth={hoveredProduct?.name === item.name ? "34" : "31.8"}
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset="0"
                                    transform={`rotate(${(rotation * 3.6)}, 50, 50)`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.8, delay: i * 0.1 }}
                                    className="transition-all duration-300"
                                />
                                {/* White separator line */}
                                {data.length > 1 && (
                                    <line 
                                        x1="50" y1="50" x2="50" y2="18.1" 
                                        stroke="white" 
                                        strokeWidth="0.8"
                                        transform={`rotate(${(rotation * 3.6)}, 50, 50)`}
                                        className="pointer-events-none"
                                    />
                                )}
                            </g>
                        );
                    })}
                </svg>
                
                {/* Center Content: Switches between total and hovered product */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white rounded-full w-24 h-24 shadow-2xl border-4 border-gray-50 flex flex-col items-center justify-center p-2 text-center animate-in fade-in zoom-in duration-300">
                        {hoveredProduct ? (
                            <>
                                <span className="text-[7px] font-black text-accent uppercase tracking-tighter mb-1 truncate w-full px-1">{hoveredProduct.name}</span>
                                <span className="text-3xl font-black text-gray-900 leading-none">{hoveredProduct.value}</span>
                                <span className="text-[8px] font-bold text-gray-400">UNIDADES</span>
                            </>
                        ) : (
                            <>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">TOTAL</span>
                                <span className="text-4xl font-black text-gray-900 leading-none">{total}</span>
                                <span className="text-[9px] font-bold text-gray-400">UNIDADES</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="w-full space-y-2 mt-auto">
                {data.map((item, i) => (
                    <div 
                        key={i} 
                        className={`flex items-center justify-between group p-1.5 rounded-xl transition-all ${hoveredProduct?.name === item.name ? 'bg-gray-50 shadow-sm' : ''}`}
                        onMouseEnter={() => setHoveredProduct(item)}
                        onMouseLeave={() => setHoveredProduct(null)}
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></div>
                            <span className={`text-[11px] font-bold transition-colors truncate max-w-[120px] ${hoveredProduct?.name === item.name ? 'text-gray-900' : 'text-gray-600'}`}>{item.name}</span>
                        </div>
                        <div className={`px-2 py-1 rounded-lg border min-w-[35px] text-center transition-all ${hoveredProduct?.name === item.name ? 'bg-accent text-white border-accent' : 'bg-gray-50 text-gray-900 border-gray-100'}`}>
                            <span className="text-xs font-black">{item.value}</span>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

const ExportButtons = ({ data, filename, title, type }) => {
    const handleExcel = () => {
        let exportData = [];
        if (type === 'inventory') {
            exportData = data.map(p => ({
                'Nombre': p.name,
                'Categoría': p.category,
                'Precio ($)': p.price,
                'Stock': p.stock,
                'Descripción': p.description || ''
            }));
        } else if (type === 'sales') {
            exportData = data.map(o => ({
                'ID': o.id,
                'Cliente': o.customer_name,
                'Fecha': new Date(o.timestamp).toLocaleString(),
                'Total ($)': o.total,
                'Estado': o.status
            }));
        } else if (type === 'history') {
            exportData = data.map(l => ({
                'Fecha': new Date(l.timestamp).toLocaleString(),
                'Producto': l.product_name || 'Desconocido',
                'Responsable': l.admin_name || 'Admin',
                'Acción': l.change_type,
                'Cantidad Cambiada': l.quantity_changed,
                'Stock Anterior': l.previous_stock,
                'Stock Nuevo': l.new_stock
            }));
        }
        
        // --- NUEVA LÓGICA DE BRANDING PARA EXCEL ---
        const wb = XLSX.utils.book_new();
        
        // Construimos el encabezado manualmente
        const headerInfo = [
            ["CREACIONES ROSA ELENA 🎀"],
            ['"Cada creación, un pedacito de amor" ✨'],
            [`REPORTE DE: ${title.toUpperCase()}`],
            [`Generado el: ${new Date().toLocaleString()}`],
            ["-------------------------------------------------"],
            [] // Espacio en blanco antes de la tabla
        ];

        const ws = XLSX.utils.aoa_to_sheet(headerInfo);
        
        // Añadimos los datos de la tabla debajo del encabezado (celda A7)
        XLSX.utils.sheet_add_json(ws, exportData, { origin: "A7" });

        // Ajustar anchos de columnas (opcional, ayuda a que no se vea cortado)
        ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];

        XLSX.utils.book_append_sheet(wb, ws, "Reporte Oficial");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    };

    const handlePDF = async () => {
        try {
            const doc = new jsPDF();
            
            // --- NUEVO: MARCA DE AGUA (WATERMARK) ---
            const addWatermark = (pdfDoc) => {
                const img = new Image();
                img.src = '/logo.png';
                try {
                    // Marca de agua centralizada (un poco más visible: 0.15)
                    pdfDoc.saveGraphicsState();
                    pdfDoc.setGState(new pdfDoc.GState({ opacity: 0.15 }));
                    pdfDoc.addImage(img, 'PNG', 40, 80, 130, 130);
                    pdfDoc.restoreGraphicsState();
                    
                    // Logo en el ENCABEZADO (Ajustado para NO tapar: un poco más pequeño)
                    pdfDoc.addImage(img, 'PNG', 172, 8, 24, 24);
                } catch (e) {
                    console.log("No se pudo cargar el logo para el PDF", e);
                }
            };

            addWatermark(doc);

            doc.setFontSize(24);
            doc.setTextColor(50);
            doc.text("Creaciones Rosa Elena", 14, 20);
            
            doc.setFontSize(14);
            doc.setTextColor(79, 70, 229); // Accent color
            doc.text(title, 14, 30);
            
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text(`Documento Administrativo | Generado: ${new Date().toLocaleString()}`, 14, 38);
            
            doc.setDrawColor(79, 70, 229);
            doc.line(14, 42, 196, 42);

            let headings = [];
            let rows = [];

            if (type === 'inventory') {
                headings = ['Nombre', 'Categoría', 'Precio ($)', 'Stock'];
                rows = data.map(p => [p.name, p.category, `$${p.price.toFixed(2)}`, p.stock]);
            } else if (type === 'sales') {
                headings = ['Fecha', 'Cliente', 'Total ($)', 'Estado'];
                rows = data.map(o => [
                    new Date(o.timestamp).toLocaleDateString(),
                    o.customer_name,
                    `$${o.total.toFixed(2)}`,
                    o.status
                ]);
            } else if (type === 'history') {
                headings = ['Fecha', 'Producto', 'Responsable', 'Acción', 'Cant.', 'Stock'];
                rows = data.map(l => [
                    new Date(l.timestamp).toLocaleString(),
                    l.product_name,
                    l.admin_name,
                    l.change_type,
                    l.quantity_changed,
                    l.new_stock
                ]);
            }

            autoTable(doc, {
                head: [headings],
                body: rows,
                startY: 48,
                theme: 'striped',
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 247, 255] },
                didDrawPage: (data) => {
                    // Solo dibujamos marca de agua/logo en la página 1 ya fue llamada antes de iniciar
                    // Pero si el reporte es muy largo, no queremos saturar las siguientes páginas
                }
            });

            doc.save(`${filename}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Hubo un error al generar el PDF. Por favor, intente de nuevo.");
        }
    };

    return (
        <div className="flex gap-2">
            <button 
                onClick={handleExcel}
                title="Exportar a Excel"
                className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all shadow-sm"
            >
                <Database className="h-3 w-3" /> Excel
            </button>
            <button 
                onClick={handlePDF}
                title="Exportar a PDF"
                className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-all shadow-sm"
            >
                <FileText className="h-3 w-3" /> PDF
            </button>
        </div>
    );
};

const TopCustomersChart = ({ orders, onSelectCustomer }) => {
    const customerData = orders
        .filter(o => o.status === 'completado')
        .reduce((acc, o) => {
            if (!acc[o.customer_name]) {
                acc[o.customer_name] = { total: 0, count: 0, orders: [] };
            }
            acc[o.customer_name].total += o.total;
            acc[o.customer_name].count += 1;
            acc[o.customer_name].orders.push(o);
            return acc;
        }, {});

    const sorted = Object.entries(customerData)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    if (sorted.length === 0) return null;

    const maxTotal = sorted[0].total || 1;

    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 mt-10">
            <div className="flex items-center justify-between mb-8">
                <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.3em] flex items-center gap-3">
                    <Users className="h-4 w-4" /> Top 5 Clientes en Ventas
                </h4>
                <span className="text-[8px] font-bold text-gray-400 uppercase italic">Click para ver historial</span>
            </div>
            <div className="space-y-6">
                {sorted.map((c, i) => (
                    <motion.button 
                        key={i} 
                        whileHover={{ x: 5 }}
                        onClick={() => onSelectCustomer(c.name)}
                        className="w-full text-left space-y-2 group"
                    >
                        <div className="flex justify-between items-end text-sm font-bold">
                            <span className="text-gray-700 flex items-center gap-2">
                                <span className="w-6 h-6 bg-gray-900 text-white rounded-lg flex items-center justify-center text-[10px] font-black">{i+1}</span>
                                {c.name}
                                <span className="text-[9px] bg-accent/5 px-2 py-0.5 rounded-full text-accent ml-2">{c.count} pedidos</span>
                            </span>
                            <span className="text-gray-900">${c.total.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden border border-gray-100">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(c.total / maxTotal) * 100}%` }}
                                transition={{ duration: 1, delay: i * 0.1 }}
                                className="h-full bg-accent relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </motion.div>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

const SidebarItem = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 font-bold ${active ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'text-white/40 hover:bg-white/5'
            }`}
    >
        {React.cloneElement(icon, { className: 'h-5 w-5' })}
        <span>{label}</span>
    </button>
);

const StatsView = ({ stats, onDetail, onGoToInventory, setMetricDetail, liveTotals, settings, setActiveTab, setInventorySearch, setOrderSearch }) => (
    <div className="space-y-10">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-3xl font-black text-gray-900">Resumen General</h2>
                <div className="flex items-center gap-2 mt-1">
                    <Database className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Base de Datos Encriptada & Segura</span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-1">
                <div className="bg-white px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2 text-sm font-bold text-gray-500">
                    {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                {settings.currency_rate && (
                    <div className="px-3 py-1 bg-accent/10 rounded-xl text-accent text-[9px] font-black uppercase tracking-tighter">
                        Tasa: 1$ = {settings.currency_rate} BS
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <MetricCard
                icon={<TrendingUp />}
                label="Ventas"
                value={stats.totalSales}
                color="bg-emerald-500"
                onClick={() => setMetricDetail('sales')}
                subtext={`Hoy: ${liveTotals.today}`}
            />
            <MetricCard
                icon={<ShoppingCart />}
                label="Pendientes"
                value={stats.newOrders}
                color="bg-accent"
                onClick={() => setMetricDetail('pending')}
                isAlert={parseInt(stats.newOrders) > 0}
                subtext={`${stats.newOrders} pedidos por procesar`}
            />
            <MetricCard
                icon={<Box />}
                label="Inventario"
                value={stats.activeProducts}
                color="bg-primary"
                onClick={() => setMetricDetail('products')}
                isAlert={stats.alerts.out.length > 0}
                subtext={`${stats.alerts.low.length + stats.alerts.out.length} alertas de stock`}
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Alerts */}
            <div className="flex flex-col gap-6">
                <div className="glass p-8 rounded-[2.5rem] bg-white shadow-sm border-white h-fit">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                        <AlertTriangle className="text-amber-500 h-6 w-6" /> Alertas de Inventario
                    </h3>
                    <div className="space-y-4">
                        {stats.alerts.out.map((name, i) => (
                            <div key={i} className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-center justify-between font-bold text-sm">
                                <span>{name} AGOTADO</span>
                                <button onClick={() => { setInventorySearch(name); setActiveTab('inventory'); }} className="bg-red-200 px-2 py-1 rounded-lg text-[10px] uppercase font-bold hover:bg-red-300 transition-colors">URGENTE: Reponer</button>
                            </div>
                        ))}
                        {stats.alerts.low.map((name, i) => (
                            <div key={i} className="p-4 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-between font-bold text-sm">
                                <span>{name} por agotar</span>
                                <button onClick={() => { setInventorySearch(name); setActiveTab('inventory'); }} className="text-[10px] uppercase underline font-bold hover:text-amber-900 transition-colors">Ver en inventario</button>
                            </div>
                        ))}
                        {stats.alerts.out.length === 0 && stats.alerts.low.length === 0 && (
                            <p className="text-center py-10 text-gray-400">No hay alertas pendientes</p>
                        )}
                    </div>
                </div>

                <TopCustomersChart 
                    orders={stats.recentOrders} 
                    onSelectCustomer={(name) => {
                        setOrderSearch(name);
                        setActiveTab('orders');
                    }}
                />
            </div>

            {/* Recent Orders List */}
            <div className="glass p-8 rounded-[2.5rem] bg-white shadow-sm border-white">
                <h3 className="text-xl font-bold mb-6">Pedidos Recientes</h3>
                <div className="space-y-3">
                    {stats.recentOrders.map(order => (
                        <button key={order.id} onClick={() => onDetail(order)} className="w-full p-4 bg-gray-50 rounded-2xl flex items-center justify-between hover:bg-white transition-all border border-transparent hover:border-accent/20 shadow-sm hover:shadow-md">
                            <div className="text-left">
                                <span className="text-xs font-bold text-gray-400 block tracking-widest uppercase">#{order.id}</span>
                                <span className="font-bold text-gray-800">{order.customer_name}</span>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-accent block">${(order.total || 0).toFixed(2)}</span>
                                <span className={`text-[10px] uppercase font-black ${order.status === 'completado' ? 'text-emerald-500' : 'text-accent'}`}>{order.status}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const MetricCard = ({ icon, label, value, color, onClick, subtext, isAlert }) => (
    <button
        onClick={onClick}
        className="bg-white p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6 relative overflow-hidden group text-left hover:shadow-xl hover:-translate-y-1 transition-all border border-transparent hover:border-gray-100 w-full"
    >
        <div className={`p-5 rounded-2xl text-white ${color} relative z-10 shadow-lg group-hover:scale-110 transition-transform ${isAlert ? 'animate-pulse' : ''}`}>
            {React.cloneElement(icon, { className: 'h-8 w-8' })}
        </div>
        <div className="relative z-10 flex-grow">
            <p className="text-gray-500 font-bold text-[10px] uppercase tracking-wider mb-1">{label}</p>
            <p className="text-3xl font-black text-gray-900">{value}</p>
            {subtext && <p className="text-[10px] font-bold text-gray-400 mt-1">{subtext}</p>}
            <span className="text-[9px] font-black text-accent opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest mt-2 block">Ver detalles →</span>
        </div>
        {isAlert && (
            <div className="absolute top-6 right-6">
                <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                </span>
            </div>
        )}
        <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-[0.03] rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`}></div>
    </button>
);

const StockInput = ({ initialStock, onUpdate }) => {
    const [value, setValue] = useState(initialStock);

    useEffect(() => {
        setValue(initialStock);
    }, [initialStock]);

    const handleCommit = () => {
        if (value === '' || isNaN(parseInt(value))) {
            setValue(initialStock);
        } else {
            onUpdate(Math.max(0, parseInt(value)));
        }
    };

    return (
        <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
            className="w-16 bg-white border border-gray-200 rounded-lg py-1 px-2 text-center font-bold text-primary focus:outline-none focus:border-accent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
    );
};

const InventoryView = ({ products, onUpdateStock, onAdd, onEdit, onDelete }) => (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl md:text-3xl font-black text-primary">Gestión de Inventario</h2>
                <ExportButtons 
                    type="inventory" 
                    title="Reporte de Inventario Completo" 
                    filename="Inventario_Rosa_Elena" 
                    data={products} 
                />
            </div>
            <button onClick={onAdd} className="w-full sm:w-auto bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent/20 transition-all">
                <Plus className="h-5 w-5" /> Nuevo Producto
            </button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-white overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
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
                                    <img 
                                        src={formatImageUrl(prod.image)} 
                                        alt="" 
                                        className="w-12 h-12 rounded-xl object-cover bg-gray-50"
                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/300?text=Error'; }}
                                    />
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
                                <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-xl px-2 py-1 w-max mx-auto border border-gray-100">
                                    <button
                                        onClick={() => onUpdateStock(prod.id, Math.max(0, prod.stock - 1))}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <StockInput
                                        initialStock={prod.stock}
                                        onUpdate={(newVal) => onUpdateStock(prod.id, newVal)}
                                    />
                                    <button
                                        onClick={() => onUpdateStock(prod.id, prod.stock + 1)}
                                        className="p-2 text-gray-400 hover:text-emerald-500 transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => onEdit(prod)} className="p-3 text-gray-400 hover:text-accent rounded-xl hover:bg-accent/5 transition-all"><Edit2 className="h-5 w-5" /></button>
                                    <button onClick={() => onDelete(prod.id)} className="p-3 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all"><Trash2 className="h-5 w-5" /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const OrdersView = ({ orders, onSelect }) => {
    const parseItems = (json) => {
        try {
            if (!json) return [];
            return typeof json === 'string' ? JSON.parse(json) : json;
        } catch (e) {
            console.error("Error parsing items:", e);
            return [];
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">Gestión de Pedidos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.map(order => {
                    const items = parseItems(order.items_json);
                    return (
                        <button
                            key={order.id}
                            onClick={() => onSelect(order)}
                            className="bg-white p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all text-left group border border-transparent hover:border-accent/20 flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-accent/10 transition-colors">
                                    <ShoppingCart className="h-6 w-6 text-gray-400 group-hover:text-accent" />
                                </div>
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${order.status === 'completado' ? 'bg-emerald-100 text-emerald-600' : 'bg-accent/10 text-accent'
                                    }`}>
                                    {order.status}
                                </span>
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Pedido #{order.id}</span>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{order.customer_name}</h3>
                            <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                                <span className="text-xs text-gray-500">{items.length} productos</span>
                                <span className="text-lg font-black text-accent">${(order.total || 0).toFixed(2)}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const InventoryHistoryView = ({ logs, products, search, onSearch }) => (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold text-gray-900">Histórico de Inventario (Kardex)</h3>
                <ExportButtons 
                    type="history" 
                    title="Histórico de Movimientos de Inventario" 
                    filename="Kardex_Rosa_Elena" 
                    data={logs.map(log => ({
                        ...log,
                        product_name: products.find(p => p.id === log.product_id)?.name || 'Producto Eliminado',
                        admin_name: log.reason?.split(' por ')?.[1] || '---'
                    }))} 
                />
            </div>
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Buscar en historial..." 
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium"
                />
            </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-white overflow-hidden overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Fecha</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Producto</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Responsable</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Tipo</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Cant.</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Stock</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {Array.isArray(logs) && logs.map(log => (
                        <tr key={log.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '---'}
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-900">
                                {products.find(p => p.id === log.product_id)?.name || (log.reason?.match(/\[(.*?)\]/)?.[1] || 'Producto Elimi.')}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] font-black text-gray-400">
                                        {(log.reason?.split(' por ')?.[1] || 'A')[0]}
                                    </div>
                                    <span className="font-bold text-gray-600">{log.reason?.split(' por ')?.[1] || '---'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                                    log.change_type === 'sale' ? 'bg-red-50 text-red-500' :
                                    log.change_type === 'restock' ? 'bg-emerald-50 text-emerald-500' :
                                    log.change_type === 'delete' ? 'bg-gray-900 text-white' :
                                    'bg-blue-50 text-blue-500'
                                }`}>
                                    {log.change_type === 'sale' ? 'Venta' :
                                     log.change_type === 'restock' ? 'Reposición' :
                                     log.change_type === 'delete' ? 'ELIMINADO' :
                                     log.change_type === 'bulk_upload' ? 'Carga Masiva' : 'Manual'}
                                </span>
                            </td>
                            <td className={`px-6 py-4 font-black text-center ${log.quantity_changed > 0 ? 'text-emerald-500' : log.quantity_changed < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                {log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed === 0 ? '--' : log.quantity_changed}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex flex-col leading-tight">
                                    <span className="text-gray-900 font-bold">{log.new_stock}</span>
                                    <span className="text-[10px] text-gray-400">Antes: {log.previous_stock}</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {(!logs || logs.length === 0) && (
                        <tr>
                            <td colSpan="6" className="px-6 py-20 text-center text-gray-400 italic">No hay registros históricos aún.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const InventoryReportView = ({ report }) => {
    if (!report || !report.categorySummary) return <div className="p-20 text-center text-gray-400">Generando reporte...</div>;

    const totalValue = report.totalValue || 0;
    const totalItems = report.totalItems || 0;
    const alertsCount = (report.lowStock?.length || 0) + (report.outOfStock?.length || 0);

    return (
        <div className="space-y-8 pb-10">
            <h3 className="text-xl font-bold text-gray-900">Infome de Inventario</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-primary-dark text-white p-8 rounded-[2.5rem] shadow-xl">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">Valor Total del Inventario</span>
                    <span className="text-4xl font-black text-accent">${totalValue.toFixed(2)}</span>
                    <p className="text-[10px] text-white/40 mt-2">Suma de precio x stock de todos los productos</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Items en Almacén</span>
                    <span className="text-4xl font-black text-gray-900">{totalItems}</span>
                    <p className="text-[10px] text-gray-400 mt-2">Cantidad total de productos físicos</p>
                </div>
                <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-1">Alertas Activas</span>
                    <span className="text-4xl font-black text-amber-700">{alertsCount}</span>
                    <p className="text-[10px] text-amber-500 mt-2">Productos agotados o con stock bajo</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-accent" /> Resumen por Categoría
                    </h4>
                    <div className="space-y-4">
                        {Object.entries(report.categorySummary || {}).map(([cat, data]) => (
                            <div key={cat} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <span className="font-bold text-gray-700">{cat}</span>
                                <div className="text-right">
                                    <span className="font-black text-gray-900 block">{(data.count || 0)} items</span>
                                    <span className="text-[10px] text-gray-400 block">${(data.value || 0).toFixed(2)} acumulado</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" /> Necesidades de Producción
                    </h4>
                    <div className="space-y-3">
                        {(report.outOfStock || []).map(p => (
                            <div key={p.id} className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between">
                                <span className="font-bold text-red-800">{p.name}</span>
                                <span className="text-[10px] font-black text-red-600 uppercase">Agotado</span>
                            </div>
                        ))}
                        {(report.lowStock || []).map(p => (
                            <div key={p.id} className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                                <span className="font-bold text-amber-800">{p.name}</span>
                                <span className="text-[10px] font-black text-amber-600 uppercase">Stock: {p.stock}</span>
                            </div>
                        ))}
                        {(!report.outOfStock?.length && !report.lowStock?.length) && (
                            <p className="text-center py-10 text-gray-400 italic">Inventario óptimo</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const InventoryBulkView = ({ products, onBulkUpdate }) => {
    const [updates, setUpdates] = useState({});
    const [searchTerm, setSearchTerm] = useState("");

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUpdateChange = (id, val) => {
        setUpdates(prev => ({ ...prev, [id]: val }));
    };

    const handleSubmit = () => {
        const payload = Object.entries(updates)
            .filter(([_, qty]) => qty !== 0 && qty !== "" && !isNaN(parseInt(qty)))
            .map(([idStr, qtyStr]) => {
                const id = parseInt(idStr);
                const change = parseInt(qtyStr);
                const prod = products.find(p => p.id === id);
                if (!prod) return null;
                return {
                    id: id,
                    stock: Math.max(0, prod.stock + change)
                };
            }).filter(Boolean);

        if (payload.length > 0) {
            onBulkUpdate(payload);
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex-grow w-full max-w-md relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-accent transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Buscar producto a actualizar..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-100 rounded-2xl py-3 pl-12 pr-4 font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                    />
                </div>
                <button
                    onClick={handleSubmit}
                    className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-accent/20 transition-all w-full sm:w-auto"
                >
                    <Check className="h-5 w-5" /> Guardar Cambios
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-white overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[500px]">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Producto</th>
                            <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Stock Actual</th>
                            <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Añadir / Quitar</th>
                            <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Nuevo Stock</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredProducts.map(prod => {
                            const change = parseInt(updates[prod.id] || 0);
                            const nextStock = prod.stock + (isNaN(change) ? 0 : change);

                            return (
                                <tr key={prod.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-6 font-bold text-gray-800">{prod.name}</td>
                                    <td className="px-8 py-6 text-gray-500 font-bold">{prod.stock}</td>
                                    <td className="px-8 py-6">
                                        <input
                                            type="number"
                                            placeholder="Ej: +10 o -5"
                                            value={updates[prod.id] || ""}
                                            onChange={(e) => handleUpdateChange(prod.id, e.target.value)}
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 w-32 font-bold focus:outline-none focus:border-accent"
                                        />
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`text-lg font-black ${nextStock < 0 ? 'text-red-500' : 'text-accent'}`}>
                                            {nextStock < 0 ? 0 : nextStock}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const OrderModal = ({ order, onClose, onUpdateStatus, onDelete, settings }) => {
    const [uploading, setUploading] = useState(false);

    const items = (() => {
        try {
            if (!order.items_json) return [];
            return typeof order.items_json === 'string' ? JSON.parse(order.items_json) : order.items_json;
        } catch (e) {
            return [];
        }
    })();

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600;
                    let width = img.width;
                    let height = img.height;
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const base64String = canvas.toDataURL('image/jpeg', 0.6);
                    onUpdateStatus(order.id, { payment_proof: base64String });
                    setUploading(false);
                };
            };
        } catch (err) {
            console.error('Error uploading payment proof:', err);
            setUploading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden shadow-black/20 max-h-[95vh] overflow-y-auto">
                {/* Header / Receipt Branding */}
                <div className="bg-primary-dark p-8 text-white relative">
                    <button onClick={onClose} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"><X className="h-6 w-6" /></button>
                    <div className="flex items-center gap-3 mb-2">
                        <Package className="h-8 w-8 text-accent" />
                        <h4 className="text-2xl font-black">Recibo de Pedido</h4>
                    </div>
                    <p className="text-white/40 text-sm font-bold tracking-widest uppercase">ID: RosaElena-{order.id}-{new Date(order.timestamp).getFullYear()}</p>
                </div>

                <div className="p-10 space-y-8">
                    {/* Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                        <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cliente</span>
                            <p className="font-bold text-base sm:text-lg text-gray-900">{order.customer_name}</p>
                            {order.customer_phone && <p className="text-sm font-bold text-accent mt-1">{order.customer_phone}</p>}
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fecha</span>
                            <p className="font-bold text-base sm:text-lg text-gray-900">{new Date(order.timestamp).toLocaleString('es-VE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        {order.customer_address && (
                            <div className="col-span-1 sm:col-span-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Dirección de Entrega</span>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 italic text-gray-600 text-sm">
                                    {order.customer_address}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Detalle de Compra</span>
                        <div className="space-y-3">
                            {items.map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-xs font-bold text-accent shadow-sm">{item.quantity}</span>
                                        <span className="font-bold text-gray-700">{item.name}</span>
                                    </div>
                                    <span className="font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="pt-4 mt-4 border-t border-gray-200">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-bold text-gray-500 uppercase">Subtotal</span>
                                    <span className="text-lg font-bold text-gray-900">${(order.total || 0).toFixed(2)}</span>
                                </div>
                                {settings?.currency_rate && (
                                    <div className="flex justify-between items-center py-2 bg-emerald-50 px-4 rounded-xl border border-emerald-100 mb-4">
                                        <span className="text-[10px] font-black text-emerald-600 uppercase">Total en Bolívares</span>
                                        <span className="text-xl font-black text-emerald-700">BS {(order.total * parseFloat(settings.currency_rate)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                                    <span className="text-lg font-black text-gray-900 uppercase tracking-widest">Total Factura</span>
                                    <span className="text-3xl font-black text-accent">${(order.total || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Comprobante de Pago</span>
                        {order.payment_proof ? (
                            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem] space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-emerald-700 font-bold text-sm">
                                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <Check className="h-4 w-4" />
                                        </div>
                                        Comprobante recibido
                                    </div>
                                    <a href={formatImageUrl(order.payment_proof)} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline text-xs font-black hover:text-emerald-900 transition-colors uppercase tracking-widest">Ver original</a>
                                </div>
                                <div className="bg-white p-2 rounded-2xl border border-emerald-100 shadow-sm relative group overflow-hidden">
                                    <img 
                                        src={formatImageUrl(order.payment_proof)} 
                                        alt="Payment Proof" 
                                        className="w-full h-64 object-contain rounded-xl"
                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/300?text=Comprobante+No+Encontrado'; }}
                                    />
                                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white font-bold gap-2">
                                        <Upload className="h-5 w-5" /> Cambiar Imagen
                                        <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <label className="w-full p-12 border-2 border-dashed border-accent/20 rounded-[2.5rem] text-accent/40 hover:border-accent hover:text-accent transition-all flex flex-col items-center gap-4 bg-accent/5 cursor-pointer group">
                                {uploading ? (
                                    <Loader2 className="h-10 w-10 animate-spin text-accent" />
                                ) : (
                                    <>
                                        <div className="p-5 bg-white rounded-2xl shadow-sm text-accent group-hover:scale-110 transition-transform">
                                            <Upload className="h-8 w-8" />
                                        </div>
                                        <div className="text-center">
                                            <span className="font-black text-lg block">Subir Comprobante</span>
                                            <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">JPG, PNG o JPEG</span>
                                        </div>
                                    </>
                                )}
                                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
                            </label>
                        )}
                    </div>

                    {/* Status Toggle */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => onUpdateStatus(order.id, { status: "completado" })}
                            className={`flex-grow py-5 rounded-2xl font-bold transition-all shadow-xl flex items-center justify-center gap-3 ${order.status === 'completado' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
                                }`}
                        >
                            <Check className="h-6 w-6" /> Completar Pedido
                        </button>
                        <button onClick={onDelete} className="p-5 bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all">
                            <Trash2 className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

const ProductModal = ({ onClose, onSubmit, editingProduct, categories }) => {
    const [imageUrl, setImageUrl] = useState(editingProduct?.image || '');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(editingProduct?.category || '');

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // SOLUCIÓN CLIENTE: Usar Base64 para evitar depender de endpoints de servidor que fallan en cloud
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 400; // Productos no necesitan tanta resolución
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const base64String = canvas.toDataURL('image/jpeg', 0.7);
                    setImageUrl(base64String);
                    setUploadingImage(false);
                };
            };
        } catch (err) {
            console.error('Error uploading file:', err);
            setUploadingImage(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white w-full max-w-lg rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl max-h-[95vh] overflow-y-auto">
                <h3 className="text-2xl font-black mb-6">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                <form onSubmit={onSubmit} className="space-y-4">
                    <input name="name" defaultValue={editingProduct?.name || ''} placeholder="Nombre del producto" required className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative">
                            {!showNewCategoryInput ? (
                                <select
                                    name="category"
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        if (e.target.value === "new") {
                                            setShowNewCategoryInput(true);
                                            setSelectedCategory("");
                                        } else {
                                            setSelectedCategory(e.target.value);
                                        }
                                    }}
                                    required
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>Seleccionar Categoría</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                    <option value="new" className="text-primary font-black">+ Nueva Categoría</option>
                                </select>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        name="category"
                                        placeholder="Nueva Categoría"
                                        required
                                        autoFocus
                                        className="w-full bg-gray-50 border border-primary/30 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewCategoryInput(false)}
                                        className="bg-gray-100 p-2 rounded-xl text-gray-400 hover:text-red-500"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <input name="price" defaultValue={editingProduct?.price || ''} type="number" step="0.01" placeholder="Precio ($)" required className="bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" />
                    </div>
                    <input name="stock" defaultValue={editingProduct?.stock || ''} type="number" placeholder="Cantidad Inicial" required className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold" />

                    <div className="flex gap-4">
                        <input name="image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Agrega url de imagen o sube una" required className="flex-grow bg-gray-50 border border-gray-100 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm" />
                        <label className="bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl px-5 flex items-center justify-center cursor-pointer transition-colors border border-gray-200 group" title="Subir imagen desde mi PC">
                            {uploadingImage ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6 group-hover:-translate-y-1 transition-transform" />}
                            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploadingImage} />
                        </label>
                    </div>

                    <textarea name="description" defaultValue={editingProduct?.description || ''} placeholder="Descripción" className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 h-32 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"></textarea>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-grow py-4 rounded-xl font-bold text-gray-500 bg-gray-50">Cancelar</button>
                        <button type="submit" disabled={uploadingImage} className="flex-grow py-4 rounded-xl font-bold text-white bg-accent shadow-lg shadow-accent/20 uppercase tracking-widest disabled:opacity-50">{editingProduct ? 'Guardar Cambios' : 'Crear Producto'}</button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default AdminDashboard;
