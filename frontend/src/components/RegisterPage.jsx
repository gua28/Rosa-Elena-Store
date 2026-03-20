import React, { useState } from 'react';
import { Heart, Lock, User, ArrowLeft, Mail, Phone, MapPin, Eye, EyeOff } from 'lucide-react';

import { supabase } from '../utils/supabaseClient';

const RegisterPage = ({ onBack, onRegisterSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setIsLoading(true);
        try {
            // 1. Registro oficial en Supabase Auth.
            // Esto automáticamente gatilla el envío del correo de confirmación al Gmail/Outlook del usuario.
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email.toLowerCase(),
                password: formData.password,
                options: {
                    data: {
                        name: formData.name
                    }
                }
            });

            if (authError) {
                // Mensajes de error amigables
                if (authError.message.includes('already registered')) {
                     throw new Error('Este correo ya está registrado.');
                }
                throw authError;
            }

            // 2. Guardamos sus datos completos en la base de datos (Retrocompatibilidad)
            const { error: dbError } = await supabase
                .from('users')
                .insert([{
                    email: formData.email.toLowerCase(),
                    password: formData.password, // Solo para compatibilidad de sistema
                    name: formData.name,
                    role: 'client',
                    phone: formData.phone,
                    address: formData.address
                }]);

            if (dbError) {
                console.warn("Aviso en guardado retrocompatible:", dbError);
                // Si da error de duplicate key, lo ignoramos, significa que el usuario
                // ya existía pero está haciendo un nuevo registro (ej. borró auth)
            }

            // Avisamos al usuario que debe ir a verificar su bandeja de entrada
            alert('¡Registro casi listo! 📩\n\nTe hemos enviado un correo de verificación. Por favor, revisa tu bandeja principal y la de SPAM. Tienes que hacer click en el enlace para poder iniciar sesión.');
            onBack();
        } catch (err) {
            setError(err.message || 'Ha ocurrido un error en el registro.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-primary-light/30 flex items-center justify-center p-4 py-12 md:py-20">
            <div className="w-full max-w-md">
                <button
                    onClick={onBack}
                    className="mb-6 flex items-center gap-2 text-gray-500 hover:text-primary transition-colors font-medium active:scale-95 transition-transform"
                >
                    <ArrowLeft className="h-4 w-4" /> Volver a la tienda
                </button>

                <div className="glass rounded-[2rem] p-6 sm:p-10 shadow-2xl overflow-hidden">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
                            <Heart className="h-7 w-7 text-primary fill-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Crea tu cuenta</h1>
                        <p className="text-gray-500 text-xs sm:text-sm mt-2">Únete a Creaciones Rosa Elena</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
                            {error}
                        </div>
                    )}

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Nombre Completo</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    placeholder="Juan Pérez"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white/50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm sm:text-base"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="tu@correo.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-white/50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm sm:text-base"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Teléfono</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="+58 412 1234567"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-white/50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm sm:text-base"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Dirección de Envío</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                                <textarea
                                    required
                                    placeholder="Tu dirección completa para envíos..."
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full bg-white/50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y text-sm sm:text-base"
                                ></textarea>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-white/50 border border-gray-100 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm sm:text-base"
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

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Repite Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="w-full bg-white/50 border border-gray-100 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm sm:text-base"
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
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-bold shadow-xl transition-all active:scale-95 disabled:opacity-50 mt-4 outline-none"
                        >
                            {isLoading ? 'Registrando...' : 'Registrarse'}
                        </button>
                    </form>


                    <div className="mt-10 pt-8 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-500">
                            ¿Ya tienes cuenta? <button onClick={onRegisterSuccess} className="font-bold text-primary hover:underline">Inicia sesión</button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
