import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Package, ShoppingCart, LogOut, Search,
    Plus, Minus, Edit2, Check, X, AlertTriangle, FileText,
    Upload, Trash2, Eye, TrendingUp, Users, Box, Menu, Heart,
    ChevronRight, ArrowLeft, Loader2, History, BarChart3, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatImageUrl } from '../utils/imageUrl';
import { API_BASE_URL } from '../utils/api';

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
            const [statsRes, prodRes] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/stats`),
                fetch(`${API_BASE_URL}/products`)
            ]);

            const statsData = await statsRes.json().catch(() => ({}));
            const prodData = await prodRes.json().catch(() => []);

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
            const [historyRes, reportRes] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/inventory/history`),
                fetch(`${API_BASE_URL}/admin/inventory/report`)
            ]);

            const historyData = await historyRes.json().catch(() => []);
            const reportData = await reportRes.json().catch(() => null);

            setInventoryHistory(Array.isArray(historyData) ? historyData : []);
            setInventoryReport(reportData);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            setIsLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsSavingConfig(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configData)
            });
            if (res.ok) {
                alert('Configuración guardada exitosamente.');
                fetchSettings();
            } else {
                alert('Error al guardar la configuración. Por favor, intente de nuevo.');
            }
        } catch (err) {
            console.error('Save config error:', err);
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleUpdateStock = async (id, newStock) => {
        try {
            await fetch(`${API_BASE_URL}/admin/products/${id}`, {
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
            await fetch(`${API_BASE_URL}/admin/orders/${id}`, {
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

    const handleDeleteOrder = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.')) return;

        try {
            await fetch(`${API_BASE_URL}/admin/orders/${id}`, {
                method: 'DELETE'
            });
            setSelectedOrder(null);
            fetchData();
        } catch (error) {
            console.error('Error deleting order:', error);
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
            if (editingProduct) {
                await fetch(`${API_BASE_URL}/admin/products/${editingProduct.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
            } else {
                await fetch(`${API_BASE_URL}/admin/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
            }
            setIsProductModalOpen(false);
            setEditingProduct(null);
            fetchData();
        } catch (error) {
            console.error('Error saving product:', error);
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

                                                <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight mt-8 pt-4 border-t border-gray-100">Distribución de Productos</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                    {(() => {
                                                        const timeframeProducts = {};
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

                                                        const mostSold = sorted.slice(0, 5);
                                                        const leastSold = sorted.length > 3 ? [...sorted].reverse().slice(0, 5) : [];

                                                        return (
                                                            <>
                                                                <SalesPieChart 
                                                                    title="Más Vendidos (Semana)" 
                                                                    data={mostSold} 
                                                                    colors={['#FF3366', '#33CCFF', '#00FFCC', '#FFCC33', '#CC33FF']} 
                                                                />
                                                                <SalesPieChart 
                                                                    title="Menos Vendidos (Semana)" 
                                                                    data={leastSold} 
                                                                    colors={['#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155']} 
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
                                                    <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight">Reporte Mensual</h4>
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

                                                <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight mt-8 pt-4 border-t border-gray-100">Distribución de Productos</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-8">
                                                    {(() => {
                                                        const timeframeProducts = {};
                                                        
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

                                                        const mostSold = sorted.slice(0, 5);
                                                        const leastSold = sorted.length > 3 ? [...sorted].reverse().slice(0, 5) : [];

                                                        return (
                                                            <>
                                                                <SalesPieChart 
                                                                    title="Más Vendidos (Mes)" 
                                                                    data={mostSold} 
                                                                    colors={['#4F46E5', '#3B82F6', '#22C55E', '#EAB308', '#EC4899']} 
                                                                />
                                                                <SalesPieChart 
                                                                    title="Menos Vendidos (Mes)" 
                                                                    data={leastSold} 
                                                                    colors={['#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9']} 
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
                        {activeTab === 'stats' && <StatsView stats={stats} liveTotals={liveTotals} setMetricDetail={setMetricDetail} onDetail={(order) => { setActiveTab('orders'); setSelectedOrder(order); }} onGoToInventory={() => setActiveTab('inventory')} />}

                        {activeTab === 'inventory' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Sub-navigation for Inventory */}
                                <div className="flex gap-2 p-1 bg-gray-200/50 rounded-2xl w-fit">
                                    <button onClick={() => setInventoryTab('list')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${inventoryTab === 'list' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'}`}>Lista</button>
                                    <button onClick={() => setInventoryTab('report')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${inventoryTab === 'report' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'}`}>Informes</button>
                                    <button onClick={() => setInventoryTab('history')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${inventoryTab === 'history' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'}`}>Histórico</button>
                                    <button onClick={() => setInventoryTab('bulk')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${inventoryTab === 'bulk' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'}`}>Carga Masiva</button>
                                </div>

                                {inventoryTab === 'list' && <InventoryView products={products} onUpdateStock={handleUpdateStock} onAdd={() => { setEditingProduct(null); setIsProductModalOpen(true); }} onEdit={(prod) => { setEditingProduct(prod); setIsProductModalOpen(true); }} />}
                                {inventoryTab === 'history' && <InventoryHistoryView logs={inventoryHistory} />}
                                {inventoryTab === 'report' && <InventoryReportView report={inventoryReport} />}
                                {inventoryTab === 'bulk' && <InventoryBulkView products={products} onBulkUpdate={async (data) => {
                                    await fetch(`${API_BASE_URL}/admin/inventory/bulk-load`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(data)
                                    });
                                    fetchData();
                                    setInventoryTab('list');
                                }} />}
                            </div>
                        )}

                        {activeTab === 'orders' && <OrdersView orders={stats.recentOrders} onSelect={setSelectedOrder} />}
                        
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
                                        <h3 className="text-lg font-black text-accent flex items-center gap-2 uppercase tracking-widest">Contacto</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Sales Analysis Components ---

const SalesPieChart = ({ data, title, colors }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativeValue = 0;

    if (total === 0 || !data.length) return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center opacity-60">
            <Package className="h-10 w-10 text-gray-300 mb-3" />
            <h4 className="text-sm font-black text-gray-500 uppercase tracking-widest">{title}</h4>
            <p className="text-[10px] text-gray-400 font-bold mt-2">Sin datos suficientes</p>
        </div>
    );

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center relative overflow-hidden group"
        >
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-10 relative z-10">{title}</h4>
            
            <div className="relative w-56 h-56 mb-10 z-10 flex items-center justify-center">
                <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90 drop-shadow-2xl overflow-visible">
                    {data.map((item, i) => {
                        const sliceValue = (item.value / total) * 100;
                        const dashArray = `${sliceValue} 100`;
                        const dashOffset = -cumulativeValue;
                        cumulativeValue += sliceValue;
                        
                        return (
                            <motion.circle
                                key={i}
                                cx="16" cy="16" r="15.9155"
                                fill="transparent"
                                stroke={colors[i % colors.length]}
                                strokeWidth="32"
                                strokeDasharray={dashArray}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="flat"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 1.5, delay: i * 0.2, ease: "easeOut" }}
                                className="cursor-pointer hover:stroke-[34] transition-all duration-300"
                                style={{ strokeDashoffset: dashOffset }}
                            />
                        );
                    })}
                    {/* Gaps between slices for better definition */}
                    {data.length > 1 && data.map((item, i) => {
                        cumulativeValue = 0; // Reset for lines
                        let currentOffset = 0;
                        for(let j=0; j<i; j++) currentOffset += (data[j].value / total) * 100;
                        
                        return (
                            <line 
                                key={`gap-${i}`}
                                x1="16" y1="16" 
                                x2="32" y2="16"
                                stroke="white"
                                strokeWidth="0.5"
                                transform={`rotate(${(currentOffset * 3.6)}, 16, 16)`}
                            />
                        );
                    })}
                </svg>
                
                {/* Center content */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-sm w-28 h-28 rounded-full shadow-xl flex flex-col items-center justify-center border-4 border-gray-50/50">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">Total</span>
                        <span className="text-4xl font-black text-gray-900">{total}</span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase">Unidades</span>
                    </div>
                </div>
            </div>

            {/* List with improved number sizes */}
            <div className="w-full space-y-4 z-10">
                {data.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-all group/item">
                        <div className="flex items-center gap-4">
                            <div className="w-4 h-4 rounded-lg shadow-sm" style={{ backgroundColor: colors[i % colors.length] }}></div>
                            <span className="text-xs font-black text-gray-600 truncate max-w-[150px] group-hover/item:text-gray-900">{item.name}</span>
                        </div>
                        <div className="flex items-end gap-1.5 bg-gray-100/50 px-3 py-1.5 rounded-xl border border-gray-100">
                            <span className="text-sm font-black text-gray-900">{item.value}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase pb-0.5">u.</span>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

// --- Sub-components ---

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

const StatsView = ({ stats, onDetail, onGoToInventory, setMetricDetail, liveTotals }) => (
    <div className="space-y-10">
        <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-gray-900">Resumen General</h2>
            <div className="bg-white px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2 text-sm font-bold text-gray-500">
                {new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
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
            <div className="glass p-8 rounded-[2.5rem] bg-white shadow-sm border-white">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <AlertTriangle className="text-amber-500 h-6 w-6" /> Alertas de Inventario
                </h3>
                <div className="space-y-4">
                    {stats.alerts.out.map((name, i) => (
                        <div key={i} className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-center justify-between font-bold text-sm">
                            <span>{name} AGOTADO</span>
                            <button onClick={onGoToInventory} className="bg-red-200 px-2 py-1 rounded-lg text-[10px] uppercase font-bold hover:bg-red-300 transition-colors">URGENTE: Reponer</button>
                        </div>
                    ))}
                    {stats.alerts.low.map((name, i) => (
                        <div key={i} className="p-4 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-between font-bold text-sm">
                            <span>{name} por agotar</span>
                            <button onClick={onGoToInventory} className="text-[10px] uppercase underline font-bold hover:text-amber-900 transition-colors">Ver en inventario</button>
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

const InventoryView = ({ products, onUpdateStock, onAdd, onEdit }) => (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-2xl md:text-3xl font-black text-primary">Gestión de Inventario</h2>
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
                                    <img src={formatImageUrl(prod.image)} alt="" className="w-12 h-12 rounded-xl object-cover bg-gray-50" />
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
                                <button onClick={() => onEdit(prod)} className="p-3 text-gray-400 hover:text-accent rounded-xl hover:bg-accent/5 transition-all"><Edit2 className="h-5 w-5" /></button>
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
        <h2 className="text-2xl md:text-3xl font-black text-gray-900">Gestión de Pedidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map(order => (
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
                        <span className="text-xs text-gray-500">{order.items.length} productos</span>
                        <span className="text-lg font-black text-accent">${(order.total || 0).toFixed(2)}</span>
                    </div>
                </button>
            ))}
        </div>
    </div>
);

const InventoryHistoryView = ({ logs }) => (
    <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900">Histórico de Inventario (Kardex)</h3>
        <div className="bg-white rounded-[2rem] shadow-sm border border-white overflow-hidden overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Fecha</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Producto</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Tipo</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Cant.</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Stock Anterior</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Stock Nuevo</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {Array.isArray(logs) && logs.map(log => (
                        <tr key={log.id} className="text-sm">
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '---'}
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-800">{log.product_name || 'Desconocido'}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${log.change_type === 'sale' ? 'bg-red-50 text-red-500' :
                                    log.change_type === 'restock' ? 'bg-emerald-50 text-emerald-500' :
                                        'bg-blue-50 text-blue-500'
                                    }`}>
                                    {log.change_type === 'sale' ? 'Venta' :
                                        log.change_type === 'restock' ? 'Reposición' :
                                            log.change_type === 'bulk_upload' ? 'Carga Masiva' : 'Manual'}
                                </span>
                            </td>
                            <td className={`px-6 py-4 font-black ${log.quantity_changed > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}
                            </td>
                            <td className="px-6 py-4 text-gray-400">{log.previous_stock}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">{log.new_stock}</td>
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

    const handleUpdateChange = (id, val) => {
        setUpdates(prev => ({ ...prev, [id]: val }));
    };

    const handleSubmit = () => {
        const payload = Object.entries(updates)
            .filter(([_, qty]) => qty !== 0 && qty !== "")
            .map(([id, qty]) => ({
                id: parseInt(id),
                quantity: parseInt(qty),
                reason: "Carga masiva rápida"
            }));

        if (payload.length > 0) {
            onBulkUpdate(payload);
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Carga Rápida de Inventario</h3>
                    <p className="text-sm text-gray-500">Aumenta o disminuye el stock de múltiples productos a la vez.</p>
                </div>
                <button
                    onClick={handleSubmit}
                    className="bg-accent hover:bg-accent-dark text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-accent/20 transition-all"
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
                        {products.map(prod => {
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

const OrderModal = ({ order, onClose, onUpdateStatus, onDelete }) => {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_BASE_URL}/admin/upload-image`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.status === 'success') {
                onUpdateStatus(order.id, { payment_proof: data.url });
            }
        } catch (err) {
            console.error('Error uploading payment proof:', err);
        } finally {
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
                            {(order.items || []).map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-xs font-bold text-accent shadow-sm">{item.quantity}</span>
                                        <span className="font-bold text-gray-700">{item.name}</span>
                                    </div>
                                    <span className="font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="pt-4 mt-4 border-t border-gray-200 flex justify-between items-center">
                                <span className="text-lg font-black text-gray-900 uppercase tracking-widest">Total</span>
                                <span className="text-3xl font-black text-accent">${(order.total || 0).toFixed(2)}</span>
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
                                    <img src={formatImageUrl(order.payment_proof)} alt="Payment Proof" className="w-full h-64 object-contain rounded-xl" />
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
            const res = await fetch(`${API_BASE_URL}/admin/upload-image`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.status === 'success') {
                setImageUrl(data.url);
            }
        } catch (err) {
            console.error('Error uploading file:', err);
        } finally {
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
