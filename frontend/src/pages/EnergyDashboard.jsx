import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getRigData, getRigHistory } from '../api';
import { RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getStoredRole } from '../auth';


/* ── Constants ─────────────────────────────────────────────────────── */
const DIESEL_DENSITY = 0.84;   // kg/L
const DIESEL_PRICE   = 40;     // ₹/L
const REFRESH_MS     = 3000;

const COLORS = ['#3b82f6', '#a855f7', '#10b981']; // Blue, Purple, Green

/* ── Helpers ───────────────────────────────────────────────────────── */
function fmt(v, dec = 1) {
    if (v == null || isNaN(v)) return '0';
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(dec) + 'K';
    return Number(v).toFixed(dec);
}

function fmtPower(kwh) {
    if (kwh >= 1000) return { value: (kwh / 1000).toFixed(2), unit: 'MWh' };
    return { value: kwh.toFixed(1), unit: 'kWh' };
}

/* ── Power Pack Card Component ─────────────────────────────────────── */
function PowerPackCard({ id, rpm, load, kw, isOnline }) {
    return (
        <Link
            to={`/engine/${id}`}
            className={`flex items-center gap-4 rounded-xl border p-3 transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
                isOnline
                    ? 'border-emerald-500/30 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] hover:border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] text-gray-500'
            }`}
        >
            <div className="relative shrink-0 w-20 h-16 flex items-center justify-center bg-black/20 rounded-lg p-1.5 border border-white/5">
                <img
                    src="/power_pack_engine.png"
                    alt={`Power Pack ${id}`}
                    className="w-full h-full object-contain"
                    style={{ filter: isOnline ? 'none' : 'grayscale(0.8) brightness(0.5)' }}
                />
                <span className={`absolute top-1 left-1 flex h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500/70'}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className={`text-xs font-black uppercase tracking-wider ${isOnline ? 'text-white' : 'text-gray-400'}`}>
                        Power Pack {id}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
                {isOnline ? (
                    <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px]">
                        <div>
                            <span className="text-gray-500 block text-[8px] font-bold uppercase tracking-wider">RPM</span>
                            <span className="text-cyan-400 font-bold tracking-tight">{rpm.toFixed(0)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-[8px] font-bold uppercase tracking-wider">Load</span>
                            <span className="text-amber-400 font-bold tracking-tight">{load.toFixed(0)}%</span>
                        </div>
                        <div>
                            <span className="text-gray-500 block text-[8px] font-bold uppercase tracking-wider">Power</span>
                            <span className="text-sky-400 font-bold tracking-tight">{kw.toFixed(0)} kW</span>
                        </div>
                    </div>
                ) : (
                    <div className="mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        Standby Mode
                    </div>
                )}
            </div>
        </Link>
    );
}

/* ── Timeline Bar ────────────────────────────────────────────────── */
function TimelineBar({ label, segments }) {
    return (
        <div className="flex items-center gap-2 mb-1.5">
            <div className="w-20 text-[10px] font-black text-gray-400 text-right shrink-0 truncate">
                {label}
            </div>
            <div className="flex-1 flex h-4 rounded overflow-hidden bg-white/5 border border-white/5">
                {segments.map((seg, i) => (
                    <div
                        key={i}
                        className="h-full flex items-center justify-center transition-all duration-300"
                        style={{
                            flex: seg.duration,
                            backgroundColor: seg.on ? '#10b981' : 'rgba(239, 68, 68, 0.1)',
                        }}
                    >
                        <span className="text-[7px] font-black text-white/50 truncate px-0.5">
                            {seg.on ? 'ON' : ''}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function buildTimeline(ppId, history) {
    if (!history || history.length === 0) {
        return [{ on: false, duration: 1 }];
    }

    const segments = [];
    let currentOn = null;
    let count = 0;

    history.forEach((point) => {
        const rpm = point[`PP${ppId}_RPM`] || 0;
        const load = point[`PP${ppId}_LoadPercent`] || 0;
        const isOn = rpm > 0 || load > 0;

        if (currentOn === null) {
            currentOn = isOn;
            count = 1;
        } else if (isOn === currentOn) {
            count++;
        } else {
            segments.push({ on: currentOn, duration: count });
            currentOn = isOn;
            count = 1;
        }
    });

    if (count > 0) segments.push({ on: currentOn, duration: count });
    return segments.length > 0 ? segments : [{ on: false, duration: 1 }];
}

function buildTimeLabels(history) {
    if (!history || history.length === 0) return ['--', '--', '--', '--', '--'];
    const step = Math.max(1, Math.floor(history.length / 5));
    const labels = [];
    for (let i = 0; i < history.length; i += step) {
        const d = new Date(history[i].time);
        labels.push(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }
    return labels.slice(0, 7);
}

/* ════════════════════════════════════════════════════════════════════ */
/*                     ENERGY DASHBOARD COMPONENT                     */
/* ════════════════════════════════════════════════════════════════════ */
export default function EnergyDashboard() {
    const role = getStoredRole();
    const isScrollable = role === 'admin' || role === 'viewer';
    const [rigData, setRigData] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        const live = await getRigData();
        setRigData(live || {});

        const hist = await getRigHistory('-2d');
        setHistoryData(hist || []);

        setLastRefresh(new Date());
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, REFRESH_MS);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchData();
        setTimeout(() => setIsRefreshing(false), 600);
    };

    /* ── Compute engine data ──────────────────────────────────── */
    const engines = useMemo(() => {
        return [1, 2, 3, 4].map((id) => {
            return {
                id,
                rpm: 0,
                load: 0,
                kw: 0,
                fuelRate: 0,
                isOnline: false,
            };
        });
    }, []);

    const kpis = useMemo(() => {
        const totalKW = 0;
        const totalFuelRate = 0;

        const hoursRunning = 0; 
        const totalPowerKWh = 0; 
        const dieselConsumedKL = 0;
        const fuelCost = 0;

        // Breakdown Fractions (Estimated)
        const dwFraction = 0.35;
        const etdFraction = 0.15;
        const mpFraction = 0.30;

        const totalPower = 0;

        return {
            totalPower: fmtPower(totalPower),
            dieselConsumedKL: dieselConsumedKL.toFixed(2),
            fuelCost,
            efficiency: '0.0',
            pieData: [
                { name: 'Drawworks', value: totalPower * dwFraction },
                { name: 'ETD', value: totalPower * etdFraction },
                { name: 'Mud Pump', value: totalPower * mpFraction }
            ]
        };
    }, []);

    const timelines = useMemo(() => {
        return [1, 2, 3, 4].map((id) => ({
            id,
            segments: buildTimeline(id, historyData),
        }));
    }, [historyData]);

    const timeLabels = useMemo(() => buildTimeLabels(historyData), [historyData]);

    const timeRange = useMemo(() => {
        const now = lastRefresh;
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        const format = (d) =>
            `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}, ${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        return `Time Range: [${format(twoDaysAgo)}] to [${format(now)}]`;
    }, [lastRefresh]);

    return (
        <div className={`w-full flex flex-col ${isScrollable ? 'overflow-y-auto custom-scrollbar min-h-fit' : 'h-full overflow-hidden'} bg-[#0b0e17] text-white`}>
            
            {/* ── TOP CONFIG BAR ─────────────────────────────────── */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#111827]/80">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Diesel Density</span>
                        <span className="text-sm font-black text-cyan-300">{DIESEL_DENSITY}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Diesel Price/L</span>
                        <span className="text-sm font-black text-cyan-300">₹{DIESEL_PRICE}</span>
                    </div>
                </div>

                <div className="text-[10px] font-mono text-gray-400 tracking-wide">
                    {timeRange}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last 2 days</span>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-black uppercase tracking-wider hover:bg-cyan-500/25 transition-colors"
                    >
                        <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── MAIN SCROLLABLE/FLEX CONTENT ───────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
                
                {/* Power Pack Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                    {engines.map((e) => (
                        <PowerPackCard 
                            key={e.id} 
                            id={e.id} 
                            rpm={e.rpm}
                            load={e.load}
                            kw={e.kw}
                            isOnline={e.isOnline} 
                        />
                    ))}
                </div>

                {/* Dashboard Metrics and Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[360px]">
                    
                    {/* Left: Total Consumption & Breakdown (Pie Chart) - Span 5 */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 rounded-2xl bg-gradient-to-br from-blue-600/20 to-blue-900/10 border border-blue-500/20 p-4 flex flex-col justify-between">
                                <span className="text-[10px] text-blue-300 uppercase font-black tracking-widest">Total Power Consumed</span>
                                <div className="mt-2 flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black tracking-tight text-white">{kpis.totalPower.value}</span>
                                    <span className="text-sm font-bold text-blue-300">{kpis.totalPower.unit}</span>
                                </div>
                            </div>
                            <div className="rounded-xl bg-gradient-to-br from-amber-600/20 to-amber-900/10 border border-amber-500/20 p-4 flex flex-col justify-between">
                                <span className="text-[9px] text-amber-300 uppercase font-black tracking-widest">Diesel Consumed</span>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-2xl font-black tracking-tight text-white">{kpis.dieselConsumedKL}</span>
                                    <span className="text-xs font-bold text-amber-300">kL</span>
                                </div>
                            </div>
                            <div className="rounded-xl bg-gradient-to-br from-emerald-600/20 to-emerald-900/10 border border-emerald-500/20 p-4 flex flex-col justify-between">
                                <span className="text-[9px] text-emerald-300 uppercase font-black tracking-widest">Fuel Cost Est.</span>
                                <div className="mt-2 flex items-baseline gap-0.5">
                                    <span className="text-2xl font-black tracking-tight text-white">₹{fmt(kpis.fuelCost / 1000)}k</span>
                                </div>
                            </div>
                        </div>

                        {/* Power Breakdown Pie Chart Card */}
                        <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-center min-h-[220px]">
                            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">Consumption Breakdown</span>
                            <div className="flex-1 flex items-center justify-between">
                                <div className="w-[140px] h-[140px] shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={kpis.pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={60}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {kpis.pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `${value.toFixed(1)} kWh`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex-1 flex flex-col gap-2 ml-4">
                                    {kpis.pieData.map((item, idx) => (
                                        <div key={item.name} className="flex items-center justify-between border-b border-white/5 pb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[idx] }} />
                                                <span className="text-xs font-bold text-gray-300">{item.name}</span>
                                            </div>
                                            <span className="text-xs font-black">{fmt(item.value, 0)} kWh</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle: Timeline History - Span 4 */}
                    <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between min-h-[300px]">
                        <div>
                            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest block mb-4">Gantt Operating Timelines</span>
                            <div className="flex flex-col justify-center gap-3">
                                {timelines.map((tl) => (
                                    <TimelineBar
                                        key={tl.id}
                                        label={`Pack ${tl.id}`}
                                        segments={tl.segments}
                                    />
                                ))}
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="w-20 shrink-0" />
                                    <div className="flex-1 flex justify-between">
                                        {timeLabels.map((t, i) => (
                                            <span key={i} className="text-[8px] text-gray-500 font-mono tracking-tighter">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Load & Efficiency - Span 3 */}
                    <div className="lg:col-span-3 flex flex-col gap-4">
                        {/* Overall Load Gauge Card */}
                        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-4">Overall Load</span>
                            <div className="relative w-36 h-20 overflow-hidden flex items-end justify-center">
                                <div className="absolute top-0 w-36 h-36 rounded-full border-[16px] border-white/[0.03] border-b-transparent border-r-transparent transform -rotate-45" />
                                <div className="absolute top-0 w-36 h-36 rounded-full border-[16px] border-emerald-500 border-b-transparent border-r-transparent transform -rotate-45" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 50%, 0 50%)' }} />
                                <div className="z-10 flex flex-col items-center pb-1">
                                    <span className="text-2xl font-black text-white leading-none">48%</span>
                                    <span className="text-[8px] font-black uppercase text-gray-500 mt-0.5">Average</span>
                                </div>
                            </div>
                        </div>

                        {/* System Efficiency & Operating Stats */}
                        <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest block mb-3">System Efficiency</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black tracking-tight text-emerald-400">{kpis.efficiency}%</span>
                                </div>
                                <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${kpis.efficiency}%` }} />
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400 font-bold">Total Power Packs</span>
                                    <span className="font-black text-white">4</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400 font-bold">Online Packs</span>
                                    <span className="font-black text-emerald-400">
                                        {engines.filter(e => e.isOnline).length}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400 font-bold">Total Output</span>
                                    <span className="font-black text-sky-400">
                                        {engines.reduce((sum, e) => sum + e.kw, 0).toFixed(0)} kW
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
