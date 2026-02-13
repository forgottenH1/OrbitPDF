
import { useState, useEffect } from 'react';
import { Advertiser, Campaign, AdPlacement, AdStatus } from '../../types/admin';
import { adminService } from '../../services/adminService';
import { Edit2, Trash2, Check, X, Calendar, Link as LinkIcon, Image as ImageIcon, Clock } from 'lucide-react';

interface Props {
    advertisers: Advertiser[];
    campaigns: Campaign[];
    setCampaigns: (c: Campaign[]) => void;
}

export default function CampaignManager({ advertisers, campaigns, setCampaigns }: Props) {
    const [editing, setEditing] = useState<string | null>(null);
    const [tempData, setTempData] = useState<Partial<Campaign>>({});
    const [isAdding, setIsAdding] = useState(false);
    const [images, setImages] = useState<{ placement: string, filename: string, path: string }[]>([]);

    useEffect(() => {
        adminService.getImages().then(setImages);
    }, []);

    const handleEdit = (campaign: Campaign) => {
        setEditing(campaign.id);
        setTempData({ ...campaign });
    };

    const handleCancel = () => {
        setEditing(null);
        setIsAdding(false);
        setTempData({});
    };

    const validateCampaign = (campaign: Partial<Campaign>): string | null => {
        if (!campaign.placement || !campaign.startDate || !campaign.endDate) return "Missing required fields";

        const start = new Date(campaign.startDate).getTime();
        const end = new Date(campaign.endDate).getTime();

        if (start > end) return "Start date must be before end date";

        // Validate Assets
        if (campaign.script !== undefined) {
            if (!campaign.script.trim()) return "Script content is required";
        } else {
            // Image validation (basic check, though wizard does more)
            if (!campaign.imageUrl && !campaign.link) return "Image or Link required";
        }

        return null;
    };

    const handleSave = async () => {
        const error = validateCampaign(tempData, editing || undefined);
        if (error) {
            alert(error);
            return;
        }

        let updatedList = [...campaigns];

        if (isAdding) {
            const newCampaign: Campaign = {
                id: Date.now().toString(),
                advertiserId: tempData.advertiserId || advertisers[0]?.id || '',
                placement: tempData.placement || 'header',
                status: tempData.status || 'active',
                startDate: tempData.startDate || new Date().toISOString().split('T')[0],
                endDate: tempData.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                imageUrl: tempData.imageUrl || '',
                mobileImageUrl: tempData.mobileImageUrl || '',
                footerImageUrl: tempData.footerImageUrl || '',
                footerMobileImageUrl: tempData.footerMobileImageUrl || '',
                link: tempData.link || '',
                clicks: 0
            };
            updatedList.push(newCampaign);
        } else if (editing) {
            updatedList = updatedList.map(c => c.id === editing ? { ...c, ...tempData } as Campaign : c);
        }

        const result = await adminService.saveCampaigns(updatedList);
        if (result.success) {
            setCampaigns(updatedList);
            handleCancel();
        } else {
            alert(`Failed to save campaigns: ${result.error}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this campaign?')) return;
        const updatedList = campaigns.filter(c => c.id !== id);
        const result = await adminService.saveCampaigns(updatedList);
        if (result.success) setCampaigns(updatedList);
        else alert(`Failed to delete: ${result.error}`);
    };

    const getAdvertiserName = (id: string) => advertisers.find(a => a.id === id)?.companyName || 'Unknown';

    const getDuration = (start: string, end: string) => {
        const diff = new Date(end).getTime() - new Date(start).getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24)) + ' Days';
    };

    const getTimeLeft = (end: string) => {
        const now = new Date().getTime();
        // Set end time to the end of the target day (23:59:59)
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        const endTime = endDate.getTime();

        const diff = endTime - now;

        if (diff <= 0) return 'Expired';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        return `${days}d ${hours}h`;
    };

    const isUrgent = (end: string) => {
        const now = new Date().getTime();
        const endTime = new Date(end).getTime();
        const diff = endTime - now;
        return diff > 0 && diff < (24 * 60 * 60 * 1000); // Less than 24h
    };

    const calculateEndDate = (start: string, tier: string) => {
        const date = new Date(start);
        let days = 0;

        switch (tier) {
            case 'bronze': days = 7; break;
            case 'silver-left':
            case 'silver-right': days = 14; break;
            case 'gold': days = 14; break;
            case 'platinum': days = 30; break;
            default: return '';
        }

        // Generous inclusive: Start + Duration
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    };

    const formatTier = (tier: string) => {
        if (tier === 'silver-left') return 'Silver Left';
        if (tier === 'silver-right') return 'Silver Right';
        return tier.charAt(0).toUpperCase() + tier.slice(1);
    };

    const handleTierChange = (tier: string) => {
        if (!tempData.startDate) return;
        const newEndDate = calculateEndDate(tempData.startDate, tier);
        setTempData({ ...tempData, tier: tier as any, endDate: newEndDate });
    };



    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Campaign Manager</h2>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
                <table className="w-full text-left min-w-[1000px]">
                    <thead className="bg-slate-900 border-b border-slate-700">
                        <tr>
                            <th className="p-4">Advertiser</th>
                            <th className="p-4">Placement</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Duration</th>
                            <th className="p-4">Time Left</th>
                            <th className="p-4">Dates & Tier</th>
                            <th className="p-4">Assets</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {isAdding && (
                            <tr className="bg-blue-900/10 animate-pulse">
                                <td className="p-4">
                                    <select className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1" value={tempData.advertiserId} onChange={e => setTempData({ ...tempData, advertiserId: e.target.value })}>
                                        <option value="">Select Client...</option>
                                        {advertisers.map(a => (
                                            <option key={a.id} value={a.id}>
                                                {a.companyName} ({formatTier(a.tier)})
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-4">
                                    <select className="bg-slate-900 border border-slate-600 rounded px-2 py-1" value={tempData.placement} onChange={e => setTempData({ ...tempData, placement: e.target.value as AdPlacement })}>
                                        <option value="header">Header</option>
                                        <option value="footer">Footer</option>
                                        <option value="sidebar-left">Sidebar Left</option>
                                        <option value="sidebar-right">Sidebar Right</option>
                                        <option value="header-footer-combo">Header + Footer Combo (Platinum)</option>
                                    </select>
                                </td>
                                <td className="p-4">
                                    <select className="bg-slate-900 border border-slate-600 rounded px-2 py-1" value={tempData.status} onChange={e => setTempData({ ...tempData, status: e.target.value as AdStatus })}>
                                        <option value="draft">Draft</option>
                                        <option value="scheduled">Scheduled</option>
                                        <option value="active">Active</option>
                                        <option value="expired">Expired</option>
                                    </select>
                                </td>
                                <td className="p-4 text-slate-500">-</td>
                                <td className="p-4 text-slate-500">-</td>
                                <td className="p-4 space-y-2">
                                    <select
                                        className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs mb-2 text-blue-300"
                                        onChange={(e) => handleTierChange(e.target.value)}
                                        value={tempData.tier || ""}
                                    >
                                        <option value="" disabled>Select Tier Duration...</option>
                                        <option value="bronze">Bronze (7 Days)</option>
                                        <option value="silver-left">Silver Left (14 Days)</option>
                                        <option value="silver-right">Silver Right (14 Days)</option>
                                        <option value="gold">Gold (14 Days)</option>
                                        <option value="platinum">Platinum (30 Days)</option>
                                    </select>
                                    {tempData.endDate && <div className="text-xs text-slate-400 mt-1">Start: {tempData.startDate}</div>}
                                    {tempData.endDate && <div className="text-xs text-slate-400 mt-1">Ends: {tempData.endDate}</div>}
                                </td>
                                <td className="p-4 space-y-2">
                                    <div className="space-y-4">
                                        <div className="flex space-x-2 mb-2">
                                            <button
                                                onClick={() => setTempData({ ...tempData, script: undefined })}
                                                className={`text-[10px] px-2 py-1 rounded ${tempData.script === undefined ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                                            >
                                                Image
                                            </button>
                                            <button
                                                onClick={() => setTempData({ ...tempData, script: tempData.script || '' })}
                                                className={`text-[10px] px-2 py-1 rounded ${tempData.script !== undefined ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                                            >
                                                Script
                                            </button>
                                        </div>

                                        {tempData.script !== undefined ? (
                                            <div className="space-y-2">
                                                <div>
                                                    <label className="text-[10px] text-slate-400 uppercase font-bold">
                                                        {tempData.placement === 'header-footer-combo' ? 'Header Desktop' :
                                                            tempData.placement === 'footer' ? 'Footer Desktop' : 'Desktop Script'}
                                                    </label>
                                                    <textarea
                                                        className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono h-24"
                                                        placeholder="<script>..."
                                                        value={tempData.script}
                                                        onChange={e => setTempData({ ...tempData, script: e.target.value })}
                                                    />
                                                </div>

                                                {['header', 'footer', 'header-footer-combo'].includes(tempData.placement || '') && (
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 uppercase font-bold">
                                                            {tempData.placement === 'footer' ? 'Footer Mobile' : 'Header Mobile'}
                                                        </label>
                                                        <textarea
                                                            className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono h-24"
                                                            placeholder="Mobile Script..."
                                                            value={tempData.mobileScript || ''}
                                                            onChange={e => setTempData({ ...tempData, mobileScript: e.target.value })}
                                                        />
                                                    </div>
                                                )}

                                                {tempData.placement === 'header-footer-combo' && (
                                                    <>
                                                        <div className="border-t border-slate-700 pt-2 mt-2">
                                                            <label className="text-[10px] text-slate-400 uppercase font-bold">Footer Desktop</label>
                                                            <textarea
                                                                className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono h-24"
                                                                placeholder="Footer Desktop Script..."
                                                                value={tempData.footerScript || ''}
                                                                onChange={e => setTempData({ ...tempData, footerScript: e.target.value })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-slate-400 uppercase font-bold">Footer Mobile</label>
                                                            <textarea
                                                                className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono h-24"
                                                                placeholder="Footer Mobile Script..."
                                                                value={tempData.footerMobileScript || ''}
                                                                onChange={e => setTempData({ ...tempData, footerMobileScript: e.target.value })}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                {/* Header Assets (or Standard) */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-slate-400 uppercase font-bold">{tempData.placement === 'header-footer-combo' ? 'Header Assets' : 'Desktop'}</label>
                                                    <select className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" value={tempData.imageUrl || ''} onChange={e => setTempData({ ...tempData, imageUrl: e.target.value })}>
                                                        <option value="">Select Local Image...</option>
                                                        {images
                                                            .filter(img => {
                                                                if (tempData.placement === 'header-footer-combo') return img.placement === 'header';
                                                                return img.placement === (tempData.placement || 'header');
                                                            })
                                                            .map((img, idx) => (
                                                                <option key={idx} value={img.path}>{img.filename}</option>
                                                            ))}
                                                    </select>
                                                    <input className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" placeholder="Image URL" value={tempData.imageUrl || ''} onChange={e => setTempData({ ...tempData, imageUrl: e.target.value })} />

                                                    {(tempData.placement === 'header' || tempData.placement === 'footer' || tempData.placement === 'header-footer-combo') && (
                                                        <>
                                                            <label className="text-[10px] text-slate-400 uppercase mt-1 block">Mobile</label>
                                                            <select className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" value={tempData.mobileImageUrl || ''} onChange={e => setTempData({ ...tempData, mobileImageUrl: e.target.value })}>
                                                                <option value="">Select Local Mobile Image...</option>
                                                                {images
                                                                    .filter(img => {
                                                                        if (tempData.placement === 'header-footer-combo') return img.placement === 'header';
                                                                        return img.placement === (tempData.placement || 'header');
                                                                    })
                                                                    .map((img, idx) => (
                                                                        <option key={idx} value={img.path}>{img.filename}</option>
                                                                    ))}
                                                            </select>
                                                            <input className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" placeholder="Mobile URL" value={tempData.mobileImageUrl || ''} onChange={e => setTempData({ ...tempData, mobileImageUrl: e.target.value })} />
                                                        </>
                                                    )}
                                                </div>

                                                {/* Footer Assets for Combo */}
                                                {tempData.placement === 'header-footer-combo' && (
                                                    <div className="space-y-1 pt-2 border-t border-slate-700">
                                                        <label className="text-[10px] text-slate-400 uppercase font-bold">Footer Assets</label>
                                                        <label className="text-[10px] text-slate-500 uppercase block">Desktop</label>
                                                        <select className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" value={tempData.footerImageUrl || ''} onChange={e => setTempData({ ...tempData, footerImageUrl: e.target.value })}>
                                                            <option value="">Select Local Footer Image...</option>
                                                            {images
                                                                .filter(img => img.placement === 'footer')
                                                                .map((img, idx) => (
                                                                    <option key={idx} value={img.path}>{img.filename}</option>
                                                                ))}
                                                        </select>
                                                        <input className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" placeholder="Footer Image URL" value={tempData.footerImageUrl || ''} onChange={e => setTempData({ ...tempData, footerImageUrl: e.target.value })} />

                                                        <label className="text-[10px] text-slate-500 uppercase mt-1 block">Mobile</label>
                                                        <select className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" value={tempData.footerMobileImageUrl || ''} onChange={e => setTempData({ ...tempData, footerMobileImageUrl: e.target.value })}>
                                                            <option value="">Select Local Footer Mobile Image...</option>
                                                            {images
                                                                .filter(img => img.placement === 'footer')
                                                                .map((img, idx) => (
                                                                    <option key={idx} value={img.path}>{img.filename}</option>
                                                                ))}
                                                        </select>
                                                        <input className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" placeholder="Footer Mobile URL" value={tempData.footerMobileImageUrl || ''} onChange={e => setTempData({ ...tempData, footerMobileImageUrl: e.target.value })} />
                                                    </div>
                                                )}

                                                <div className="pt-2 border-t border-slate-700">
                                                    <input className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" placeholder="Target Link" value={tempData.link || ''} onChange={e => setTempData({ ...tempData, link: e.target.value })} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-right space-x-2">
                                    <button onClick={handleSave} className="text-emerald-400 hover:text-emerald-300"><Check className="w-5 h-5" /></button>
                                    <button onClick={handleCancel} className="text-red-400 hover:text-red-300"><X className="w-5 h-5" /></button>
                                </td>
                            </tr>
                        )}

                        {campaigns.map(c => (
                            <tr key={c.id} className="hover:bg-slate-700/50">
                                {editing === c.id ? (
                                    <>
                                        <td className="p-4">{getAdvertiserName(c.advertiserId)}</td>
                                        <td className="p-4">
                                            <select className="bg-slate-900 border border-slate-600 rounded px-2 py-1" value={tempData.placement} onChange={e => setTempData({ ...tempData, placement: e.target.value as AdPlacement })}>
                                                <option value="header">Header</option>
                                                <option value="footer">Footer</option>
                                                <option value="sidebar-left">Sidebar Left</option>
                                                <option value="sidebar-right">Sidebar Right</option>
                                                <option value="header-footer-combo">Header + Footer Combo (Platinum)</option>
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <select className="bg-slate-900 border border-slate-600 rounded px-2 py-1" value={tempData.status} onChange={e => setTempData({ ...tempData, status: e.target.value as AdStatus })}>
                                                <option value="draft">Draft</option>
                                                <option value="scheduled">Scheduled</option>
                                                <option value="active">Active</option>
                                                <option value="expired">Expired</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-slate-500">-</td>
                                        <td className="p-4 text-slate-500">-</td>
                                        <td className="p-4 space-y-2">
                                            <select
                                                className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs mb-2 text-blue-300"
                                                onChange={(e) => handleTierChange(e.target.value)}
                                                value={tempData.tier || ""}
                                            >
                                                <option value="" disabled>Select Tier Duration...</option>
                                                <option value="bronze">Bronze (7 Days)</option>
                                                <option value="silver-left">Silver Left (14 Days)</option>
                                                <option value="silver-right">Silver Right (14 Days)</option>
                                                <option value="gold">Gold (14 Days)</option>
                                                <option value="platinum">Platinum (30 Days)</option>
                                            </select>
                                            {tempData.endDate && <div className="text-xs text-slate-400 mt-1">Start: {tempData.startDate}</div>}
                                            {tempData.endDate && <div className="text-xs text-slate-400 mt-1">Ends: {tempData.endDate}</div>}
                                        </td>
                                        <td className="p-4 space-y-2">
                                            <div className="space-y-4">
                                                <div className="flex space-x-2 mb-2">
                                                    <button
                                                        onClick={() => setTempData({ ...tempData, script: undefined })}
                                                        className={`text-[10px] px-2 py-1 rounded ${tempData.script === undefined ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                                                    >
                                                        Image
                                                    </button>
                                                    <button
                                                        onClick={() => setTempData({ ...tempData, script: tempData.script || '' })}
                                                        className={`text-[10px] px-2 py-1 rounded ${tempData.script !== undefined ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                                                    >
                                                        Script
                                                    </button>
                                                </div>

                                                {tempData.script !== undefined ? (
                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="text-[10px] text-slate-400 uppercase font-bold">
                                                                {tempData.placement === 'header-footer-combo' ? 'Header Desktop' :
                                                                    tempData.placement === 'footer' ? 'Footer Desktop' : 'Desktop Script'}
                                                            </label>
                                                            <textarea
                                                                className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono h-24"
                                                                placeholder="<script>..."
                                                                value={tempData.script}
                                                                onChange={e => setTempData({ ...tempData, script: e.target.value })}
                                                            />
                                                        </div>

                                                        {['header', 'footer', 'header-footer-combo'].includes(tempData.placement || '') && (
                                                            <div>
                                                                <label className="text-[10px] text-slate-400 uppercase font-bold">
                                                                    {tempData.placement === 'footer' ? 'Footer Mobile' : 'Header Mobile'}
                                                                </label>
                                                                <textarea
                                                                    className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono h-24"
                                                                    placeholder="Mobile Script..."
                                                                    value={tempData.mobileScript || ''}
                                                                    onChange={e => setTempData({ ...tempData, mobileScript: e.target.value })}
                                                                />
                                                            </div>
                                                        )}

                                                        {tempData.placement === 'header-footer-combo' && (
                                                            <>
                                                                <div className="border-t border-slate-700 pt-2 mt-2">
                                                                    <label className="text-[10px] text-slate-400 uppercase font-bold">Footer Desktop</label>
                                                                    <textarea
                                                                        className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono h-24"
                                                                        placeholder="Footer Desktop Script..."
                                                                        value={tempData.footerScript || ''}
                                                                        onChange={e => setTempData({ ...tempData, footerScript: e.target.value })}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] text-slate-400 uppercase font-bold">Footer Mobile</label>
                                                                    <textarea
                                                                        className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs font-mono h-24"
                                                                        placeholder="Footer Mobile Script..."
                                                                        value={tempData.footerMobileScript || ''}
                                                                        onChange={e => setTempData({ ...tempData, footerMobileScript: e.target.value })}
                                                                    />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Header Assets (or Standard) */}
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-slate-400 uppercase font-bold">{tempData.placement === 'header-footer-combo' ? 'Header Assets' : 'Desktop'}</label>
                                                            <select className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" value={tempData.imageUrl || ''} onChange={e => setTempData({ ...tempData, imageUrl: e.target.value })}>
                                                                <option value="">Select Local Image...</option>
                                                                {images
                                                                    .filter(img => {
                                                                        if (tempData.placement === 'header-footer-combo') return img.placement === 'header';
                                                                        return img.placement === (tempData.placement || 'header');
                                                                    })
                                                                    .map((img, idx) => (
                                                                        <option key={idx} value={img.path}>{img.filename}</option>
                                                                    ))}
                                                            </select>
                                                            <input className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" placeholder="Image URL" value={tempData.imageUrl || ''} onChange={e => setTempData({ ...tempData, imageUrl: e.target.value })} />

                                                            {(tempData.placement === 'header' || tempData.placement === 'footer' || tempData.placement === 'header-footer-combo') && (
                                                                <>
                                                                    <label className="text-[10px] text-slate-400 uppercase mt-1 block">Mobile</label>
                                                                    <select className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" value={tempData.mobileImageUrl || ''} onChange={e => setTempData({ ...tempData, mobileImageUrl: e.target.value })}>
                                                                        <option value="">Select Local Mobile Image...</option>
                                                                        {images
                                                                            .filter(img => {
                                                                                if (tempData.placement === 'header-footer-combo') return img.placement === 'header';
                                                                                return img.placement === (tempData.placement || 'header');
                                                                            })
                                                                            .map((img, idx) => (
                                                                                <option key={idx} value={img.path}>{img.filename}</option>
                                                                            ))}
                                                                    </select>
                                                                    <input className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" placeholder="Mobile URL" value={tempData.mobileImageUrl || ''} onChange={e => setTempData({ ...tempData, mobileImageUrl: e.target.value })} />
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Footer Assets for Combo */}
                                                        {tempData.placement === 'header-footer-combo' && (
                                                            <div className="space-y-1 pt-2 border-t border-slate-700">
                                                                <label className="text-[10px] text-slate-400 uppercase font-bold">Footer Assets</label>
                                                                <label className="text-[10px] text-slate-500 uppercase block">Desktop</label>
                                                                <select className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" value={tempData.footerImageUrl || ''} onChange={e => setTempData({ ...tempData, footerImageUrl: e.target.value })}>
                                                                    <option value="">Select Local Footer Image...</option>
                                                                    {images
                                                                        .filter(img => img.placement === 'footer')
                                                                        .map((img, idx) => (
                                                                            <option key={idx} value={img.path}>{img.filename}</option>
                                                                        ))}
                                                                </select>
                                                                <input className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" placeholder="Footer Image URL" value={tempData.footerImageUrl || ''} onChange={e => setTempData({ ...tempData, footerImageUrl: e.target.value })} />

                                                                <label className="text-[10px] text-slate-500 uppercase mt-1 block">Mobile</label>
                                                                <select className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" value={tempData.footerMobileImageUrl || ''} onChange={e => setTempData({ ...tempData, footerMobileImageUrl: e.target.value })}>
                                                                    <option value="">Select Local Footer Mobile Image...</option>
                                                                    {images
                                                                        .filter(img => img.placement === 'footer')
                                                                        .map((img, idx) => (
                                                                            <option key={idx} value={img.path}>{img.filename}</option>
                                                                        ))}
                                                                </select>
                                                                <input className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" placeholder="Footer Mobile URL" value={tempData.footerMobileImageUrl || ''} onChange={e => setTempData({ ...tempData, footerMobileImageUrl: e.target.value })} />
                                                            </div>
                                                        )}

                                                        <div className="pt-2 border-t border-slate-700">
                                                            <input className="block w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs" placeholder="Target Link" value={tempData.link || ''} onChange={e => setTempData({ ...tempData, link: e.target.value })} />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button onClick={handleSave} className="text-emerald-400 hover:text-emerald-300"><Check className="w-5 h-5" /></button>
                                            <button onClick={handleCancel} className="text-red-400 hover:text-red-300"><X className="w-5 h-5" /></button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="p-4 font-medium text-white">{getAdvertiserName(c.advertiserId)}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-full bg-slate-700 text-xs font-mono">{c.placement}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase 
                                                ${c.status === 'active' ? 'bg-emerald-900 text-emerald-200' :
                                                    c.status === 'scheduled' ? 'bg-blue-900 text-blue-200' :
                                                        'bg-slate-600 text-slate-400'}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-mono text-slate-300">
                                            {getDuration(c.startDate, c.endDate)}
                                        </td>
                                        <td className="p-4">
                                            <span className={`flex items-center text-sm font-bold font-mono 
                                                ${isUrgent(c.endDate) ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                                                <Clock className="w-3 h-3 mr-2" />
                                                {getTimeLeft(c.endDate)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-400 space-y-1">
                                            <div className="flex items-center"><Calendar className="w-3 h-3 mr-2" /> {c.startDate}</div>
                                            <div className="flex items-center"><Calendar className="w-3 h-3 mr-2" /> {c.endDate}</div>
                                        </td>
                                        <td className="p-4 text-sm space-y-1">
                                            {c.script ? (
                                                <div className="flex items-center text-blue-400" title="This campaign uses a custom script">
                                                    <div className="px-2 py-1 bg-blue-900/50 rounded border border-blue-500/30 text-xs font-mono">
                                                        &lt;/&gt; Script
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <a href={c.imageUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-400 hover:underline"><ImageIcon className="w-3 h-3 mr-2" /> Image</a>
                                                    <a href={c.link} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-400 hover:underline"><LinkIcon className="w-3 h-3 mr-2" /> Target</a>
                                                </>
                                            )}
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button onClick={() => handleEdit(c)} className="text-slate-400 hover:text-white" title="Edit">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300" title="Delete">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                        {campaigns.length === 0 && !isAdding && (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-slate-500">
                                    No campaigns found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
