import React from 'react';
import { useTranslation } from 'react-i18next';
import { currentAds, AdData } from '../config/ads';
import settingsData from '../data/settings.json';

interface AdSpaceProps {
    placement: 'header' | 'footer' | 'sidebar-left' | 'sidebar-right' | 'interstitial';
    className?: string;
}

const AdSpace: React.FC<AdSpaceProps> = ({ placement, className = '' }) => {
    const { t } = useTranslation();

    // Check if AdSense is exclusive for this zone
    const isAdSenseExclusive = (settingsData as any).adsense?.[placement] === true;

    // Weighted Random Selection: Selects an ad based on 'weight' property
    const activeAd: AdData | undefined = React.useMemo(() => {
        const ads = currentAds[placement] || [];
        const activeAds = ads.filter(ad => ad.active);

        if (activeAds.length === 0) return undefined;

        // Calculate total weight
        const totalWeight = activeAds.reduce((sum, ad) => sum + (ad.weight || 1), 0);

        // Random value between 0 and totalWeight
        let random = Math.random() * totalWeight;

        // Select ad
        for (const ad of activeAds) {
            const weight = ad.weight || 1;
            if (random < weight) {
                return ad;
            }
            random -= weight;
        }

        return activeAds[0]; // Fallback
    }, [placement]);

    const handleAdClick = (adId: string, linkUrl: string) => {
        // Prepare GA event
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'ad_click', {
                event_category: 'monetization',
                event_label: adId,
                transport_type: 'beacon',
                destination_url: linkUrl
            });
        }
    };

    // Lazy Loading State (Must be declared at top level)
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
        if (!activeAd) return; // Don't observe if no ad

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [activeAd]);

    const isSidebar = placement === 'sidebar-left' || placement === 'sidebar-right';

    // If there is an active ad, render it
    if (activeAd) {
        // --- SCRIPT RENDERING ---
        if (activeAd.script) {
            if (activeAd.mobileScript) {
                return (
                    <>
                        {/* Desktop Script */}
                        <ScriptAd script={activeAd.script} className={`${className} hidden md:flex`} isSidebar={isSidebar} />
                        {/* Mobile Script */}
                        <ScriptAd script={activeAd.mobileScript} className={`${className} flex md:hidden`} isSidebar={isSidebar} />
                    </>
                );
            }
            return <ScriptAd script={activeAd.script} className={className} isSidebar={isSidebar} />;
        }

        // --- IMAGE RENDERING ---
        const isVideo = (url?: string) => url?.match(/\.(mp4|webm)$/i);
        const desktopVideo = isVideo(activeAd.imageUrl);
        const mobileVideo = isVideo(activeAd.mobileImageUrl);

        return (
            <div
                ref={containerRef}
                className={`relative overflow-hidden group mx-auto ${isSidebar ? 'w-[160px] h-[600px]' : 'w-full min-h-[90px] h-auto flex justify-center'} ${className}`}
            >
                {isVisible ? (
                    <a
                        href={activeAd.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleAdClick(activeAd.id, activeAd.linkUrl)}
                        className={`block ${isSidebar ? 'w-full h-full' : 'w-full max-w-full md:max-w-[970px]'}`}
                    >
                        {(desktopVideo || mobileVideo) ? (
                            <>
                                <div className="block md:hidden w-full h-full">
                                    {mobileVideo ? (
                                        <video
                                            src={encodeURI(activeAd.mobileImageUrl || activeAd.imageUrl)}
                                            autoPlay loop muted playsInline
                                            className={`w-full h-auto object-contain ${isSidebar ? 'h-full' : ''}`}
                                        />
                                    ) : (
                                        <img
                                            src={encodeURI(activeAd.mobileImageUrl || activeAd.imageUrl)}
                                            alt={activeAd.altText}
                                            className={`w-full h-auto object-contain ${isSidebar ? 'h-full' : ''}`}
                                            loading="lazy"
                                        />
                                    )}
                                </div>
                                <div className="hidden md:block w-full h-full">
                                    {desktopVideo ? (
                                        <video
                                            src={encodeURI(activeAd.imageUrl)}
                                            autoPlay loop muted playsInline
                                            className={`w-full h-auto object-contain transition-transform duration-300 group-hover:scale-105 ${isSidebar ? 'h-full' : ''}`}
                                        />
                                    ) : (
                                        <img
                                            src={encodeURI(activeAd.imageUrl)}
                                            alt={activeAd.altText}
                                            className={`w-full h-auto object-contain transition-transform duration-300 group-hover:scale-105 ${isSidebar ? 'h-full' : ''}`}
                                            loading="lazy"
                                        />
                                    )}
                                </div>
                            </>
                        ) : (
                            <picture>
                                {activeAd.mobileImageUrl && <source media="(max-width: 767px)" srcSet={encodeURI(activeAd.mobileImageUrl)} />}
                                <img
                                    src={encodeURI(activeAd.imageUrl)}
                                    alt={activeAd.altText}
                                    className={`w-full h-auto object-contain transition-transform duration-300 group-hover:scale-105 ${isSidebar ? 'h-full' : ''}`}
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                />
                            </picture>
                        )}
                        <div className="absolute top-1 right-1 bg-black/50 text-[8px] text-white px-1 rounded z-10">Ad</div>
                    </a>
                ) : (
                    <div className="w-full h-full" />
                )}
            </div>
        );
    }

    // Fallback / Self-Promo (Default behavior now since Sanity is removed)
    // CRITICAL: If AdSense Exclusive is ON and no ad was found, DO NOT show fallback.
    // Collapse the space entirely.
    if (isAdSenseExclusive && !activeAd) {
        return null;
    }

    if (isSidebar) {
        return (
            <div className={`w-[160px] h-[600px] flex-shrink-0 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col items-center justify-center p-4 text-center ${className}`}>
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-4 text-center">{t('adSpace.label')}</p>

                <a href="/advertise.html" className="group block w-full flex-grow">
                    <div className="h-full bg-gradient-to-b from-blue-900/20 to-indigo-900/20 border border-blue-500/30 rounded-xl p-4 hover:border-blue-500/50 transition-all flex flex-col items-center justify-center gap-6">
                        <div className="text-center">
                            <p className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors mb-2">{t('adSpace.placeholderTitle')}</p>
                            <p className="text-slate-400 text-xs">{t('adSpace.placeholderDescSidebar')}</p>
                        </div>
                        <span className="shrink-0 text-[10px] text-blue-500 font-semibold uppercase tracking-wider bg-blue-500/10 px-3 py-2 rounded-full group-hover:bg-blue-500/20 transition-colors text-center">{t('adSpace.ctaSidebar')}</span>
                    </div>
                </a>
            </div>
        );
    }

    return (
        <div className={`w-full min-h-[140px] bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center p-6 text-center ${className}`}>
            <div className="w-full max-w-2xl">
                <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-3">{t('adSpace.label')}</p>
                <a href="/advertise.html" className="group block">
                    <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/50 transition-all">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="text-left">
                                <p className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors">{t('adSpace.placeholderTitle')}</p>
                                <p className="text-slate-400 text-sm">{t('adSpace.placeholderDescBanner')}</p>
                            </div>
                            <span className="shrink-0 text-xs text-blue-500 font-semibold uppercase tracking-wider bg-blue-500/10 px-4 py-2 rounded-full group-hover:bg-blue-500/20 transition-colors">{t('adSpace.ctaBanner')} &rarr;</span>
                        </div>
                    </div>
                </a>
            </div>
        </div>
    );
};

// Sub-component for Script Ads to handle lifecycle strictly via Iframe
// Switched back to direct document manipulation as srcDoc can be flaky with some ad networks
// that expect a synchronous execution environment.
const ScriptAd = ({ script, className, isSidebar }: { script: string, className: string, isSidebar: boolean }) => {
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const [isVisible, setIsVisible] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const hasInjected = React.useRef(false);

    // Check if it's an AdSense script
    const isAdSense = React.useMemo(() => {
        return /adsbygoogle/i.test(script) || /pagead2\.googlesyndication\.com/i.test(script);
    }, [script]);

    React.useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // --- ADSENSE DIRECT INJECTION (SAFE MODE) ---
    React.useEffect(() => {
        if (isVisible && isAdSense && containerRef.current && !hasInjected.current) {
            hasInjected.current = true;
            try {
                // 1. Extract the <ins> tag attributes from the script string
                //    AdSense scripts usually look like: <script>...</script> <ins ...></ins> <script>...</script>
                //    We need to reconstruct the <ins> element safely in the DOM.

                // Regex to find attributes in <ins> tag
                const insMatch = script.match(/<ins([^>]+)><\/ins>/);
                if (insMatch) {
                    const insAttributes = insMatch[1];
                    const insElement = document.createElement('ins');

                    // Parse attributes (simple regex parser)
                    const attrRegex = /(\w+)="([^"]+)"/g;
                    let match;
                    while ((match = attrRegex.exec(insAttributes)) !== null) {
                        insElement.setAttribute(match[1], match[2]);
                    }

                    // Append <ins> to container
                    containerRef.current.innerHTML = ''; // Clear container
                    containerRef.current.appendChild(insElement);

                    // Trigger AdSense
                    // @ts-ignore
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                } else {
                    console.error("AdSense <ins> tag not found in script:", script);
                }
            } catch (e) {
                console.error("AdSense Injection Error:", e);
            }
        }
    }, [isVisible, isAdSense, script]);

    // --- IFRAME INJECTION (SANDBOX MODE FOR OTHER ADS) ---
    React.useEffect(() => {
        if (isVisible && !isAdSense && iframeRef.current && script && !hasInjected.current) {
            const doc = iframeRef.current.contentWindow?.document;
            if (doc) {
                hasInjected.current = true;
                doc.open();
                doc.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <style>
                            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; overflow: hidden; height: 100vh; background: transparent; }
                            img, iframe, video { max-width: 100%; height: auto; }
                        </style>
                    </head>
                    <body>
                        <div id="ad-container">${script}</div>
                    </body>
                    </html>
                `);
                doc.close();
            }
        }
    }, [isVisible, isAdSense, script]);

    if (isAdSense) {
        return (
            <div
                ref={containerRef}
                className={`relative overflow-hidden group mx-auto flex items-center justify-center ${isSidebar ? 'w-[160px] min-h-[600px]' : 'w-full min-h-[90px]'} ${className}`}
            >
                {/* AdSense will be injected here */}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden group mx-auto flex items-center justify-center ${isSidebar ? 'w-[160px] min-h-[600px]' : 'w-full min-h-[90px]'} ${className}`}
        >
            {isVisible ? (
                <iframe
                    ref={iframeRef}
                    title="Ad Content"
                    className="w-full h-full border-0 overflow-hidden"
                    scrolling="no"
                />
            ) : (
                <div className="w-full h-full bg-slate-800/20 animate-pulse" />
            )}
        </div>
    );
};

export default AdSpace;
