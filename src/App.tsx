import { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ToolCard from './components/ToolCard';
import LegalModal from './components/LegalModal';
import BackToTop from './components/BackToTop';
// Lazy load the heavy ToolProcessor to avoid loading pdf-lib/tesseract on homepage
const ToolProcessor = lazy(() => import('./components/ToolProcessor'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
import MobileMenu from './components/MobileMenu'; // Import MobileMenu
import AdSpace from './components/AdSpace';
import NotFound from './components/NotFound'; // Import 404 Page


// import Guides from './components/Guides'; // Removed for standalone page
import LanguageSuggestion from './components/LanguageSuggestion';
import AdBlockerDetector from './components/AdBlockerDetector';



import { tools } from './data/tools';


// Legal Content removed - using translations

export default function App() {
    const { t, i18n } = useTranslation();
    const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Mobile Menu State

    // Lazy load components

    // Derived state
    const urlParams = new URLSearchParams(window.location.search);
    const toolId = urlParams.get('tool');
    const activeToolId = toolId || null;
    const isRoot = window.location.pathname === '/' || window.location.pathname === '/index.html';
    const isAdmin = window.location.pathname === '/admin';
    const [searchQuery, setSearchQuery] = useState('');

    // Handle RTL
    useEffect(() => {
        document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = i18n.language;
    }, [i18n.language]);

    // Admin Route - Render completely separate layout
    if (isAdmin) {
        return (
            <Suspense fallback={
                <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                </div>
            }>
                <AdminDashboard />
            </Suspense>
        );
    }

    // Filter tools based on responsive search bar input
    const filteredTools = tools.filter(tool =>
        t(`tools.${tool.id}.title`).toLowerCase().includes(searchQuery.toLowerCase()) ||
        t(`tools.${tool.id}.desc`).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeToolData = tools.find(t => t.id === activeToolId);

    // Dynamic SEO Metadata
    const pageTitle = activeToolData
        ? `${t(`tools.${activeToolData.id}.title`)} - OrbitPDF`
        : t('hero.title') + ' | OrbitPDF';

    const pageDescription = activeToolData
        ? t(`tools.${activeToolData.id}.desc`)
        : t('hero.description');

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-blue-500/30">
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta name="twitter:title" content={pageTitle} />
                <meta name="twitter:description" content={pageDescription} />
                {activeToolData && <link rel="canonical" href={`https://orbitpdf.pages.dev/?tool=${activeToolData.id}`} />}
            </Helmet>

            {/* 1. Header / Navbar */}
            <Navbar
                onSearch={setSearchQuery}
                openModal={setActiveModal}
                isMenuOpen={isMenuOpen}
                onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
            />

            {/* Mobile Menu (Portal-like behavior via root render) */}
            <MobileMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                openModal={setActiveModal}
            />

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-1">

                {/* Conditional Rendering: Show Tool Grid OR Tool Process */}
                {!activeToolId && isRoot ? (
                    <>
                        {/* Responsive top Banner */}
                        <div className="w-full mb-4 py-4">
                            <AdSpace placement="header" className="w-full" />
                        </div>


                        {/* Hero Section */}
                        <header className="text-center mb-6 px-4">
                            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">
                                {t('hero.title')}
                            </h1>
                            <p className="text-slate-400 text-base md:text-xl max-w-2xl mx-auto">
                                {t('hero.description')}
                            </p>
                        </header>

                        {/* 2. Responsive Tool Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                            {filteredTools.map((tool) => (
                                <ToolCard
                                    key={tool.id}
                                    title={t(`tools.${tool.id}.title`)}
                                    description={t(`tools.${tool.id}.desc`)}
                                    icon={tool.icon}
                                    tag={tool.category} // You might want to translate categories too if they are fixed
                                    onClick={() => window.location.href = `/?tool=${tool.id}`} // Activate tool with full reload
                                />
                            ))}
                        </div>

                        {/* Bottom Advertisement Banner */}
                        <div className="mt-12 mb-8">
                            <AdSpace placement="footer" className="w-full" />
                        </div>


                        {/* Empty State */}
                        {filteredTools.length === 0 && (
                            <div className="text-center py-20">
                                <p className="text-slate-500 text-lg">{t('common.noToolsFound', { query: searchQuery })}</p>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="mt-4 text-blue-400 hover:underline"
                                >
                                    {t('common.search')}
                                </button>
                            </div>
                        )}
                    </>
                ) : activeToolData ? (
                    <>
                        {/* Tool Page Header Ad */}
                        <div className="w-full mb-8">
                            <AdSpace placement="header" className="w-full" />
                        </div>

                        <Suspense fallback={
                            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                                <p className="text-slate-400 text-lg animate-pulse">{t('common.loading')}</p>
                            </div>
                        }>
                            <ToolProcessor
                                toolId={activeToolData.id}
                                toolName={t(`tools.${activeToolData.id}.title`)}
                                onBack={() => window.location.href = '/'}
                            />
                        </Suspense>

                        {/* Tool Page Footer Ad */}
                        <div className="mt-12 mb-8">
                            <AdSpace placement="footer" className="w-full" />
                        </div>
                    </>
                ) : (
                    <NotFound />
                )}

            </main>

            {/* 3. Footer */}
            <Footer openModal={setActiveModal} />

            {/* 4. Modals & Utility */}
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
            <LanguageSuggestion />
            <AdBlockerDetector />
        </div>
    );
}