import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert, Waves, Gauge, Droplet, ArrowRightCircle } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getRigData, getRigHistory } from '../api';
import RadialGauge from '../components/RadialGauge';

function getNumeric(source, candidates, fallback = 0) {
    for (const key of candidates) {
        const value = source?.[key];
        if (typeof value === 'number') return value;
    }
    return fallback;
}

function getStatusValue(source, candidates, fallback = 'UNKNOWN') {
    for (const key of candidates) {
        const value = source?.[key];
        if (value !== undefined && value !== null && value !== '') return String(value).toUpperCase();
    }
    return fallback;
}

function normalizeBarrierStatus(value) {
    const raw = String(value || '').toUpperCase();
    if (['1', 'ON', 'CLOSE', 'CLOSED', 'ENGAGED', 'ACTIVE'].includes(raw)) return 'CLOSED';
    if (['0', 'OPEN', 'OPENED', 'RELEASED', 'OFF'].includes(raw)) return 'OPEN';
    if (['2', 'STANDBY'].includes(raw)) return 'STANDBY';
    return raw || 'UNKNOWN';
}

function normalizePumpStatus(value) {
    const raw = String(value || '').toUpperCase();
    if (['1', 'ON', 'RUN', 'RUNNING', 'ACTIVE'].includes(raw)) return 'ON';
    if (['2', 'STANDBY'].includes(raw)) return 'STANDBY';
    if (['0', 'OFF', 'STOPPED'].includes(raw)) return 'OFF';
    return raw || 'UNKNOWN';
}

function formatShortTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function StatusBadge({ value }) {
    const state = String(value || 'UNKNOWN').toUpperCase();
    const tone =
        state === 'CLOSED'
            ? 'border-red-500/40 bg-red-500/10 text-red-400 font-black shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-pulse-red'
            : state === 'OPEN'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-black'
                : state === 'ON'
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400 font-black'
                    : state === 'STANDBY'
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 font-black'
                        : 'border-white/10 bg-white/5 text-gray-400';

    return (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${tone}`}>
            {state}
        </span>
    );
}

// 1. Core BOP Stack Digital Twin Schematic
function BOPStackVisual({ annular, upperRam, lowerRam, blindRam }) {
    const isAnnularClosed = annular === 'CLOSED';
    const isUpperClosed = upperRam === 'CLOSED';
    const isLowerClosed = lowerRam === 'CLOSED';
    const isBlindClosed = blindRam === 'CLOSED';

    return (
        <div className="rounded-[20px] border border-nov-border bg-nov-card overflow-hidden flex flex-col h-full min-h-[500px] shadow-2xl relative">
            <div className="bg-white/5 py-3 text-center border-b border-nov-border shrink-0">
                <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Stack Telemetry Twin</span>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                {/* Visual Guidelines */}
                <div className="absolute left-6 top-6 flex flex-col gap-1 text-[8px] font-black uppercase tracking-wider text-gray-500">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-red-500 animate-pulse" /> Closed / Engaged</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-500" /> Open / Released</div>
                </div>

                <svg viewBox="0 0 200 400" className="w-full max-w-[280px] h-full max-h-[380px]">
                    {/* Drill string passing down the center */}
                    <rect x="94" y="0" width="12" height="400" fill="#4b5563" opacity="0.65" />
                    <line x1="100" y1="0" x2="100" y2="400" stroke="#374151" strokeWidth="1" strokeDasharray="5 5" />
                    
                    {/* 1. ANNULAR PREVENTER (Top) */}
                    <g transform="translate(0, 30)">
                        <rect x="40" y="0" width="120" height="55" rx="10" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                        {/* Circular elastic seal squeeze effect */}
                        <path 
                            d="M 45 27.5 Q 75 12.5 94 27.5 Q 75 42.5 45 27.5" 
                            fill={isAnnularClosed ? '#ef4444' : '#10b981'} 
                            opacity="0.85"
                            className="transition-all duration-700 ease-in-out"
                            style={{ 
                                transform: isAnnularClosed ? 'translateX(8px) scaleX(1.08)' : 'translateX(0px)',
                            }}
                        />
                        <path 
                            d="M 155 27.5 Q 125 12.5 106 27.5 Q 125 42.5 155 27.5" 
                            fill={isAnnularClosed ? '#ef4444' : '#10b981'} 
                            opacity="0.85"
                            className="transition-all duration-700 ease-in-out"
                            style={{ 
                                transform: isAnnularClosed ? 'translateX(-8px) scaleX(1.08)' : 'translateX(0px)',
                            }}
                        />
                        <text x="100" y="32" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="black" letterSpacing="0.8">ANNULAR</text>
                        <circle cx="100" cy="11" r="3.5" fill={isAnnularClosed ? '#ef4444' : '#10b981'} className="animate-pulse" />
                    </g>

                    {/* Flange link */}
                    <rect x="82" y="93" width="36" height="15" fill="#334155" />

                    {/* 2. UPPER PIPE RAM */}
                    <g transform="translate(0, 118)">
                        <rect x="20" y="0" width="160" height="50" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                        {/* Slide blocks */}
                        <rect 
                            x="10" y="14" width="55" height="22" rx="3"
                            fill={isUpperClosed ? '#ef4444' : '#10b981'} 
                            className="transition-all duration-700 ease-in-out"
                            style={{ 
                                transform: isUpperClosed ? 'translateX(29px)' : 'translateX(0px)'
                            }}
                        />
                        <rect 
                            x="135" y="14" width="55" height="22" rx="3"
                            fill={isUpperClosed ? '#ef4444' : '#10b981'} 
                            className="transition-all duration-700 ease-in-out"
                            style={{ 
                                transform: isUpperClosed ? 'translateX(-29px)' : 'translateX(0px)'
                            }}
                        />
                        <text x="100" y="30" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="black" letterSpacing="0.8">UPPER RAM</text>
                    </g>

                    {/* Flange link */}
                    <rect x="82" y="178" width="36" height="15" fill="#334155" />

                    {/* 3. LOWER PIPE RAM */}
                    <g transform="translate(0, 203)">
                        <rect x="20" y="0" width="160" height="50" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                        {/* Slide blocks */}
                        <rect 
                            x="10" y="14" width="55" height="22" rx="3"
                            fill={isLowerClosed ? '#ef4444' : '#10b981'} 
                            className="transition-all duration-700 ease-in-out"
                            style={{ 
                                transform: isLowerClosed ? 'translateX(29px)' : 'translateX(0px)'
                            }}
                        />
                        <rect 
                            x="135" y="14" width="55" height="22" rx="3"
                            fill={isLowerClosed ? '#ef4444' : '#10b981'} 
                            className="transition-all duration-700 ease-in-out"
                            style={{ 
                                transform: isLowerClosed ? 'translateX(-29px)' : 'translateX(0px)'
                            }}
                        />
                        <text x="100" y="30" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="black" letterSpacing="0.8">LOWER RAM</text>
                    </g>

                    {/* Flange link */}
                    <rect x="82" y="263" width="36" height="15" fill="#334155" />

                    {/* 4. BLIND / SHEAR RAM */}
                    <g transform="translate(0, 288)">
                        <rect x="20" y="0" width="160" height="50" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                        {/* Left Shearing Blade */}
                        <path 
                            d="M 10 13 L 75 13 L 75 25 L 65 37 L 10 37 Z" 
                            fill={isBlindClosed ? '#ef4444' : '#10b981'} 
                            className="transition-all duration-700 ease-in-out"
                            style={{ 
                                transform: isBlindClosed ? 'translateX(25px)' : 'translateX(0px)'
                            }}
                        />
                        {/* Right Shearing Blade */}
                        <path 
                            d="M 190 13 L 125 13 L 125 25 L 135 37 L 190 37 Z" 
                            fill={isBlindClosed ? '#ef4444' : '#10b981'} 
                            className="transition-all duration-700 ease-in-out"
                            style={{ 
                                transform: isBlindClosed ? 'translateX(-25px)' : 'translateX(0px)'
                            }}
                        />
                        <text x="100" y="30" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="black" letterSpacing="0.8">BLIND RAM</text>
                    </g>
                </svg>
            </div>
        </div>
    );
}

// 2. High-Tech Accumulator Reserve Bottle Visual
function FluidReservoir({ value, max = 160 }) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    
    return (
        <div className="rounded-[20px] border border-nov-border bg-nov-card overflow-hidden flex flex-col h-full shadow-lg">
            <div className="bg-white/5 py-3 text-center border-b border-nov-border shrink-0">
                <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Accumulator Volume</span>
            </div>
            
            <div className="flex-1 p-4 flex flex-col sm:flex-row items-center justify-around gap-4 min-h-0">
                {/* Accumulator visual bottle */}
                <div className="relative w-20 h-44 border-[3px] border-slate-700 rounded-t-3xl rounded-b-xl overflow-hidden bg-slate-950/80 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] shrink-0">
                    {/* Gloss glass highlights */}
                    <div className="absolute left-1.5 top-0 bottom-0 w-2.5 bg-white/10 blur-[0.5px] z-20 rounded-full" />
                    <div className="absolute right-2 top-0 bottom-0 w-1 bg-white/5 blur-[0.5px] z-20 rounded-full" />
                    
                    {/* Fluids fill level */}
                    <div 
                        className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-cyan-600 via-cyan-500 to-cyan-400 transition-all duration-1000 ease-in-out shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                        style={{ height: `${pct}%` }}
                    >
                        {/* Wave indicator top */}
                        <div className="absolute -top-1.5 left-0 right-0 h-3 bg-cyan-300/60 rounded-full blur-[1px] animate-pulse" />
                    </div>
                </div>

                <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1">
                    <div className="flex items-baseline justify-center sm:justify-start gap-1">
                        <span className="text-3xl font-black text-cyan-400 font-sans leading-none">{value.toFixed(1)}</span>
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Gal</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">Fluid Level Capacity</span>
                    
                    <div className="mt-3 bg-black/30 border border-white/5 rounded-lg p-2 flex items-center gap-2">
                        <Droplet size={14} className="text-cyan-400" />
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Fluid reserves ready</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 3. Grid representation of Barriers & Ram status items
function BarrierStateMatrix({ title, items }) {
    return (
        <div className="rounded-[20px] border border-nov-border bg-nov-card overflow-hidden flex flex-col h-full min-h-0 shadow-lg">
            <div className="bg-white/5 py-3 text-center border-b border-nov-border shrink-0">
                <span className="text-xs font-black text-gray-300 uppercase tracking-widest">{title}</span>
            </div>
            <div className="flex-1 p-3 grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar">
                {items.map((item, idx) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex flex-col items-center justify-center relative overflow-hidden group">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-center w-full truncate">{item.label}</span>
                        <StatusBadge value={item.status} />
                        {item.detail && <span className="text-[7.5px] text-gray-500 mt-1 uppercase tracking-tight text-center truncate w-full">{item.detail}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function BOP() {
    const [rigData, setRigData] = useState({});
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const live = await getRigData();
            setRigData(live || {});
        };

        const fetchHistory = async () => {
            const rows = await getRigHistory('-30m');
            setHistory(rows || []);
        };

        fetchData();
        fetchHistory();

        const liveInterval = setInterval(fetchData, 2000);
        const historyInterval = setInterval(fetchHistory, 15000);
        return () => {
            clearInterval(liveInterval);
            clearInterval(historyInterval);
        };
    }, []);

    const annularPressure = getNumeric(rigData, ['AnnularPressure', 'ANNULAR', 'ANNULAR PRESSURE']);
    const upperPipePressure = getNumeric(rigData, ['PipeRamUpperPress', 'PIPE RAM UPPER PRESS', 'PIPE_UPPER_PRESS']);
    const lowerPipePressure = getNumeric(rigData, ['PipeRamLowerPress', 'PIPE RAM LOWER PRESS', 'PIPE_LOWER_PRESS']);
    const blindRamPressure = getNumeric(rigData, ['BlindRamPress', 'BLIND RAM PRESS', 'BLIND_PRESS']);
    const accumulatorPressure = getNumeric(rigData, ['AccumulatorPress', 'ACCUM PRESS', 'ACCUMULATOR']);
    const manifoldPressure = getNumeric(rigData, ['ManifoldPress', 'MANIFOLD', 'MANIFOLD PRESS']);

    const annularStatus = normalizeBarrierStatus(getStatusValue(rigData, ['AnnularStatus', 'ANNULAR_STATUS', 'ANNULAR']));
    const upperRamStatus = normalizeBarrierStatus(getStatusValue(rigData, ['PipeRamUpperStatus', 'PIPE_RAM_UPPER_STATUS', 'PIPE_UPPER_STATUS']));
    const lowerRamStatus = normalizeBarrierStatus(getStatusValue(rigData, ['PipeRamLowerStatus', 'PIPE_RAM_LOWER_STATUS', 'PIPE_LOWER_STATUS']));
    const blindRamStatus = normalizeBarrierStatus(getStatusValue(rigData, ['BlindRamStatus', 'BLIND_RAM_STATUS', 'BLIND_STATUS']));
    const pump1Status = normalizePumpStatus(getStatusValue(rigData, ['Pump1Status', 'BOP_PUMP1_STATUS', 'Pump1']));
    const pump2Status = normalizePumpStatus(getStatusValue(rigData, ['Pump2Status', 'BOP_PUMP2_STATUS', 'Pump2']));

    const usableFluid = Math.max(0, ((accumulatorPressure - 1200) / 1800) * 160);
    const closeTime = usableFluid > 90 ? 7.8 : usableFluid > 60 ? 10.5 : 14.8;
    const hydraulicReadiness = Math.min(100, Math.max(0, (accumulatorPressure / 3000) * 100));
    const pressureIntegrity = Math.min(
        100,
        Math.max(
            0,
            100 -
                Math.max(0, annularPressure - 3200) * 0.015 -
                Math.max(0, manifoldPressure - 6000) * 0.006 -
                Math.max(0, 1800 - accumulatorPressure) * 0.02
        )
    );

    const statusItems = [
        { label: 'Annular Preventer', status: annularStatus, detail: 'Primary sealing element' },
        { label: 'Upper Pipe Ram', status: upperRamStatus, detail: 'Upper pipe ram barrier' },
        { label: 'Lower Pipe Ram', status: lowerRamStatus, detail: 'Lower pipe ram barrier' },
        { label: 'Blind / Shear Ram', status: blindRamStatus, detail: 'Blind ram barrier' },
        { label: 'Hydraulic Pump 1', status: pump1Status, detail: 'Primary hydraulic pump' },
        { label: 'Hydraulic Pump 2', status: pump2Status, detail: 'Backup hydraulic pump' }
    ];

    const bopAlerts = useMemo(() => {
        const alerts = [];
        if (accumulatorPressure < 2200) alerts.push({ label: 'Accumulator pressure below range', tone: 'border-red-500/30 bg-red-500/10 text-red-400 font-bold' });
        if (usableFluid < 60) alerts.push({ label: 'Usable fluid reserve low', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold' });
        if (manifoldPressure > 7000) alerts.push({ label: 'Manifold pressure elevated', tone: 'border-red-500/30 bg-red-500/10 text-red-400 font-bold' });
        if (pump1Status !== 'ON' && pump2Status !== 'ON') alerts.push({ label: 'No hydraulic pump online', tone: 'border-red-500/30 bg-red-500/10 text-red-400 font-bold' });
        if (annularStatus === 'CLOSED' || blindRamStatus === 'CLOSED') alerts.push({ label: 'A primary barrier is CLOSED', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold' });
        if (alerts.length === 0) alerts.push({ label: 'All parameters normal', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold' });
        return alerts;
    }, [accumulatorPressure, usableFluid, manifoldPressure, pump1Status, pump2Status, annularStatus, blindRamStatus]);

    const trendData = history.slice(-18).map((row) => ({
        time: formatShortTime(row.time),
        annular: getNumeric(row, ['AnnularPressure', 'ANNULAR', 'ANNULAR PRESSURE']),
        accum: getNumeric(row, ['AccumulatorPress', 'ACCUM PRESS', 'ACCUMULATOR']),
        manifold: getNumeric(row, ['ManifoldPress', 'MANIFOLD', 'MANIFOLD PRESS']),
    }));

    return (
        <div className="w-full h-full flex flex-col bg-nov-dark p-4 text-white overflow-hidden">
            {/* Slim Header */}
            <header className="shrink-0 flex flex-wrap items-center justify-between gap-4 border border-nov-border bg-nov-card p-3 rounded-2xl">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/10 p-1.5 rounded-lg border border-red-500/20">
                        <ShieldAlert className="text-red-400" size={18} />
                    </div>
                    <div>
                        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-red-400 leading-none">BOP System</div>
                        <h1 className="text-sm font-black tracking-tight text-white uppercase mt-0.5">Pressure Control Watchboard</h1>
                    </div>
                </div>
                
                {/* Slim Header KPIs */}
                <div className="flex items-center gap-2">
                    {[
                        { label: 'ACCUMULATOR', val: accumulatorPressure.toFixed(0), unit: 'psi', color: 'text-cyan-400', bg: 'bg-cyan-500/5', border: 'border-cyan-500/20' },
                        { label: 'USABLE FLUID', val: usableFluid.toFixed(1), unit: 'gal', color: usableFluid < 60 ? 'text-amber-400' : 'text-emerald-400', bg: usableFluid < 60 ? 'bg-amber-500/5' : 'bg-emerald-500/5', border: usableFluid < 60 ? 'border-amber-500/20' : 'border-emerald-500/20' },
                        { label: 'EST. CLOSE TIME', val: closeTime.toFixed(1), unit: 'sec', color: 'text-violet-400', bg: 'bg-violet-500/5', border: 'border-violet-500/20' },
                        { label: 'PRESSURE INTEGRITY', val: pressureIntegrity.toFixed(0), unit: '%', color: pressureIntegrity < 65 ? 'text-red-400' : pressureIntegrity < 80 ? 'text-amber-400' : 'text-emerald-400', bg: pressureIntegrity < 65 ? 'bg-red-500/5' : pressureIntegrity < 80 ? 'bg-amber-500/5' : 'bg-emerald-500/5', border: pressureIntegrity < 65 ? 'border-red-500/20' : pressureIntegrity < 80 ? 'border-amber-500/20' : 'border-emerald-500/20' }
                    ].map((k, idx) => (
                        <div key={idx} className={`flex items-center gap-2 px-3 py-1 rounded-xl border ${k.bg} ${k.border}`}>
                            <span className="text-[8px] font-black uppercase tracking-wider text-gray-500 leading-none">{k.label}</span>
                            <span className={`text-xs font-black font-sans leading-none ${k.color}`}>{k.val} <span className="text-[7px] opacity-75 font-normal">{k.unit}</span></span>
                        </div>
                    ))}
                </div>
            </header>

            {/* Viewport-fitting Grid */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 animate-in fade-in duration-300">
                
                {/* Column 1: BOP Stack Schematic Representation */}
                <div className="h-full min-h-0">
                    <BOPStackVisual 
                        annular={annularStatus}
                        upperRam={upperRamStatus}
                        lowerRam={lowerRamStatus}
                        blindRam={blindRamStatus}
                    />
                </div>

                {/* Column 2: Gauges & Reservoir */}
                <div className="h-full min-h-0 flex flex-col gap-4">
                    {/* Dial Pressures Card */}
                    <div className="flex-1 min-h-0 rounded-[20px] border border-nov-border bg-nov-card overflow-hidden flex flex-col shadow-lg">
                        <div className="bg-white/5 py-3 text-center border-b border-nov-border shrink-0">
                            <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Hydraulic Pressures</span>
                        </div>
                        
                        <div className="flex-1 grid grid-cols-3 p-4 gap-2 items-center justify-center min-h-0">
                            <div className="w-full h-full flex flex-col items-center">
                                <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-widest text-center mb-1">ACCUMULATOR</span>
                                <div className="flex-1 w-full max-h-[140px]">
                                    <RadialGauge value={accumulatorPressure} min={0} max={3000} majorStep={500} minorStep={100} size="sm" unit="psi" />
                                </div>
                            </div>
                            
                            <div className="w-full h-full flex flex-col items-center">
                                <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-widest text-center mb-1">MANIFOLD</span>
                                <div className="flex-1 w-full max-h-[140px]">
                                    <RadialGauge value={manifoldPressure} min={0} max={10000} majorStep={2000} minorStep={500} size="sm" unit="psi" />
                                </div>
                            </div>

                            <div className="w-full h-full flex flex-col items-center">
                                <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-widest text-center mb-1">ANNULAR</span>
                                <div className="flex-1 w-full max-h-[140px]">
                                    <RadialGauge value={annularPressure} min={0} max={5000} majorStep={1000} minorStep={200} size="sm" unit="psi" />
                                </div>
                            </div>
                        </div>

                        {/* Extra Ram Pressures Subtitle indicators */}
                        <div className="px-4 py-3 bg-black/20 border-t border-nov-border grid grid-cols-3 gap-2 text-center text-[10px]">
                            <div>
                                <span className="block text-gray-500 font-black uppercase">Upper Pipe Ram</span>
                                <span className="font-sans font-black text-cyan-400 text-xs tabular-nums">{upperPipePressure.toFixed(0)} <span className="text-[8px] opacity-80">psi</span></span>
                            </div>
                            <div>
                                <span className="block text-gray-500 font-black uppercase">Lower Pipe Ram</span>
                                <span className="font-sans font-black text-cyan-400 text-xs tabular-nums">{lowerPipePressure.toFixed(0)} <span className="text-[8px] opacity-80">psi</span></span>
                            </div>
                            <div>
                                <span className="block text-gray-500 font-black uppercase">Blind/Shear Ram</span>
                                <span className="font-sans font-black text-cyan-400 text-xs tabular-nums">{blindRamPressure.toFixed(0)} <span className="text-[8px] opacity-80">psi</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Fluid bottle Reservoir */}
                    <div className="flex-1 min-h-0">
                        <FluidReservoir value={usableFluid} max={160} />
                    </div>
                </div>

                {/* Column 3: Barriers, Alarms & Trends */}
                <div className="flex flex-col gap-4 h-full min-h-0">
                    
                    {/* Matrix status cards */}
                    <div className="flex-1 min-h-0">
                        <BarrierStateMatrix title="Component State Matrix" items={statusItems} />
                    </div>

                    {/* System Alarm Board */}
                    <div className="border border-nov-border bg-nov-card p-3 rounded-[20px] shrink-0 shadow-lg">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5 mb-2 leading-none">
                            <AlertTriangle size={12} className="text-amber-400" />
                            <span>System Alarm Board</span>
                        </div>
                        <div className="space-y-1.5 max-h-[85px] overflow-y-auto custom-scrollbar pr-1">
                            {bopAlerts.map((alert, idx) => (
                                <div key={idx} className={`rounded-xl border px-3 py-1 text-[9px] font-bold ${alert.tone}`}>
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={12} className="shrink-0" />
                                        <span>{alert.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Trend Area Chart */}
                    <div className="flex-1 min-h-0 border border-nov-border bg-nov-card p-3 rounded-[20px] flex flex-col shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Pressure Trend</div>
                            <StatusBadge value={hydraulicReadiness > 80 ? 'READY' : hydraulicReadiness > 60 ? 'WATCH' : 'LOW'} />
                        </div>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorAnnular" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25}/>
                                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorAccum" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorManifold" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 8 }} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} width={25} />
                                    <Tooltip contentStyle={{ background: 'var(--card-bg, #0f172a)', border: '1px solid var(--card-border, rgba(255,255,255,0.08))', borderRadius: '12px' }} />
                                    <Area type="monotone" dataKey="annular" name="Annular" stroke="#38bdf8" fill="url(#colorAnnular)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="accum" name="Accumulator" stroke="#10b981" fill="url(#colorAccum)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="manifold" name="Manifold" stroke="#f59e0b" fill="url(#colorManifold)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
