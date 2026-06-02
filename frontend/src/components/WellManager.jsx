import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getActiveWell } from '../api';
import { Gauge, ArrowDownCircle, MapPin, ChevronDown, LayoutGrid, Zap, Database, TrendingUp, FileText, Settings, LogOut, ShieldAlert, Activity } from 'lucide-react';
import { useRealtimeData } from '../hooks/useRealtimeData';
import SetDepthModal from './SetDepthModal';
import WellManagementModal from './WellManagementModal';
import { isViewer } from '../auth';

export default function WellManager({ role }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeWell, setActiveWell] = useState(null);
    const [isSetDepthModalOpen, setIsSetDepthModalOpen] = useState(false);
    const [isWellModalOpen, setIsWellModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [globalAlarmsEnabled, setGlobalAlarmsEnabled] = useState(() => {
        return localStorage.getItem('global_alarms_enabled') !== 'false';
    });

    const { data: wsData } = useRealtimeData();
    const data = wsData || {};
    
    const getVal = (k) => {
        const val = data?.[k];
        return (typeof val === 'number') ? val : 0;
    };

    const getActivityLabel = () => {
        const rawActivity =
            data?.RigActivity ??
            data?.RIG_ACTIVITY ??
            data?.['RIG ACTIVITY'] ??
            data?.Rig_Activity;

        if (typeof rawActivity === 'string' && rawActivity.trim()) {
            return rawActivity.trim().toUpperCase();
        }

        if (typeof rawActivity === 'number' && Number.isFinite(rawActivity)) {
            const rounded = Math.round(rawActivity);
            const activityMap = {
                0: 'IDLE',
                1: 'DRILLING',
                2: 'TRIPPING',
                3: 'CIRCULATING',
                4: 'CONNECTION',
                5: 'REAMING',
                6: 'SLIDING',
                7: 'ROTATING',
            };
            if (activityMap[rounded]) {
                return activityMap[rounded];
            }
        }

        const rop = getVal('ROP');
        const hkld = getVal('HookLoad');
        return rop > 0.5 ? 'DRILLING' : hkld > 5 ? 'TRIPPING' : 'IDLE';
    };

    const depth = getVal('Depth');
    const bitDepth = getVal('BitDepth');
    const rigActivity = getActivityLabel();
    const activityText =
        rigActivity === 'DRILLING' || rigActivity === 'ROTATING' || rigActivity === 'SLIDING'
            ? 'text-green-400'
            : rigActivity === 'TRIPPING' || rigActivity === 'CONNECTION' || rigActivity === 'REAMING'
                ? 'text-yellow-400'
                : rigActivity === 'CIRCULATING'
                    ? 'text-blue-400'
                    : 'text-cyan-400';

    const fetchWell = async () => {
        try {
            const well = await getActiveWell();
            setActiveWell(well);
        } catch (err) { /* ignore */ }
    };

    useEffect(() => {
        fetchWell();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleTrigger = () => {
        setIsSetDepthModalOpen(true);
    };

    const toggleAlarms = () => {
        const newState = !globalAlarmsEnabled;
        setGlobalAlarmsEnabled(newState);
        localStorage.setItem('global_alarms_enabled', newState.toString());
        window.dispatchEvent(new Event('global_alarms_toggled'));
    };

    const [currentBg, setCurrentBg] = useState(() => {
        return localStorage.getItem('drillbit_twin_bg_theme') || '#0b0c10';
    });

    const selectTheme = (color) => {
        setCurrentBg(color);
        localStorage.setItem('drillbit_twin_bg_theme', color);
        window.dispatchEvent(new Event('bg_theme_changed'));
    };

    const allSidebarItems = [
        { icon: LayoutGrid, label: 'Drillbit Twin', path: '/twin' },
        { icon: ShieldAlert, label: 'Operations Dashboards', path: '/operations' },
        { icon: Zap, label: 'Energy Dashboard', path: '/energy' },
        { icon: Database, label: 'BOP Dashboard', path: '/bop' },
        { icon: Activity, label: 'EDR', path: '/edr' },
        { icon: Gauge, label: 'Equipment Assets', path: '/assets' },
        { icon: TrendingUp, label: 'Live Trends', path: '/trends' },
        { icon: FileText, label: 'Reports & Logs', path: '/reports' },
        { icon: Settings, label: 'User Management', path: '/users' },
    ];

    const isOperatorRole = role === 'operator';
    const isViewerRole = isViewer(role);
    const sidebarItems = isOperatorRole
        ? allSidebarItems.filter(item => item.path === '/twin')
        : isViewerRole
            ? allSidebarItems.filter(item => item.path !== '/users')
            : allSidebarItems;

    const currentPath = location.pathname === '/' ? '/twin' : location.pathname;

    return (
        <>
            {/* Dropdown Overlay */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
            )}

            <div className="px-2 py-1.5 bg-gray-900 border-b border-white/10 flex items-center h-[78px] relative z-40">
                <div className="flex-1 flex items-center gap-2 pl-2">
                    {/* Blue DRILLBIT TWIN Home + Menu */}
                    <div className="relative z-50">
                        <div
                            className="flex overflow-hidden border-[3px] border-blue-400/50 bg-[#004d7a] text-white shadow-sm"
                            style={{ borderRightColor: '#002b45', borderBottomColor: '#002b45' }}
                        >
                            <button
                                onClick={() => {
                                    navigate('/twin' + location.search);
                                    setIsMenuOpen(false);
                                }}
                                className="px-3 py-1.5 font-black uppercase tracking-wider text-[11px] transition-all hover:bg-[#005a8f] active:scale-[0.98]"
                                title="Return to Drillbit Twin main page"
                            >
                                DRILLBIT TWIN
                            </button>

                            <button
                                onClick={() => setIsMenuOpen((prev) => !prev)}
                                className="flex items-center justify-center border-l border-blue-300/30 px-2 py-1.5 transition-all hover:bg-[#005a8f] active:scale-[0.98]"
                                title="Open page menu"
                            >
                                <ChevronDown size={14} className={`text-white transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} strokeWidth={4} />
                            </button>
                        </div>

                        {isMenuOpen && (
                            <div className="absolute left-0 top-full mt-2 w-[290px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] shadow-2xl shadow-black/40">
                                <div className="py-2">
                                    {sidebarItems.map((item, idx) => {
                                        const Icon = item.icon;
                                        const isActive = currentPath === item.path;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    navigate(`${item.path}${location.search}`);
                                                    setIsMenuOpen(false);
                                                }}
                                                className={`flex w-full items-center gap-4 px-5 py-3 text-left transition-colors ${
                                                    isActive ? 'bg-white/8 text-white' : 'text-gray-200 hover:bg-white/5 hover:text-white'
                                                }`}
                                            >
                                                <Icon size={18} className={isActive ? 'text-blue-400' : 'text-gray-400'} strokeWidth={1.8} />
                                                <span className={`text-[14px] ${isActive ? 'font-semibold' : 'font-normal'}`}>{item.label}</span>
                                            </button>
                                        );
                                    })}

                                    {/* BG THEME SELECTOR FOR VIEWERS */}
                                    {isViewerRole && (
                                        <div className="border-t border-white/5 px-5 py-3 mt-1 flex flex-col gap-2">
                                            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest">
                                                Theme Background:
                                            </span>
                                            <div className="grid grid-cols-5 gap-2">
                                                {[
                                                    { value: '#0b0c10', color: '#0b0c10', title: 'Navy' },
                                                    { value: '#030712', color: '#030712', title: 'Black' },
                                                    { value: '#1e293b', color: '#1e293b', title: 'Slate' },
                                                    { value: '#020617', color: '#020617', title: 'Midnight' },
                                                    { value: '#18181b', color: '#18181b', title: 'Charcoal' },
                                                    { value: '#062016', color: '#062016', title: 'Forest' },
                                                    { value: '#27050f', color: '#27050f', title: 'Burgundy' },
                                                    { value: '#e2e8f0', color: '#e2e8f0', title: 'Silver' },
                                                    { value: '#f8fafc', color: '#f8fafc', title: 'Ice' },
                                                    { value: '#f5f2eb', color: '#f5f2eb', title: 'Sand' }
                                                ].map((t) => (
                                                    <button
                                                        key={t.value}
                                                        onClick={() => selectTheme(t.value)}
                                                        className={`w-6 h-6 rounded-full border transition-all hover:scale-110 flex items-center justify-center ${
                                                            currentBg === t.value ? 'border-cyan-400 ring-2 ring-cyan-400/20' : 'border-white/10 hover:border-white/40'
                                                        }`}
                                                        style={{ backgroundColor: t.color }}
                                                        title={t.title}
                                                    >
                                                        {currentBg === t.value && (
                                                            <span className={`text-[10px] font-black ${
                                                                ['#e2e8f0', '#f8fafc', '#f5f2eb'].includes(t.value) ? 'text-black' : 'text-white'
                                                            }`}>✓</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="border-t border-white/5 my-1" />
                                </div>
                                <div className="border-t border-white/5 p-2">
                                    <button
                                        onClick={() => {
                                            localStorage.removeItem('token');
                                            window.location.href = '/login';
                                        }}
                                        className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-gray-200 transition-colors hover:bg-white/5 hover:text-white"
                                    >
                                        <LogOut size={18} className="text-gray-400" strokeWidth={1.8} />
                                        <span className="text-[14px]">Logout</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                <div className="flex flex-col ml-4">
                </div>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 px-3 py-1 rounded-xl border border-white/5 bg-white/[0.02] z-50">
                
                {/* GLOBAL ALARM TOGGLE */}
                {!isViewerRole && (
                    <>
                        <div className="flex items-center justify-center gap-2">
                            <button 
                                onClick={toggleAlarms}
                                className={`px-2 py-1 border-[3px] font-black uppercase text-[10px] shadow-sm tracking-wider whitespace-nowrap ${
                                    globalAlarmsEnabled 
                                        ? 'bg-[#E0E0E0] text-black border-white hover:bg-white transition-all active:scale-95' 
                                        : 'bg-red-800 text-white border-red-400 hover:bg-red-700 transition-all active:scale-95'
                                }`}
                                style={{ 
                                    borderRightColor: globalAlarmsEnabled ? '#6B6B6B' : '#7f1d1d', 
                                    borderBottomColor: globalAlarmsEnabled ? '#6B6B6B' : '#7f1d1d' 
                                }}
                            >
                                ALARM {globalAlarmsEnabled ? 'ENABLED' : 'DISABLED'}
                            </button>
                        </div>

                        <div className="w-px h-10 bg-white/10"></div>
                    </>
                )}

                {/* ACTIVITY BLOCK */}
                <div className="flex flex-col items-center min-w-[80px]">
                    <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-[0.18em] mb-0.5 flex items-center gap-1.5">
                        <Gauge size={12} className={activityText} /> ACTIVITY
                    </span>
                    <span className={`text-base leading-none font-black tracking-tighter ${activityText}`}>
                        {rigActivity}
                    </span>
                </div>
                
                <div className="w-px h-10 bg-white/10 mx-1"></div>

                {/* HOLE DEPTH BLOCK — visible to all roles, clickable only for non-viewers */}
                <div 
                    className={`flex flex-col items-center min-w-[100px] rounded-lg p-1.5 transition-all ${!isViewerRole ? 'cursor-pointer group hover:bg-white/10' : 'cursor-default'}`}
                    onClick={!isViewerRole ? handleTrigger : undefined}
                    title={!isViewerRole ? 'Click to set depth' : 'Hole Depth (read-only)'}
                >
                    <span className={`text-[10px] text-gray-400 font-extrabold uppercase tracking-[0.18em] mb-0.5 flex items-center gap-1.5 ${!isViewerRole ? 'group-hover:text-white' : ''}`}>
                        <ArrowDownCircle size={12} className="text-cyan-500" /> HOLE DEPTH
                    </span>
                    <div className="flex items-baseline gap-1 pointer-events-none">
                        <span className="text-base font-black text-blue-400 tracking-tighter tabular-nums leading-none">
                            {depth.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-blue-400/80 font-black">m</span>
                    </div>
                </div>

                <div className="w-px h-10 bg-white/10 mx-1"></div>

                {/* BIT POSITION BLOCK — visible to all roles, clickable only for non-viewers */}
                <div 
                    className={`flex flex-col items-center min-w-[100px] rounded-lg p-1.5 transition-all ${!isViewerRole ? 'cursor-pointer group hover:bg-white/10' : 'cursor-default'}`}
                    onClick={!isViewerRole ? handleTrigger : undefined}
                    title={!isViewerRole ? 'Click to set depth' : 'Bit Position (read-only)'}
                >
                    <span className={`text-[10px] text-gray-400 font-extrabold uppercase tracking-[0.18em] mb-0.5 flex items-center gap-1.5 ${!isViewerRole ? 'group-hover:text-white' : ''}`}>
                        <MapPin size={12} className="text-cyan-500" /> BIT POSITION
                    </span>
                    <div className="flex items-baseline gap-1 pointer-events-none">
                        <span className="text-base font-black text-blue-400 tracking-tighter tabular-nums leading-none">
                            {bitDepth.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-blue-400/80 font-black">m</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end justify-center pr-3 pb-6 gap-1 shrink-0 ml-auto">
                {/* Active Well Display (Top/Middle) */}
                <div 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${isViewerRole ? 'cursor-default' : 'cursor-pointer group hover:bg-white/5'}`}
                    onClick={isViewerRole ? undefined : () => setIsWellModalOpen(true)}
                    title={isViewerRole ? 'Well management is disabled in viewer mode' : 'Open Well Management'}
                >
                    <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest leading-none group-hover:text-white transition-colors">ACTIVE WELL:</span>
                    <span className="text-[16px] text-white font-black tracking-tighter leading-none group-hover:text-cyan-400 transition-colors" id="activewellid">
                        {activeWell ? activeWell.name : 'NO WELL LOADED'}
                    </span>
                </div>

                {/* Bottom Aligned Time/Date (Bigger Font) */}
                <div className="absolute bottom-1.5 right-3 flex items-center gap-2 text-[12px] font-black tracking-wider text-cyan-400 uppercase leading-none">
                    <span>{currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    <div className="w-[4px] h-[4px] rounded-full bg-cyan-400/40" />
                    <span>{currentTime.toLocaleDateString('en-GB')}</span>
                </div>
            </div>

            <SetDepthModal 
                isOpen={isSetDepthModalOpen}
                onClose={() => setIsSetDepthModalOpen(false)}
                currentDepth={depth}
                currentBitDepth={bitDepth}
            />
            <WellManagementModal 
                isOpen={isWellModalOpen}
                onClose={() => setIsWellModalOpen(false)}
                onWellChanged={fetchWell}
            />
        </div>
        </>
    );
}
