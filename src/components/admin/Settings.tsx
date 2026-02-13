import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Advertiser, Campaign } from '../../types/admin';
import { Loader2, Save, Power, CheckCircle, AlertCircle, RefreshCw, User, RotateCcw } from 'lucide-react';

const Settings: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<{ placements: Record<string, boolean> }>({ placements: {} });
    const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [settingsData, adsData, campsData] = await Promise.all([
                adminService.getSettings(),
                adminService.getAdvertisers(),
                adminService.getCampaigns()
            ]);
            setSettings(settingsData);
            setAdvertisers(adsData);
            setCampaigns(campsData);
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to load data' });
        } finally {
            setLoading(false);
        }
    };

    const handleWeightChange = (id: string, weight: string) => {
        const value = parseInt(weight);
        setCampaigns(prev => prev.map(c =>
            c.id === id ? { ...c, customWeight: isNaN(value) ? undefined : value } : c
        ));
    };

    const handleResetWeight = (id: string) => {
        setCampaigns(prev => prev.map(c =>
            c.id === id ? { ...c, customWeight: undefined } : c
        ));
    };



    const handleToggle = (placement: string) => {
        setSettings(prev => ({
            ...prev,
            placements: {
                ...prev.placements,
                [placement]: !prev.placements[placement]
            }
        }));
        setMessage(null); // Clear message on change
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const [settingsRes, campsRes] = await Promise.all([
                adminService.saveSettings(settings),
                adminService.saveCampaigns(campaigns) // Save modified campaigns (with weights)
            ]);

            if (settingsRes.success && campsRes.success) {
                setMessage({ type: 'success', text: 'Settings & Weights saved successfully!' });
            } else {
                setMessage({ type: 'error', text: settingsRes.error || campsRes.error || 'Failed to save changes' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        }

        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    const placements = [
        { id: 'header', label: 'Header Banner' },
        { id: 'footer', label: 'Footer Banner' },
        { id: 'sidebar-left', label: 'Left Sidebar' },
        { id: 'sidebar-right', label: 'Right Sidebar' },
        { id: 'interstitial', label: 'Interstitial' }
    ];

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                        Settings
                    </h2>
                    <p className="text-slate-400 mt-1">Manage global ad configurations.</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Power className="w-5 h-5 text-blue-400" />
                    Ad Placements
                </h3>
                <p className="text-slate-400 mb-6 text-sm">
                    Toggle ad spots on or off. Paused spots will not display any ads on the live site.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {placements.map(placement => {
                        const isActive = settings.placements[placement.id] !== false; // Default to true if undefined
                        return (
                            <div
                                key={placement.id}
                                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${isActive
                                    ? 'bg-emerald-900/10 border-emerald-500/30 hover:border-emerald-500/50'
                                    : 'bg-red-900/10 border-red-500/30 hover:border-red-500/50'
                                    }`}
                            >
                                <span className="font-medium text-slate-200">{placement.label}</span>
                                <button
                                    onClick={() => handleToggle(placement.id)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${isActive ? 'bg-emerald-500' : 'bg-slate-700'
                                        }`}
                                >
                                    <span
                                        className={`${isActive ? 'translate-x-6' : 'translate-x-1'
                                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                    />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-purple-400" />
                    Advertiser Frequency Weights
                </h3>
                <p className="text-slate-400 mb-6 text-sm">
                    Manually override the display frequency for specific advertisers. Higher numbers mean more frequent display.
                    <br />
                    <span className="text-slate-500 text-xs">(Standard Weights: Platinum=10, Gold=7, Silver=6, Bronze=5)</span>
                </p>

                <div className="space-y-3">
                    {campaigns
                        .filter(c => c.status === 'active')
                        .map(campaign => {
                            const advertiser = advertisers.find(a => a.id === campaign.advertiserId);
                            const tier = (campaign.tier || advertiser?.tier || 'bronze') as string;
                            const defaultWeight = tier === 'platinum' || tier === 'unassigned' ? 10 : tier === 'gold' ? 7 : tier.includes('silver') ? 6 : 5;
                            const isCustom = campaign.customWeight !== undefined && campaign.customWeight !== defaultWeight;

                            return (
                                <div key={campaign.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-200">
                                                {advertiser?.companyName || 'Unknown'}
                                                <span className="text-slate-500 font-normal text-xs ml-2">({campaign.placement.replace(/-/g, ' ')})</span>
                                            </div>
                                            <div className="text-xs text-slate-500 uppercase">{tier} Tier (Default: {defaultWeight})</div>
                                            {campaign.customWeight && <div className="text-[10px] text-purple-400">Custom Weight Active</div>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center bg-slate-900 rounded-lg border border-slate-600 px-2">
                                            <span className="text-xs text-slate-500 mr-2">Weight:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={campaign.customWeight ?? defaultWeight}
                                                onChange={(e) => handleWeightChange(campaign.id, e.target.value)}
                                                className={`w-12 bg-transparent text-center font-mono py-1 outline-none ${isCustom ? 'text-purple-400 font-bold' : 'text-slate-300'}`}
                                            />
                                        </div>
                                        {isCustom && (
                                            <button
                                                onClick={() => handleResetWeight(campaign.id)}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                                title="Reset to Default"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    {campaigns.filter(c => c.status === 'active').length === 0 && (
                        <div className="text-center text-slate-500 py-4">No active campaigns found.</div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    {message && (
                        <div className={`flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {message.text}
                        </div>
                    )}
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default Settings;
