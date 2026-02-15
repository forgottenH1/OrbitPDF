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
// import AdvertiserInquiryForm from './components/AdvertiserInquiryForm';
// import AdvertiserInquiryForm from './components/AdvertiserInquiryForm';
import PricingTable from './components/PricingTable';
import AdSpace from './components/AdSpace';


const AdvertiseApp = () => {
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
                onSearch={() => { }}
                openModal={setActiveModal}
                isMenuOpen={isMenuOpen}
                onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
            />

            <MobileMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                openModal={setActiveModal}
            />

            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-1 flex flex-col justify-center">
                {/* Top Ad Banner */}
                <div className="mb-4">
                    <AdSpace placement="header" className="w-full" />
                </div>

                <div className="text-center mb-4">
                    <span className="text-blue-500 font-bold tracking-widest uppercase text-xs mb-0 block">{t('advertisePage.title')}</span>
                    <h1 className="text-2xl md:text-4xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                        {t('advertisePage.heroTitle')}
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-4">
                        {t('advertisePage.heroDesc')}
                    </p>
                    <PricingTable />
                </div>

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
            <AdvertiseApp />
        </BrowserRouter>
    </React.StrictMode>,
);
