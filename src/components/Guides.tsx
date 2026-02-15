import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, ChevronRight, Search } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import AdSpace from './AdSpace';

// Data moved to translation.json to support multiple languages
// function to get guides data (memoized in component)
const useGuidesData = () => {
    const { t } = useTranslation();

    // We can't easily iterate keys in i18next without a text structure or returnObjects: true
    // So we'll map the known IDs which matches standard tools
    const guideIds = [
        'merge', 'split', 'compress', 'word-to-pdf', 'pdf-to-word', 'pdf-to-excel',
        'pdf-to-img', 'pdf-to-png', 'img-to-pdf', 'ocr', 'rotate', 'page-number',
        'sign', 'organize', 'watermark', 'edit-metadata', 'flatten', 'trim',
        'compare', 'protect', 'unlock', 'repair', 'grayscale', 'invert-colors',
        'extract-text', 'remove-annotations', 'redact', 'pdf-to-ppt', 'excel-to-pdf',
        'ppt-to-pdf', 'html-to-pdf'
    ];

    return guideIds.map(id => ({
        id,
        title: t(`guidesData.${id}.title`),
        category: t(`guidesData.${id}.category`),
        intro: t(`guidesData.${id}.intro`),
        steps: t(`guidesData.${id}.steps`, { returnObjects: true }) as string[]
    }));
};

interface GuidesProps {
    externalSearch?: string;
}

export default function Guides({ externalSearch }: GuidesProps) {
    const { t } = useTranslation();
    const toolsGuides = useGuidesData();
    const [searchTerm, setSearchTerm] = useState(externalSearch || '');
    const { id: guideId } = useParams();

    const activeGuide = guideId ? toolsGuides.find(g => g.id === guideId) || null : null;

    const filteredGuides = toolsGuides.filter(g =>
        g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sync with external search if provided (e.g. from Navbar)
    React.useEffect(() => {
        if (externalSearch !== undefined) {
            setSearchTerm(externalSearch);
        }
    }, [externalSearch]);

    if (activeGuide) {
        return (
            <div className="w-full flex justify-center gap-6 px-4">
                <Helmet>
                    <title>{activeGuide.title} | OrbitPDF Guides</title>
                    <meta name="description" content={activeGuide.intro} />
                    <link rel="canonical" href={`https://orbitpdf.com/guides/${activeGuide.id}`} />
                </Helmet>

                {/* Left Sidebar Ad (PC Only) */}
                <div className="hidden xl:block w-[160px] min-w-[160px] flex-shrink-0 pt-20">
                    <div className="sticky top-24">
                        <AdSpace placement="sidebar-left" />
                    </div>
                </div>

                {/* Main Content */}
                <div className="w-full max-w-4xl animate-in slide-in-from-right duration-300">
                    <button
                        onClick={() => window.location.href = '/guides.html'}
                        className="flex items-center text-slate-400 hover:text-white mb-8 transition-colors"
                    >
                        <ArrowLeft size={20} className="mr-2" /> {t('common.back')}
                    </button>

                    <article className="glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <BookOpen size={200} />
                        </div>

                        <span className="inline-block px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium mb-4 uppercase tracking-wider">
                            {activeGuide.category}
                        </span>

                        <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-6">
                            {activeGuide.title}
                        </h1>

                        <p className="text-xl text-slate-300 leading-relaxed mb-10 max-w-2xl border-l-4 border-blue-500 pl-6">
                            {activeGuide.intro}
                        </p>

                        <div className="space-y-8">
                            <h2 className="text-2xl font-bold text-white flex items-center">
                                {t('guides.stepByStep')}
                            </h2>

                            <div className="space-y-6">
                                {activeGuide.steps.map((step, idx) => (
                                    <div key={idx} className="flex gap-4 group">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-bold group-hover:border-blue-500 transition-colors">
                                            {idx + 1}
                                        </div>
                                        <div className="pt-2">
                                            <p className="text-slate-300 text-lg leading-relaxed">
                                                {step.split('**').map((part, i) =>
                                                    i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-slate-700/50 flex justify-between items-center">
                            <p className="text-slate-500 italic">{t('guides.readyToTry')}</p>
                            <a
                                href={`/${activeGuide.id}`}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-blue-500/25 inline-block"
                            >
                                {t('guides.openTool')}
                            </a>
                        </div>
                    </article>
                </div>

                {/* Right Sidebar Ad (PC Only) */}
                <div className="hidden xl:block w-[160px] min-w-[160px] flex-shrink-0 pt-20">
                    <div className="sticky top-24">
                        <AdSpace placement="sidebar-right" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            <Helmet>
                <title>{t('guides.title')} | OrbitPDF</title>
                <meta name="description" content={t('guides.subtitle')} />
                <link rel="canonical" href="https://orbitpdf.com/guides" />
            </Helmet>

            {/* Header */}
            <div className="text-center mb-8">
                <a href="/" className="inline-flex items-center text-slate-400 hover:text-white mb-4 transition-colors">
                    <ArrowLeft size={20} className="mr-2" /> {t('guides.backToTools')}
                </a>
                <h1 className="text-4xl md:text-5xl font-bold mb-2 text-white">
                    {t('guides.title')}
                </h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-6">
                    {t('guides.subtitle')}
                    <br />
                    <span className="text-xs text-slate-500 font-mono mt-2 inline-block">({t('guides.available', { count: filteredGuides.length })})</span>
                </p>

                {/* Search */}
                <div className="max-w-xl mx-auto relative">
                    <Search className="absolute left-4 top-3.5 text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder={t('guides.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGuides.map(guide => (
                    <div
                        key={guide.id}
                        onClick={() => window.location.href = `/guides/${guide.id}`}
                        className="group bg-slate-900/40 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-3 md:p-6 cursor-pointer transition-all hover:bg-slate-800/60 flex flex-col h-full"
                    >
                        <div className="mb-2 md:mb-4">
                            <span className="text-[8px] md:text-xs font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md uppercase tracking-wider">
                                {guide.category}
                            </span>
                        </div>
                        <h3 className="text-base md:text-xl font-bold text-slate-100 mb-0.5 md:mb-3 group-hover:text-blue-400 transition-colors">
                            {guide.title}
                        </h3>
                        <p className="text-slate-400 text-[10px] md:text-sm mb-0 md:mb-6 flex-grow line-clamp-2 md:line-clamp-3">
                            {guide.intro}
                        </p>
                        <div className="hidden md:flex items-center text-sm font-medium text-slate-300 group-hover:text-white mt-auto">
                            {t('guides.readGuide')} <ChevronRight size={16} className="ml-1 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredGuides.length === 0 && (
                <div className="text-center py-20 text-slate-500">
                    {t('guides.noGuidesFound', { query: searchTerm })}
                </div>
            )}
        </div>
    );
}
