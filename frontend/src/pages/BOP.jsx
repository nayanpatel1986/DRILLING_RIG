import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert, Waves } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getRigData, getRigHistory } from '../api';

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
            ? 'border-red-500/30 bg-red-500/10 text-red-300'
            : state === 'OPEN'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : state === 'ON'
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                    : state === 'STANDBY'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                        : 'border-white/10 bg-white/5 text-gray-300';

    return (
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${tone}`}>
            {state}
        </span>
    );
}

function UnifiedPressureCard({ title, items }) {
    return (
        <div className="rounded-[20px] border border-white/10 bg-[#16171d] overflow-hidden flex flex-col h-full min-h-0 shadow-lg">
            <div className="bg-white/[0.03] py-3 text-center border-b border-white/5 shrink-0">
                <span className="text-xs font-black text-gray-300 uppercase tracking-widest">{title}</span>
            </div>
            <div className="flex-1 p-3 grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar">
                {items.map((item, idx) => {
                    const ratio = item.max > 0 ? Math.min(100, Math.max(0, (item.value / item.max) * 100)) : 0;
                    const tone = item.value > item.max * 0.85 ? 'text-red-400' : item.value > item.max * 0.6 ? 'text-amber-400' : 'text-cyan-400';
                    return (
                        <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex flex-col items-center justify-center relative overflow-hidden group">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1 text-center w-full truncate">{item.label}</span>
                            <div className="flex items-baseline gap-1 z-10">
                                <span className={`text-xl font-sans font-black leading-none tabular-nums ${tone}`}>{item.value.toFixed(0)}</span>
                                <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wide">{item.unit}</span>
                            </div>
                            {/* Subtle mini progress bar at the very bottom of each capsule */}
                            <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/5">
                                <div className={`h-full ${item.value > item.max * 0.85 ? 'bg-red-500' : item.value > item.max * 0.6 ? 'bg-amber-500' : 'bg-cyan-500'}`} style={{ width: `${ratio}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function UnifiedStatusCard({ title, items }) {
    return (
        <div className="rounded-[20px] border border-white/10 bg-[#16171d] overflow-hidden flex flex-col h-full min-h-0 shadow-lg">
            <div className="bg-white/[0.03] py-3 text-center border-b border-white/5 shrink-0">
                <span className="text-xs font-black text-gray-300 uppercase tracking-widest">{title}</span>
            </div>
            <div className="flex-1 p-3 grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar">
                {items.map((item, idx) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex flex-col items-center justify-center relative overflow-hidden group">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-center w-full truncate">{item.label}</span>
                        <StatusBadge value={item.status} />
                        {item.detail && <span className="text-[7px] text-gray-600 mt-1 uppercase tracking-tight">{item.detail}</span>}
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

    const pressureItems = [
        { label: 'Annular Pressure', value: annularPressure, max: 5000, unit: 'psi' },
        { label: 'Upper Pipe Ram', value: upperPipePressure, max: 5000, unit: 'psi' },
        { label: 'Lower Pipe Ram', value: lowerPipePressure, max: 5000, unit: 'psi' },
        { label: 'Blind / Shear Ram', value: blindRamPressure, max: 5000, unit: 'psi' },
        { label: 'Accumulator Pressure', value: accumulatorPressure, max: 3000, unit: 'psi' },
        { label: 'Manifold Pressure', value: manifoldPressure, max: 10000, unit: 'psi' }
    ];

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
        if (accumulatorPressure < 2200) alerts.push({ label: 'Accumulator pressure below range', tone: 'border-red-500/30 bg-red-500/10 text-red-300' });
        if (usableFluid < 60) alerts.push({ label: 'Usable fluid reserve low', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' });
        if (manifoldPressure > 7000) alerts.push({ label: 'Manifold pressure elevated', tone: 'border-red-500/30 bg-red-500/10 text-red-300' });
        if (pump1Status !== 'ON' && pump2Status !== 'ON') alerts.push({ label: 'No hydraulic pump online', tone: 'border-red-500/30 bg-red-500/10 text-red-300' });
        if (annularStatus === 'CLOSED' || blindRamStatus === 'CLOSED') alerts.push({ label: 'A primary barrier is CLOSED', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' });
        if (alerts.length === 0) alerts.push({ label: 'All parameters normal', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' });
        return alerts;
    }, [accumulatorPressure, usableFluid, manifoldPressure, pump1Status, pump2Status, annularStatus, blindRamStatus]);

    const trendData = history.slice(-18).map((row) => ({
        time: formatShortTime(row.time),
        annular: getNumeric(row, ['AnnularPressure', 'ANNULAR', 'ANNULAR PRESSURE']),
        accum: getNumeric(row, ['AccumulatorPress', 'ACCUM PRESS', 'ACCUMULATOR']),
        manifold: getNumeric(row, ['ManifoldPress', 'MANIFOLD', 'MANIFOLD PRESS']),
    }));

    return (
        <div className="w-full h-full flex flex-col bg-[#0a0f19] p-4 text-white overflow-hidden">
            {/* Slim Header */}
            <header className="shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-white/5 bg-slate-900/40 p-3 rounded-2xl">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500/10 p-1.5 rounded-lg">
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
                
                {/* Column 1: Unified Pressure Parameters */}
                <div className="h-full min-h-0">
                    <UnifiedPressureCard title="Pressure Parameters" items={pressureItems} />
                </div>

                {/* Column 2: Unified Barrier & Ram Statuses */}
                <div className="h-full min-h-0">
                    <UnifiedStatusCard title="Barrier State Matrix" items={statusItems} />
                </div>

                {/* Column 3: Readiness, Alarm Board & Pressure Trend */}
                <div className="flex flex-col gap-4 h-full min-h-0">
                    {/* Readiness Snapshot */}
                    <div className="border border-white/5 bg-[#16171d] border-white/10 p-3 rounded-[20px] shrink-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5 mb-2 leading-none">
                            <Waves size={12} className="text-cyan-400" />
                            <span>Readiness Snapshot</span>
                        </div>
                        <div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
                                <span>Hydraulic Readiness</span>
                                <span>{hydraulicReadiness.toFixed(0)}%</span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                                <div
                                    className={`h-full rounded-full ${hydraulicReadiness < 60 ? 'bg-red-500' : hydraulicReadiness < 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${hydraulicReadiness}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Alarm Board */}
                    <div className="border border-[#16171d] bg-[#16171d] border-white/10 p-3 rounded-[20px] shrink-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5 mb-2 leading-none">
                            <AlertTriangle size={12} className="text-amber-400" />
                            <span>System Alarm Board</span>
                        </div>
                        <div className="space-y-1.5 max-h-[100px] overflow-y-auto custom-scrollbar pr-1">
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
                    <div className="flex-1 min-h-0 border border-white/10 bg-[#16171d] p-3 rounded-[20px] flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Pressure Trend</div>
                            <StatusBadge value={hydraulicReadiness > 80 ? 'READY' : hydraulicReadiness > 60 ? 'WATCH' : 'LOW'} />
                        </div>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 8 }} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} width={25} />
                                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }} />
                                    <Area type="monotone" dataKey="annular" stroke="#38bdf8" fill="rgba(56,189,248,0.14)" strokeWidth={1.5} />
                                    <Area type="monotone" dataKey="accum" stroke="#10b981" fill="rgba(16,185,129,0.12)" strokeWidth={1.5} />
                                    <Area type="monotone" dataKey="manifold" stroke="#f59e0b" fill="rgba(245,158,11,0.10)" strokeWidth={1.5} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
