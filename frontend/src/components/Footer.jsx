import React from 'react';
import { Instagram, MapPin, Heart } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-primary-light pt-12 pb-6 border-t border-primary/20">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-center md:text-left">
                    <div>
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                            <Heart className="text-primary h-5 w-5 fill-primary" />
                            <h2 className="text-lg font-bold">Creaciones Rosa Elena</h2>
                        </div>
                        <p className="text-gray-600 text-sm max-w-xs mx-auto md:mx-0">
                            Hecho a mano con amor. Creamos detalles únicos para tus momentos especiales.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-800 mb-4">Enlaces Rápidos</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><a href="#" className="hover:text-primary transition-colors">Inicio</a></li>
                            <li><a href="#productos" className="hover:text-primary transition-colors">Productos</a></li>
                            <li><a href="#contacto" className="hover:text-primary transition-colors">Contacto</a></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-800 mb-4">Encuéntranos</h3>
                        <div className="flex flex-col items-center md:items-start gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                Valencia, Venezuela
                            </span>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                                <Instagram className="h-4 w-4 text-primary" />
                                @creacionesrosaelena
                            </a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-primary/10 pt-6 text-center text-xs text-gray-400">
                    &copy; {new Date().getFullYear()} Creaciones Rosa Elena. Todos los derechos reservados.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
