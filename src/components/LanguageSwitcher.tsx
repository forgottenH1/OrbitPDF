import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'fr', label: 'Français', short: 'FR' },
    { code: 'es', label: 'Español', short: 'ES' },
    { code: 'ar', label: 'العربية', short: 'AR' },
    { code: 'ja', label: '日本語', short: 'JA' },
    { code: 'zh', label: '中文 (简体)', short: 'ZH' },
    { code: 'de', label: 'Deutsch', short: 'DE' },
    { code: 'ru', label: 'Русский', short: 'RU' },
    { code: 'pt', label: 'Português', short: 'PT' },
    { code: 'uk', label: 'Українська', short: 'UK' },
    { code: 'tr', label: 'Türkçe', short: 'TR' },
    { code: 'it', label: 'Italiano', short: 'IT' }
];

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        setIsOpen(false);
        // RTL handling will be done in App.tsx via useEffect on i18n.language
    };

    const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                aria-label="Change Language"
            >
                <Globe className="w-5 h-5" />
                <span className="font-medium text-sm">{currentLang.short}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                    <div className="py-1">
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => changeLanguage(lang.code)}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                                    ${i18n.language === lang.code
                                        ? 'bg-blue-600/10 text-blue-400 font-medium'
                                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <span>{lang.label}</span>
                                {i18n.language === lang.code && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;
