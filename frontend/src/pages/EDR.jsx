import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Calendar, RefreshCw, SlidersHorizontal, Zap, Plus, Minus, Download } from 'lucide-react';
import {
    Area, AreaChart, CartesianGrid,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { getRigData, getRigHistory, getRigHistoryRange } from '../api';
import { getStoredRole } from '../auth';
import ExportDataModal from '../components/ExportDataModal';


// ── Time Ranges ────────────────────────────────────────────────────────────────
const QUICK_RANGES = [
    { label: '1m',  value: '-1m'  },
    { label: '5m',  value: '-5m'  },
    { label: '10m', value: '-10m' },
    { label: '30m', value: '-30m' },
    { label: '1h',  value: '-1h'  },
    { label: '24h', value: '-24h' },
    { label: '6M',  value: '-180d' },
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
function DualTrackPanel({ track1, track2, data, liveValues, onSelect1, onSelect2, onUpdateMax1, onUpdateMax2, panelIdx, timeDomain, timeLabelFormatter }) {
    const id1 = `grad-${panelIdx}-0`;
    const id2 = `grad-${panelIdx}-1`;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            borderRadius: 20, overflow: 'hidden', position: 'relative',
            background: `#ffffff`,
            border: `1px solid #cbd5e1`,
            boxShadow: `0 4px 12px rgba(0,0,0,0.05)`,
            color: '#1e293b'
        }}>
            {/* Header */}
            <div style={{
                flexShrink: 0, padding: '7px 12px',
                background: `#f8fafc`,
                borderBottom: `1px solid #e2e8f0`,
                display: 'flex', alignItems: 'center', gap: 8,
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
                }}>
                    Panel {panelIdx + 1}
                </span>
                {/* Track color pills */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {[track1, track2].map((t, i) => (
                        <div key={`${t.key}-${i}`} style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: `${t.color}15`, 
                            border: `1.5px solid ${t.color}60`,
                            borderRadius: 20, padding: '1px 8px',
                            opacity: i === 1 ? 0.8 : 1
                        }}>
                            <div style={{ 
                                width: 5, height: 5, borderRadius: '50%', background: t.color, 
                                boxShadow: i === 0 ? `0 0 6px ${t.color}` : 'none',
                                opacity: i === 1 ? 0.7 : 1
                            }} />
                            <span style={{ fontSize: 8, color: t.color, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>
                                {t.title} ({t.max || 'Auto'})
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div style={{ flex: 1, minHeight: 0, padding: '4px 4px 2px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        syncId="edr_sync"
                        margin={{ top: 20, right: 8, left: 4, bottom: 20 }}
                        layout="vertical"
                    >
                        <defs>
                            <linearGradient id={id1} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="5%" stopColor={track1.color} stopOpacity={0.15} />
                                <stop offset="95%" stopColor={track1.color} stopOpacity={0.01} />
                            </linearGradient>
                            <linearGradient id={id2} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="5%" stopColor={track2.color} stopOpacity={0.15} />
                                <stop offset="95%" stopColor={track2.color} stopOpacity={0.01} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                        <XAxis
                            xAxisId="top"
                            orientation="top"
                            type="number"
                            tick={false}
                            axisLine={{ stroke: '#cbd5e1' }}
                            tickLine={false}
                            height={4}
                            domain={[0, track1.max || 'auto']}
                        />
                        <XAxis
                            xAxisId="bottom"
                            orientation="bottom"
                            type="number"
                            tick={false}
                            axisLine={{ stroke: '#cbd5e1' }}
                            tickLine={false}
                            height={4}
                            domain={[0, track2.max || 'auto']}
                        />
                        <YAxis
                            dataKey="timestamp"
                            type="category"
                            tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'sans-serif', fontWeight: 600 }}
                            axisLine={{ stroke: '#cbd5e1' }}
                            tickLine={false}
                            tickFormatter={timeLabelFormatter || fmtAxisTime}
                            minTickGap={24}
                            width={34}
                            reversed={true}
                        />
                        <Tooltip
                            content={props => <DualTooltip {...props} accent="#94a3b8" />}
                            cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeOpacity: 0.5, strokeDasharray: '4 4' }}
                        />
                        <Area
                            xAxisId="top"
                            type="monotoneY"
                            dataKey={track1.key}
                            name={track1.title}
                            stroke={track1.color}
                            strokeWidth={3}
                            fill={`url(#${id1})`}
                            dot={false}
                            activeDot={{ r: 4, fill: '#fff', stroke: track1.color, strokeWidth: 2 }}
                            connectNulls
                            isAnimationActive={false}
                        />
                        <Area
                            xAxisId="bottom"
                            type="monotoneY"
                            dataKey={track2.key}
                            name={track2.title}
                            stroke={track2.color}
                            strokeWidth={1.5}
                            strokeOpacity={0.7}
                            fill={`url(#${id2})`}
                            dot={false}
                            activeDot={{ r: 4, fill: '#fff', stroke: track2.color, strokeWidth: 2 }}
                            connectNulls
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Bottom value + selector strip */}
            <div style={{
                flexShrink: 0,
                borderTop: `1px solid #e2e8f0`,
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                background: `#ffffff`,
            }}>
                {[{ track: track1, onSelect: onSelect1, onUpdateMax: onUpdateMax1 }, { track: track2, onSelect: onSelect2, onUpdateMax: onUpdateMax2 }].map(({ track, onSelect, onUpdateMax }, i) => (
                    <div key={`${track.key}-${i}`} style={{
                        padding: '6px 8px',
                        borderRight: i === 0 ? `1px solid #e2e8f0` : 'none',
                    }}>
                        {/* Row 1: 0 | Parameter Selector | MAX */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, width: '100%' }}>
                            {/* 0 on left */}
                            <span style={{
                                fontSize: 10, fontWeight: 900, color: track.color,
                                fontFamily: 'sans-serif', minWidth: 14, textAlign: 'center',
                                background: `${track.color}15`, borderRadius: 4, padding: '2px 4px',
                                flexShrink: 0,
                            }}>0</span>
                            {/* Parameter selector in center */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                <SlidersHorizontal size={10} color={track.color} style={{ flexShrink: 0 }} />
                                <select
                                    value={track.key}
                                    onChange={e => onSelect(e.target.value)}
                                    style={{
                                        background: 'transparent', border: 'none', outline: 'none',
                                        color: track.color, fontSize: 11, fontWeight: 900,
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
                            {/* MAX on right */}
                            <input
                                type="number"
                                value={track.max || ''}
                                onChange={e => onUpdateMax(parseFloat(e.target.value) || 0)}
                                placeholder="Max"
                                style={{
                                    width: 55, background: `${track.color}15`, border: 'none', outline: 'none',
                                    borderRadius: 4, padding: '2px 4px',
                                    fontSize: 10, fontWeight: 900, color: track.color, textAlign: 'center',
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
                                color: track.color, lineHeight: 1,
                            }}>
                                {shell(liveValues[track.key])}
                            </span>
                            <span style={{
                                fontSize: 10, color: '#64748b', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: 2,
                            }}>
                                {track.unit}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
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



// ── Main EDR Page ──────────────────────────────────────────────────────────────
export default function EDR() {
    const role = getStoredRole();
    const isScrollable = role === 'admin' || role === 'viewer';
    const [rigData,       setRigData]       = useState({});
    const [history,       setHistory]       = useState([]);
    const [timeRange,     setTimeRange]     = useState('-30m');
    const [isCustomRange, setIsCustomRange] = useState(false);
    const [customStart,   setCustomStart]   = useState(() => toLocalDatetimeString(new Date(Date.now() - 3600_000)));
    const [customEnd,     setCustomEnd]     = useState(() => toLocalDatetimeString(new Date()));
    const [pickerStart,   setPickerStart]   = useState(customStart);
    const [pickerEnd,     setPickerEnd]     = useState(customEnd);
    const [pairs,         setPairs]         = useState(() => {
        try {
            const saved = localStorage.getItem('edrPairs');
            const parsed = saved ? JSON.parse(saved) : null;
            if (parsed && parsed.length === 3) return parsed;
            return DEFAULT_PAIRS;
        } catch {
            return DEFAULT_PAIRS;
        }
    });
    const [showExportModal, setShowExportModal] = useState(false);
    const selectedKeys = useMemo(() => pairs.flatMap(p => [p[0].key, p[1].key]), [pairs]);

    useEffect(() => {
        localStorage.setItem('edrPairs', JSON.stringify(pairs));
    }, [pairs]);

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

    const chartHistory = useMemo(() => (
        downsampleRows(history, 240)
    ), [history]);

    const depthLogHistory = useMemo(() => (
        downsampleRows(history, 60)
    ), [history]);

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

    const customTimeDomain = useMemo(() => {
        if (!isCustomRange || !customStart || !customEnd) return null;
        const startTs = new Date(customStart).getTime();
        const endTs = new Date(customEnd).getTime();
        if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || startTs >= endTs) return null;
        return [startTs, endTs];
    }, [isCustomRange, customStart, customEnd]);

    const customDurationMs = customTimeDomain ? (customTimeDomain[1] - customTimeDomain[0]) : 0;
    const xAxisTimeFormatter = (value) => fmtAxisTimeByRange(value, customDurationMs);

    const lastHistoryTime = history.length > 0 ? history[history.length - 1]?.time : null;
    const selectedEndTime = isCustomRange && customEnd ? new Date(customEnd).getTime() : null;
    const dataStopsEarly = Boolean(
        isCustomRange &&
        lastHistoryTime &&
        Number.isFinite(selectedEndTime) &&
        new Date(lastHistoryTime).getTime() < selectedEndTime - 60_000
    );

    const updatePair = (pi, slot, k) => {
        setPairs(prev => {
            const n = prev.map(p => [...p]);
            if (typeof k === 'string') {
                // Changing parameter key
                n[pi][slot] = { ...n[pi][slot], key: k };
            } else if (typeof k === 'object') {
                // Updating entire object (e.g. key + max)
                n[pi][slot] = { ...n[pi][slot], ...k };
            }
            return n;
        });
    };

    const updateMax = (pi, slot, m) => {
        setPairs(prev => {
            const n = prev.map(p => [...p]);
            n[pi][slot] = { ...n[pi][slot], max: m };
            return n;
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
                display: 'grid',
                gridTemplateColumns: '120px repeat(3, 1fr)',
                gap: 10, padding: '0 10px',
            }}>
                {/* Depth/Time Axis Column */}
                <TimeDepthColumn rows={timeDepthRows} holeDepth={holeDepth} bitDepth={bitDepth} />

                {/* Tracks */}
                {pairs.map((p, pi) => {
                    const opt1 = TRACK_OPTIONS.find(o => o.key === p[0].key) || TRACK_OPTIONS[0];
                    const opt2 = TRACK_OPTIONS.find(o => o.key === p[1].key) || TRACK_OPTIONS[1];

                    // Retrieve fixed static colors for the panel
                    const colors = PANEL_COLORS[pi] || { c1: '#2563eb', c2: '#06b6d4' };

                    // Merge state with metadata and override colors
                    const t1 = { ...opt1, max: p[0].max, color: colors.c1 };
                    const t2 = { ...opt2, max: p[1].max, color: colors.c2 };

                    return (
                        <DualTrackPanel
                            key={pi}
                            panelIdx={pi}
                            track1={t1}
                            track2={t2}
                            data={trackData}
                            liveValues={liveValues}
                            timeDomain={customTimeDomain}
                            timeLabelFormatter={xAxisTimeFormatter}
                            onSelect1={k => updatePair(pi, 0, k)}
                            onSelect2={k => updatePair(pi, 1, k)}
                            onUpdateMax1={m => updateMax(pi, 0, m)}
                            onUpdateMax2={m => updateMax(pi, 1, m)}
                        />
                    );
                })}
            </div>

            <ExportDataModal 
                isOpen={showExportModal} 
                onClose={() => setShowExportModal(false)} 
                selectedKeys={selectedKeys}
                allOptions={TRACK_OPTIONS.map(o => ({ key: o.key, label: o.title }))}
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
