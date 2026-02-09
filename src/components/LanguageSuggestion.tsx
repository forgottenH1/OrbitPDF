import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

const SUPPORTED_LANGUAGES: Record<string, { code: string; label: string }> = {
    'ar': { code: 'ar', label: 'العربية' },
    'es': { code: 'es', label: 'Español' },
    'fr': { code: 'fr', label: 'Français' },
    'ja': { code: 'ja', label: '日本語' },
    'zh': { code: 'zh', label: '中文 (简体)' },
    'de': { code: 'de', label: 'Deutsch' },
    'ru': { code: 'ru', label: 'Русский' },
    'pt': { code: 'pt', label: 'Português' },
    'uk': { code: 'uk', label: 'Українська' },
    'tr': { code: 'tr', label: 'Türkçe' },
    'it': { code: 'it', label: 'Italiano' },
};

const LanguageSuggestion: React.FC = () => {
    const { i18n } = useTranslation();
    const [suggestion, setSuggestion] = useState<{ code: string; label: string } | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // 1. Check if user has already explicitly dismissed or acted on the suggestion
        const hasSeenSuggestion = localStorage.getItem('language_suggestion_seen');

        if (hasSeenSuggestion) {
            return;
        }

        // 2. Detect browser language
        const browserLang = navigator.language.split('-')[0]; // e.g., 'en-US' -> 'en'

        // 3. Check if we support it and it's not the current language
        // We only suggest if the detected language is NOT English (since we default to English)
        // AND if it matches one of our supported languages
        if (browserLang !== 'en' && SUPPORTED_LANGUAGES[browserLang] && i18n.language !== browserLang) {
            setSuggestion(SUPPORTED_LANGUAGES[browserLang]);
            // Small delay for better UX
            setTimeout(() => setIsVisible(true), 1500);
        }
    }, [i18n.language]);

    const handleSwitch = () => {
        if (suggestion) {
            i18n.changeLanguage(suggestion.code);
            localStorage.setItem('language_suggestion_seen', 'true');
            setIsVisible(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('language_suggestion_seen', 'true');
        setIsVisible(false);
    };

    if (!suggestion || !isVisible) return null;

    return (
        <div className="fixed z-50 animate-in fade-in duration-500 
            top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm
            md:top-auto md:left-auto md:translate-x-0 md:translate-y-0 md:bottom-4 md:right-4 md:w-auto
            slide-in-from-bottom-5">
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-2xl flex flex-col gap-3">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <h3 className="text-white font-semibold flex items-center gap-2">
                            🌐 Change Language?
                        </h3>
                        <p className="text-slate-300 text-sm mt-1">
                            We detected your browser language is <strong>{suggestion.label}</strong>.
                            Would you like to switch?
                        </p>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-slate-400 hover:text-white transition-colors p-1"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex gap-2 mt-1">
                    <button
                        onClick={handleSwitch}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                    >
                        Yes, Switch to {suggestion.label}
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                    >
                        Keep English
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LanguageSuggestion;
