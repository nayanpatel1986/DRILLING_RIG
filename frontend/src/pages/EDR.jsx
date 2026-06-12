import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Activity, Calendar, RefreshCw, SlidersHorizontal, Zap, Plus, Minus, Download, X, RotateCcw } from 'lucide-react';
import {
    Area, AreaChart, Line, LineChart, CartesianGrid,
    ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine,
} from 'recharts';
import { getRigData, getRigHistory, getRigHistoryRange } from '../api';
import { getStoredRole } from '../auth';
import ExportDataModal from '../components/ExportDataModal';


// ── Time Ranges ────────────────────────────────────────────────────────────────
const QUICK_RANGES = [
    { label: '1M',  value: '-1m'  },
    { label: '5M',  value: '-5m'  },
    { label: '15M', value: '-15m' },
    { label: '30M', value: '-30m' },
    { label: '1H',  value: '-1h'  },
    { label: '6H',  value: '-6h'  },
    { label: '12H', value: '-12h' },
    { label: '24H', value: '-24h' },
];

const ZOOM_LEVELS = [
    { label: '1m',  ms: 60_000,          query: '-1m' },
    { label: '5m',  ms: 300_000,         query: '-5m' },
    { label: '15m', ms: 900_000,         query: '-15m' },
    { label: '30m', ms: 1_800_000,       query: '-30m' },
    { label: '1h',  ms: 3_600_000,       query: '-1h' },
    { label: '2h',  ms: 7_200_000,       query: '-2h' },
    { label: '4h',  ms: 14_400_000,      query: '-4h' },
    { label: '8h',  ms: 28_800_000,      query: '-8h' },
    { label: '12h', ms: 43_200_000,      query: '-12h' },
    { label: '24h', ms: 86_400_000,      query: '-24h' },
    { label: '48h', ms: 172_800_000,     query: '-48h' },
    { label: '72h', ms: 259_200_000,     query: '-72h' },
    { label: '7d',  ms: 604_800_000,     query: '-7d' },
    { label: '30d', ms: 2592_000_000,     query: '-30d' },
    { label: '90d', ms: 7776_000_000,     query: '-90d' },
    { label: '6M',  ms: 15552_000_000,    query: '-180d' },
];


// ── Full Parameter List ────────────────────────────────────────────────────────
const TRACK_OPTIONS = [
    { key: 'WOH',       title: 'Hook Load',       unit: 'ton',  color: '#1e40af', candidates: ['WOH', 'HookLoad', 'WOHLoad'] }, // Blue
    { key: 'WOB',       title: 'WOB',             unit: 'ton',  color: '#6d28d9', candidates: ['WOB', 'WeightOnBit'] },       // Purple
    { key: 'RPM',       title: 'RPM',             unit: 'rpm',  color: '#dc2626', candidates: ['RPM', 'TopDriveRPM', 'RotaryRPM'] }, // Red
    { key: 'TORQUE',    title: 'Torque',          unit: 'kNm',  color: '#d97706', candidates: ['TORQUE', 'ROTARY TORQUE', 'ROTARY TORQU', 'Torque', 'TopDriveTorque'] }, // Amber
    { key: 'RAP',       title: 'Air Pressure',    unit: 'psi',  color: '#ea580c', candidates: ['RAP', 'Rig air pressure', 'rap'] },                      // Orange
    { key: 'TONG_TRQ',  title: 'Tong Torque',     unit: 'kNm',  color: '#9a3412', candidates: ['TONG_TRQ', 'TONG TORQUE', 'Pipe Torque'] },
    { key: 'Depth',     title: 'Hole Depth',      unit: 'm',    color: '#15803d', candidates: ['Depth', 'DEPTH', 'HoleDepth'] }, // Green
    { key: 'BitDepth',  title: 'Bit Depth',       unit: 'm',    color: '#059669', candidates: ['BitDepth', 'BITDEPTH', 'BIT DEPTH'] }, // Emerald
    { key: 'MP1_SPM',   title: 'Pump 1 SPM',      unit: 'spm',  color: '#0d9488', candidates: ['MP1_SPM', 'PUMP 1', 'PUMP1', 'SPM1'] }, // Teal
    { key: 'MP2_SPM',   title: 'Pump 2 SPM',      unit: 'spm',  color: '#4f46e5', candidates: ['MP2_SPM', ' PUMP 2', 'PUMP 2', 'PUMP2', 'SPM2'] }, // Indigo
    { key: 'STROKES1',  title: 'Strokes 1',       unit: '',     color: '#0284c7', candidates: ['STROKES1', 'STROKES 1', 'PumpStrokes1'] },
    { key: 'STROKES2',  title: 'Strokes 2',       unit: '',     color: '#7c3aed', candidates: ['STROKES2', 'STROKES 2', 'PumpStrokes2'] },
    { key: 'STP_PRS',   title: 'Pump Pressure',   unit: 'psi',  color: '#c026d3', candidates: ['STP_PRS', 'STANDPIPE  PRESSURE', 'STANDPIPE PRESSURE', 'STANDPIPE PRE', 'StandpipePressure'] }, // Magenta
    { key: 'TOT_STRK',  title: 'Total Strokes',   unit: '',     color: '#4f46e5', candidates: ['TOT_STRK', 'TOTAL STROKES', 'TotalStrokes'] },
    { key: 'TOT_SPM',   title: 'Total SPM',       unit: 'spm',  color: '#7e22ce', candidates: ['TOT_SPM', 'TOTAL SPM', 'TotalSPM'] },
    { key: 'TANK_1',    title: 'Tank 1',          unit: 'm3',   color: '#0891b2', candidates: ['TANK_1', 'TANK 1', 'PitVolume1'] },
    { key: 'TANK_2',    title: 'Tank 2',          unit: 'm3',   color: '#0284c7', candidates: ['TANK_2', 'TANK  2', 'PitVolume2'] },
    { key: 'TANK_3',    title: 'Tank 3',          unit: 'm3',   color: '#0369a1', candidates: ['TANK_3', 'TANK 3', 'PitVolume3'] },
    { key: 'TRIP_TNK',  title: 'Trip Tank',       unit: 'm3',   color: '#1e3a8a', candidates: ['TRIP_TNK', 'TRIP TANK', 'TripTank1'] },
    { key: 'FLOW_RT',   title: 'Flow Rate In',    unit: 'gpm',  color: '#166534', candidates: ['FLOW_RT', 'FLOW  IN', 'FlowRate'] },
    { key: 'FLOW_OUT',  title: 'Flow Out %',      unit: '%',    color: '#059669', candidates: ['FLOW_OUT', 'FLOW OUT', 'FlowOutPercent'] },
    { key: 'GAIN_LSS',  title: 'Gain / Loss',     unit: 'bbl',  color: '#e11d48', candidates: ['GAIN_LSS', 'GAIN LOSS', 'GainLoss'] }, // Rose
    { key: 'LEL_SS',    title: 'LEL SS',          unit: '%',    color: '#a16207', candidates: ['LEL_SS', 'LEL SS', 'LELGasSS'] },
    { key: 'LEL_BN',    title: 'LEL BN',          unit: '%',    color: '#ca8a04', candidates: ['LEL_BN', 'LEL BN', 'LELGasBN'] },
    { key: 'H2S_SS',    title: 'H2S SS',          unit: 'ppm',  color: '#c2410c', candidates: ['H2S_SS', 'H2S SS', 'H2SGasSS'] },
    { key: 'H2S_BN',    title: 'H2S BN',          unit: 'ppm',  color: '#ea580c', candidates: ['H2S_BN', 'H2S BN', 'H2SGasBN'] },
    { key: 'ROP',       title: 'ROP',             unit: 'm/hr', color: '#f43f5e', candidates: ['ROP', 'RateOfPenetration'] },
    { key: 'RigActivity', title: 'Rig Activity',  unit: '',     color: '#475569', candidates: ['RIG ACTIVITY', 'RigActivity'] },
    { key: 'SLIPS_STAT', title: 'Slip Status',    unit: '',     color: '#64748b', candidates: ['SLIP STATUS', 'SLIPS_STAT', 'SlipStatus'] },
    { key: 'TOTAL_VOL', title: 'Total Volume',    unit: 'm3',   color: '#0ea5e9', candidates: ['TOTAL VOLUME', 'TOTAL_VOL', 'TotalVolume'] },
    { key: 'BH',        title: 'Block Height',    unit: 'm',    color: '#7c3aed', candidates: ['BH', 'BlockPosition', 'BLOCK_HEIGHT'] },
];

const DEFAULT_PAIRS = [
    [{ key: 'WOH',     max: 300 }, { key: 'WOB',      max: 50 }],
    [{ key: 'TORQUE',  max: 50 },  { key: 'RPM',      max: 200 }],
    [{ key: 'STP_PRS', max: 5000 }, { key: 'GAIN_LSS', max: 20 }],
];

const COLOR_PRESETS = [
    '#1d4ed8', '#ec4899', '#0d9488', '#ea580c', '#6366f1', '#e11d48',
    '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#d946ef', '#f43f5e'
];

const DEFAULT_TRACKS = [
    {
        pens: [
            { metric: 'WOH', min: 0, max: 300, color: '#1d4ed8' },
            { metric: 'WOB', min: 0, max: 50, color: '#ec4899' }
        ]
    },
    {
        pens: [
            { metric: 'TORQUE', min: 0, max: 50, color: '#0d9488' },
            { metric: 'RPM', min: 0, max: 200, color: '#ea580c' }
        ]
    },
    {
        pens: [
            { metric: 'STP_PRS', min: 0, max: 5000, color: '#6366f1' },
            { metric: 'GAIN_LSS', min: -6, max: 6, color: '#e11d48' }
        ]
    }
];

// Panel accent + gradient stop pairs
const PANEL_THEMES = [
    { accent: '#38bdf8', gradient: ['#38bdf8', '#7dd3fc'] },  // P1 — Light Sky
    { accent: '#fb923c', gradient: ['#fb923c', '#fdba74'] },  // P2 — Light Peach
    { accent: '#5eead4', gradient: ['#5eead4', '#99f6e4'] },  // P3 — Light Mint
    { accent: '#e879f9', gradient: ['#e879f9', '#f0abfc'] },  // P4 — Light Pink
];

const PANEL_COLORS = [
    { c1: '#2563eb', c2: '#06b6d4' }, // Panel 1: Royal Blue & Cyan
    { c1: '#d97706', c2: '#10b981' }, // Panel 2: Amber & Mint Green
    { c1: '#c026d3', c2: '#f43f5e' }, // Panel 3: Magenta & Rose
    { c1: '#7c3aed', c2: '#c084fc' }, // Panel 4: Violet & Purple
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function getFieldValue(source, candidates, fallback = 0) {
    for (const key of candidates) {
        if (source?.[key] !== undefined && source?.[key] !== null) {
            const v = source[key];
            return typeof v === 'number' ? v : fallback;
        }
    }
    return fallback;
}
function fmtTime(iso) {
    if (!iso) return '--';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtAxisTime(value) {
    if (!Number.isFinite(value)) return '--';
    const d = new Date(value);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtAxisTimeByRange(value, durationMs) {
    if (!Number.isFinite(value)) return '--';
    const d = new Date(value);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (durationMs > 24 * 3600_000) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${month} ${hh}:${mm}`;
    }
    return `${hh}:${mm}`;
}
function fmtDate(iso) {
    if (!iso) return '--';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}
function shell(v, d = 2) { return Number.isFinite(v) ? v.toFixed(d) : '0.00'; }
function toLocalDatetimeString(d) {
    const p = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtBannerDateTime(iso) {
    if (!iso) return '--';
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth()+1).padStart(2, '0');
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hh}:${mm}:${ss}`;
}
function downsampleRows(rows, limit) {
    if (!Array.isArray(rows) || rows.length <= limit) return rows;
    const sampled = [];
    const lastIndex = rows.length - 1;
    for (let i = 0; i < limit; i += 1) {
        const idx = Math.round((i * lastIndex) / Math.max(limit - 1, 1));
        sampled.push(rows[idx]);
    }
    return sampled;
}

// ── Dual Panel Tooltip ─────────────────────────────────────────────────────────
function DualTooltip({ active, payload, accent }) {
    if (!active || !payload?.length) return null;
    const pt = payload[0]?.payload;
    if (!pt) return null;
    return (
        <div style={{
            background: 'rgba(10,14,26,0.95)',
            border: `1px solid ${accent}40`,
            boxShadow: `0 0 24px ${accent}30, 0 8px 32px #00000080`,
            borderRadius: 14, padding: '10px 14px',
            fontFamily: 'sans-serif', fontSize: 10, minWidth: 160,
            backdropFilter: 'blur(12px)',
        }}>
            <div style={{ color: '#475569', marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: accent, fontWeight: 900 }}>{pt.date}</span>
                <span style={{ color: '#64748b' }}>·</span>
                <span style={{ color: accent, fontWeight: 900 }}>{pt.time}</span>
                <span style={{ color: '#64748b' }}>·</span>
                <span style={{ color: '#94a3b8' }}>{shell(pt.depth, 1)} m</span>
            </div>
            {payload.map((entry, i) => (
                <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 16, marginTop: i === 0 ? 0 : 4,
                    padding: '3px 8px', borderRadius: 6,
                    background: `${entry.color}15`,
                }}>
                    <span style={{ color: entry.color, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {entry.name}
                    </span>
                    <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 12 }}>
                        {shell(entry.value)}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ── Dual Track Panel ───────────────────────────────────────────────────────────
// ── Dual Track Panel ───────────────────────────────────────────────────────────
function DualTrackPanel({ 
    pens = [], 
    data = [], 
    liveValues = {}, 
    onSelect, 
    onUpdateMin, 
    onUpdateMax, 
    panelIdx, 
    timeDomain, 
    timeLabelFormatter,
    isDepthLog = false,
    clickedTimestamp = null,
    onClick = () => {}
}) {
    const computedTicks = useMemo(() => {
        if (!timeDomain || !timeDomain[0] || !timeDomain[1]) return undefined;
        const [start, end] = timeDomain;
        const duration = end - start;
        
        // Choose tick interval based on duration
        let intervalMs = 60_000; // default 1 minute
        if (duration <= 120_000) { // 1-2 min -> 15s ticks
            intervalMs = 15_000;
        } else if (duration <= 300_000) { // 5 min -> 1 min ticks
            intervalMs = 60_000;
        } else if (duration <= 900_000) { // 15 min -> 3 min ticks
            intervalMs = 3 * 60_000;
        } else if (duration <= 1800_000) { // 30 min -> 5 min ticks
            intervalMs = 5 * 60_000;
        } else if (duration <= 3600_000) { // 1 hour -> 10 min ticks
            intervalMs = 10 * 60_000;
        } else if (duration <= 21600_000) { // 6 hours -> 1 hour ticks
            intervalMs = 3600_000;
        } else if (duration <= 43200_000) { // 12 hours -> 2 hour ticks
            intervalMs = 2 * 3600_000;
        } else if (duration <= 86400_000) { // 24 hours -> 4 hour ticks
            intervalMs = 4 * 3600_000;
        } else { // > 24 hours -> 12 hour ticks
            intervalMs = 12 * 3600_000;
        }

        const ticksArr = [];
        const alignedStart = Math.ceil(start / intervalMs) * intervalMs;
        for (let t = alignedStart; t <= end; t += intervalMs) {
            ticksArr.push(t);
        }
        return ticksArr;
    }, [timeDomain]);
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            borderRadius: 20, position: 'relative',
            background: `#ffffff`,
            border: `1px solid #cbd5e1`,
            boxShadow: `0 4px 12px rgba(0,0,0,0.05)`,
            color: '#1e293b'
        }}>
            {/* Header */}
            <div style={{
                height: 38, boxSizing: 'border-box',
                flexShrink: 0, padding: '7px 12px',
                background: `#f8fafc`,
                borderBottom: `1px solid #e2e8f0`,
                display: 'flex', alignItems: 'center', gap: 8,
                overflow: 'hidden',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
            }}>
                {/* Animated pulse dot */}
                <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: `0 0 4px rgba(16,185,129,0.5)`,
                    animation: 'edr-pulse 2s ease-in-out infinite',
                }} />
                <span style={{
                    fontSize: 11, fontWeight: 900, textTransform: 'uppercase',
                    letterSpacing: 4, color: '#475569',
                    whiteSpace: 'nowrap'
                }}>
                    {isDepthLog ? 'Depth Log' : `Strip ${panelIdx + 1}`}
                </span>
            </div>

            {/* Chart */}
            <div style={{ flex: 1, minHeight: 0, padding: '4px 4px 2px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        syncId="edr_sync"
                        margin={{ top: 20, right: 8, left: 4, bottom: 20 }}
                        layout="vertical"
                        style={{ cursor: 'pointer' }}
                        onClick={(state) => {
                            if (state) {
                                const ts = state.activeLabel || (state.activeTooltipIndex !== undefined && data[state.activeTooltipIndex]?.timestamp);
                                if (ts) {
                                    onClick(Number(ts));
                                }
                            }
                        }}
                    >
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                        {pens.map((pen, i) => (
                            <XAxis
                                key={`xaxis-${i}`}
                                xAxisId={`x-${i}`}
                                orientation="top"
                                type="number"
                                tick={false}
                                axisLine={i === 0 ? { stroke: '#cbd5e1' } : false}
                                tickLine={false}
                                height={i === 0 ? 4 : 0}
                                domain={[pen.min !== undefined ? pen.min : 0, pen.max || 'auto']}
                            />
                        ))}
                        <YAxis
                            dataKey="timestamp"
                            type="number"
                            domain={timeDomain || ['auto', 'auto']}
                            ticks={computedTicks}
                            tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'sans-serif', fontWeight: 600 }}
                            axisLine={{ stroke: '#cbd5e1' }}
                            tickLine={false}
                            tickFormatter={timeLabelFormatter || fmtAxisTime}
                            minTickGap={10}
                            width={36}
                        />
                        <Tooltip
                            content={props => <DualTooltip {...props} accent="#94a3b8" />}
                            cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeOpacity: 0.5, strokeDasharray: '4 4' }}
                        />
                        {clickedTimestamp && (
                            <ReferenceLine
                                y={clickedTimestamp}
                                stroke="#f59e0b"
                                strokeWidth={1.5}
                                strokeDasharray="4 4"
                                label={{ 
                                    value: fmtAxisTime(clickedTimestamp), 
                                    fill: '#f59e0b', 
                                    fontSize: 9, 
                                    fontWeight: 700,
                                    position: 'insideLeft',
                                    offset: 5
                                }}
                            />
                        )}
                        {pens.map((pen, i) => {
                            const opt = TRACK_OPTIONS.find(o => o.key === pen.metric) || { title: pen.metric };
                            return (
                                <Line
                                    key={`line-${pen.metric}-${i}`}
                                    xAxisId={`x-${i}`}
                                    type="monotoneY"
                                    dataKey={pen.metric}
                                    name={opt.title}
                                    stroke={pen.color}
                                    strokeWidth={2.5}
                                    dot={false}
                                    activeDot={{ r: 4, fill: '#fff', stroke: pen.color, strokeWidth: 2 }}
                                    connectNulls
                                    isAnimationActive={false}
                                />
                            );
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Bottom value + selector strip */}
            {isDepthLog ? (
                <div style={{
                    height: 60, boxSizing: 'border-box',
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    borderTop: `1px solid #e2e8f0`,
                    background: `#ffffff`,
                    flexShrink: 0,
                    overflow: 'hidden',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                    borderBottomLeftRadius: 18,
                    borderBottomRightRadius: 18,
                }}>
                    {pens.map((pen, i) => {
                        const label = i === 0 ? 'HOLE' : 'BIT';
                        return (
                            <div key={label} style={{
                                padding: '6px 8px',
                                borderRight: i === 0 ? `1px solid #e2e8f0` : 'none',
                            }}>
                                <div style={{ fontSize: 8, color: '#64748b', fontWeight: 900, letterSpacing: 2, marginBottom: 4 }}>
                                    {label}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                    <span style={{
                                        fontSize: 22, fontWeight: 900, fontFamily: 'sans-serif',
                                        color: pen.color, lineHeight: 1
                                    }}>
                                        {shell(liveValues[pen.metric], 1)}
                                    </span>
                                    <span style={{
                                        fontSize: 10, color: '#64748b', fontWeight: 700,
                                        textTransform: 'uppercase', letterSpacing: 2
                                    }}>
                                        m
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{
                    height: 60, boxSizing: 'border-box',
                    flexShrink: 0,
                    borderTop: `1px solid #e2e8f0`,
                    display: 'grid', 
                    gridTemplateColumns: `repeat(${pens.length}, 1fr)`,
                    background: `#ffffff`,
                    overflow: 'hidden',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                    borderBottomLeftRadius: 18,
                    borderBottomRightRadius: 18,
                }}>
                    {pens.map((pen, i) => {
                        const opt = TRACK_OPTIONS.find(o => o.key === pen.metric) || { title: pen.metric, unit: '' };
                        return (
                            <div key={`${pen.metric}-${i}`} style={{
                                padding: '6px 8px',
                                borderRight: i < pens.length - 1 ? `1px solid #e2e8f0` : 'none',
                            }}>
                                {/* Row 1: Min | Parameter Selector | Max */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, width: '100%' }}>
                                    {/* Min */}
                                    <input
                                        type="number"
                                        value={pen.min !== undefined ? pen.min : 0}
                                        onChange={e => onUpdateMin(i, parseFloat(e.target.value) || 0)}
                                        placeholder="Min"
                                        style={{
                                            width: 45, background: `${pen.color}15`, border: 'none', outline: 'none',
                                            borderRadius: 4, padding: '2px 4px',
                                            fontSize: 10, fontWeight: 900, color: pen.color, textAlign: 'center',
                                            fontFamily: 'sans-serif',
                                            flexShrink: 0,
                                        }}
                                    />
                                    {/* Parameter dropdown */}
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                        <SlidersHorizontal size={10} color={pen.color} style={{ flexShrink: 0 }} />
                                        <select
                                            value={pen.metric}
                                            onChange={e => onSelect(i, e.target.value)}
                                            style={{
                                                background: 'transparent', border: 'none', outline: 'none',
                                                color: pen.color, fontSize: 11, fontWeight: 900,
                                                textTransform: 'uppercase', letterSpacing: 0.5,
                                                cursor: 'pointer', width: '100%', minWidth: 0,
                                                appearance: 'none',
                                                WebkitAppearance: 'none',
                                                MozAppearance: 'none',
                                                textOverflow: 'ellipsis',
                                                padding: '0 2px',
                                            }}
                                        >
                                            {TRACK_OPTIONS.map(o => (
                                                <option key={o.key} value={o.key} style={{ background: '#ffffff', color: '#1e293b' }}>
                                                    {o.title}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    {/* Max */}
                                    <input
                                        type="number"
                                        value={pen.max !== undefined ? pen.max : ''}
                                        onChange={e => onUpdateMax(i, parseFloat(e.target.value) || 0)}
                                        placeholder="Max"
                                        style={{
                                            width: 55, background: `${pen.color}15`, border: 'none', outline: 'none',
                                            borderRadius: 4, padding: '2px 4px',
                                            fontSize: 10, fontWeight: 900, color: pen.color, textAlign: 'center',
                                            fontFamily: 'sans-serif',
                                            flexShrink: 0,
                                        }}
                                    />
                                </div>
                                {/* Row 2: Live value */}
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                    <span style={{
                                        fontSize: 22, fontWeight: 900, fontFamily: 'sans-serif',
                                        fontVariantNumeric: 'tabular-nums',
                                        color: pen.color, lineHeight: 1,
                                    }}>
                                        {shell(liveValues[pen.metric])}
                                    </span>
                                    <span style={{
                                        fontSize: 10, color: '#64748b', fontWeight: 700,
                                        textTransform: 'uppercase', letterSpacing: 2,
                                    }}>
                                        {opt.unit}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Time / Depth column ────────────────────────────────────────────────────────
function TimeDepthColumn({ rows, holeDepth, bitDepth }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            borderRadius: 20, overflow: 'hidden',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}>
            {/* Header */}
            <div style={{
                flexShrink: 0, padding: '8px 12px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
            }}>
                <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 4, color: '#475569', marginBottom: 6 }}>
                    Depth Log
                </div>
                {/* Live depth readouts */}
                {[
                    { label: 'HOLE', val: holeDepth, color: '#0369a1' },
                    { label: 'BIT',  val: bitDepth,  color: '#6d28d9' },
                ].map(d => (
                    <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                        <span style={{ fontSize: 8, color: '#64748b', fontWeight: 900, letterSpacing: 2 }}>{d.label}</span>
                        <span style={{ fontSize: 16, fontFamily: 'sans-serif', fontVariantNumeric: 'tabular-nums', fontWeight: 900, color: d.color }}>
                            {shell(d.val, 1)} <span style={{ fontSize: 8, opacity: 0.6 }}>m</span>
                        </span>
                    </div>
                ))}
            </div>
            {/* Column headers */}
            <div style={{
                flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                padding: '4px 12px', borderBottom: '1px solid #cbd5e1',
                background: '#f1f5f9'
            }}>
                {[['TIME', '#64748b'], ['MD', '#0369a1'], ['BD', '#6d28d9']].map(([h, c]) => (
                    <span key={h} style={{ fontSize: 8, fontWeight: 900, color: c, fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 2 }}>{h}</span>
                ))}
            </div>
            {/* Rows */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2px 12px' }} className="custom-scrollbar">
                {rows.map(row => (
                    <div key={row.key} style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                        borderBottom: '1px solid #f1f5f9', padding: '3px 0',
                        fontFamily: 'sans-serif', fontVariantNumeric: 'tabular-nums', fontSize: 9,
                    }}>
                        <span style={{ color: '#64748b' }}>{row.time}</span>
                        <span style={{ color: '#0369a1' }}>{shell(row.depth, 1)}</span>
                        <span style={{ color: '#6d28d9' }}>{shell(row.bitDepth, 1)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}



// ── EDR Settings Modal ─────────────────────────────────────────────────────────
function EdrSettingsModal({ isOpen, onClose, tracks = [], onApply, onReset }) {
    const [tempTracks, setTempTracks] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setTempTracks(JSON.parse(JSON.stringify(tracks)));
        }
    }, [isOpen, tracks]);

    if (!isOpen) return null;

    const handleStripCountChange = (newCount) => {
        setTempTracks(prev => {
            const currentCount = prev.length;
            if (newCount > currentCount) {
                const added = [];
                for (let i = currentCount; i < newCount; i++) {
                    added.push({
                        pens: [
                            { metric: 'WOH', min: 0, max: 300, color: COLOR_PRESETS[i % COLOR_PRESETS.length] }
                        ]
                    });
                }
                return [...prev, ...added];
            } else if (newCount < currentCount) {
                return prev.slice(0, newCount);
            }
            return prev;
        });
    };

    const handlePenCountChange = (stripIndex, newCount) => {
        setTempTracks(prev => {
            return prev.map((strip, sIdx) => {
                if (sIdx !== stripIndex) return strip;
                const currentCount = strip.pens.length;
                if (newCount > currentCount) {
                    const added = [];
                    for (let i = currentCount; i < newCount; i++) {
                        added.push({
                            metric: 'WOB',
                            min: 0,
                            max: 100,
                            color: COLOR_PRESETS[(stripIndex + i) % COLOR_PRESETS.length]
                        });
                    }
                    return {
                        ...strip,
                        pens: [...strip.pens, ...added]
                    };
                } else if (newCount < currentCount) {
                    return {
                        ...strip,
                        pens: strip.pens.slice(0, newCount)
                    };
                }
                return strip;
            });
        });
    };

    const handlePenChange = (stripIndex, penIndex, field, value) => {
        setTempTracks(prev => {
            return prev.map((strip, sIdx) => {
                if (sIdx !== stripIndex) return strip;
                return {
                    ...strip,
                    pens: strip.pens.map((pen, pIdx) => {
                        if (pIdx !== penIndex) return pen;
                        return { ...pen, [field]: value };
                    })
                };
            });
        });
    };

    const handleApply = () => {
        onApply(tempTracks);
        onClose();
    };

    const handleResetLocal = () => {
        if (window.confirm("Are you sure you want to reset all tracks to defaults?")) {
            onReset();
            onClose();
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            padding: '16px'
        }}>
            <div style={{
                position: 'relative', width: '100%', maxWidth: '850px',
                backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', maxHeight: '90vh',
                overflow: 'hidden', color: '#f8fafc'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: 'linear-gradient(to right, #0f172a, #1e293b)'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SlidersHorizontal size={20} color="#6366f1" /> EDR CHART CONFIGURATION SETTINGS
                    </h2>
                    <button 
                        onClick={onClose}
                        style={{
                            marginLeft: 'auto', background: 'transparent', border: 'none', color: '#94a3b8',
                            cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }} className="custom-scrollbar">
                    {/* Strip Count Selector */}
                    <div style={{
                        background: 'rgba(15,23,42,0.4)', padding: '16px', borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.05)', display: 'flex',
                        alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <div>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Number of Strips</h3>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 0' }}>Configure how many stacked chart strips to display (1 - 10)</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <button
                                disabled={tempTracks.length <= 1}
                                onClick={() => handleStripCountChange(tempTracks.length - 1)}
                                style={{
                                    width: 36, height: 36, borderRadius: '8px', backgroundColor: '#334155',
                                    border: '1px solid rgba(255,255,255,0.05)', color: '#fff',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: tempTracks.length <= 1 ? 0.3 : 1
                                }}
                            >
                                <Minus size={16} />
                            </button>
                            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#818cf8', width: 24, textAlign: 'center', fontFamily: 'monospace' }}>
                                {tempTracks.length}
                            </span>
                            <button
                                disabled={tempTracks.length >= 10}
                                onClick={() => handleStripCountChange(tempTracks.length + 1)}
                                style={{
                                    width: 36, height: 36, borderRadius: '8px', backgroundColor: '#334155',
                                    border: '1px solid rgba(255,255,255,0.05)', color: '#fff',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: tempTracks.length >= 10 ? 0.3 : 1
                                }}
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Per-Strip Configuration */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {tempTracks.map((strip, sIdx) => (
                            <div key={sIdx} style={{
                                backgroundColor: 'rgba(15,23,42,0.3)', border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12
                            }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifycontent: 'space-between',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8,
                                    justifyContent: 'space-between'
                                }}>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                            width: 20, height: 20, borderRadius: 4, backgroundColor: 'rgba(99,102,241,0.2)',
                                            color: '#818cf8', display: 'flex', alignItems: 'center', justifycontent: 'center',
                                            fontFamily: 'monospace', fontSize: '0.75rem', justifyContent: 'center'
                                        }}>{sIdx + 1}</span>
                                        Strip {sIdx + 1}
                                    </span>

                                    {/* Number of Pens */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Pens:</span>
                                        <div style={{ display: 'flex', gap: 4, backgroundColor: 'rgba(51,65,85,0.8)', padding: 2, borderRadius: 6 }}>
                                            {[1, 2, 3, 4, 5, 6].map(num => (
                                                <button
                                                    key={num}
                                                    onClick={() => handlePenCountChange(sIdx, num)}
                                                    style={{
                                                        padding: '2px 8px', borderRadius: 4, border: 'none',
                                                        fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer',
                                                        backgroundColor: strip.pens.length === num ? '#6366f1' : 'transparent',
                                                        color: strip.pens.length === num ? '#fff' : '#94a3b8',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Pens Rows */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {strip.pens.map((pen, pIdx) => (
                                        <div key={pIdx} style={{
                                            display: 'grid', gridTemplateColumns: '80px 1.5fr 1fr 1fr 1.5fr',
                                            gap: 12, alignItems: 'center', backgroundColor: 'rgba(51,65,85,0.15)',
                                            padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)'
                                        }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
                                                Pen {pIdx + 1}
                                            </div>

                                            {/* Parameter selector */}
                                            <div>
                                                <select
                                                    value={pen.metric}
                                                    onChange={e => handlePenChange(sIdx, pIdx, 'metric', e.target.value)}
                                                    style={{
                                                        width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: 6, padding: '6px 8px', fontSize: '0.75rem', fontWeight: 700,
                                                        color: '#fff', outline: 'none'
                                                    }}
                                                >
                                                    {TRACK_OPTIONS.map(o => (
                                                        <option key={o.key} value={o.key}>
                                                            {o.title}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Min */}
                                            <div>
                                                <input
                                                    type="number"
                                                    value={pen.min !== undefined ? pen.min : 0}
                                                    onChange={e => handlePenChange(sIdx, pIdx, 'min', parseFloat(e.target.value) || 0)}
                                                    placeholder="Min"
                                                    style={{
                                                        width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: 6, padding: '6px 4px', fontSize: '0.75rem', fontWeight: 700,
                                                        color: '#fff', outline: 'none', textAlign: 'center', fontFamily: 'monospace'
                                                    }}
                                                />
                                            </div>

                                            {/* Max */}
                                            <div>
                                                <input
                                                    type="number"
                                                    value={pen.max !== undefined ? pen.max : 100}
                                                    onChange={e => handlePenChange(sIdx, pIdx, 'max', parseFloat(e.target.value) || 0)}
                                                    placeholder="Max"
                                                    style={{
                                                        width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: 6, padding: '6px 4px', fontSize: '0.75rem', fontWeight: 700,
                                                        color: '#fff', outline: 'none', textAlign: 'center', fontFamily: 'monospace'
                                                    }}
                                                />
                                            </div>

                                            {/* Color selector */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{
                                                        width: 20, height: 20, borderRadius: 4, backgroundColor: pen.color,
                                                        border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0
                                                    }} />
                                                    <input
                                                        type="text"
                                                        value={pen.color}
                                                        onChange={e => handlePenChange(sIdx, pIdx, 'color', e.target.value)}
                                                        style={{
                                                            width: '100%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: 6, padding: '4px 6px', fontSize: '0.7rem', fontWeight: 700,
                                                            color: '#fff', outline: 'none', fontFamily: 'monospace'
                                                        }}
                                                    />
                                                </div>
                                                {/* Preset colors */}
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                    {COLOR_PRESETS.map(preset => (
                                                        <button
                                                            key={preset}
                                                            onClick={() => handlePenChange(sIdx, pIdx, 'color', preset)}
                                                            style={{
                                                                width: 12, height: 12, borderRadius: '50%', backgroundColor: preset,
                                                                border: pen.color === preset ? '1px solid #fff' : 'none',
                                                                cursor: 'pointer', padding: 0, flexShrink: 0
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#0f172a'
                }}>
                    <button
                        onClick={handleResetLocal}
                        style={{
                            background: 'transparent', border: 'none', color: '#ef4444',
                            fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.05em',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                        }}
                    >
                        <RotateCcw size={14} /> RESET TO DEFAULTS
                    </button>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent', border: 'none', color: '#94a3b8',
                                fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.05em',
                                cursor: 'pointer', padding: '8px 16px'
                            }}
                        >
                            CANCEL
                        </button>
                        <button
                            onClick={handleApply}
                            style={{
                                backgroundColor: '#4f46e5', border: 'none', color: '#fff',
                                fontWeight: 900, fontSize: '0.75rem', letterSpacing: '0.05em',
                                cursor: 'pointer', padding: '10px 20px', borderRadius: 8,
                                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)'
                            }}
                        >
                            APPLY CHANGES
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


// ── Main EDR Page ──────────────────────────────────────────────────────────────
export default function EDR() {
    const role = getStoredRole();
    const scrollContainerRef = useRef(null);
    const [clickedTimestamp, setClickedTimestamp] = useState(null);

    const handleChartClick = (timestamp) => {
        setClickedTimestamp(prev => prev === timestamp ? null : timestamp);
    };
    const isScrollable = role === 'admin' || role === 'viewer';
    const [rigData,       setRigData]       = useState({});
    const [history,       setHistory]       = useState([]);
    const [timeRange,     setTimeRange]     = useState('-30m');
    const [isCustomRange, setIsCustomRange] = useState(false);
    const [customStart,   setCustomStart]   = useState(() => toLocalDatetimeString(new Date(Date.now() - 3600_000)));
    const [customEnd,     setCustomEnd]     = useState(() => toLocalDatetimeString(new Date()));
    const [pickerStart,   setPickerStart]   = useState(customStart);
    const [pickerEnd,     setPickerEnd]     = useState(customEnd);
    const [tracks, setTracks] = useState(() => {
        try {
            const saved = localStorage.getItem('edrTracks') || localStorage.getItem('edrPairs');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    if (parsed[0] && Array.isArray(parsed[0].pens)) {
                        return parsed;
                    }
                    if (Array.isArray(parsed[0])) {
                        return parsed.map((strip, idx) => {
                            const colors = ['#1d4ed8', '#ec4899', '#0d9488', '#ea580c', '#6366f1', '#e11d48'];
                            return {
                                pens: strip.map((pen, pIdx) => ({
                                    metric: pen.key || pen.metric,
                                    min: pen.min !== undefined ? pen.min : 0,
                                    max: pen.max !== undefined ? pen.max : 100,
                                    color: pen.color || colors[pIdx % colors.length]
                                }))
                            };
                        });
                    }
                    if (parsed[0] && (parsed[0].left || parsed[0].right)) {
                        return parsed.map((strip) => {
                            const pens = [];
                            if (strip.left) pens.push({ metric: strip.left.metric || strip.left.key, min: strip.left.min || 0, max: strip.left.max, color: '#1d4ed8' });
                            if (strip.right) pens.push({ metric: strip.right.metric || strip.right.key, min: strip.right.min || 0, max: strip.right.max, color: '#ec4899' });
                            return { pens };
                        });
                    }
                }
            }
            return DEFAULT_TRACKS;
        } catch (e) {
            console.error("Failed to parse EDR layout config:", e);
            return DEFAULT_TRACKS;
        }
    });
    const [showExportModal, setShowExportModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const selectedKeys = useMemo(() => tracks.flatMap(t => t.pens.map(p => p.metric)), [tracks]);

    useEffect(() => {
        localStorage.setItem('edrTracks', JSON.stringify(tracks));
        localStorage.setItem('edrPairs', JSON.stringify(tracks));
    }, [tracks]);

    // Synchronize inputs when active custom endpoints change programmatically (e.g. on Zoom or Banner action)
    useEffect(() => {
        setPickerStart(customStart);
        setPickerEnd(customEnd);
    }, [customStart, customEnd]);

    const handleZoom = (direction) => {
        // direction: 1 for Zoom In (+) -> Smaller Time Window
        // direction: -1 for Zoom Out (-) -> Larger Time Window
        
        if (isCustomRange) {
            const startTs = new Date(customStart).getTime();
            const endTs = new Date(customEnd).getTime();
            if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) return;
            
            const currentMs = endTs - startTs;
            const centerTs = (startTs + endTs) / 2;
            
            let newMs = direction === 1 ? currentMs / 1.5 : currentMs * 1.5;
            
            // Bounds: Cap custom range zoom between 1 minute and 180 days (6 months)
            if (newMs < 60_000) newMs = 60_000;
            if (newMs > 180 * 86400_000) newMs = 180 * 86400_000;
            
            const newStartTs = centerTs - newMs / 2;
            const newEndTs = centerTs + newMs / 2;
            
            setCustomStart(toLocalDatetimeString(new Date(newStartTs)));
            setCustomEnd(toLocalDatetimeString(new Date(newEndTs)));
            return;
        }

        let currentMs = 1800_000; // default 30m
        const match = timeRange.match(/-(\d+)([mhd])/);
        if (match) {
            const val = parseInt(match[1], 10);
            const unit = match[2];
            currentMs = val * (unit === 'd' ? 86400000 : unit === 'h' ? 3600000 : 60000);
        }

        if (direction === 1) { // ZOOM IN (+) -> Smaller
            const nextLevel = [...ZOOM_LEVELS].reverse().find(l => l.ms < currentMs);
            if (nextLevel) {
                setIsCustomRange(false);
                setTimeRange(nextLevel.query);
            }
        } else { // ZOOM OUT (-) -> Larger
            const nextLevel = ZOOM_LEVELS.find(l => l.ms > currentMs);
            if (nextLevel) {
                setIsCustomRange(false);
                setTimeRange(nextLevel.query);
            } else {
                // Already at max level or more (e.g. 7d), shift back by currentMs
                const end = Date.now();
                const newEndTs = end - currentMs;
                const newStartTs = newEndTs - currentMs;
                
                setCustomStart(toLocalDatetimeString(new Date(newStartTs)));
                setCustomEnd(toLocalDatetimeString(new Date(newEndTs)));
                setIsCustomRange(true);
            }
        }
    };

    const handleRecoverHistory = () => {
        // Last active Modbus telemetry time is April 23, 2026 10:50:49
        const latestTs = rigData._time ? new Date(rigData._time).getTime() : new Date("2026-04-23T10:50:49+00:00").getTime();
        
        // Setup a 24-hour historical window centering on the latest database telemetry
        const startTs = latestTs - 24 * 3600_000;
        const endTs = latestTs;
        
        setCustomStart(toLocalDatetimeString(new Date(startTs)));
        setCustomEnd(toLocalDatetimeString(new Date(endTs)));
        setIsCustomRange(true);
    };

    // Handle arrow keys navigation for scrolling
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (document.activeElement && (
                document.activeElement.tagName === 'INPUT' || 
                document.activeElement.tagName === 'SELECT' || 
                document.activeElement.tagName === 'TEXTAREA'
            )) {
                return;
            }

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                const container = scrollContainerRef.current;
                if (container) {
                    e.preventDefault();
                    const scrollAmount = 80;
                    if (e.key === 'ArrowDown') {
                        container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                    } else {
                        container.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const fetchLive = async () => {
            const d = await getRigData();
            setRigData(d || {});
        };
        const fetchHistory = async () => {
            const rows = isCustomRange && customStart && customEnd
                ? await getRigHistoryRange(new Date(customStart).toISOString(), new Date(customEnd).toISOString())
                : await getRigHistory(timeRange);
            setHistory(rows || []);
        };
        fetchLive(); fetchHistory();
        const li = setInterval(fetchLive, 2000);
        
        // Optimization: Disable polling intervals for large historical data when in custom range mode
        let hi = null;
        if (!isCustomRange) {
            hi = setInterval(fetchHistory, 15000);
        }

        return () => { 
            clearInterval(li); 
            if (hi) clearInterval(hi); 
        };
    }, [timeRange, isCustomRange, customStart, customEnd]);

    const holeDepth = getFieldValue(rigData, ['Depth', 'DEPTH']);
    const bitDepth  = getFieldValue(rigData, ['BitDepth', 'BITDEPTH', 'BIT DEPTH']);

    const chartConfig = useMemo(() => {
        let durationMs = 1800_000; // default 30m
        if (isCustomRange) {
            const startTs = new Date(customStart).getTime();
            const endTs = new Date(customEnd).getTime();
            if (Number.isFinite(startTs) && Number.isFinite(endTs) && startTs < endTs) {
                durationMs = endTs - startTs;
            }
        } else {
            const match = timeRange.match(/-(\d+)([mhd])/i);
            if (match) {
                const val = parseInt(match[1], 10);
                const unit = match[2].toLowerCase();
                durationMs = val * (unit === 'd' ? 86400000 : unit === 'h' ? 3600000 : 60000);
            }
        }

        // Map duration to height and downsample limit
        let height = 1200;
        let limit = 240;

        if (durationMs <= 60_000) { // 1 min
            height = 600;
            limit = 150;
        } else if (durationMs <= 300_000) { // 5 min
            height = 900;
            limit = 300;
        } else if (durationMs <= 900_000) { // 15 min
            height = 1200;
            limit = 450;
        } else if (durationMs <= 1800_000) { // 30 min
            height = 1800;
            limit = 600;
        } else if (durationMs <= 3600_000) { // 1 hour
            height = 3000;
            limit = 1000;
        } else if (durationMs <= 21600_000) { // 6 hours
            height = 7200;
            limit = 2000;
        } else if (durationMs <= 43200_000) { // 12 hours
            height = 12000;
            limit = 3000;
        } else if (durationMs <= 86400_000) { // 24 hours
            height = 20000;
            limit = 4000;
        } else { // larger than 24 hours
            height = 24000;
            limit = 5000;
        }

        return { height, limit, durationMs };
    }, [isCustomRange, customStart, customEnd, timeRange]);

    const computedTimeDomain = useMemo(() => {
        if (isCustomRange && customStart && customEnd) {
            const startTs = new Date(customStart).getTime();
            const endTs = new Date(customEnd).getTime();
            if (Number.isFinite(startTs) && Number.isFinite(endTs) && startTs < endTs) {
                return [startTs, endTs];
            }
        }
        // Find latest timestamp in history, default to Date.now() if no history
        const latestTs = history.length > 0 && history[history.length - 1]?.time
            ? new Date(history[history.length - 1].time).getTime()
            : Date.now();
        return [latestTs - chartConfig.durationMs, latestTs];
    }, [isCustomRange, customStart, customEnd, chartConfig.durationMs, history]);

    const chartHistory = useMemo(() => (
        downsampleRows(history, chartConfig.limit)
    ), [history, chartConfig.limit]);

    const depthLogHistory = useMemo(() => (
        downsampleRows(history, Math.round(chartConfig.limit / 4))
    ), [history, chartConfig.limit]);

    const trackData = useMemo(() =>
        chartHistory.map((row, i) => {
            const depth = getFieldValue(row, ['Depth', 'DEPTH']) || i;
            const timestamp = row?.time ? new Date(row.time).getTime() : Date.now() + i * 1000;
            const obj = { date: fmtDate(row.time), time: fmtTime(row.time), depth, timestamp };
            TRACK_OPTIONS.forEach(o => { obj[o.key] = getFieldValue(row, o.candidates); });
            return obj;
        }), [chartHistory]);

    const timeDepthRows = useMemo(() => {
        const rows = depthLogHistory.map((row, i) => ({
            key: `${row.time || i}-${i}`,
            date: fmtDate(row.time), time: fmtTime(row.time),
            depth:    getFieldValue(row, ['Depth',    'DEPTH']),
            bitDepth: getFieldValue(row, ['BitDepth', 'BITDEPTH', 'BIT DEPTH']),
        }));
        return rows.length > 0 ? rows : [{
            key: 'live', date: fmtDate(new Date()), time: fmtTime(new Date()),
            depth: holeDepth, bitDepth,
        }];
    }, [depthLogHistory, holeDepth, bitDepth]);

    const liveValues = useMemo(() => {
        const obj = {};
        TRACK_OPTIONS.forEach(o => { obj[o.key] = getFieldValue(rigData, o.candidates); });
        return obj;
    }, [rigData]);

    const xAxisTimeFormatter = (value) => fmtAxisTimeByRange(value, chartConfig.durationMs);

    const lastHistoryTime = history.length > 0 ? history[history.length - 1]?.time : null;
    const selectedEndTime = isCustomRange && customEnd ? new Date(customEnd).getTime() : null;
    const dataStopsEarly = Boolean(
        isCustomRange &&
        lastHistoryTime &&
        Number.isFinite(selectedEndTime) &&
        new Date(lastHistoryTime).getTime() < selectedEndTime - 60_000
    );

    const updatePenMetric = (trackIndex, penIndex, metric) => {
        setTracks(prev => {
            return prev.map((t, ti) => {
                if (ti !== trackIndex) return t;
                return {
                    ...t,
                    pens: t.pens.map((p, pi) => {
                        if (pi !== penIndex) return p;
                        return { ...p, metric };
                    })
                };
            });
        });
    };

    const updatePenMin = (trackIndex, penIndex, min) => {
        setTracks(prev => {
            return prev.map((t, ti) => {
                if (ti !== trackIndex) return t;
                return {
                    ...t,
                    pens: t.pens.map((p, pi) => {
                        if (pi !== penIndex) return p;
                        return { ...p, min };
                    })
                };
            });
        });
    };

    const updatePenMax = (trackIndex, penIndex, max) => {
        setTracks(prev => {
            return prev.map((t, ti) => {
                if (ti !== trackIndex) return t;
                return {
                    ...t,
                    pens: t.pens.map((p, pi) => {
                        if (pi !== penIndex) return p;
                        return { ...p, max };
                    })
                };
            });
        });
    };

    return (
        <div style={{
            height: '100%',
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#0c1220',
            color: '#e2e8f0',
            overflow: 'hidden',
            paddingBottom: '10px'
        }}>

            {/* ── Premium Filter Bar ── */}
            <div style={{
                flexShrink: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                gap: 6, padding: '7px 12px',
                background: 'rgba(8,12,24,0.95)',
                borderBottom: '1px solid rgba(99,102,241,0.15)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 1px 0 rgba(99,102,241,0.08)',
            }}>
                {/* EDR Label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8, paddingRight: 12, borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                    <Activity size={14} color="#6366f1" />
                    <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase', color: '#6366f1' }}>EDR</span>
                    {/* Live pulse */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 20, padding: '1px 6px' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'edr-pulse 2s infinite' }} />
                        <span style={{ fontSize: 8, color: '#10b981', fontWeight: 900, letterSpacing: 2 }}>LIVE</span>
                    </div>
                </div>

                {/* Time range buttons */}
                {QUICK_RANGES.map(r => {
                    const active = !isCustomRange && timeRange === r.value;
                    return (
                        <button key={r.value} onClick={() => { setIsCustomRange(false); setTimeRange(r.value); }} style={{
                            padding: '4px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: active ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'rgba(255,255,255,0.05)',
                            color: active ? '#fff' : '#64748b',
                            fontSize: 10, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase',
                            boxShadow: active ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
                            transition: 'all 0.2s',
                        }}>
                            {r.label}
                        </button>
                    );
                })}
                <button onClick={() => setIsCustomRange(v => !v)} style={{
                    padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: isCustomRange ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'rgba(255,255,255,0.05)',
                    color: isCustomRange ? '#000' : '#64748b',
                    fontSize: 10, fontWeight: 900, letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 5,
                    boxShadow: isCustomRange ? '0 0 12px rgba(245,158,11,0.4)' : 'none',
                }}>
                    <Calendar size={10} /> CUSTOM
                </button>
                <button onClick={() => { setIsCustomRange(false); setTimeRange('-30m'); }} style={{
                    padding: '4px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)', color: '#475569',
                    display: 'flex', alignItems: 'center',
                }}>
                    <RefreshCw size={10} />
                </button>

                {/* Zoom Buttons */}
                <div style={{ display: 'flex', gap: 4, marginLeft: 4, paddingLeft: 8, borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                    <button 
                        onClick={() => handleZoom(1)}
                        title="Zoom In (Less Time)"
                        style={{
                            padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
                            display: 'flex', alignItems: 'center', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        <Plus size={12} />
                    </button>
                    <button 
                        onClick={() => handleZoom(-1)}
                        title="Zoom Out (More Time / History)"
                        style={{
                            padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
                            display: 'flex', alignItems: 'center', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        <Minus size={12} />
                    </button>
                </div>

                {/* Export Button */}
                <button
                    onClick={() => setShowExportModal(true)}
                    style={{
                        padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff',
                        fontSize: 10, fontWeight: 900, letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 5,
                        boxShadow: '0 0 12px rgba(16,185,129,0.3)',
                        transition: 'all 0.2s',
                        marginLeft: 4
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <Download size={10} /> EXPORT
                </button>

                {/* Settings Button */}
                <button
                    onClick={() => setShowSettingsModal(true)}
                    style={{
                        padding: '4px 12px', borderRadius: 8, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        fontSize: 10, fontWeight: 900, letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 5,
                        border: '1px solid rgba(255,255,255,0.15)',
                        transition: 'all 0.2s',
                        marginLeft: 4
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <SlidersHorizontal size={10} /> SETTINGS
                </button>


                {isCustomRange && (
                    <div style={{ display: 'flex', gap: 8, marginLeft: 4, paddingLeft: 8, borderLeft: '1px solid rgba(255,255,255,0.08)', alignItems: 'center' }}>
                        {[['FROM', pickerStart, setPickerStart], ['TO', pickerEnd, setPickerEnd]].map(([lbl, val, set]) => (
                            <label key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8, color: '#475569', fontWeight: 900, letterSpacing: 2 }}>
                                {lbl}
                                <input type="datetime-local" value={val} onChange={e => set(e.target.value)} style={{
                                    background: 'rgba(20,30,50,0.9)', border: '1px solid rgba(99,102,241,0.2)',
                                    borderRadius: 6, padding: '3px 8px', color: '#94a3b8', fontSize: 10, outline: 'none',
                                }} />
                            </label>
                        ))}
                        <button
                            onClick={() => {
                                setCustomStart(pickerStart);
                                setCustomEnd(pickerEnd);
                                setIsCustomRange(true);
                            }}
                            style={{
                                padding: '4px 12px',
                                borderRadius: 8,
                                border: 'none',
                                cursor: 'pointer',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: 900,
                                letterSpacing: 1,
                                boxShadow: '0 0 12px rgba(16,185,129,0.3)',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            APPLY
                        </button>
                    </div>
                )}

                {dataStopsEarly && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        marginLeft: 8, padding: '3px 8px',
                        borderRadius: 8,
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.18)',
                        color: '#f59e0b',
                        fontSize: 9, fontWeight: 800, letterSpacing: 1,
                    }}>
                        DATA AVAILABLE UNTIL {fmtTime(lastHistoryTime)}
                    </div>
                )}

                {/* KPI pills on the right */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {[
                        { label: 'HOLE', val: holeDepth, unit: 'm', color: '#22d3ee' },
                        { label: 'BIT',  val: bitDepth,  unit: 'm', color: '#818cf8' },
                    ].map(k => (
                        <div key={k.label} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: `${k.color}10`,
                            border: `1px solid ${k.color}25`,
                            borderRadius: 10, padding: '4px 12px',
                        }}>
                            <span style={{ fontSize: 8, color: k.color, fontWeight: 900, letterSpacing: 2, opacity: 0.7 }}>{k.label}</span>
                            <span style={{ fontSize: 14, fontWeight: 900, color: k.color, fontFamily: 'sans-serif', fontVariantNumeric: 'tabular-nums', textShadow: `0 0 10px ${k.color}80` }}>{shell(k.val, 1)}</span>
                            <span style={{ fontSize: 8, color: k.color, opacity: 0.5 }}>{k.unit}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Smart Offline / No Data Recovery Banner ── */}
            {history.length === 0 && (
                <div style={{
                    flexShrink: 0,
                    margin: '8px 10px 0',
                    padding: '8px 16px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(217,119,6,0.15), rgba(245,158,11,0.08))',
                    border: '1px solid rgba(245,158,11,0.3)',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    boxShadow: '0 4px 12px rgba(245,158,11,0.05)',
                    animation: 'edr-slide-down 0.3s ease-out',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700 }}>
                        <SlidersHorizontal size={14} color="#f59e0b" style={{ transform: 'rotate(90deg)' }} />
                        <span>
                            No telemetry data found in the selected range. Latest telemetry recorded is from <strong style={{ color: '#fff', textShadow: '0 0 8px rgba(255,255,255,0.2)' }}>{fmtBannerDateTime(rigData._time || "2026-04-23T10:50:49+00:00")}</strong>.
                        </span>
                    </div>
                    <button
                        onClick={handleRecoverHistory}
                        style={{
                            padding: '4px 12px',
                            borderRadius: 8,
                            border: 'none',
                            cursor: 'pointer',
                            background: '#f59e0b',
                            color: '#000',
                            fontSize: 10,
                            fontWeight: 900,
                            letterSpacing: 1,
                            boxShadow: '0 0 10px rgba(245,158,11,0.4)',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        VIEW HISTORICAL DATA
                    </button>
                </div>
            )}

            {/* ── Track Grid ── */}
            <div className="capture-target-graph" style={{
                flex: 1, minHeight: 0,
                display: 'flex', flexDirection: 'row',
                overflowX: 'auto', overflowY: 'hidden',
                padding: '0 10px', gap: 10,
                height: '100%',
                background: '#0c1220'
            }}>
                {/* Scrollable area for all strips side-by-side */}
                <div 
                    ref={scrollContainerRef}
                    style={{
                        display: 'flex', flexDirection: 'row',
                        flex: 1, height: '100%',
                        overflowY: 'auto', gap: 10
                    }} 
                    className="custom-scrollbar"
                >
                    
                    {/* Depth Log (Width: 180px) */}
                    <div style={{ width: 180, flexShrink: 0, height: chartConfig.height }}>
                        <DualTrackPanel
                            panelIdx={-1}
                            isDepthLog={true}
                            pens={[
                                { metric: 'Depth', min: 0, max: 5000, color: '#0369a1' },
                                { metric: 'BitDepth', min: 0, max: 5000, color: '#6d28d9' }
                            ]}
                            data={trackData}
                            liveValues={liveValues}
                            timeDomain={computedTimeDomain}
                            timeLabelFormatter={xAxisTimeFormatter}
                            clickedTimestamp={clickedTimestamp}
                            onClick={handleChartClick}
                        />
                    </div>

                    {/* Tracks */}
                    {tracks.map((track, pi) => (
                        <div key={pi} style={{ flex: 1, minWidth: 220, flexShrink: 0, height: chartConfig.height }}>
                            <DualTrackPanel
                                panelIdx={pi}
                                pens={track.pens}
                                data={trackData}
                                liveValues={liveValues}
                                timeDomain={computedTimeDomain}
                                timeLabelFormatter={xAxisTimeFormatter}
                                clickedTimestamp={clickedTimestamp}
                                onClick={handleChartClick}
                                onSelect={(penIdx, metric) => updatePenMetric(pi, penIdx, metric)}
                                onUpdateMin={(penIdx, min) => updatePenMin(pi, penIdx, min)}
                                onUpdateMax={(penIdx, max) => updatePenMax(pi, penIdx, max)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <ExportDataModal 
                isOpen={showExportModal} 
                onClose={() => setShowExportModal(false)} 
                selectedKeys={selectedKeys}
                allOptions={TRACK_OPTIONS.map(o => ({ key: o.key, label: o.title }))}
            />

            <EdrSettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                tracks={tracks}
                onApply={newTracks => setTracks(newTracks)}
                onReset={() => setTracks(DEFAULT_TRACKS)}
            />

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes edr-pulse {
                    0%, 100% { opacity: 1; box-shadow: 0 0 6px currentColor; }
                    50% { opacity: 0.4; box-shadow: 0 0 2px currentColor; }
                }
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.15); border-radius: 10px; }
            `}} />
        </div>
    );
}
