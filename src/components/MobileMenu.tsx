import React from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Book, FileText, Link as LinkIcon, Split, Minimize2, Image, X, PenTool, Lock, Mail } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';


interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    openModal: (type: 'privacy' | 'terms') => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, openModal }) => {
    const { t } = useTranslation();

    // Body Scroll Lock
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.width = '100%';
        } else {
            document.body.style.overflow = '';
            document.body.style.width = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.width = '';
        };
    }, [isOpen]);

    // Staggered animation delay helper
    const getDelayClass = (index: number) => {
        const delays = ['delay-[0ms]', 'delay-[75ms]', 'delay-[150ms]', 'delay-[225ms]', 'delay-[300ms]', 'delay-[375ms]', 'delay-[450ms]'];
        return isOpen ? `opacity-100 translate-x-0 ${delays[index]}` : 'opacity-0 -translate-x-4';
    };

    return (
        <>
            {/* Off-Canvas Menu Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden={!isOpen}
            />

            {/* Off-Canvas Menu Panel */}
            <div
                id="mobile-menu"
                role="dialog"
                aria-modal="true"
                className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-[#0f172a] border-l border-white/10 z-[100] shadow-2xl transition-transform duration-300 ease-out will-change-transform flex flex-col`}
                style={{ transform: isOpen ? 'translate3d(0, 0, 0)' : 'translate3d(100%, 0, 0)' }}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-6 p-2 text-slate-400 hover:text-white transition-colors z-50 rounded-full hover:bg-white/10"
                    aria-label={t('nav.ariaClose')}
                >
                    <X className="w-8 h-8" />
                </button>
                {/* Scrollable Content Container */}
                <div className="flex-1 overflow-y-auto py-12 px-8 flex flex-col">

                    {/* Language Switcher for Mobile */}
                    <div className="mb-8">
                        <LanguageSwitcher />
                    </div>

                    {/* Primary Navigation */}
                    <div className="mb-10">
                        <p className={`text-xs font-semibold text-slate-500 uppercase tracking-wider mb-6 transition-all duration-500 ${getDelayClass(0)}`}>
                            {t('nav.menu')}
                        </p>
                        <nav className="flex flex-col gap-6">
                            <a
                                href="/"
                                onClick={onClose}
                                className={`flex items-center gap-4 text-2xl font-medium text-white transition-all duration-500 ease-out ${getDelayClass(0)}`}
                            >
                                <Home className="w-6 h-6 text-blue-400" />
                                {t('common.home')}
                            </a>

                            <a
                                href="/guides.html"
                                onClick={onClose}
                                className={`flex items-center gap-4 text-2xl font-medium text-white transition-all duration-500 ease-out ${getDelayClass(1)}`}
                            >
                                <Book className="w-6 h-6 text-emerald-400" />
                                {t('nav.guides')}
                            </a>
                            <a
                                href="/contact.html"
                                onClick={onClose}
                                className={`flex items-center gap-4 text-2xl font-medium text-white transition-all duration-500 ease-out ${getDelayClass(2)}`}
                            >
                                <Mail className="w-6 h-6 text-indigo-400" />

                                {t('nav.contact')}
                            </a>
                        </nav>
                    </div>


                    {/* Quick Tools Section */}
                    <div className="mb-10">
                        <div className={`h-px bg-white/10 w-full mb-6 transition-all duration-500 ${getDelayClass(2)}`} />
                        <p className={`text-xs font-semibold text-slate-500 uppercase tracking-wider mb-6 transition-all duration-500 ${getDelayClass(2)}`}>
                            {t('nav.quickTools')}
                        </p>
                        <nav className="grid grid-cols-2 gap-4">
                            <a href="/?tool=merge" onClick={onClose} className={`flex flex-col items-center justify-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all duration-500 ${getDelayClass(3)}`}>
                                <LinkIcon className="w-6 h-6 text-purple-400 mb-2" />
                                <span className="text-sm text-slate-300">{t('tools.merge.title')}</span>
                            </a>
                            <a href="/?tool=split" onClick={onClose} className={`flex flex-col items-center justify-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all duration-500 ${getDelayClass(3)}`}>
                                <Split className="w-6 h-6 text-indigo-400 mb-2" />
                                <span className="text-sm text-slate-300">{t('tools.split.title')}</span>
                            </a>

                            <a href="/?tool=compress" onClick={onClose} className={`flex flex-col items-center justify-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all duration-500 ${getDelayClass(4)}`}>
                                <Minimize2 className="w-6 h-6 text-orange-400 mb-2" />
                                <span className="text-sm text-slate-300">{t('tools.compress.title')}</span>
                            </a>
                            <a href="/?tool=pdf-to-word" onClick={onClose} className={`flex flex-col items-center justify-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all duration-500 ${getDelayClass(4)}`}>
                                <FileText className="w-6 h-6 text-emerald-400 mb-2" />
                                <span className="text-sm text-slate-300">{t('tools.pdf-to-word.title')}</span>
                            </a>

                            <a href="/?tool=word-to-pdf" onClick={onClose} className={`flex flex-col items-center justify-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all duration-500 ${getDelayClass(5)}`}>
                                <FileText className="w-6 h-6 text-blue-400 mb-2" />
                                <span className="text-sm text-slate-300">{t('tools.word-to-pdf.title')}</span>
                            </a>
                            <a href="/?tool=pdf-to-img" onClick={onClose} className={`flex flex-col items-center justify-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all duration-500 ${getDelayClass(5)}`}>
                                <Image className="w-6 h-6 text-pink-400 mb-2" />
                                <span className="text-sm text-slate-300">{t('tools.pdf-to-img.title')}</span>
                            </a>

                            <a href="/?tool=sign" onClick={onClose} className={`flex flex-col items-center justify-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all duration-500 ${getDelayClass(6)}`}>
                                <PenTool className="w-6 h-6 text-teal-400 mb-2" />
                                <span className="text-sm text-slate-300">{t('tools.sign.title')}</span>
                            </a>
                            <a href="/?tool=protect" onClick={onClose} className={`flex flex-col items-center justify-center p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all duration-500 ${getDelayClass(6)}`}>
                                <Lock className="w-6 h-6 text-red-400 mb-2" />
                                <span className="text-sm text-slate-300">{t('tools.protect.title')}</span>
                            </a>
                        </nav>
                    </div>

                    {/* Legal / Secondary */}
                    <div className="mt-auto">
                        <div className={`h-px bg-white/10 w-full mb-6 transition-all duration-500 ${getDelayClass(5)}`} />
                        <nav className="flex flex-col gap-4">
                            <button
                                onClick={() => { openModal('privacy'); onClose(); }}
                                className={`flex items-center gap-3 text-base text-slate-400 hover:text-white transition-all duration-500 ${getDelayClass(6)}`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                {t('nav.privacy')}
                            </button>

                            <button
                                onClick={() => { openModal('terms'); onClose(); }}
                                className={`flex items-center gap-3 text-base text-slate-400 hover:text-white transition-all duration-500 ${getDelayClass(6)}`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                {t('nav.terms')}
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileMenu;
