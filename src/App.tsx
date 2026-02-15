import { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import Guides from './components/Guides';
import { Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Routes, Route, useParams, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ToolCard from './components/ToolCard';
import LegalModal from './components/LegalModal';
import BackToTop from './components/BackToTop';
// Lazy load the heavy ToolProcessor
const ToolProcessor = lazy(() => import('./components/ToolProcessor'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
import MobileMenu from './components/MobileMenu';
import AdSpace from './components/AdSpace';
import NotFound from './components/NotFound';
import LanguageSuggestion from './components/LanguageSuggestion';
import AdBlockerDetector from './components/AdBlockerDetector';
import CookieConsent from './components/CookieConsent';
import { tools } from './data/tools';

// Wrapper for ToolProcessor to extract ID from params
const ToolRoute = () => {
    const { toolId } = useParams();
    const { t } = useTranslation();

    const activeToolData = tools.find(t => t.id === toolId);

    if (!activeToolData) {
        return <NotFound />;
    }

    return (
        <>
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

            <div className="mt-12 mb-8">
                <AdSpace placement="footer" className="w-full" />
            </div>
        </>
    );
};

export default function App() {
    const { t, i18n } = useTranslation();
    const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');

    // Handle RTL
    useEffect(() => {
        document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = i18n.language;
    }, [i18n.language]);

    // Admin Route - Render completely separate layout
    if (location.pathname === '/admin') {
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

    // Tools filtering
    const filteredTools = tools.filter(tool =>
        t(`tools.${tool.id}.title`).toLowerCase().includes(searchQuery.toLowerCase()) ||
        t(`tools.${tool.id}.desc`).toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Dynamic SEO Metadata helper
    const ToolMetadata = () => {
        const { toolId } = useParams();
        const activeToolData = tools.find(t => t.id === toolId);

        if (!activeToolData) return null;

        const pageTitle = `${t(`tools.${activeToolData.id}.title`)} - OrbitPDF`;
        const pageDescription = t(`tools.${activeToolData.id}.desc`);
        const canonicalUrl = `https://orbitpdf.com/${activeToolData.id}`; // Clean URL

        return (
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta name="twitter:title" content={pageTitle} />
                <meta name="twitter:description" content={pageDescription} />
                <link rel="canonical" href={canonicalUrl} />
            </Helmet>
        );
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-blue-500/30">
            {/* Global Helmet for Home (overridden by ToolMetadata) */}
            <Routes>
                <Route path="/" element={
                    <Helmet>
                        <title>{t('hero.title')} | OrbitPDF</title>
                        <meta name="description" content={t('hero.description')} />
                        <meta property="og:title" content={`${t('hero.title')} | OrbitPDF`} />
                        <meta property="og:description" content={t('hero.description')} />
                        <link rel="canonical" href="https://orbitpdf.com/" />
                    </Helmet>
                } />
                <Route path="/:toolId" element={<ToolMetadata />} />
            </Routes>

            <Navbar
                onSearch={setSearchQuery}
                openModal={setActiveModal}
                isMenuOpen={isMenuOpen}
                onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
            />

            <MobileMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                openModal={setActiveModal}
            />

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-1">
                <Routes>
                    {/* Homepage - Tool Grid */}
                    <Route path="/" element={
                        <>
                            <div className="w-full mb-4 py-4">
                                <AdSpace placement="header" className="w-full" />
                            </div>

                            <header className="text-center mb-6 px-4">
                                <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">
                                    {t('hero.title')}
                                </h1>
                                <p className="text-slate-400 text-base md:text-xl max-w-2xl mx-auto">
                                    {t('hero.description')}
                                </p>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredTools.map((tool) => (
                                    <ToolCard
                                        key={tool.id}
                                        title={t(`tools.${tool.id}.title`)}
                                        description={t(`tools.${tool.id}.desc`)}
                                        icon={tool.icon}
                                        tag={tool.category}
                                        toolId={tool.id}
                                    />
                                ))}
                            </div>

                            <div className="mt-12 mb-8">
                                <AdSpace placement="footer" className="w-full" />
                            </div>

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
                    } />

                    {/* Guides Routes with Ads */}
                    <Route path="/guides" element={
                        <>
                            <div className="w-full mb-4">
                                <AdSpace placement="header" className="w-full" />
                            </div>
                            <Guides />
                            <div className="mt-12 mb-8">
                                <AdSpace placement="footer" className="w-full" />
                            </div>
                        </>
                    } />
                    <Route path="/guides/:id" element={
                        <>
                            <div className="w-full mb-4">
                                <AdSpace placement="header" className="w-full" />
                            </div>
                            <Guides />
                            <div className="mt-12 mb-8">
                                <AdSpace placement="footer" className="w-full" />
                            </div>
                        </>
                    } />

                    {/* Tool Route - Clean URL /merge-pdf etc */}
                    <Route path="/:toolId" element={<ToolRoute />} />

                    {/* Fallback */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
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
            <LanguageSuggestion />
            <LanguageSuggestion />
            <AdBlockerDetector />
            <CookieConsent />
        </div>
    );
}