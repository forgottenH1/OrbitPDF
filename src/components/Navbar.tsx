import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import LanguageSwitcher from './LanguageSwitcher';

interface NavbarProps {
    onSearch: (query: string) => void;
    openModal: (type: 'privacy' | 'terms') => void;
    isMenuOpen: boolean;
    onToggleMenu: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearch, openModal, isMenuOpen, onToggleMenu }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            window.location.href = `/guides.html?search=${encodeURIComponent(query)}`;
        }
    };

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-900/70 backdrop-blur-md">
            <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                {/* Logo */}
                <a href="/" className="flex items-center gap-2 cursor-pointer z-[60]">
                    <img src="/logo-transparent.png" alt={t('footer.logoAlt')} className="w-10 h-10 rounded-xl" />
                    <span className="text-2xl font-semibold tracking-tight text-white hidden sm:block">
                        Orbit<span className="text-blue-400">PDF</span>
                    </span>
                </a>

                {/* Global Search Bar */}
                <form onSubmit={handleSearch} className={`hidden md:block flex-1 max-w-md mx-8 transition-opacity duration-300`}>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t('nav.searchPlaceholder')}
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                onSearch(e.target.value);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-full py-2 px-5 pl-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500"
                        />
                        <svg className="absolute left-4 top-2.5 h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </form>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
                    <a href="/guides.html" className="hover:text-white transition-colors">{t('nav.guides')}</a>
                    <a href="/contact.html" className="hover:text-white transition-colors">{t('nav.contact')}</a>
                    <button onClick={() => openModal('privacy')} className="hover:text-white transition-colors">{t('nav.privacy')}</button>
                    <div className="pl-4 border-l border-white/10">
                        <LanguageSwitcher />
                    </div>
                </div>

                {/* Mobile Hamburger Trigger - Morphing SVG */}
                <div className="lg:hidden flex items-center z-[70]">
                    <button
                        onClick={onToggleMenu}
                        className="p-2 text-white focus:outline-none"
                        aria-label={isMenuOpen ? t('nav.ariaClose') : t('nav.ariaOpen')}
                        aria-expanded={isMenuOpen}
                        aria-controls="mobile-menu"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transform transition-transform duration-300">
                            {/* Top Line */}
                            <line x1="3" y1="6" x2="21" y2="6"
                                className={`transition-all duration-300 origin-center ${isMenuOpen ? 'translate-y-[6px] rotate-45' : ''}`}
                            />
                            {/* Middle Line */}
                            <line x1="3" y1="12" x2="21" y2="12"
                                className={`transition-all duration-300 ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}
                            />
                            {/* Bottom Line */}
                            <line x1="3" y1="18" x2="21" y2="18"
                                className={`transition-all duration-300 origin-center ${isMenuOpen ? '-translate-y-[6px] -rotate-45' : ''}`}
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;