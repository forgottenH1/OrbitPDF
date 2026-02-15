
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';
import './i18n';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MobileMenu from './components/MobileMenu';
import LegalModal from './components/LegalModal';
import BackToTop from './components/BackToTop';
import ContactForm from './components/ContactForm';
import AdSpace from './components/AdSpace';


// Minimal App shell for Contact Page
const ContactApp = () => {
    const { t, i18n } = useTranslation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);

    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Handle RTL
    React.useEffect(() => {
        document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = i18n.language;
    }, [i18n.language]);

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-blue-500/30 flex flex-col">
            <Navbar
                onSearch={() => { }} // No search needed on contact page context usually, or redirect
                openModal={setActiveModal}
                isMenuOpen={isMenuOpen}
                onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
            />

            <MobileMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                openModal={setActiveModal}
            />

            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-1">
                {/* Top Ad Banner */}
                <div className="mb-4">
                    <AdSpace placement="header" className="w-full" />
                </div>

                <div className="text-center mb-12">

                    <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                        {t('nav.contact')}
                    </h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        {t('contact.intro')}
                    </p>
                </div>

                <ContactForm />

                {/* Bottom Ad Banner */}
                <div className="mt-12">
                    <AdSpace placement="footer" className="w-full" />
                </div>
            </main>


            <Footer openModal={setActiveModal} />

            <LegalModal
                isOpen={activeModal === 'privacy' || activeModal === 'terms'}
                onClose={() => setActiveModal(null)}
                title={activeModal === 'privacy' ? t('nav.privacy') : t('nav.terms')}
                content={
                    <div
                        className="space-y-4"
                        dangerouslySetInnerHTML={{
                            __html: activeModal === 'privacy'
                                ? t('legal.privacyContent')
                                : t('legal.termsContent')
                        }}
                    />
                }
            />
            <BackToTop />
        </div>
    );
};

import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <ContactApp />
        </BrowserRouter>
    </React.StrictMode>,
);
