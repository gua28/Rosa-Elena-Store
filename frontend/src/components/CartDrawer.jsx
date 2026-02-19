import React from 'react';
import { X, Trash2, ShoppingBag, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CartDrawer = ({ isOpen, onClose, cart, onRemove, user, onOrderComplete }) => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col"
                    >
                        <div className="p-6 border-b flex items-center justify-between bg-primary-light/50">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="text-primary h-5 w-5" />
                                <h2 className="text-xl font-bold text-gray-800">Tu Pedido</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white rounded-full transition-colors"
                            >
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-6 space-y-4">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                                    <ShoppingBag className="h-16 w-16 opacity-20" />
                                    <p>Tu carrito está vacío</p>
                                </div>
                            ) : (
                                cart.map((item, index) => (
                                    <div key={index} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 items-center shadow-sm">
                                        <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
                                        <div className="flex-grow">
                                            <h4 className="font-bold text-gray-800 text-sm mb-1">{item.name}</h4>
                                            <p className="text-primary font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Cant: {item.quantity}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onRemove(index)}
                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-6 border-t bg-gray-50 space-y-4">
                                <div className="flex items-center justify-between text-lg font-bold px-2">
                                    <span className="text-gray-500">Total a pagar</span>
                                    <span className="text-primary text-2xl">${total.toFixed(2)}</span>
                                </div>

                                <button
                                    onClick={async () => {
                                        const currentTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                        try {
                                            const response = await fetch('http://localhost:8000/order', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    user_id: user?.id || null,
                                                    customer_name: user?.name || "Invitado",
                                                    items: cart.map(item => ({
                                                        id: item.id,
                                                        name: item.name,
                                                        price: item.price,
                                                        quantity: item.quantity
                                                    })),
                                                    total: currentTotal
                                                })
                                            });

                                            const data = await response.json();
                                            if (response.ok) {
                                                alert('¡Pedido registrado! Stock actualizado. Redirigiendo a WhatsApp...');
                                                const whatsappMsg = encodeURIComponent(`Hola, acabo de hacer un pedido (#${data.order_id}). Total: $${currentTotal.toFixed(2)}`);
                                                window.open(`https://wa.me/584127827734?text=${whatsappMsg}`, '_blank');
                                                onOrderComplete();
                                                onClose();
                                                // Refresh page to update shop stock
                                                window.location.reload();
                                            } else {
                                                alert(data.detail || 'Error al procesar el pedido.');
                                            }
                                        } catch (error) {
                                            console.error('API Error:', error);
                                            alert('No se pudo conectar con el servidor.');
                                        }
                                    }}
                                    className="w-full bg-primary hover:bg-primary-dark text-white py-5 rounded-[2rem] font-bold shadow-xl shadow-primary/20 transition-all text-lg"
                                >
                                    Confirmar y Pagar
                                </button>
                                <p className="text-[10px] text-center text-gray-400 font-medium">
                                    Al confirmar, el stock será reservado para tu pedido.
                                </p>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CartDrawer;
