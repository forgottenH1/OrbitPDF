import { useState, useEffect } from 'react';
import { Advertiser, Campaign, AdPlacement, AdTier } from '../../types/admin';
import { adminService } from '../../services/adminService';
import { X, Check, ArrowRight, Calendar, AlertTriangle } from 'lucide-react';

import { addDays } from '../../utils/dateUtils';

interface Props {
    onClose: () => void;
    onSuccess: () => void;
    advertisers: Advertiser[];
    campaigns: Campaign[];
    availableImages: { placement: string, filename: string, path: string }[];
}

type Step = 'advertiser' | 'details' | 'assets';

export default function CampaignWizard({ onClose, onSuccess, advertisers, campaigns, availableImages }: Props) {
    const [currentStep, setCurrentStep] = useState<Step>('advertiser');

    // Form State
    const [selectedAdvertiserId, setSelectedAdvertiserId] = useState<string>('');
    const [isNewAdvertiser, setIsNewAdvertiser] = useState(false);

    // New Advertiser Data
    const [newAdvertiser, setNewAdvertiser] = useState<Partial<Advertiser>>({
        tier: 'bronze'
    });

    // Campaign Data
    const [campaign, setCampaign] = useState<Partial<Campaign>>({
        status: 'active',
        placement: 'header',
        startDate: new Date().toISOString().split('T')[0],
        clicks: 0
    });

    // Validation State
    const [error, setError] = useState<string | null>(null);

    const [selectedTier, setSelectedTier] = useState<AdTier>('bronze');

    // Helpers
    const getAdvertiserTier = () => {
        if (isNewAdvertiser) return newAdvertiser.tier as AdTier;
        return selectedTier;
    };

    // ... inside component

    const calculateEndDate = (start: string, tier: string) => {
        let days = 7;
        switch (tier) {
            case 'bronze': days = 7; break;
            case 'silver-left':
            case 'silver-right': days = 14; break;
            case 'gold': days = 14; break;
            case 'platinum': days = 30; break;
            case 'unassigned': days = 365; break; // Default to 1 year for unassigned
        }
        // Inclusive range: Start + Duration (Start=11, +7 = 18. Consumes 11,12,13,14,15,16,17 = 7 days? No wait.)
        // If I want 7 FULL days. Feb 11 00:00 to Feb 18 00:00 is 7 days.
        // But our "End Date" logic is End of Day (23:59).
        // Feb 11. End = Feb 17 23:59. = 7 Days.
        // Wait, 11, 12, 13, 14, 15, 16, 17. That IS 7 days.
        // Why did user see 6d 13h? 
        // Maybe because they created it at 11am. 
        // Feb 17 23:59 - Feb 11 11:00 = 6d 13h.
        // Ah! If they want "7 Days" from START, it should be Feb 18 11:00.
        // But our system is Date-based, not Time-based.
        // So we should probably give them "Until the end of the 7th day".
        // Let's add full 'days' count. 
        // Feb 11 + 7 = Feb 18.
        // Feb 18 23:59 - Feb 11 11:00 = 7d 13h (approx).
        // Let's change this to be generous.
        return addDays(start, days);
    };

    // Auto-calculate end date AND placement when start date or tier changes
    useEffect(() => {
        const tier = getAdvertiserTier();

        // 1. Auto-select Placement based on Tier (Skip for unassigned)
        let autoPlacement: AdPlacement = 'header';
        if (tier === 'platinum') autoPlacement = 'header-footer-combo';
        else if (tier === 'gold') autoPlacement = 'header';
        else if (tier === 'silver-left') autoPlacement = 'sidebar-left';
        else if (tier === 'silver-right') autoPlacement = 'sidebar-right';
        else if (tier === 'bronze') autoPlacement = 'footer';

        // If unassigned, we don't enforce placement here, user selects it.
        // But we might want a default. Let's keep whatever is there or default to header.

        // 2. Auto-calculate End Date
        if (campaign.startDate && tier) {
            setCampaign(c => ({
                ...c,
                placement: tier === 'unassigned' ? (c.placement || 'header') : autoPlacement,
                endDate: calculateEndDate(c.startDate!, tier)
            }));
        }
    }, [campaign.startDate, selectedAdvertiserId, isNewAdvertiser, newAdvertiser.tier, selectedTier]);


    const validateStep = (): boolean => {
        setError(null);
        if (currentStep === 'advertiser') {
            if (isNewAdvertiser) {
                if (!newAdvertiser.companyName) { setError('Company Name is required'); return false; }
                if (!newAdvertiser.email) { setError('Email is required'); return false; }
            } else {
                if (!selectedAdvertiserId) { setError('Please select an advertiser'); return false; }
            }
        } else if (currentStep === 'details') {
            if (!campaign.placement) { setError('Placement is required'); return false; }
            if (!campaign.startDate || !campaign.endDate) { setError('Dates are required'); return false; }

            // Check overlaps
            const startStr = campaign.startDate;
            const endStr = campaign.endDate;
            const start = new Date(startStr!).getTime(); // Start of day 00:00
            const end = new Date(endStr!).setHours(23, 59, 59, 999); // End of day 23:59

            if (start > end) { setError('Start date must be before end date'); return false; }

            // Overlap check REMOVED to allow multiple active campaigns (Rotation System)
            // const overlapping = campaigns.find(c => ... );

            // if (overlapping) return setError(...) || false;
        }
        return true;
    };

    const handleNext = () => {
        if (!validateStep()) return;
        if (currentStep === 'advertiser') setCurrentStep('details');
        else if (currentStep === 'details') setCurrentStep('assets');
    };

    const handleSubmit = async () => {
        // Validation for required fields
        const missingFields = [];

        if (campaign.script !== undefined) {
            if (!campaign.script) missingFields.push('Ad Script (Desktop)');

            // Validate Combo Scripts
            if (campaign.placement === 'header-footer-combo') {
                if (!campaign.footerScript) missingFields.push('Footer Script (Desktop)');
            }
        } else {
            const isCombo = campaign.placement === 'header-footer-combo';
            const isHeader = campaign.placement === 'header';
            const isFooter = campaign.placement === 'footer';

            if (!campaign.imageUrl) missingFields.push('Desktop Image');
            if (!campaign.link) missingFields.push('Link');

            if (isCombo || isHeader || isFooter) {
                if (!campaign.mobileImageUrl) missingFields.push('Mobile Image');
            }

            if (isCombo) {
                if (!campaign.footerImageUrl) missingFields.push('Footer Desktop Image');
                if (!campaign.footerMobileImageUrl) missingFields.push('Footer Mobile Image');
            }
        }

        if (missingFields.length > 0) {
            setError(`Missing required assets: ${missingFields.join(', ')}`);
            return;
        }

        try {
            // 1. Save Advertiser if new
            let finalAdvertiserId = selectedAdvertiserId;
            if (isNewAdvertiser) {
                const newAdId = Date.now().toString();
                const newAd: Advertiser = {
                    id: newAdId,
                    companyName: newAdvertiser.companyName!,
                    contactName: newAdvertiser.contactName || '',
                    email: newAdvertiser.email!,
                    tier: newAdvertiser.tier as AdTier,
                    notes: newAdvertiser.notes || '',
                    website: newAdvertiser.website || ''
                };

                // Optimistic update for the UI/Service to handle
                // In a real app we'd wait for the ID back, but here we generate it.
                await adminService.saveAdvertisers([...advertisers, newAd]);
                finalAdvertiserId = newAdId;
            }

            // 2. Save Campaign
            const newCampaign: Campaign = {
                ...campaign as Campaign,
                id: Date.now().toString(), // Ensure unique ID even if rapid fire
                advertiserId: finalAdvertiserId,
                clicks: 0,
                tier: getAdvertiserTier()
            };

            await adminService.saveCampaigns([...campaigns, newCampaign]);

            onSuccess();
        } catch (err) {
            setError('Failed to save. Please try again.');
        }
    };



    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
                    <div>
                        <h2 className="text-2xl font-bold text-white">New Campaign Wizard</h2>
                        <div className="flex space-x-2 mt-2">
                            <StepIndicator step="advertiser" current={currentStep} label="Advertiser" />
                            <div className="w-8 h-[2px] bg-slate-700 self-center" />
                            <StepIndicator step="details" current={currentStep} label="Details" />
                            <div className="w-8 h-[2px] bg-slate-700 self-center" />
                            <StepIndicator step="assets" current={currentStep} label="Assets" />
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4 flex items-center text-red-200">
                            <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {currentStep === 'advertiser' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setIsNewAdvertiser(false)}
                                    className={`p-4 rounded-lg border text-left transition-all ${!isNewAdvertiser ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                                >
                                    <div className="font-bold text-lg mb-1">Existing Client</div>
                                    <div className="text-sm text-slate-400">Select from database</div>
                                </button>
                                <button
                                    onClick={() => { setIsNewAdvertiser(true); setSelectedAdvertiserId(''); }}
                                    className={`p-4 rounded-lg border text-left transition-all ${isNewAdvertiser ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
                                >
                                    <div className="font-bold text-lg mb-1">New Client</div>
                                    <div className="text-sm text-slate-400">Create profile</div>
                                </button>
                            </div>

                            {!isNewAdvertiser ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Select Advertiser</label>
                                    <select
                                        value={selectedAdvertiserId}
                                        onChange={(e) => setSelectedAdvertiserId(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                    >
                                        <option value="">-- Choose Company --</option>
                                        {advertisers.map(ad => (
                                            <option key={ad.id} value={ad.id}>{ad.companyName}</option>
                                        ))}
                                    </select>

                                    <label className="block text-sm font-medium text-slate-400 mt-4 mb-2">Select Tier for this Campaign</label>
                                    <select
                                        value={selectedTier}
                                        onChange={(e) => setSelectedTier(e.target.value as AdTier)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                        disabled={!selectedAdvertiserId}
                                    >
                                        <option value="bronze">Bronze (Standard)</option>
                                        <option value="silver-left">Silver Left</option>
                                        <option value="silver-right">Silver Right</option>
                                        <option value="gold">Gold (Premium)</option>
                                        <option value="platinum">Platinum (Combo)</option>
                                        <option value="unassigned">Unassigned (Custom)</option>
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Company Name *</label>
                                        <input
                                            value={newAdvertiser.companyName || ''}
                                            onChange={e => setNewAdvertiser({ ...newAdvertiser, companyName: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white"
                                            placeholder="e.g. Acme Corp"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-1">Contact Name</label>
                                            <input
                                                value={newAdvertiser.contactName || ''}
                                                onChange={e => setNewAdvertiser({ ...newAdvertiser, contactName: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-1">Email *</label>
                                            <input
                                                value={newAdvertiser.email || ''}
                                                onChange={e => setNewAdvertiser({ ...newAdvertiser, email: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Tier</label>
                                        <select
                                            value={newAdvertiser.tier}
                                            onChange={e => setNewAdvertiser({ ...newAdvertiser, tier: e.target.value as AdTier })}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white"
                                        >
                                            <option value="bronze">Bronze (Standard)</option>
                                            <option value="silver-left">Silver Left</option>
                                            <option value="silver-right">Silver Right</option>
                                            <option value="gold">Gold (Premium)</option>
                                            <option value="platinum">Platinum (Combo)</option>
                                            <option value="unassigned">Unassigned (Custom)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep === 'details' && (
                        <div className="space-y-6">
                            {/* Placement */}
                            {getAdvertiserTier() === 'unassigned' ? (
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Ads Zone Placement *</label>
                                    <select
                                        value={campaign.placement || ''}
                                        onChange={e => setCampaign({ ...campaign, placement: e.target.value as AdPlacement })}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                    >
                                        <option value="header">Header Banner</option>
                                        <option value="footer">Footer Banner</option>
                                        <option value="sidebar-left">Left Sidebar</option>
                                        <option value="sidebar-right">Right Sidebar</option>
                                        <option value="header-footer-combo">Header + Footer Combo</option>
                                        <option value="interstitial">Interstitial</option>
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-emerald-400 mb-2">
                                        Placement: <span className="text-white font-bold">{campaign.placement?.replace(/-/g, ' ').toUpperCase()}</span>
                                    </label>
                                    <p className="text-xs text-slate-500">
                                        Automatically set based on {getAdvertiserTier().toUpperCase()} tier.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Start Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                                        <input
                                            type="date"
                                            value={campaign.startDate}
                                            onChange={e => setCampaign({ ...campaign, startDate: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 p-2.5 text-white"
                                        />
                                    </div>
                                </div>

                                {getAdvertiserTier() !== 'unassigned' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">End Date (Auto)</label>
                                        <input
                                            type="date"
                                            value={campaign.endDate}
                                            onChange={e => setCampaign({ ...campaign, endDate: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            Calculated based on {getAdvertiserTier().toUpperCase()} tier duration.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {currentStep === 'assets' && (
                        <div className="space-y-6">
                            {/* Ad Type Selector */}
                            <div className="flex space-x-4 mb-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="adType"
                                        checked={campaign.script === undefined}
                                        onChange={() => setCampaign({ ...campaign, script: undefined })}
                                        className="form-radio text-blue-600"
                                    />
                                    <span className="text-white">Image Banner</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="adType"
                                        checked={campaign.script !== undefined}
                                        onChange={() => setCampaign({ ...campaign, script: '' })}
                                        className="form-radio text-blue-600"
                                    />
                                    <span className="text-white">Custom Script</span>
                                </label>
                            </div>

                            {/* SCRIPT INPUT */}
                            {campaign.script !== undefined ? (
                                <>
                                    {/* 1. Desktop Script (Always required if Script mode) */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">
                                            {campaign.placement === 'header-footer-combo' ? 'Header Script (Desktop) *' :
                                                campaign.placement === 'footer' ? 'Footer Script (Desktop) *' :
                                                    'Ad Script Code (Desktop) *'}
                                        </label>
                                        <textarea
                                            value={campaign.script}
                                            onChange={e => setCampaign({ ...campaign, script: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white font-mono text-xs h-32"
                                            placeholder="<script>...</script> or <iframe>...</iframe>"
                                        />
                                    </div>

                                    {/* 2. Mobile Script (For Header/Footer/Combo) */}
                                    {['header', 'footer', 'header-footer-combo'].includes(campaign.placement || '') && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mt-4 mb-2">
                                                {campaign.placement === 'footer' ? 'Footer Script (Mobile)' : 'Header Script (Mobile)'}
                                            </label>
                                            <textarea
                                                value={campaign.mobileScript || ''}
                                                onChange={e => setCampaign({ ...campaign, mobileScript: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white font-mono text-xs h-32"
                                                placeholder="Optional: Different script for mobile devices..."
                                            />
                                        </div>
                                    )}

                                    {/* 3. Footer Scripts (Combo Only) */}
                                    {campaign.placement === 'header-footer-combo' && (
                                        <div className="pt-6 border-t border-slate-700 mt-6 space-y-4">
                                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Footer Placement Scripts</h3>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                                    Footer Script (Desktop) *
                                                </label>
                                                <textarea
                                                    value={campaign.footerScript || ''}
                                                    onChange={e => setCampaign({ ...campaign, footerScript: e.target.value })}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white font-mono text-xs h-32"
                                                    placeholder="<script>...</script>"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                                    Footer Script (Mobile)
                                                </label>
                                                <textarea
                                                    value={campaign.footerMobileScript || ''}
                                                    onChange={e => setCampaign({ ...campaign, footerMobileScript: e.target.value })}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white font-mono text-xs h-32"
                                                    placeholder="Optional..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs text-yellow-500 mt-4">
                                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                                        Scripts are injected using sandboxed iframes. Ensure they are self-contained.
                                    </p>
                                </>
                            ) : (
                                <>
                                    {/* --- HEADER / MAIN PLACEMENT (Link & Images) --- */}

                                    {/* 1. Desktop Image (Always required) */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-2">
                                            {campaign.placement === 'header-footer-combo' ? 'Header Image (Desktop) *' :
                                                campaign.placement === 'footer' ? 'Footer Image (Desktop) *' :
                                                    'Ad Image (Desktop) *'}
                                        </label>
                                        <select
                                            value={campaign.imageUrl || ''}
                                            onChange={e => setCampaign({ ...campaign, imageUrl: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white mb-2"
                                        >
                                            <option value="">-- Select Valid Image --</option>
                                            {availableImages
                                                .filter(img => {
                                                    if (campaign.placement === 'header-footer-combo') return img.placement === 'header';
                                                    return img.placement === campaign.placement;
                                                })
                                                .map((img, idx) => (
                                                    <option key={idx} value={img.path}>{img.filename}</option>
                                                ))}
                                        </select>
                                        <input
                                            placeholder="Or paste external URL..."
                                            value={campaign.imageUrl || ''}
                                            onChange={e => setCampaign({ ...campaign, imageUrl: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                        />
                                    </div>

                                    {/* 2. Mobile Image (Required for Header/Footer/Combo) */}
                                    {['header', 'footer', 'header-footer-combo'].includes(campaign.placement || '') && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                                {campaign.placement === 'footer' ? 'Footer Image (Mobile) *' : 'Header Image (Mobile) *'}
                                            </label>
                                            <select
                                                value={campaign.mobileImageUrl || ''}
                                                onChange={e => setCampaign({ ...campaign, mobileImageUrl: e.target.value })}
                                                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white mb-2"
                                            >
                                                <option value="">-- Select Valid Image --</option>
                                                {availableImages
                                                    .filter(img => {
                                                        if (campaign.placement === 'header-footer-combo') return img.placement === 'header'; // Use header assets for mobile header
                                                        return img.placement === campaign.placement;
                                                    })
                                                    .map((img, idx) => (
                                                        <option key={idx} value={img.path}>{img.filename}</option>
                                                    ))}
                                            </select>
                                            <input
                                                placeholder="Or paste external URL..."
                                                value={campaign.mobileImageUrl || ''}
                                                onChange={e => setCampaign({ ...campaign, mobileImageUrl: e.target.value })}
                                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                            />
                                        </div>
                                    )}

                                    {/* --- FOOTER SECTION (Only for COMBO) --- */}
                                    {campaign.placement === 'header-footer-combo' && (
                                        <div className="pt-6 border-t border-slate-700 space-y-6">
                                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Footer Placement Assets</h3>

                                            {/* 3. Footer Desktop */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-400 mb-2">Footer Image (Desktop) *</label>
                                                <select
                                                    value={campaign.footerImageUrl || ''}
                                                    onChange={e => setCampaign({ ...campaign, footerImageUrl: e.target.value })}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white mb-2"
                                                >
                                                    <option value="">-- Select Valid Image --</option>
                                                    {availableImages
                                                        .filter(img => img.placement === 'footer')
                                                        .map((img, idx) => (
                                                            <option key={idx} value={img.path}>{img.filename}</option>
                                                        ))}
                                                </select>
                                                <input
                                                    placeholder="Or paste external URL..."
                                                    value={campaign.footerImageUrl || ''}
                                                    onChange={e => setCampaign({ ...campaign, footerImageUrl: e.target.value })}
                                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                                />
                                            </div>

                                            {/* 4. Footer Mobile */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-400 mb-2">Footer Image (Mobile) *</label>
                                                <select
                                                    value={campaign.footerMobileImageUrl || ''}
                                                    onChange={e => setCampaign({ ...campaign, footerMobileImageUrl: e.target.value })}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white mb-2"
                                                >
                                                    <option value="">-- Select Valid Image --</option>
                                                    {availableImages
                                                        .filter(img => img.placement === 'footer')
                                                        .map((img, idx) => (
                                                            <option key={idx} value={img.path}>{img.filename}</option>
                                                        ))}
                                                </select>
                                                <input
                                                    placeholder="Or paste external URL..."
                                                    value={campaign.footerMobileImageUrl || ''}
                                                    onChange={e => setCampaign({ ...campaign, footerMobileImageUrl: e.target.value })}
                                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-sm text-white"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-slate-700">
                                        <label className="block text-sm font-medium text-slate-400 mb-2">Target Link *</label>
                                        <input
                                            placeholder="https://..."
                                            value={campaign.link || ''}
                                            onChange={e => setCampaign({ ...campaign, link: e.target.value })}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-800 bg-slate-900/50 rounded-b-xl flex justify-between">
                    <button
                        onClick={currentStep === 'advertiser' ? onClose : () => setCurrentStep(prev => prev === 'assets' ? 'details' : 'advertiser')}
                        className="px-6 py-2 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        {currentStep === 'advertiser' ? 'Cancel' : 'Back'}
                    </button>

                    <button
                        onClick={currentStep === 'assets' ? handleSubmit : handleNext}
                        className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center space-x-2 transition-all shadow-lg shadow-blue-500/20"
                    >
                        <span>{currentStep === 'assets' ? 'Launch Campaign' : 'Next Step'}</span>
                        {currentStep !== 'assets' && <ArrowRight className="w-4 h-4" />}
                        {currentStep === 'assets' && <Check className="w-4 h-4" />}
                    </button>
                </div>
            </div >
        </div >
    );
}

function StepIndicator({ step, current, label }: { step: Step, current: Step, label: string }) {
    const isActive = step === current;
    const isPast = (step === 'advertiser' && current !== 'advertiser') || (step === 'details' && current === 'assets');

    return (
        <div className={`flex items-center space-x-2 ${isActive ? 'text-blue-400' : isPast ? 'text-emerald-400' : 'text-slate-500'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border 
                ${isActive ? 'border-blue-400 bg-blue-400/10' : isPast ? 'border-emerald-400 bg-emerald-400/10' : 'border-slate-600'}`}>
                {isPast ? <Check className="w-3 h-3" /> : (step === 'advertiser' ? '1' : step === 'details' ? '2' : '3')}
            </div>
            <span className="text-sm font-medium">{label}</span>
        </div>
    );
}
