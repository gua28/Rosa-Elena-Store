import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Plus, Minus, AlertCircle, X, Sparkles, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatImageUrl } from '../utils/imageUrl';

const ProductCard = ({ product, onAddToCart, isFavorite, onToggleFavorite }) => {
    const [quantity, setQuantity] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);
    const [viewerScale, setViewerScale] = useState(1);
    const isOutOfStock = product.stock === 0;
    const isLowStock = product.stock > 0 && product.stock < 5;

    useEffect(() => {
        if (isZoomed) {
            document.body.style.overflow = 'hidden';
            // Hide header if it exists
            const header = document.querySelector('header');
            if (header) header.style.zIndex = '0';
        } else {
            document.body.style.overflow = 'auto';
            const header = document.querySelector('header');
            if (header) header.style.zIndex = '50';
        }
        return () => {
            document.body.style.overflow = 'auto';
            const header = document.querySelector('header');
            if (header) header.style.zIndex = '50';
        };
    }, [isZoomed]);

    const handleIncrease = () => {
        if (quantity < product.stock) {
            setQuantity(quantity + 1);
        }
    };

    const handleDecrease = () => {
        if (quantity > 1) {
            setQuantity(quantity - 1);
        }
    };

    const handleAddToCart = (e) => {
        e.stopPropagation();
        onAddToCart({ ...product, quantity });
        setIsModalOpen(false);
    };

    return (
        <>
            {/* Minimalist Card View */}
            <motion.div
                layoutId={`card-${product.id}`}
                onClick={() => setIsModalOpen(true)}
                className="glass rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-500 border-white/40 flex flex-col h-full bg-white/40 cursor-pointer relative"
            >
                <div className="relative h-72 md:h-96 w-full bg-slate-100 overflow-hidden">
                    <img
                        src={formatImageUrl(product.image)}
                        alt={product.name}
                        className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
                    />

                    {/* Floating Heart Checkbox */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite();
                        }}
                        className={`absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-md rounded-full transition-all shadow-lg active:scale-90 z-10 ${isFavorite ? 'text-accent' : 'text-gray-400 hover:text-accent'}`}
                    >
                        <Heart className={`h-4 w-4 transition-all ${isFavorite ? 'fill-accent' : ''}`} />
                    </button>

                    {/* Stock Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {isOutOfStock && (
                            <span className="bg-gray-900/80 backdrop-blur-md text-white text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                                Agotado
                            </span>
                        )}
                        {isLowStock && (
                            <span className="bg-accent/80 backdrop-blur-md text-white text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg animate-pulse">
                                ¡Últimos!
                            </span>
                        )}
                    </div>

                    {/* Quick Name Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                        <h3 className="text-white font-bold text-lg leading-tight group-hover:translate-x-2 transition-transform">
                            {product.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-accent font-black text-sm">${product.price.toFixed(2)}</span>
                            <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Ver detalles</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Detailed Product Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="fixed inset-0 bg-primary-dark/40 backdrop-blur-md z-[100]"
                        />
                        <motion.div
                            layoutId={`card-${product.id}`}
                            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl bg-white rounded-[3rem] shadow-2xl z-[110] overflow-hidden flex flex-col md:flex-row"
                        >
                            {/* Close Button Mobile */}
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-6 right-6 p-3 bg-black/10 hover:bg-black/20 rounded-full text-white z-20 md:hidden"
                            >
                                <X className="h-6 w-6" />
                            </button>

                            {/* Left: Product Image with Zoom trigger */}
                            <div
                                className="w-full md:w-1/2 h-72 md:h-auto bg-slate-50 relative group/image cursor-zoom-in overflow-hidden"
                                onClick={() => setIsZoomed(true)}
                            >
                                <img
                                    src={formatImageUrl(product.image)}
                                    alt={product.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors flex items-center justify-center">
                                    <div className="opacity-0 group-hover/image:opacity-100 bg-white/20 backdrop-blur-md p-4 rounded-full text-white transition-all transform scale-90 group-hover/image:scale-100 shadow-xl border border-white/20">
                                        <Maximize2 className="h-6 w-6" />
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-[8px] font-bold uppercase tracking-[0.2em] group-hover/image:opacity-0 transition-opacity">Haz clic para ampliar</div>
                            </div>

                            {/* Right: Product Details */}
                            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col h-full bg-white relative">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="absolute top-8 right-8 p-2 text-gray-400 hover:text-accent transition-colors hidden md:block"
                                >
                                    <X className="h-6 w-6" />
                                </button>

                                <div className="mb-auto">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="px-3 py-1 bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest rounded-full">
                                            {product.category || 'Creación Premium'}
                                        </span>
                                        {isLowStock && <span className="text-accent text-[10px] font-bold flex items-center gap-1 animate-pulse"><Sparkles className="h-3 w-3" /> ¡Pieza única!</span>}
                                    </div>

                                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-tight">
                                        {product.name}
                                    </h2>

                                    <div className="text-3xl font-black text-accent mb-6 flex items-baseline gap-1">
                                        <span className="text-lg font-bold">$</span>
                                        {product.price.toFixed(2)}
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción</h4>
                                        <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                                            {product.description || "Esta hermosa pieza está elaborada a mano con materiales de la más alta calidad y un cuidado meticuloso en cada detalle. Ideal para momentos especiales."}
                                        </p>
                                    </div>
                                </div>

                                {/* Controls Footer */}
                                <div className="pt-8 border-t border-gray-100">
                                    <div className="flex items-center justify-between gap-4 mb-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cantidad</span>
                                            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                                                <button
                                                    onClick={handleDecrease}
                                                    disabled={isOutOfStock}
                                                    className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:text-accent transition-all active:scale-90 disabled:opacity-30"
                                                >
                                                    <Minus className="h-5 w-5" />
                                                </button>
                                                <span className="w-8 text-center font-black text-gray-800">{quantity}</span>
                                                <button
                                                    onClick={handleIncrease}
                                                    disabled={isOutOfStock}
                                                    className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:text-accent transition-all active:scale-90 disabled:opacity-30"
                                                >
                                                    <Plus className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Subtotal</span>
                                            <span className="text-2xl font-black text-gray-900">${(product.price * quantity).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <button
                                        disabled={isOutOfStock}
                                        onClick={handleAddToCart}
                                        className={`w-full py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${isOutOfStock
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-accent hover:bg-accent-dark text-white shadow-accent/40'
                                            }`}
                                    >
                                        <ShoppingCart className="h-6 w-6" />
                                        {isOutOfStock ? 'AGOTADO' : 'AÑADIR AL CARRITO'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Immersive Full-Screen Image Viewer */}
            <AnimatePresence>
                {isZoomed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999999] bg-black/98 backdrop-blur-3xl flex items-center justify-center overflow-hidden"
                        onWheel={(e) => {
                            if (e.deltaY < 0) setViewerScale(s => Math.min(5, s + 0.2));
                            else setViewerScale(s => Math.max(1, s - 0.2));
                        }}
                        onTouchMove={(e) => {
                            if (e.touches.length === 2) {
                                const dist = Math.hypot(
                                    e.touches[0].pageX - e.touches[1].pageX,
                                    e.touches[0].pageY - e.touches[1].pageY
                                );
                                if (window.pinchDist) {
                                    const zoom = dist / window.pinchDist;
                                    setViewerScale(s => Math.min(5, Math.max(1, s * zoom)));
                                }
                                window.pinchDist = dist;
                            }
                        }}
                        onTouchEnd={() => { window.pinchDist = null; }}
                    >
                        {/* High Visibility Close Button for Mobile/Desktop */}
                        <button
                            onClick={(e) => { 
                                e.stopPropagation();
                                setIsZoomed(false); 
                                setViewerScale(1); 
                            }}
                            className="absolute top-10 right-10 p-5 bg-white text-black rounded-full shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-110 active:scale-90 transition-all z-[1000000] border-2 border-white"
                        >
                            <X className="h-7 w-7" />
                        </button>

                        {/* Draggable Image */}
                        <motion.div
                            drag
                            dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
                            dragElastic={0.1}
                            className="relative w-full h-full flex items-center justify-center p-4 md:p-12 cursor-move"
                        >
                            <motion.img
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: viewerScale, opacity: 1 }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                src={formatImageUrl(product.image)}
                                alt={product.name}
                                className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-xl pointer-events-none select-none"
                            />
                        </motion.div>

                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ProductCard;
