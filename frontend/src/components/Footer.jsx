import React from 'react';
import { Instagram, MapPin, Heart, AtSign } from 'lucide-react';

const Footer = ({ settings }) => {
    return (
        <footer className="bg-accent/5 pt-12 pb-6 border-t border-accent/10">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-center md:text-left">
                    <div>
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                            <Heart className="text-accent h-5 w-5 fill-accent" />
                            <h2 className="text-lg font-bold text-primary">Creaciones Rosa Elena</h2>
                        </div>
                        <p className="text-gray-600 text-sm max-w-xs mx-auto md:mx-0">
                            Hecho a mano con amor. Creamos detalles únicos para tus momentos especiales.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-800 mb-4">Enlaces Rápidos</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><button onClick={() => window.scrollTo(0, 0)} className="hover:text-accent transition-colors">Inicio</button></li>
                            <li><a href="#productos" className="hover:text-accent transition-colors">Productos</a></li>
                            <li><a href="#contacto" className="hover:text-accent transition-colors">Contacto</a></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-800 mb-4">Encuéntranos</h3>
                        <div className="flex flex-col items-center md:items-start gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-2 text-primary font-medium text-center md:text-left">
                                <MapPin className="h-4 w-4 text-accent shrink-0" />
                                {settings?.contact_address || 'Valencia, Venezuela'}
                            </span>
                            <a href={settings?.contact_instagram_url || "https://instagram.com"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-accent transition-colors">
                                <Instagram className="h-4 w-4 text-accent shrink-0" />
                                {settings?.contact_instagram || '@creacionesrosaelena'}
                            </a>
                            <div className="flex items-center gap-2 hover:text-accent transition-colors">
                                <AtSign className="h-4 w-4 text-accent shrink-0" />
                                <span className="font-medium">{settings?.contact_gmail || 'creacionesrosaelena@gmail.com'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-accent/10 pt-6 text-center text-[10px] font-bold text-primary/40 uppercase tracking-widest">
                    &copy; {new Date().getFullYear()} Creaciones Rosa Elena. Todos los derechos reservados.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
