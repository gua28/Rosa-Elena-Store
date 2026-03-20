import React, { useState } from 'react';
import { Heart, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { supabase } from '../utils/supabaseClient';
function LoginPage({ onBack, onLogin, onGoToRegister }) {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Direct check against our 'users' table
            // This bypasses Supabase Auth's internal system to use the credentials we recovered
            const { data, error: dbError } = await supabase
                .from('users')
                .select('*')
                .eq('email', credentials.email.toLowerCase())
                .eq('password', credentials.password)
                .single();

            if (dbError || !data) {
                setError('Credenciales incorrectas (Verifique email y contraseña)');
                return;
            }

            // Successful login
            onLogin(data);

        } catch (err) {
            setError('Error al conectar con la base de datos');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-primary-light/30 flex items-center justify-center p-4 py-12">
            <div className="w-full max-w-md">
                <button
                    onClick={onBack}
                    className="mb-6 flex items-center gap-2 text-gray-500 hover:text-primary transition-colors font-medium active:scale-95 transition-transform"
                >
                    <ArrowLeft className="h-4 w-4" /> Volver a la tienda
                </button>

                <div className="glass rounded-[2rem] p-6 sm:p-10 shadow-2xl">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
                            <Heart className="h-8 w-8 text-primary fill-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Bienvenido de nuevo</h1>
                        <p className="text-gray-500 text-sm mt-2">Accede a tu cuenta de Creaciones Rosa Elena</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    placeholder="tu@correo.com"
                                    value={credentials.email}
                                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                    className="w-full bg-white/50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="••••••••"
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                    className="w-full bg-white/50 border border-gray-100 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-bold shadow-xl transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                        </button>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-100"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">O continuar con</span>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={async (credentialResponse) => {
                                    setIsLoading(true);
                                    try {
                                        // Use the Google credential to get user info
                                        const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${credentialResponse.credential}`);
                                        const googleUser = await response.json();
                                        
                                        // Check if the user exists in our DB
                                        const { data, error } = await supabase
                                            .from('users')
                                            .select('*')
                                            .eq('email', googleUser.email)
                                            .single();

                                        if (data) {
                                            onLogin(data);
                                        } else {
                                            // Register as client if not found
                                            const { data: newUser } = await supabase
                                                .from('users')
                                                .insert([{ 
                                                    email: googleUser.email, 
                                                    name: googleUser.name, 
                                                    role: 'client' 
                                                }])
                                                .select()
                                                .single();
                                            onLogin(newUser);
                                        }
                                    } catch (err) {
                                        setError('Error al sincronizar con tu cuenta de Google');
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                                onError={() => {
                                    setError('Error en la autenticación de Google');
                                }}
                                theme="outline"
                                shape="pill"
                                size="large"
                                text="continue_with"
                                width="100%"
                            />
                        </div>
                    </form>

                    <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col gap-4 text-center">
                        <button className="text-sm text-gray-500 hover:text-primary transition-colors">¿Olvidaste tu contraseña?</button>
                        <p className="text-sm text-gray-500">
                            ¿No tienes cuenta? <button onClick={onGoToRegister} className="font-bold text-primary hover:underline">Regístrate</button>
                        </p>
                    </div>
                </div>

                <p className="text-center mt-8 text-xs text-gray-400 uppercase tracking-widest font-bold">
                    Portal administrativo · v1.0
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
