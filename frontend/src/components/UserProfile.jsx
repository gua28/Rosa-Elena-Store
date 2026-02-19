import React, { useState, useEffect } from 'react';
import { Package, Calendar, Clock, ArrowLeft, User as UserIcon } from 'lucide-react';

const UserProfile = ({ user, onBack }) => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await fetch(`http://localhost:8000/user/orders/${user.id}`);
                const data = await response.json();
                setOrders(data);
            } catch (error) {
                console.error('Error fetching orders:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, [user.id]);

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-4xl">
                <button
                    onClick={onBack}
                    className="mb-8 flex items-center gap-2 text-gray-500 hover:text-primary transition-colors font-medium"
                >
                    <ArrowLeft className="h-4 w-4" /> Volver a la tienda
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar Profile */}
                    <div className="lg:col-span-1">
                        <div className="glass p-8 rounded-[2rem] text-center border-white/40">
                            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <UserIcon className="h-12 w-12 text-primary" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                            <p className="text-gray-500 text-sm mt-1">{user.email}</p>
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rol de usuario</div>
                                <div className="mt-2 text-primary font-bold capitalize">{user.role}</div>
                            </div>
                        </div>
                    </div>

                    {/* Order History */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                <Package className="h-6 w-6 text-primary" />
                                Mis Pedidos
                            </h3>
                            <span className="bg-white px-3 py-1 rounded-full border border-gray-100 text-xs font-bold text-gray-500">
                                {orders.length} pedidos
                            </span>
                        </div>

                        {isLoading ? (
                            <div className="py-20 text-center text-gray-400">Cargando tus pedidos...</div>
                        ) : orders.length > 0 ? (
                            <div className="space-y-4">
                                {orders.map((order) => (
                                    <div key={order.id} className="glass p-6 rounded-3xl border-white/40 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-primary/10 rounded-2xl text-primary font-bold">
                                                    #{order.id}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">Pedido Recibido</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(order.timestamp).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-primary">${order.total.toFixed(2)}</div>
                                                <div className="text-[10px] font-bold text-green-500 uppercase">Procesando</div>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                            <span>{order.items.length} productos</span>
                                            <button className="text-primary font-bold hover:underline">Ver detalles</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass p-20 rounded-[3rem] text-center border-white/40 border-dashed">
                                <Package className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500">Aún no has realizado pedidos.</p>
                                <button
                                    onClick={onBack}
                                    className="mt-6 text-primary font-bold hover:underline"
                                >
                                    ¡Empieza a comprar ahora!
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
