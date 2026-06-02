import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ChevronLeft, Fuel, Gauge, Thermometer, Zap } from 'lucide-react';
import { getRigData, getRigHistory } from '../api';
import { getStoredRole } from '../auth';


function extractEngineData(id, rawData) {
    const prefix = `PP${id}_`;
    const data = {
        RPM: rawData?.[`${prefix}RPM`] ?? 0,
        OilPressure: rawData?.[`${prefix}OilPressure`] ?? 0,
        CoolantTemp: rawData?.[`${prefix}CoolantTemp`] ?? 0,
        ExhaustTemp: rawData?.[`${prefix}ExhaustTemp`] ?? 0,
        OilTemperature: rawData?.[`${prefix}OilTemperature`] ?? 0,
        FuelRate: rawData?.[`${prefix}FuelRate`] ?? 0,
        RunHours: rawData?.[`${prefix}RunHours`] ?? 0,
        LoadPercent: rawData?.[`${prefix}LoadPercent`] ?? 0,
        InstFuelCons: rawData?.[`${prefix}InstFuelCons`] ?? 0,
        TotalFuelCons: rawData?.[`${prefix}TotalFuelCons`] ?? 0,
        TotalPercentKW: rawData?.[`${prefix}TotalPercentKW`] ?? 0,
        kWOutput: rawData?.[`${prefix}kWOutput`] ?? 0,
        TotalReactivePow: rawData?.[`${prefix}TotalReactivePow`] ?? 0,
        OverallPowerFact: rawData?.[`${prefix}OverallPowerFact`] ?? 0,
    };

    if (id === '1') {
        data.RPM = data.RPM || rawData?.RPM || 0;
        data.LoadPercent = data.LoadPercent || rawData?.LoadPercent || 0;
        data.FuelRate = data.FuelRate || rawData?.FuelRate || 0;
        data.OilPressure = data.OilPressure || rawData?.OilPressure || 0;
        data.CoolantTemp = data.CoolantTemp || rawData?.CoolantTemp || 0;
    }

    if (!data.kWOutput && data.TotalPercentKW) {
        data.kWOutput = data.TotalPercentKW * 11;
    }

    return data;
}

function formatHistory(id, history) {
    return (history || []).slice(-24).map((item) => {
        const dt = new Date(item.time);
        return {
            time: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            load: item[`PP${id}_LoadPercent`] || 0,
            power: item[`PP${id}_kWOutput`] || item[`PP${id}_TotalPercentKW`] * 11 || 0,
            rpm: item[`PP${id}_RPM`] || 0,
            coolant: item[`PP${id}_CoolantTemp`] || 0,
        };
    });
}

function MiniSummary({ label, value, unit, tone = 'text-cyan-300' }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-gray-500">{label}</div>
            <div className="mt-1 flex items-baseline gap-1">
                <span className={`text-xl font-black leading-none tracking-tight ${tone}`}>{value}</span>
                <span className="text-[9px] font-black uppercase text-gray-500">{unit}</span>
            </div>
        </div>
    );
}

function MiniMetric({ icon: Icon, label, value, unit, tone }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.1em] text-gray-500">
                <Icon size={10} className={tone} />
                <span>{label}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
                <span className={`text-lg font-black leading-none tracking-tight ${tone}`}>{value}</span>
                <span className="text-[9px] font-black uppercase text-gray-500">{unit}</span>
            </div>
        </div>
    );
}

function CompactTrend({ title, accent, data, dataKey, unit }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-1">
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-500">{title}</div>
                <div className="text-[9px] font-black uppercase tracking-[0.1em]" style={{ color: accent }}>{unit}</div>
            </div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`${dataKey}-fill`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                                <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip
                            contentStyle={{
                                background: '#0f172a',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: 11,
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={accent}
                            fill={`url(#${dataKey}-fill)`}
                            strokeWidth={2}
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default function EngineDetails() {
    const role = getStoredRole();
    const isScrollable = role === 'admin' || role === 'viewer';
    const { id = '1' } = useParams();
    const [engineData, setEngineData] = useState({});
    const [historyData, setHistoryData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const rawData = await getRigData();
            setEngineData(extractEngineData(id, rawData || {}));

            const history = await getRigHistory('-30m');
            setHistoryData(formatHistory(id, history));
        };

        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, [id]);

    const isOnline = (engineData.RPM || 0) > 0 || (engineData.LoadPercent || 0) > 0;
    const healthScore = useMemo(() => {
        if (!isOnline) return 0;
        return Math.max(72, Math.min(99, 100 - (engineData.CoolantTemp || 0) / 6));
    }, [engineData.CoolantTemp, isOnline]);

    const accent = isOnline ? '#22c55e' : '#f97316';
    const accentClass = isOnline ? 'text-emerald-400' : 'text-orange-400';
    const loadValue = Math.max(0, Math.min(100, engineData.LoadPercent || 0));

    return (
        <div className={`w-full flex flex-col ${isScrollable ? 'overflow-y-auto custom-scrollbar min-h-fit' : 'h-full overflow-hidden'} bg-[#0a0f19] px-4 py-3 text-white`}>

            {/* ── HEADER BAR ── */}
            <div className="shrink-0 flex items-center justify-between gap-4 mb-3 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] px-4 py-2.5">
                <div className="flex items-center gap-4 min-w-0">
                    <Link
                        to="/energy"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-gray-300 transition hover:border-white/20 hover:text-white shrink-0"
                    >
                        <ChevronLeft size={12} />
                        Back
                    </Link>
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-400">Power Pack Detail</div>
                        <h1 className="text-xl font-black tracking-tight text-white leading-tight">Power Pack {id}</h1>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                        <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: accent, boxShadow: `0 0 12px ${accent}` }}
                        />
                        <span className={`text-xs font-black uppercase tracking-[0.16em] ${accentClass}`}>
                            {isOnline ? 'Running' : 'Standby'}
                        </span>
                    </div>
                </div>

                {/* Summary KPIs in header */}
                <div className="flex gap-2 shrink-0">
                    <MiniSummary label="Active Power" value={(engineData.kWOutput || 0).toFixed(0)} unit="kW" tone="text-sky-300" />
                    <MiniSummary label="Load" value={(engineData.LoadPercent || 0).toFixed(1)} unit="%" tone="text-amber-300" />
                    <MiniSummary label="Runtime" value={(engineData.RunHours || 0).toFixed(1)} unit="hrs" tone="text-violet-300" />
                    <MiniSummary label="Health" value={healthScore.toFixed(0)} unit="%" tone={accentClass} />
                </div>
            </div>

            {/* ── MAIN CONTENT ── */}
            <div className={`grid grid-cols-1 lg:grid-cols-[1fr_0.38fr] gap-3 ${isScrollable ? 'min-h-[600px] pb-4' : 'flex-1 min-h-0'}`}>

                {/* LEFT COLUMN */}
                <div className="flex flex-col gap-3 min-h-0">
                    {/* Metric tiles - 2 rows x 4 cols */}
                    <div className="grid grid-cols-4 gap-2 shrink-0">
                        <MiniMetric icon={Zap} label="RPM" value={(engineData.RPM || 0).toFixed(0)} unit="rpm" tone="text-sky-400" />
                        <MiniMetric icon={Fuel} label="Fuel Rate" value={(engineData.FuelRate || 0).toFixed(1)} unit="L/h" tone="text-amber-400" />
                        <MiniMetric icon={Gauge} label="Oil Pressure" value={(engineData.OilPressure || 0).toFixed(0)} unit="psi" tone="text-lime-400" />
                        <MiniMetric icon={Thermometer} label="Coolant" value={(engineData.CoolantTemp || 0).toFixed(0)} unit="C" tone="text-rose-400" />
                        <MiniMetric icon={Thermometer} label="Oil Temp" value={(engineData.OilTemperature || 0).toFixed(0)} unit="C" tone="text-orange-400" />
                        <MiniMetric icon={Activity} label="Exhaust" value={(engineData.ExhaustTemp || 0).toFixed(0)} unit="C" tone="text-pink-400" />
                        <MiniMetric icon={Fuel} label="Inst. Fuel" value={(engineData.InstFuelCons || 0).toFixed(1)} unit="L/h" tone="text-cyan-400" />
                        <MiniMetric icon={Gauge} label="Power Factor" value={(engineData.OverallPowerFact || 0).toFixed(2)} unit="pf" tone="text-violet-400" />
                    </div>

                    {/* Trend charts side by side - fill remaining */}
                    <div className="flex-1 min-h-0 grid grid-cols-2 gap-2">
                        <CompactTrend title="Load Trend" accent="#f59e0b" data={historyData} dataKey="load" unit="%" />
                        <CompactTrend title="Power Output Trend" accent="#38bdf8" data={historyData} dataKey="power" unit="kW" />
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col gap-3 min-h-0">
                    {/* Load Bar */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-500">Load Bar</div>
                            <div className={`text-xs font-black uppercase tracking-[0.12em] ${accentClass}`}>
                                {loadValue.toFixed(1)}%
                            </div>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${loadValue}%`,
                                    background: `linear-gradient(90deg, ${accent}, rgba(255,255,255,0.88))`,
                                }}
                            />
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                                <div className="text-[8px] uppercase tracking-[0.12em] text-gray-500 font-black">Total Fuel</div>
                                <div className="mt-1 text-lg font-black text-white">{(engineData.TotalFuelCons || 0).toFixed(1)}</div>
                                <div className="text-[9px] uppercase tracking-[0.1em] text-gray-500">L</div>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                                <div className="text-[8px] uppercase tracking-[0.12em] text-gray-500 font-black">Reactive Power</div>
                                <div className="mt-1 text-lg font-black text-white">{(engineData.TotalReactivePow || 0).toFixed(0)}</div>
                                <div className="text-[9px] uppercase tracking-[0.1em] text-gray-500">kVAR</div>
                            </div>
                        </div>
                    </div>

                    {/* Live Snapshot */}
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 flex-1 min-h-0 flex flex-col">
                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-500 mb-2">Live Operating Snapshot</div>
                        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
                            {[
                                { label: 'Current State', value: isOnline ? 'System Online' : 'System Idle', tone: accentClass, large: false },
                                { label: 'Current RPM', value: (engineData.RPM || 0).toFixed(0), tone: 'text-sky-300', large: true },
                                { label: 'Current Output', value: `${(engineData.kWOutput || 0).toFixed(0)} kW`, tone: 'text-cyan-300', large: true },
                                { label: 'Cooling Status', value: `${(engineData.CoolantTemp || 0).toFixed(0)} C`, tone: 'text-rose-300', large: true },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                                    <span className="text-xs font-bold text-gray-400">{item.label}</span>
                                    <span className={`${item.large ? 'text-lg' : 'text-xs'} font-black uppercase tracking-[0.12em] ${item.tone}`}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
