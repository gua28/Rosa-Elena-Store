import React, { useState, useEffect } from 'react';
import { Package, Calendar, Clock, ArrowLeft, User as UserIcon, Phone, MapPin, Edit2, Save, X, Lock, Heart } from 'lucide-react';
import { formatImageUrl } from '../utils/imageUrl';

const UserProfile = ({ user, favorites = [], onToggleFavorite, onBack, onUpdateUser }) => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editForm, setEditForm] = useState({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        password: ''
    });

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await fetch(`http://${window.location.hostname}:8000/user/orders/${user.id}`);
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

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const dataToUpdate = { name: editForm.name, phone: editForm.phone, address: editForm.address };
            if (editForm.password) dataToUpdate.password = editForm.password;

            const response = await fetch(`http://${window.location.hostname}:8000/user/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToUpdate)
            });
            const data = await response.json();
            if (response.ok) {
                if (onUpdateUser) onUpdateUser(data.user);
                setIsEditing(false);
                setEditForm({ ...editForm, password: '' });
                alert('¡Perfil actualizado con éxito!');
            } else {
                alert(data.detail || 'Error al actualizar el perfil');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Error de conexión al actualizar el perfil');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-6xl">
                <button
                    onClick={onBack}
                    className="mb-8 flex items-center gap-2 text-gray-500 hover:text-accent transition-colors font-bold"
                >
                    <ArrowLeft className="h-4 w-4" /> Volver a la tienda
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Profile */}
                    <div className="lg:col-span-1">
                        <div className="glass p-8 rounded-[2rem] border-white/40 relative sticky top-24">
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-accent bg-white/50 hover:bg-white rounded-xl transition-all shadow-sm">
                                    <Edit2 className="h-4 w-4" />
                                </button>
                            )}

                            <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <UserIcon className="h-12 w-12 text-accent" />
                            </div>

                            {!isEditing ? (
                                <div className="text-center">
                                    <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                                    <p className="text-gray-500 text-sm mt-1 mb-6">{user.email}</p>

                                    <div className="space-y-4 text-left border-t border-gray-100 pt-6">
                                        <div className="flex items-start gap-3">
                                            <Phone className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Teléfono</div>
                                                <div className="text-sm font-medium text-gray-800">{user.phone || 'No registrado'}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <MapPin className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Dirección de envío</div>
                                                <div className="text-sm font-medium text-gray-800">{user.address || 'No registrada'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rol de cuenta</div>
                                        <div className="mt-1 pb-1 inline-block text-accent font-bold text-sm capitalize">{user.role}</div>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in zoom-in duration-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-gray-900">Editar Perfil</h3>
                                        <button type="button" onClick={() => setIsEditing(false)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-1 text-left">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Nombre</label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input type="text" required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-white/70 border border-gray-100 rounded-xl py-3 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm font-medium" />
                                        </div>
                                    </div>

                                    <div className="space-y-1 text-left">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Teléfono</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input type="text" placeholder="+58 412 1234567" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full bg-white/70 border border-gray-100 rounded-xl py-3 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm font-medium" />
                                        </div>
                                    </div>

                                    <div className="space-y-1 text-left">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Dirección de envío</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <textarea required placeholder="Calle, Referencia, Casa..." value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full bg-white/70 border border-gray-100 rounded-xl py-3 pl-10 pr-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm font-medium resize-y"></textarea>
                                        </div>
                                    </div>

                                    <div className="space-y-1 text-left">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Nueva Contraseña <span className="text-gray-400 normal-case font-normal">(opcional)</span></label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input type="password" placeholder="Solo si deseas cambiarla" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} className="w-full bg-white/70 border border-gray-100 rounded-xl py-3 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm font-medium" />
                                        </div>
                                    </div>

                                    <button type="submit" disabled={isSaving} className="w-full bg-accent hover:bg-accent-dark text-white py-3 rounded-xl font-bold shadow-md shadow-accent/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50">
                                        <Save className="h-4 w-4" />
                                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Main Content Areas */}
                    <div className="lg:col-span-3 space-y-12">
                        {/* Favorites Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                    <Heart className="h-6 w-6 text-accent fill-accent" />
                                    Mis Favoritos
                                </h3>
                                <span className="bg-white px-3 py-1 rounded-full border border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                    {favorites.length} modelos
                                </span>
                            </div>

                            {favorites.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {favorites.map((product) => (
                                        <div key={product.id} className="glass p-4 rounded-3xl border-white/40 flex items-center gap-4 group">
                                            <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-gray-100">
                                                <img src={formatImageUrl(product.image)} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                            </div>
                                            <div className="flex-grow">
                                                <h4 className="font-bold text-gray-800 text-sm line-clamp-1">{product.name}</h4>
                                                <p className="text-accent font-bold text-sm">${product.price.toFixed(2)}</p>
                                            </div>
                                            <button
                                                onClick={() => onToggleFavorite(product)}
                                                className="p-2 text-accent hover:bg-accent/10 rounded-xl transition-colors"
                                                title="Quitar de favoritos"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="glass p-12 rounded-[2.5rem] text-center border-white/40 border-dashed">
                                    <Heart className="h-10 w-10 text-gray-200 mx-auto mb-4" />
                                    <p className="text-gray-500 text-sm">¿Aún no tienes favoritos? ¡Heartéalo que te guste!</p>
                                </div>
                            )}
                        </div>

                        {/* Order History */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                    <Package className="h-6 w-6 text-accent" />
                                    Mis Pedidos
                                </h3>
                                <span className="bg-white px-3 py-1 rounded-full border border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-widest">
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
                                                    <div className="p-3 bg-accent/10 rounded-2xl text-accent font-bold">
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
                                                    <div className="text-lg font-bold text-accent">${order.total.toFixed(2)}</div>
                                                    <div className="text-[10px] font-bold text-green-500 uppercase">Procesando</div>
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                                <span>{order.items.length} productos</span>
                                                <button className="text-accent font-bold hover:underline">Ver detalles</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="glass p-20 rounded-[3rem] text-center border-white/40 border-dashed">
                                    <Package className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                                    <p className="text-gray-500 italic">Aún no has realizado pedidos.</p>
                                    <button
                                        onClick={onBack}
                                        className="mt-6 text-accent font-bold hover:underline"
                                    >
                                        ¡Empieza a comprar ahora!
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
