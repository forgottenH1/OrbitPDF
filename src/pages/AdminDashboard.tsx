
import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { Advertiser, Campaign, DashboardStats } from '../types/admin';
import { Loader2, LayoutDashboard, Users, Megaphone, Settings as SettingsIcon, MonitorUp, AlertTriangle, LogOut } from 'lucide-react';
import AdvertiserList from '../components/admin/AdvertiserList';
import CampaignManager from '../components/admin/CampaignManager';
import CampaignWizard from '../components/admin/CampaignWizard';
import Settings from '../components/admin/Settings';

// Sub-components (Will be extracted later)
const Overview = ({ stats, alerts }: { stats: DashboardStats, alerts: any[] }) => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <div className="text-slate-400 text-sm mb-1">Active Campaigns</div>
                <div className="text-3xl font-bold text-blue-400">{stats.activeCampaigns}</div>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <div className="text-slate-400 text-sm mb-1">Total Advertisers</div>
                <div className="text-3xl font-bold text-emerald-400">{stats.totalAdvertisers}</div>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <div className="text-slate-400 text-sm mb-1">Expiring Soon (&lt; 72h)</div>
                <div className="text-3xl font-bold text-yellow-400">{stats.expiringSoon}</div>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <div className="text-slate-400 text-sm mb-1">Revenue Estimate</div>
                <div className="text-3xl font-bold text-purple-400">${stats.revenueEstimate}</div>
            </div>
        </div>

        {/* Alerts Section (24h warning) */}
        {alerts.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                <h3 className="text-red-400 font-bold flex items-center mb-2">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Critical Alerts (Expiring in 24h)
                </h3>
                <ul className="space-y-2">
                    {alerts.map((alert, idx) => (
                        <li key={idx} className="flex justify-between items-center text-red-200 text-sm">
                            <span>Campaign for <strong>{alert.company}</strong> ({alert.placement}) expires in {alert.hours} hours.</span>
                            <button className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs">
                                Renew / Notify
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
);

export default function AdminDashboard() {
    const [view, setView] = useState<'overview' | 'advertisers' | 'campaigns' | 'settings'>('overview');
    const [loading, setLoading] = useState(true);

    // Data State
    const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [images, setImages] = useState<{ placement: string, filename: string, path: string }[]>([]); // Added images state
    const [showWizard, setShowWizard] = useState(false); // Wizard State

    const [stats, setStats] = useState<DashboardStats>({
        totalAdvertisers: 0,
        activeCampaigns: 0,
        expiringSoon: 0,
        revenueEstimate: 0
    });
    const [alerts, setAlerts] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [adsData, campsData, imgsData] = await Promise.all([
                adminService.getAdvertisers(),
                adminService.getCampaigns(),
                adminService.getImages()
            ]);

            setAdvertisers(adsData);
            setCampaigns(campsData);
            setImages(imgsData);

            // Calculate Stats
            const active = campsData.filter(c => c.status === 'active');

            // Simple logic for expiring soon (mocked for now, will implement real date diff later)
            const expiring = active.filter(c => {
                const end = new Date(c.endDate).getTime();
                const now = new Date().getTime();
                const diffHours = (end - now) / (1000 * 60 * 60);
                return diffHours > 0 && diffHours < 72;
            });

            // 24h Alerts
            const critical = active.filter(c => {
                const end = new Date(c.endDate).getTime();
                const now = new Date().getTime();
                const diffHours = (end - now) / (1000 * 60 * 60);
                return diffHours > 0 && diffHours < 24;
            }).map(c => ({
                company: adsData.find(a => a.id === c.advertiserId)?.companyName || 'Unknown',
                placement: c.placement,
                hours: Math.floor((new Date(c.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60))
            }));

            setStats({
                totalAdvertisers: adsData.length,
                activeCampaigns: active.length,
                expiringSoon: expiring.length,
                revenueEstimate: active
                    .filter(c => !c.script && !c.mobileScript && c.tier !== 'unassigned')
                    .reduce((sum, c) => {
                        // Resolve tier: Campaign Tier -> Advertiser Tier -> Default 'bronze'
                        const advertiser = adsData.find(a => a.id === c.advertiserId);
                        const tier = c.tier || advertiser?.tier || 'bronze';

                        let price = 0;
                        switch (tier) {
                            case 'bronze': price = 9; break;
                            case 'silver-left':
                            case 'silver-right': price = 29; break;
                            case 'gold': price = 49; break;
                            case 'platinum': price = 99; break;
                            default: price = 0; // Unassigned or unknown
                        }
                        return sum + price;
                    }, 0)
            });
            setAlerts(critical);

        } catch (err) {
            console.error(err);
            setError('Failed to connect to Admin Server. is "npm run admin-server" running?');
        } finally {
            setLoading(false);
        }
    };

    const handleDeploy = async () => {
        if (!confirm('Are you sure you want to push all changes to GitHub? This will trigger a site build.')) return;

        try {
            // Show loading toast (mock)
            alert('Deploying...');
            const res = await adminService.deploy();
            if (res.success) alert('Deployment Successful!');
            else alert('Deployment Failed: ' + res.message);
        } catch (e) {
            alert('Error deploying.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
                    <p className="text-red-200 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#020617] text-slate-100">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col fixed h-full overflow-y-auto">
                <div className="mb-8 flex items-center space-x-2">
                    <LayoutDashboard className="w-6 h-6 text-blue-500" />
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                        Admin
                    </span>
                </div>

                <div className="mb-6">
                    <button
                        onClick={() => setShowWizard(true)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
                    >
                        <Megaphone className="w-5 h-5" />
                        <span>New Campaign</span>
                    </button>
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => setView('overview')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'overview' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span>Overview</span>
                    </button>
                    <button
                        onClick={() => setView('advertisers')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'advertisers' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <Users className="w-5 h-5" />
                        <span>Advertisers</span>
                    </button>
                    <button
                        onClick={() => setView('campaigns')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'campaigns' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <Megaphone className="w-5 h-5" />
                        <span>Campaigns</span>
                    </button>
                    <button
                        onClick={() => setView('settings')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${view === 'settings' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <SettingsIcon className="w-5 h-5" />
                        <span>Settings</span>
                    </button>
                </nav>

                <div className="pt-6 border-t border-slate-800 space-y-4">
                    <button
                        onClick={handleDeploy}
                        className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-medium transition-colors"
                    >
                        <MonitorUp className="w-4 h-4" />
                        <span>Deploy to Site</span>
                    </button>
                    <a href="/" className="w-full flex items-center justify-center space-x-2 text-slate-500 hover:text-slate-300 py-2">
                        <LogOut className="w-4 h-4" />
                        <span>Exit Admin</span>
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 ml-64 overflow-y-auto">
                {view === 'overview' && <Overview stats={stats} alerts={alerts} />}
                {view === 'advertisers' && (
                    <AdvertiserList
                        advertisers={advertisers}
                        setAdvertisers={setAdvertisers}
                        campaigns={campaigns} // Pass campaigns for deletion check
                        setCampaigns={setCampaigns} // Pass setter to delete dependent campaigns
                    />
                )}
                {view === 'campaigns' && (
                    <CampaignManager
                        advertisers={advertisers}
                        campaigns={campaigns}
                        setCampaigns={setCampaigns}
                    />
                )}
                {view === 'settings' && <Settings />}
            </main>

            {/* Wizard Modal */}
            {showWizard && (
                <CampaignWizard
                    onClose={() => setShowWizard(false)}
                    onSuccess={() => {
                        setShowWizard(false);
                        loadData(); // Refresh data
                    }}
                    advertisers={advertisers}
                    campaigns={campaigns}
                    availableImages={images}
                />
            )}
        </div>
    );
}
