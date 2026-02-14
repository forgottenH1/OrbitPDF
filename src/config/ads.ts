
// Import dynamic data from the Admin Dashboard system
import campaignsData from '../data/campaigns.json';
import advertisersData from '../data/advertisers.json';
import settingsData from '../data/settings.json';

export interface AdData {
    id: string;
    imageUrl: string;
    mobileImageUrl?: string; // Optional: Specific image for mobile devices
    linkUrl: string;
    altText: string;
    active: boolean;
    startDate?: string;
    endDate?: string;
    weight: number; // For weighted rotation
    tier: string;
    script?: string; // Custom HTML/JS script
    mobileScript?: string;
}

export interface AdZones {
    'sidebar-left': AdData[];
    'sidebar-right': AdData[];
    header: AdData[];
    footer: AdData[];
    interstitial: AdData[];
    [key: string]: AdData[]; // Allow for string indexing
}

// Helper to map Admin Campaign data to Frontend AdData
const getAdsForPlacement = (placement: string): AdData[] => {
    // Check global settings first
    const settings = (settingsData as any);
    if (settings.placements && settings.placements[placement] === false) {
        return [];
    }

    // Check if data is loaded correctly (JSON import)
    const campaigns = (campaignsData as any[]) || [];
    const advertisers = (advertisersData as any[]) || [];

    return campaigns
        .filter(c => {
            if (c.status !== 'active') return false;
            // Return ALL active ads for the placement (rotation logic handles selection)
            if (c.placement === placement) return true;
            // Include 'header-footer-combo' if requesting header or footer
            if ((placement === 'header' || placement === 'footer') && c.placement === 'header-footer-combo') return true;
            return false;
        })
        .map(c => {
            const isFooterRequest = placement === 'footer';
            const isCombo = c.placement === 'header-footer-combo';

            // Find advertiser to determine tier/weight (Fallback)
            const advertiser = advertisers.find(a => a.id === c.advertiserId);

            // Determine Tier (Strictly from Campaign, no fallback to Advertiser)
            // Default to 'bronze' if not set (for safety), but do NOT inherit from advertiser
            const tier = (c.tier || 'bronze').toString();

            // Determine Weight
            let weight = 5; // Default Bronze

            // Priority: Campaign Custom Weight > Advertiser Custom Weight > Tier Default
            if (c.customWeight && c.customWeight > 0) {
                weight = c.customWeight;
            } else if (advertiser?.customWeight && advertiser.customWeight > 0) {
                weight = advertiser.customWeight;
            } else {
                if (tier === 'platinum') weight = 10;
                else if (tier === 'gold') weight = 7;
                else if (tier.includes('silver')) weight = 6;
                else if (tier === 'bronze') weight = 5;
            }

            return {
                id: c.id,
                imageUrl: (isFooterRequest && isCombo && c.footerImageUrl) ? c.footerImageUrl : c.imageUrl,
                mobileImageUrl: (isFooterRequest && isCombo && c.footerMobileImageUrl) ? c.footerMobileImageUrl : (c.mobileImageUrl || undefined),
                linkUrl: c.link,
                altText: `Advertisement provided by ${c.advertiserId}`, // Fallback alt text
                active: true,
                startDate: c.startDate,
                endDate: c.endDate,
                weight: weight,
                tier: tier,
                script: (isFooterRequest && isCombo) ? c.footerScript : c.script,
                mobileScript: (isFooterRequest && isCombo) ? c.footerMobileScript : c.mobileScript
            };
        });
};

// Helper: Check if a script is an AdSense tag
export const isAdSenseScript = (script: string): boolean => {
    return /adsbygoogle/i.test(script) || /pagead2\.googlesyndication\.com/i.test(script);
};

// Middleware to filter ads based on AdSense toggle Settings
const getFilteredAds = (placement: string): AdData[] => {
    const ads = getAdsForPlacement(placement);
    const settings = (settingsData as any);

    // Check if AdSense is strictly enabled for this specific zone
    // If true -> Show ONLY AdSense ads
    // If false -> Show ONLY Non-AdSense ads
    const isAdSenseExclusive = settings.adsense?.[placement] === true;

    return ads.filter(ad => {
        const isAdSense = ad.script && isAdSenseScript(ad.script);

        if (isAdSenseExclusive) {
            // If AdSense Zone is ON, show ONLY AdSense ads
            return isAdSense;
        } else {
            // If AdSense Zone is OFF, show ONLY Non-AdSense ads
            return !isAdSense;
        }
    });
};

export const currentAds: AdZones = {
    'sidebar-left': getFilteredAds('sidebar-left'),
    'sidebar-right': getFilteredAds('sidebar-right'),
    header: getFilteredAds('header'),
    footer: getFilteredAds('footer'),
    interstitial: []
};
