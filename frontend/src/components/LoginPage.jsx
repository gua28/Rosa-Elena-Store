import React, { useState } from 'react';
import { Heart, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';

import { supabase } from '../utils/supabaseClient';
const hashPassword = async (password) => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

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
            // 1. Intentamos el inicio de sesión seguro y oficial con Supabase Auth
            // Esto es lo que verifica si el correo fue confirmado
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: credentials.email.toLowerCase(),
                password: credentials.password
            });

            if (authError) {
                // Si el error es específicamente que NO ha verificado el email:
                if (authError.message.includes('Email not confirmed') || authError.message.includes('verificar')) {
                    setError('Debes verificar tu correo primero. Revisa tu bandeja de entrada o SPAM para confirmar el enlace que te enviamos.');
                    return;
                }

                // 2. FALLBACK RETROCOMPATIBLE Y SOPORTE DE ENCRIPTACIÓN:
                // Generamos el hash de la contraseña escrita para comparar con la base de datos
                const hashedPassword = await hashPassword(credentials.password);

                const { data: oldUser, error: oldError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', credentials.email.toLowerCase())
                    .in('password', [credentials.password, hashedPassword]) // Soportamos la encriptada y la vieja en texto plano
                    .limit(1);

                if (oldError || !oldUser || oldUser.length === 0) {
                    setError('Credenciales incorrectas (Verifique email y contraseña)');
                    return;
                }

                // Exito con cuenta antigua
                onLogin(oldUser[0]);
                return;
            }

            // 3. Si Auth tuvo éxito (correo verificado exitosamente):
            // Recuperamos sus demás datos (dirección, teléfono) de la tabla 'users'
            const { data: dbUser, error: dbError } = await supabase
                .from('users')
                .select('*')
                .eq('email', credentials.email.toLowerCase())
                .single();

            if (dbError || !dbUser) {
                 // Si no lo hallamos en public.users, creamos una sesión mínima.
                 onLogin({ 
                     email: authData.user.email, 
                     role: 'client', 
                     name: authData.user.user_metadata?.name || 'Cliente' 
                 });
                 return;
            }

            // Login exitoso
            onLogin(dbUser);
        } catch (err) {
            setError('Error al conectar con la base de datos');
        } finally {
            setIsLoading(false);
        }
    };

    const [isResetting, setIsResetting] = useState(false);
    const [resetMessage, setResetMessage] = useState('');

    const handleForgotPassword = async () => {
        if (!credentials.email) {
            setError('Por favor, ingresa tu email primero para enviarte el enlace de recuperación.');
            return;
        }

        setError('');
        setResetMessage('');
        setIsResetting(true);

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(credentials.email, {
                redirectTo: `${window.location.origin}/reset-password`, 
            });

            if (resetError) {
                setError('No pudimos enviar el correo: ' + (resetError.message === 'User not found' ? 'No encontramos una cuenta con ese email.' : resetError.message));
            } else {
                setResetMessage('¡Listo! Te hemos enviado un enlace a tu correo para que cambies tu contraseña. Revisa tu bandeja de entrada o SPAM.');
            }
        } catch (err) {
            setError('Error al intentar enviar el correo de recuperación.');
        } finally {
            setIsResetting(false);
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
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                            {error}
                        </div>
                    )}

                    {resetMessage && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                            {resetMessage}
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


                    </form>

                    <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col gap-4 text-center">
                        <button 
                            onClick={handleForgotPassword}
                            disabled={isResetting}
                            className={`text-sm text-gray-500 hover:text-primary transition-colors ${isResetting ? 'opacity-50' : ''}`}
                        >
                            {isResetting ? 'Enviando email...' : '¿Olvidaste tu contraseña?'}
                        </button>
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
