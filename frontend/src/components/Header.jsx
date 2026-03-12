import React, { useState } from 'react';
import { ShoppingCart, Menu, Heart, User as UserIcon, LayoutDashboard, LogOut, X } from 'lucide-react';

const Header = ({ cartCount, onCartClick, user, onPageChange, onLogout }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handlePageChange = (page) => {
        onPageChange(page);
        setIsMenuOpen(false);
    };

    return (
        <header className="sticky top-0 z-50 w-full glass">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handlePageChange('shop')}>
                    <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                        Creaciones <span className="text-accent italic">Rosa Elena</span>
                    </h1>
                </div>

                <nav className="hidden md:flex items-center gap-8 text-gray-600 font-medium">
                    <button onClick={() => handlePageChange('home')} className="hover:text-accent transition-colors">Inicio</button>
                    <button onClick={() => handlePageChange('shop')} className="hover:text-accent transition-colors">Productos</button>
                    <a href="#contacto" className="hover:text-accent transition-colors">Contacto</a>
                    {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'owner') && (
                        <button
                            onClick={() => handlePageChange('admin')}
                            className="flex items-center gap-2 text-accent font-bold bg-accent/10 px-3 py-1.5 rounded-xl hover:bg-accent/20 transition-all font-bold"
                        >
                            <LayoutDashboard className="h-4 w-4" /> Panel
                        </button>
                    )}
                </nav>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 border-r pr-4 border-gray-100">
                        {user ? (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handlePageChange('profile')}
                                    className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-accent transition-colors"
                                >
                                    <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center">
                                        <UserIcon className="h-4 w-4 text-accent" />
                                    </div>
                                    <span className="hidden sm:inline">Hola, {user.name.split(' ')[0]}</span>
                                </button>
                                <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors hidden sm:block" title="Cerrar Sesión">
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => handlePageChange('login')}
                                className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-accent transition-colors"
                            >
                                <UserIcon className="h-5 w-5" />
                                <span className="hidden xs:inline">Ingresar</span>
                            </button>
                        )}
                    </div>

                    <button
                        onClick={onCartClick}
                        className="relative p-2 text-gray-600 hover:text-accent transition-colors"
                    >
                        <ShoppingCart className="h-6 w-6" />
                        {cartCount > 0 && (
                            <span className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                                {cartCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden glass border-t border-gray-100 animate-in slide-in-from-top duration-300">
                    <div className="flex flex-col p-4 gap-4">
                        <button onClick={() => handlePageChange('home')} className="text-left py-2 px-4 hover:bg-accent/5 rounded-xl transition-colors font-medium text-gray-700">Inicio</button>
                        <button onClick={() => handlePageChange('shop')} className="text-left py-2 px-4 hover:bg-accent/5 rounded-xl transition-colors font-medium text-gray-700">Productos</button>
                        <a href="#contacto" onClick={() => setIsMenuOpen(false)} className="text-left py-2 px-4 hover:bg-accent/5 rounded-xl transition-colors font-medium text-gray-700">Contacto</a>
                        {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'owner') && (
                            <button
                                onClick={() => handlePageChange('admin')}
                                className="flex items-center gap-2 text-accent font-bold bg-accent/10 px-4 py-3 rounded-xl hover:bg-accent/20 transition-all"
                            >
                                <LayoutDashboard className="h-4 w-4" /> Administrar Tienda
                            </button>
                        )}
                        {user && (
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-2 text-red-500 font-bold bg-red-50 px-4 py-3 rounded-xl hover:bg-red-100 transition-all text-left"
                            >
                                <LogOut className="h-4 w-4" /> Cerrar Sesión
                            </button>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
