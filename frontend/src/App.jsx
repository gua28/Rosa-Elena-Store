import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import ProductCard from './components/ProductCard';
import CartDrawer from './components/CartDrawer';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import UserProfile from './components/UserProfile';
import AdminDashboard from './components/AdminDashboard';
import { supabase } from './utils/supabaseClient';
import { Heart, Sparkles, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (product) => {
    setFavorites(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('products').select('*').order('id');
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      const settingsMap = data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
      setSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  // Load user and products
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));

    fetchProducts();
    fetchSettings();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setCurrentPage('shop');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setCurrentPage('shop');
  };

  const addToCart = (product) => {
    setCart([...cart, product]);
    setIsCartOpen(true);
  };

  const removeFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const resetCart = () => setCart([]);

  // Rendering logic
  if (currentPage === 'login') {
    return <LoginPage
      onBack={() => setCurrentPage('shop')}
      onLogin={handleLogin}
      onGoToRegister={() => setCurrentPage('register')}
    />;
  }

  if (currentPage === 'register') {
    return <RegisterPage
      onBack={() => setCurrentPage('shop')}
      onRegisterSuccess={() => setCurrentPage('login')}
    />;
  }

  const isAdminOrOwner = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'owner';

  if (currentPage === 'admin' && isAdminOrOwner) {
    return (
      <AdminDashboard 
        user={user}
        onLogout={handleLogout} 
        onBack={() => { fetchProducts(); fetchSettings(); setCurrentPage('shop'); }} 
        fetchSettings={fetchSettings} 
        settings={settings} 
      />
    );
  }

  if (currentPage === 'profile' && user) {
    return (
      <UserProfile
        user={user}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onBack={() => setCurrentPage('shop')}
        onUpdateUser={(newUserData) => {
          setUser(newUserData);
          localStorage.setItem('user', JSON.stringify(newUserData));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header
        cartCount={cart.length}
        onCartClick={() => setIsCartOpen(true)}
        user={user}
        onPageChange={setCurrentPage}
        onLogout={handleLogout}
      />

      <main className="flex-grow pt-16 md:pt-0">
        {currentPage === 'home' && (
          <section className="relative min-h-[90vh] flex items-center py-16 bg-[#fcfaf7] overflow-hidden">
            {/* Subtle logo watermark in the background */}
            <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.07] pointer-events-none overflow-hidden scale-150 select-none grayscale-[0.3]">
              <img
                src="/logo.png?v=4"
                alt=""
                className="w-full h-full object-contain mix-blend-multiply"
              />
            </div>

            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-sage/5 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl opacity-30"></div>

            <div className="container mx-auto px-4 relative z-10 text-center">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="space-y-6"
              >
                <h1 className="flex flex-col items-center leading-none">
                  <span className="text-4xl md:text-7xl font-light text-primary/60 uppercase tracking-[0.4em] mb-2">Creaciones</span>
                  <span className="text-3xl md:text-5xl font-black text-accent italic whitespace-nowrap select-none drop-shadow-sm">Rosa Elena</span>
                </h1>

                <p className="text-accent/70 max-w-xl mx-auto mt-6 mb-12 text-base md:text-lg font-medium italic">
                  <Heart className="inline-block h-4 w-4 mr-2 fill-accent/20" />
                  "Cada Creación, Un Pedacito De Amor"
                </p>

                <div className="flex flex-wrap justify-center gap-6">
                  <button
                    onClick={() => setCurrentPage('shop')}
                    className="bg-accent hover:bg-accent-dark text-white px-10 py-5 rounded-[2.5rem] font-bold shadow-xl shadow-accent/20 transition-all flex items-center gap-3 text-lg"
                  >
                    Entrar a la Tienda
                    <Heart className="h-6 w-6" />
                  </button>
                  <a href="#contacto" className="bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10 px-10 py-5 rounded-[2.5rem] font-bold transition-all text-lg flex items-center gap-3">
                    ¿Dónde estamos?
                  </a>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {currentPage === 'shop' && (
          <>
            <section id="productos" className="relative py-24 overflow-hidden">
              {/* Subtle logo watermark in the background */}
              <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.05] pointer-events-none overflow-hidden scale-150 select-none grayscale-[0.3]">
                <img
                  src="/logo.png?v=4"
                  alt=""
                  className="w-full h-full object-contain mix-blend-multiply"
                />
              </div>

              <div className="container mx-auto px-4 relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                <div className="space-y-4">
                  <div className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wider">Catálogo {new Date().getFullYear()}</div>
                  <h2 className="text-4xl font-extrabold text-gray-900">Nuestras Creaciones</h2>
                  <div className="h-1.5 w-24 bg-primary rounded-full"></div>
                </div>
              </div>

              <div className="space-y-20">
                {Object.entries(
                  products.reduce((acc, product) => {
                    const cat = product.category || 'Otros';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(product);
                    return acc;
                  }, {})
                ).map(([category, items]) => (
                  <div key={category} className="mb-4">
                    <h3 className="text-3xl font-extrabold text-gray-800 mb-8 flex items-center gap-4">
                      <span className="bg-primary/10 text-primary p-3 rounded-2xl"><Sparkles className="h-6 w-6" /></span>
                      {category}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-10">
                      {items.map(product => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onAddToCart={addToCart}
                          isFavorite={favorites.some(f => f.id === product.id)}
                          onToggleFavorite={() => toggleFavorite(product)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

            <section id="contacto" className="py-24 bg-gray-50/50">
              <div className="container mx-auto px-4 text-center">
                <div className="max-w-4xl mx-auto glass p-10 md:p-20 rounded-[3rem] border-accent/20 shadow-2xl bg-white/40">
                  <Heart className="h-12 w-12 text-accent fill-accent mx-auto mb-8 animate-pulse" />
                  <h2 className="text-3xl md:text-5xl font-extrabold text-primary mb-6 italic">¿Tienes una idea en mente?</h2>
                  <p className="text-gray-600 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
                    Realizamos pedidos 100% personalizados. Cuéntanos qué necesitas y nosotros le daremos vida.
                  </p>
                  <a href={`https://wa.me/${settings.contact_phone || '584127827734'}`} className="inline-flex bg-[#25D366] hover:bg-[#128C7E] text-white px-12 py-6 rounded-[2.5rem] font-bold shadow-xl transition-all items-center gap-3 text-lg">
                    Contactar por WhatsApp
                  </a>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <Footer settings={settings} />
      <Chatbot onAddToCart={addToCart} cart={cart} onOpenCart={() => setIsCartOpen(true)} />
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemove={removeFromCart}
        user={user}
        onOrderComplete={resetCart}
        settings={settings}
      />
    </div >
  );
}

export default App;
