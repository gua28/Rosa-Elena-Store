import { ShoppingCart, Menu, Heart, User as UserIcon, LayoutDashboard, LogOut } from 'lucide-react';

const Header = ({ cartCount, onCartClick, user, onPageChange, onLogout }) => {
    return (
        <header className="sticky top-0 z-50 w-full glass">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => onPageChange('shop')}>
                    <Heart className="text-primary h-6 w-6" />
                    <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                        Creaciones <span className="text-primary">Rosa Elena</span>
                    </h1>
                </div>

                <nav className="hidden md:flex items-center gap-8 text-gray-600 font-medium">
                    <button onClick={() => onPageChange('shop')} className="hover:text-primary transition-colors">Inicio</button>
                    <a href="#productos" className="hover:text-primary transition-colors">Productos</a>
                    <a href="#contacto" className="hover:text-primary transition-colors">Contacto</a>
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => onPageChange('admin')}
                            className="flex items-center gap-2 text-primary font-bold bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-all"
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
                                    onClick={() => onPageChange('profile')}
                                    className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-primary transition-colors"
                                >
                                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                        <UserIcon className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="hidden sm:inline">Hola, {user.name.split(' ')[0]}</span>
                                </button>
                                <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Cerrar Sesión">
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => onPageChange('login')}
                                className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-primary transition-colors"
                            >
                                <UserIcon className="h-5 w-5" />
                                <span>Ingresar</span>
                            </button>
                        )}
                    </div>

                    <button
                        onClick={onCartClick}
                        className="relative p-2 text-gray-600 hover:text-primary transition-colors"
                    >
                        <ShoppingCart className="h-6 w-6" />
                        {cartCount > 0 && (
                            <span className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                                {cartCount}
                            </span>
                        )}
                    </button>
                    <button className="md:hidden p-2 text-gray-600">
                        <Menu className="h-6 w-6" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
