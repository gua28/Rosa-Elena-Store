import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, Plus, Minus, CreditCard, Camera, CheckCircle, Copy, ExternalLink, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatImageUrl } from '../utils/imageUrl';
import { supabase } from '../utils/supabaseClient';

const CartDrawer = ({ isOpen, onClose, cart, onRemove, user, onOrderComplete, settings }) => {
    const [step, setStep] = useState('cart'); // 'cart', 'payment', 'success'
    const [orderId, setOrderId] = useState(null);
    const [reportingPayment, setReportingPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [reference, setReference] = useState('');
    const [receiptUrl, setReceiptUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleClose = () => {
        if (step === 'success') {
            onOrderComplete();
            setStep('cart');
            setOrderId(null);
        }
        onClose();
    };

    const handleCreateOrder = async () => {
        try {
            // 1. Create the Order
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    user_id: user?.id || null,
                    customer_name: user?.name || "Invitado",
                    customer_phone: user?.phone || "",
                    customer_address: user?.address || "",
                    total: total,
                    status: 'procesando',
                    timestamp: new Date().toISOString(),
                    items_json: JSON.stringify(cart)
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            const newOrderId = orderData.id;

            // 2. Insert Order Items
            const orderItems = cart.map(item => ({
                order_id: newOrderId,
                product_name: item.name,
                product_id: item.id,
                price: item.price,
                quantity: item.quantity
            }));

            const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
            if (itemsError) throw itemsError;

            // 3. Update Stock & Logs (for each item)
            for (const item of cart) {
                const { data: currentProd } = await supabase.from('products').select('stock').eq('id', item.id).single();
                const oldStock = currentProd?.stock || 0;
                const newStock = Math.max(0, oldStock - item.quantity);

                await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
                
                await supabase.from('inventory_logs').insert([{
                    product_id: item.id,
                    change_type: 'sale',
                    quantity_changed: -item.quantity,
                    previous_stock: oldStock,
                    new_stock: newStock,
                    timestamp: new Date().toISOString()
                }]);
            }

            setOrderId(newOrderId);
            setStep('payment');
        } catch (error) {
            console.error('Supabase Error:', error);
            alert('Error al procesar el pedido: ' + (error.message || 'Error desconocido'));
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // SOLUCIÓN: Usar conversión a Base64 local para evitar problemas con buckets de Supabase.
            // Redimensionamos la imagen para que sea súper ligera y no sature la base de datos.
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
                    
                    // Comprimir la imagen al 60% de calidad en JPEG
                    const base64String = canvas.toDataURL('image/jpeg', 0.6);
                    setReceiptUrl(base64String);
                    setIsUploading(false);
                };
                img.onerror = () => {
                   alert('Error al procesar la imagen.');
                   setIsUploading(false);
                };
            };
            reader.onerror = () => {
                alert('Error al cargar el archivo original.');
                setIsUploading(false);
            };
        } catch (err) {
            console.error('Upload error:', err);
            alert('Ha ocurrido un error inesperado al subir el comprobante.');
            setIsUploading(false);
        }
    };

    const handleReportPayment = async () => {
        if (!paymentMethod || !reference || !receiptUrl) {
            alert('Por favor, completa todos los campos del reporte de pago.');
            return;
        }

        setReportingPayment(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    payment_proof: receiptUrl,
                    payment_method: paymentMethod,
                    payment_reference: reference,
                    status: 'esperando pago'
                })
                .eq('id', orderId);

            if (!error) {
                // Enviar también a WhatsApp para respaldo
                const message = `✅ *PAGO REPORTADO - Pedido #${orderId}*\n\n` +
                    `*Cliente:* ${user?.name || "Invitado"}\n` +
                    `*Método:* ${paymentMethod}\n` +
                    `*Ref:* ${reference}\n` +
                    `*Total:* $${total.toFixed(2)}\n\n` +
                    `Ya cargué el comprobante en la web.`;

                const whatsappMsg = encodeURIComponent(message);
                window.open(`https://wa.me/${settings?.contact_phone || '584127827734'}?text=${whatsappMsg}`, '_blank');
                
                setStep('success');
            } else {
                throw error;
            }
        } catch (error) {
            console.error('Report error:', error);
            alert('Error al reportar pago: ' + error.message);
        } finally {
            setReportingPayment(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Copiado al portapapeles');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b flex items-center justify-between bg-accent/5">
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="text-accent h-5 w-5" />
                                <h2 className="text-xl font-bold text-accent-dark">
                                    {step === 'cart' ? 'Tu Pedido' : step === 'payment' ? 'Pagar Pedido' : '¡Pedido Exitoso!'}
                                </h2>
                            </div>
                            <button onClick={handleClose} className="p-2 hover:bg-white rounded-full transition-colors">
                                <X className="h-6 w-6 text-accent" />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto">
                            {/* STEP 1: CART */}
                            {step === 'cart' && (
                                <div className="p-6 space-y-4">
                                    {cart.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-accent/50 gap-4 py-20">
                                            <ShoppingBag className="h-16 w-16 opacity-20" />
                                            <p className="font-bold">Tu carrito está vacío</p>
                                        </div>
                                    ) : (
                                        cart.map((item, index) => (
                                            <div key={index} className="flex gap-4 p-4 bg-white rounded-2xl border border-accent/10 items-center shadow-sm">
                                                <img src={formatImageUrl(item.image)} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
                                                <div className="flex-grow">
                                                    <h4 className="font-bold text-accent-dark text-sm mb-1">{item.name}</h4>
                                                    <p className="text-accent font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                                                    <span className="text-[10px] font-bold text-accent/70 uppercase">Cant: {item.quantity}</span>
                                                </div>
                                                <button onClick={() => onRemove(index)} className="p-2 text-accent/50 hover:text-red-500 transition-colors">
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* STEP 2: PAYMENT */}
                            {step === 'payment' && (
                                <div className="p-6 space-y-8">
                                    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2.5rem] text-center shadow-sm">
                                        <p className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.3em] mb-2">Monto a Transferir</p>
                                        <div className="space-y-1">
                                            <p className="text-4xl font-black text-emerald-700">${total.toFixed(2)}</p>
                                            {settings?.currency_rate && (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] text-emerald-500 font-bold">O EQUIVALENTE A:</span>
                                                    <p className="text-2xl font-black text-emerald-600">BS {(total * parseFloat(settings.currency_rate)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                    <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-tighter mt-1">(TASA: {settings.currency_rate} BS/$)</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-1/2 h-px bg-emerald-100 mx-auto my-4"></div>
                                        <p className="text-[10px] text-emerald-600/70 font-bold">ID PEDIDO: #{orderId}</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <CreditCard className="h-3 w-3" /> Métodos Disponibles
                                            </h4>
                                            
                                            <div className="space-y-3">
                                                {/* Pago Móvil */}
                                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group relative">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-[10px] font-black text-primary uppercase">Pago Móvil</p>
                                                            <p className="font-bold text-gray-800">{settings?.payment_movil_bank || 'Banco Mercantil (0105)'}</p>
                                                            <p className="text-sm text-gray-600">{settings?.payment_movil_doc || 'V-12.345.678'} • {settings?.payment_movil_phone || '0412-7827734'}</p>
                                                        </div>
                                                        <button onClick={() => copyToClipboard(`${settings?.payment_movil_doc} ${settings?.payment_movil_phone}`)} className="p-2 bg-white rounded-lg shadow-sm hover:text-accent opacity-0 group-hover:opacity-100 transition-all"><Copy className="h-4 w-4" /></button>
                                                    </div>
                                                </div>

                                                {/* Binance Pay */}
                                                <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 group">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-yellow-400 p-2 rounded-lg text-black"><QrCode className="h-5 w-5" /></div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-yellow-700 uppercase">Binance Pay (USDT)</p>
                                                                <p className="font-bold text-gray-800">ID: {settings?.payment_binance_id || '245678901'}</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => copyToClipboard(settings?.payment_binance_id || '245678901')} className="p-2 bg-white rounded-lg shadow-sm hover:text-yellow-600"><Copy className="h-4 w-4" /></button>
                                                    </div>
                                                </div>

                                                {/* PayPal */}
                                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-blue-600 p-2 rounded-lg text-white"><ExternalLink className="h-5 w-5" /></div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-blue-700 uppercase">PayPal</p>
                                                                <p className="font-bold text-gray-800">{settings?.payment_paypal_email || 'rosaelena@email.com'}</p>
                                                            </div>
                                                        </div>
                                                        <a href={settings?.payment_paypal_url || "https://paypal.me/RosaElenaCreaciones"} target="_blank" rel="noreferrer" className="bg-blue-600 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold">IR A PAGAR</a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-gray-100 space-y-4">
                                            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest text-center">Reportar Mi Pago</h4>
                                            
                                            <div className="space-y-3">
                                                <select 
                                                    value={paymentMethod} 
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:border-accent"
                                                >
                                                    <option value="">Selecciona Método</option>
                                                    <option value="Pago Movil">Pago Móvil</option>
                                                    <option value="Binance">Binance Pay</option>
                                                    <option value="PayPal">PayPal</option>
                                                </select>

                                                <input 
                                                    type="text" 
                                                    placeholder="Número de Referencia" 
                                                    value={reference}
                                                    onChange={(e) => setReference(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:outline-none focus:border-accent"
                                                />

                                                <label className={`w-full h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${receiptUrl ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-accent hover:bg-accent/5'}`}>
                                                    {isUploading ? (
                                                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent" />
                                                    ) : receiptUrl ? (
                                                        <>
                                                            <CheckCircle className="text-emerald-500 h-8 w-8" />
                                                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Comprobante Cargado</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Camera className="text-gray-400 h-8 w-8" />
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Subir Foto Comprobante</span>
                                                        </>
                                                    )}
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: SUCCESS */}
                            {step === 'success' && (
                                <div className="p-10 flex flex-col items-center justify-center text-center h-full space-y-6">
                                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle className="h-12 w-12 text-emerald-500" />
                                    </div>
                                    <h3 className="text-3xl font-black text-gray-900 leading-tight">¡Pago Reportado Exitosamente!</h3>
                                    <p className="text-gray-500 font-medium">
                                        Hemos recibido tu reporte. El equipo de Rosa Elena verificará tu pago y procesará tu pedido a la brevedad.
                                    </p>
                                    <div className="bg-gray-50 p-4 rounded-2xl w-full border border-gray-100">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Referencia Guardada</p>
                                        <p className="font-bold text-gray-800">{reference}</p>
                                    </div>
                                    <button 
                                        onClick={handleClose}
                                        className="w-full bg-primary text-white py-5 rounded-[2rem] font-bold shadow-xl transition-all"
                                    >
                                        Volver a la Tienda
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer Button for Step 1 */}
                        {step === 'cart' && cart.length > 0 && (
                            <div className="p-6 border-t bg-accent/5 space-y-4">
                                <div className="flex flex-col gap-1 px-2 mb-2">
                                    <div className="flex items-center justify-between text-lg font-bold">
                                        <span className="text-accent-dark">Total en Dólares</span>
                                        <span className="text-accent text-2xl">${total.toFixed(2)}</span>
                                    </div>
                                    {settings?.currency_rate && (
                                        <div className="flex items-center justify-between text-emerald-600">
                                            <span className="text-sm font-bold uppercase tracking-widest">Total en Bolívares</span>
                                            <span className="text-xl font-black">BS {(total * parseFloat(settings.currency_rate)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleCreateOrder}
                                    className="w-full bg-accent hover:bg-accent-dark text-white py-5 rounded-[2rem] font-bold shadow-xl shadow-accent/20 transition-all text-lg"
                                >
                                    Confirmar y Pagar
                                </button>
                            </div>
                        )}

                        {/* Footer Button for Step 2 */}
                        {step === 'payment' && (
                            <div className="p-6 border-t bg-white">
                                <button
                                    onClick={handleReportPayment}
                                    disabled={reportingPayment || isUploading}
                                    className="w-full bg-accent hover:bg-accent-dark text-white py-5 rounded-[2rem] font-bold shadow-xl shadow-accent/20 transition-all text-lg disabled:opacity-50"
                                >
                                    {reportingPayment ? 'Reportando...' : 'Finalizar Reporte'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CartDrawer;
