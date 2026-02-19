import React, { useState } from 'react';
import { Heart, ShoppingCart, Plus, Minus, AlertCircle } from 'lucide-react';

const ProductCard = ({ product, onAddToCart }) => {
    const [quantity, setQuantity] = useState(1);
    const isOutOfStock = product.stock === 0;
    const isLowStock = product.stock > 0 && product.stock < 5;

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

    return (
        <div className="glass rounded-[2.5rem] overflow-hidden group hover:shadow-2xl transition-all duration-500 border-white/40 flex flex-col h-full bg-white/40 backdrop-blur-xl">
            <div className="relative aspect-square overflow-hidden">
                <img
                    src={product.image}
                    alt={product.name}
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
                />
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <button className="p-3 bg-white/90 backdrop-blur-md rounded-full text-primary hover:bg-primary hover:text-white transition-all shadow-lg active:scale-90">
                        <Heart className="h-5 w-5" />
                    </button>
                    {isOutOfStock && (
                        <span className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                            Agotado
                        </span>
                    )}
                    {isLowStock && (
                        <span className="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg animate-pulse">
                            ¡Por Agotar!
                        </span>
                    )}
                </div>

                {product.category && (
                    <div className="absolute bottom-4 left-4">
                        <span className="px-3 py-1 bg-white/80 backdrop-blur-md text-[10px] font-bold text-gray-500 rounded-lg uppercase tracking-wider">
                            {product.category}
                        </span>
                    </div>
                )}
            </div>

            <div className="p-6 flex flex-col flex-grow">
                <div className="flex-grow">
                    <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-primary transition-colors">
                        {product.name}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed mb-4">
                        {product.description}
                    </p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100/50">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-black text-gray-900">
                            ${(product.price * quantity).toFixed(2)}
                        </span>
                        <span className="text-xs font-bold text-gray-400">
                            {isOutOfStock ? 'Sin stock' : `${product.stock} unidades`}
                        </span>
                    </div>

                    {!isOutOfStock && (
                        <div className="flex items-center gap-3 mb-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                            <button
                                onClick={handleDecrease}
                                className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm hover:text-primary transition-all active:scale-90"
                            >
                                <Minus className="h-4 w-4" />
                            </button>
                            <span className="flex-grow text-center font-bold text-gray-700">{quantity}</span>
                            <button
                                onClick={handleIncrease}
                                className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm hover:text-primary transition-all active:scale-90"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    <button
                        disabled={isOutOfStock}
                        onClick={() => onAddToCart({ ...product, quantity })}
                        className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${isOutOfStock
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-primary hover:bg-primary-dark text-white shadow-primary/20'
                            }`}
                    >
                        <ShoppingCart className="h-5 w-5" />
                        {isOutOfStock ? 'No disponible' : 'Añadir al Carrito'}
                    </button>

                    {isLowStock && (
                        <p className="text-[10px] text-primary font-bold mt-2 text-center flex items-center justify-center gap-1">
                            <AlertCircle className="h-3 w-3" /> ¡Asegura el tuyo antes que se acaben!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
