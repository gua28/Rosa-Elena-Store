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
import { Heart, Sparkles, User as UserIcon } from 'lucide-react';

const products = [
  {
    id: 1,
    name: "Lazo Rosa Encanto",
    category: "Lazos",
    price: 3.50,
    image: "https://images.unsplash.com/photo-1590502120012-de59b563459e?q=80&w=400&auto=format&fit=crop",
    description: "Hermoso lazo hecho a mano con cinta de raso premium y apliques de perlas."
  },
  {
    id: 2,
    name: "Piñata Estrella Pastel",
    category: "Piñatas",
    price: 15.00,
    image: "https://images.unsplash.com/photo-1620173834206-c029bf322dba?q=80&w=400&auto=format&fit=crop",
    description: "Piñata personalizada en forma de estrella con colores pasteles ideales para cumpleaños."
  },
  {
    id: 3,
    name: "Birrete Graduación Oro",
    category: "Birretes",
    price: 12.00,
    image: "https://images.unsplash.com/photo-1523050853023-8c2d2909f4d3?q=80&w=400&auto=format&fit=crop",
    description: "Birrete decorado de lujo con detalles dorados y personalización de nombre."
  },
  {
    id: 4,
    name: "Set de Decoración Fiesta",
    category: "Decoraciones",
    price: 25.00,
    image: "https://images.unsplash.com/photo-1533294485618-f58a741ef0b2?q=80&w=400&auto=format&fit=crop",
    description: "Kit completo de guirnaldas, flores de papel y toppers para torta."
  }
];

function App() {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState('shop');
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load user and products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('http://localhost:8000/products');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const savedUser = sessionStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));

    fetchProducts();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
    setCurrentPage('shop');
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
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

  if (currentPage === 'admin' && user?.role === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  if (currentPage === 'profile' && user) {
    return <UserProfile user={user} onBack={() => setCurrentPage('shop')} />;
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

      <main className="flex-grow">
        {/* Shop view */}
        <section className="relative py-24 bg-primary-light/50 overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl opacity-40"></div>
          <div className="container mx-auto px-4 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-primary/10 mb-8 shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Artesanía con Corazón</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-[1.1]">
              Creaciones <span className="text-primary italic">Rosa Elena</span>
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto mb-12 text-lg md:text-xl">
              Descubre nuestro catálogo de detalles hechos a mano.
              Personalizamos cada pieza para que tus momentos brillen de forma única.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <a href="#productos" className="bg-primary hover:bg-primary-dark text-white px-10 py-5 rounded-3xl font-bold shadow-2xl shadow-primary/30 transition-all flex items-center gap-3">
                Ver Catálogo
                <Heart className="h-6 w-6" />
              </a>
            </div>
          </div>
        </section>

        {/* Products */}
        <section id="productos" className="py-24 container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="space-y-4">
              <div className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wider">Nuestro Trabajo</div>
              <h2 className="text-4xl font-extrabold text-gray-900">Catálogo de Productos</h2>
              <div className="h-1.5 w-24 bg-primary rounded-full"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {products.map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
            ))}
          </div>
        </section>

        {/* Contact */}
        <section id="contacto" className="py-24 bg-gray-50/50">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-4xl mx-auto glass p-10 md:p-20 rounded-[3rem] border-white/40 shadow-2xl">
              <Heart className="h-12 w-12 text-primary fill-primary mx-auto mb-8 animate-pulse" />
              <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-6 italic">¿Tienes una idea en mente?</h2>
              <p className="text-gray-600 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
                Realizamos pedidos 100% personalizados. Cuéntanos qué necesitas y nosotros le daremos vida.
              </p>
              <a href="https://wa.me/584127827734" className="inline-flex bg-[#25D366] hover:bg-[#128C7E] text-white px-10 py-5 rounded-[2rem] font-bold shadow-xl transition-all items-center gap-3">
                Contactar por WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <Chatbot />
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemove={removeFromCart}
        user={user}
        onOrderComplete={resetCart}
      />
    </div>
  );
}

export default App;
