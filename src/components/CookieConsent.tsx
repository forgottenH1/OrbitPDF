import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, X } from 'lucide-react';
// import LegalModal from './LegalModal'; // We can reuse this or link to it

const CookieConsent: React.FC = () => {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // slight delay to not block initial render paint
        const timer = setTimeout(() => {
            const consent = localStorage.getItem('orbitpdf_consent');
            if (!consent) {
                setIsVisible(true);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    const handleAccept = () => {
        localStorage.setItem('orbitpdf_consent', 'true');
        window.dispatchEvent(new Event('orbitpdf_consent_updated'));
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('orbitpdf_consent', 'false');
        window.dispatchEvent(new Event('orbitpdf_consent_updated'));
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom duration-500">
            <div className="max-w-7xl mx-auto bg-[#0f172a]/95 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-4 md:p-6 shadow-2xl shadow-blue-900/20 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">

                <div className="flex items-start gap-4">
                    <div className="hidden md:flex p-3 bg-blue-500/10 rounded-xl border border-blue-500/10">
                        <ShieldCheck className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="text-sm text-slate-300">
                        <p className="mb-2">
                            <strong className="text-white block md:inline mb-1 md:mb-0 mr-2">{t('cookie.title', 'We value your privacy')}</strong>
                            {t('cookie.description', 'We use cookies to enhance your experience, serve personalized ads, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.')}
                        </p>
                        <div className="text-xs text-slate-500">
                            {t('cookie.googleNotice', 'Google uses cookies to personalize ads and analyze traffic.')}{' '}
                            <a
                                href="https://policies.google.com/technologies/partner-sites"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                            >
                                {t('cookie.learnMoreGoogle', 'How Google uses data when you use our partners\' sites or apps')}
                            </a>
                            .
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto flex-shrink-0">
                    <button
                        onClick={handleDecline}
                        className="flex-1 md:flex-none px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors"
                    >
                        {t('cookie.decline', 'Decline')}
                    </button>

                    <button
                        onClick={handleAccept}
                        className="flex-1 md:flex-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
                    >
                        {t('cookie.accept', 'Accept All')}
                    </button>

                    <button
                        onClick={handleDecline}
                        className="md:hidden p-2 text-slate-500 hover:text-white"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
