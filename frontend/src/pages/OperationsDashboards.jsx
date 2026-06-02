import React, { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    Database,
    Gauge,
    HeartPulse,
    Layers3,
    ShieldAlert,
    Waves,
    Wrench,
} from 'lucide-react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    Radar,
    RadarChart,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { getRigHistory } from '../api';
import { useRealtimeData } from '../hooks/useRealtimeData';

const DASHBOARD_TABS = [
    { id: 'well-balance', label: 'Well Balance', icon: ShieldAlert },
    { id: 'hydraulics', label: 'Hydraulics', icon: Waves },
    { id: 'drilling-efficiency', label: 'Drilling Efficiency', icon: Activity },
    { id: 'drillstring-integrity', label: 'Drillstring / BHA', icon: Wrench },
    { id: 'hole-cleaning', label: 'Hole Cleaning', icon: Layers3 },
    { id: 'rig-kpi', label: 'Rig KPI', icon: BarChart3 },
    { id: 'equipment-health', label: 'Equipment Health', icon: HeartPulse },
    { id: 'data-quality', label: 'Data Quality', icon: Database },
];

const shellCard = 'rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl shadow-black/20';

function getFieldValue(source, candidates, fallback = 0) {
    for (const key of candidates) {
        if (source?.[key] !== undefined && source?.[key] !== null) {
            return source[key];
        }
    }
    return fallback;
}

function clamp(value, min = 0, max = 100) {
    return Math.min(max, Math.max(min, value));
}

function formatShortTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function rollingSeries(history, mapper) {
    return history.slice(-18).map((row) => ({
        time: formatShortTime(row.time),
        ...mapper(row),
    }));
}

function MetricCard({ label, value, unit, tone = 'text-cyan-400', hint }) {
    return (
        <div className={`${shellCard} p-4`}>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">{label}</div>
            <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-3xl font-black tracking-tight font-sans tabular-nums ${tone}`}>{value}</span>
                {unit ? <span className="text-xs font-black uppercase tracking-wider text-gray-500">{unit}</span> : null}
            </div>
            {hint ? <div className="mt-2 text-xs text-gray-500">{hint}</div> : null}
        </div>
    );
}

function SectionCard({ title, subtitle, children, right }) {
    return (
        <section className={`${shellCard} p-5`}>
            <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                    <h3 className="text-lg font-black tracking-tight text-white">{title}</h3>
                    {subtitle ? <p className="mt-1 text-sm text-gray-400">{subtitle}</p> : null}
                </div>
                {right}
            </div>
            <div className="pt-5">{children}</div>
        </section>
    );
}

function TinyStatusPill({ label, tone }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${tone}`}>
            {label}
        </span>
    );
}

function AlarmList({ items }) {
    return (
        <div className="space-y-3">
            {items.map((alert) => (
                <div key={alert.label} className={`rounded-xl border px-4 py-3 text-sm font-bold ${alert.tone}`}>
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={16} />
                        <span>{alert.label}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function TrendAreaChart({ data, areas, height = 280 }) {
    return (
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }} />
                    {areas.map((area) => (
                        <Area
                            key={area.key}
                            type="monotone"
                            dataKey={area.key}
                            stroke={area.stroke}
                            fill={area.fill}
                            strokeWidth={2}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export default function OperationsDashboards() {
    const [activeTab, setActiveTab] = useState('well-balance');
    const [history, setHistory] = useState([]);
    const [flowbackOverride, setFlowbackOverride] = useState(false);
    const { data, connectionStatus, messageCount } = useRealtimeData({ pollingInterval: 2000 });

    useEffect(() => {
        const fetchHistory = async () => {
            const rows = await getRigHistory('-30m');
            setHistory(rows || []);
        };

        fetchHistory();
        const interval = setInterval(fetchHistory, 15000);
        return () => clearInterval(interval);
    }, []);

    const live = data || {};

    const rop = getFieldValue(live, ['ROP', 'RateOfPenetration']);
    const hookLoad = getFieldValue(live, ['WOH', 'HookLoad', 'WOHLoad']);
    const torque = getFieldValue(live, ['ROTARY TORQU', 'ROTARY TORQUE', 'Torque', 'TopDriveTorque']);
    const wob = getFieldValue(live, ['WOB', 'WeightOnBit']);
    const rpm = getFieldValue(live, ['RPM', 'TopDriveRPM', 'RotaryRPM']);
    const standpipePressure = getFieldValue(live, ['STANDPIPE PRESSURE', 'STANDPIPE PRE', 'StandpipePressure']);
    const diffPress = getFieldValue(live, ['DiffPress', 'DIFF PRESS']);
    const flowIn = getFieldValue(live, ['FLOW  IN', 'FLOW IN', 'FlowRate']);
    const flowOut = getFieldValue(live, ['FLOW  OUT', 'FLOW OUT', 'FlowOutPercent']);
    const gainLoss = getFieldValue(live, ['GAIN LOSS', 'GainLoss']);
    const bitDepth = getFieldValue(live, ['BitDepth', 'BITDEPTH', 'BIT DEPTH']);
    const holeDepth = getFieldValue(live, ['Depth', 'DEPTH']);
    const slipStatusValue = getFieldValue(live, ['SLIPS_STAT', 'SlipStatus'], 0);
    const pump1 = getFieldValue(live, ['PUMP 1', 'PUMP1', 'SPM1']);
    const pump2 = getFieldValue(live, ['PUMP 2', 'PUMP2', 'SPM2']);
    const strokes1 = getFieldValue(live, ['STROKES 1', 'STROKES1', 'STROKE1']);
    const strokes2 = getFieldValue(live, ['STROKES 2', 'STROKES2', 'STROKE2']);
    const totalSpm = getFieldValue(live, ['TOTAL SPM', 'TOTAL_SPM'], pump1 + pump2);
    const tank1 = getFieldValue(live, ['TANK 1', 'TANK1', 'PitVolume1']);
    const tank2 = getFieldValue(live, ['TANK 2', 'TANK2', 'PitVolume2']);
    const tank3 = getFieldValue(live, ['TANK 3', 'TANK3', 'PitVolume3']);
    const tripTank = getFieldValue(live, ['TRIP TANK', 'TRIPTANK', 'TripTank']);
    const gasSS = getFieldValue(live, ['H2S SS', 'H2SSS']);
    const gasBN = getFieldValue(live, ['H2S BN', 'H2SBN']);
    const lelSS = getFieldValue(live, ['LEL SS', 'LELSS']);
    const lelBN = getFieldValue(live, ['LEL BN', 'LELBN']);

    const slipStatus =
        slipStatusValue === 2 || slipStatusValue === '2' ? 'IN'
            : slipStatusValue === 1 || slipStatusValue === '1' ? 'OUT'
                : 'OFF';

    const flowDelta = flowIn - flowOut;
    const totalMudVolume = tank1 + tank2 + tank3;
    const activePit = totalMudVolume + tripTank;
    const annularVelocity = totalSpm * 0.8;
    const ecd = standpipePressure > 0 ? 9.2 + standpipePressure / 1800 + flowIn / 2500 : 0;
    const esd = ecd > 0 ? ecd - 0.35 : 0;
    const mudWindowTop = 14.2;
    const mudWindowBottom = 9.0;
    const fractureRisk = clamp(((ecd - 13.3) / 1.1) * 100);
    const influxRisk = clamp(((9.6 - esd) / 0.9) * 100);
    const pressureWindowAdherence = clamp((1 - Math.abs((ecd - 11.6) / 2.6)) * 100);
    const ballooningIndex = clamp(((Math.max(0, diffPress - 500) / 12) + Math.max(0, flowOut - flowIn) * 1.5));
    const actualLossIndex = clamp(((Math.max(0, -gainLoss) * 8) + Math.max(0, flowIn - flowOut) * 2));
    const cuttingsTransport = clamp((annularVelocity / 120) * 100 + (pump1 + pump2 > 0 ? 12 : -18) - Math.max(0, slipStatus === 'IN' ? 8 : 0));
    const bedHeightRisk = clamp(100 - cuttingsTransport + Math.max(0, holeDepth - bitDepth) * 0.8);
    const packoffRisk = clamp((Math.max(0, torque - 200) / 8) + (Math.max(0, diffPress - 350) / 10) + (100 - cuttingsTransport) * 0.35);
    const sweepEffectiveness = clamp(cuttingsTransport - packoffRisk * 0.3 + (pump1 + pump2 > 0 ? 10 : -10));
    const microDoglegRisk = clamp((Math.abs(holeDepth - bitDepth) * 4) + Math.max(0, torque - 180) * 0.15);
    const casingRunRisk = clamp((bedHeightRisk * 0.45) + (microDoglegRisk * 0.35) + (packoffRisk * 0.2));

    const currentDrag = Math.max(0, hookLoad - wob);
    const overpull = Math.max(0, hookLoad - 1.15 * Math.max(wob, 1));
    const slackoff = Math.max(0, wob - hookLoad);
    const bucklingRisk = clamp((wob / 2.2) + (torque / 16));
    const stuckPipeRisk = clamp((torque / 7.5) + currentDrag * 0.6 + Math.max(0, diffPress - 250) * 0.08);
    const stickSlip = clamp((rpm > 0 ? Math.abs((torque / Math.max(rpm, 1)) * 0.7) : 0));
    const whirlRisk = clamp((rpm * 0.45) + (torque * 0.08));
    const shockVibration = clamp((Math.abs(wob - hookLoad) * 0.45) + rpm * 0.35);
    const washoutIndicator = clamp((Math.max(0, flowIn - flowOut) * 3) + Math.max(0, standpipePressure < 150 ? 20 : 0));

    const mse = clamp((wob * 8) + (torque * Math.max(rpm, 1) / Math.max(rop || 0.5, 0.5)), 0, 9999);
    const drillingBreakRisk = clamp((rop > 0 ? Math.max(0, 120 - mse / 25) : 0), 0, 100);
    const planRop = 18;
    const parameterAdherence = clamp(100 - Math.abs(planRop - rop) * 4 - Math.abs(standpipePressure - 180) * 0.1);
    const bitPerformance = clamp((rop * 5) - (mse / 180) + 40);
    const connectionTime = clamp(8 + (slipStatus === 'IN' ? 5 : 0) + (pump1 + pump2 > 0 ? 2 : 0), 0, 45);
    const weightToWeight = clamp(connectionTime + Math.max(0, hookLoad - wob) * 0.08, 0, 60);
    const invisibleLostTime = clamp(100 - parameterAdherence + (slipStatus === 'OFF' ? 5 : 0), 0, 100);

    const rigActivity =
        rop > 0.5 ? 'DRILLING'
            : pump1 + pump2 > 20 ? 'CIRCULATING'
                : hookLoad > 5 ? 'TRIPPING'
                    : slipStatus === 'IN' ? 'CONNECTION'
                        : 'IDLE';

    const wellBalanceSeries = useMemo(() => rollingSeries(history, (row) => {
        const inFlow = getFieldValue(row, ['FLOW  IN', 'FLOW IN', 'FlowRate']);
        const outFlow = getFieldValue(row, ['FLOW  OUT', 'FLOW OUT', 'FlowOutPercent']);
        const gl = getFieldValue(row, ['GAIN LOSS', 'GainLoss']);
        const trip = getFieldValue(row, ['TRIP TANK', 'TRIPTANK', 'TripTank']);
        return {
            inflow: inFlow,
            outflow: outFlow,
            delta: inFlow - outFlow,
            gainLoss: gl,
            tripTank: trip,
        };
    }), [history]);

    const hydraulicsSeries = useMemo(() => rollingSeries(history, (row) => {
        const spp = getFieldValue(row, ['STANDPIPE PRESSURE', 'STANDPIPE PRE', 'StandpipePressure']);
        const fin = getFieldValue(row, ['FLOW  IN', 'FLOW IN', 'FlowRate']);
        const histEcd = spp > 0 ? 9.2 + spp / 1800 + fin / 2500 : 0;
        return {
            ecd: histEcd,
            spp,
            model: 170 + fin * 0.8,
            windowTop: mudWindowTop,
            windowBottom: mudWindowBottom,
        };
    }), [history]);

    const efficiencySeries = useMemo(() => rollingSeries(history, (row) => {
        const hRop = getFieldValue(row, ['ROP', 'RateOfPenetration']);
        const hWob = getFieldValue(row, ['WOB', 'WeightOnBit']);
        const hTorque = getFieldValue(row, ['ROTARY TORQU', 'ROTARY TORQUE', 'Torque', 'TopDriveTorque']);
        const hRpm = getFieldValue(row, ['RPM', 'TopDriveRPM', 'RotaryRPM']);
        const hMse = clamp((hWob * 8) + (hTorque * Math.max(hRpm, 1) / Math.max(hRop || 0.5, 0.5)), 0, 9999);
        return {
            rop: hRop,
            mse: hMse,
            adherence: clamp(100 - Math.abs(planRop - hRop) * 4),
        };
    }), [history]);

    const integritySeries = useMemo(() => rollingSeries(history, (row) => {
        const hHook = getFieldValue(row, ['WOH', 'HookLoad', 'WOHLoad']);
        const hWob = getFieldValue(row, ['WOB', 'WeightOnBit']);
        const hTorque = getFieldValue(row, ['ROTARY TORQU', 'ROTARY TORQUE', 'Torque', 'TopDriveTorque']);
        const hDiff = getFieldValue(row, ['DiffPress', 'DIFF PRESS']);
        const drag = Math.max(0, hHook - hWob);
        return {
            torque: hTorque,
            drag,
            risk: clamp((hTorque / 7.5) + drag * 0.6 + Math.max(0, hDiff - 250) * 0.08),
        };
    }), [history]);

    const cleaningSeries = useMemo(() => rollingSeries(history, (row) => {
        const p1 = getFieldValue(row, ['PUMP 1', 'PUMP1', 'SPM1']);
        const p2 = getFieldValue(row, ['PUMP 2', 'PUMP2', 'SPM2']);
        const tq = getFieldValue(row, ['ROTARY TORQU', 'ROTARY TORQUE', 'Torque', 'TopDriveTorque']);
        const dp = getFieldValue(row, ['DiffPress', 'DIFF PRESS']);
        const efficiency = clamp(((p1 + p2) * 0.8 / 120) * 100 + (p1 + p2 > 0 ? 12 : -18));
        const packoff = clamp((Math.max(0, tq - 200) / 8) + (Math.max(0, dp - 350) / 10) + (100 - efficiency) * 0.35);
        const totalSpmVal = p1 + p2;
        return {
            transport: efficiency,
            packoff,
            bedHeight: clamp(100 - efficiency),
            annularVelocity: totalSpmVal * 0.8,
            totalSpm: totalSpmVal,
        };
    }), [history]);

    const activityBreakdown = useMemo(() => {
        const counts = { Drilling: 0, Tripping: 0, Circulating: 0, Connection: 0, Idle: 0 };
        history.forEach((row) => {
            const hRop = getFieldValue(row, ['ROP', 'RateOfPenetration']);
            const hHook = getFieldValue(row, ['WOH', 'HookLoad', 'WOHLoad']);
            const hSlip = getFieldValue(row, ['SLIPS_STAT', 'SlipStatus'], 0);
            const hPump = getFieldValue(row, ['PUMP 1', 'PUMP1', 'SPM1']) + getFieldValue(row, ['PUMP 2', 'PUMP2', 'SPM2']);
            if (hRop > 0.5) counts.Drilling += 1;
            else if (hPump > 20) counts.Circulating += 1;
            else if (hHook > 5) counts.Tripping += 1;
            else if (hSlip === 2 || hSlip === '2') counts.Connection += 1;
            else counts.Idle += 1;
        });
        return [
            { name: 'Drilling', value: counts.Drilling || 1, color: '#10b981' },
            { name: 'Tripping', value: counts.Tripping || 1, color: '#38bdf8' },
            { name: 'Circulating', value: counts.Circulating || 1, color: '#f59e0b' },
            { name: 'Connection', value: counts.Connection || 1, color: '#a855f7' },
            { name: 'Idle / NPT', value: counts.Idle || 1, color: '#ef4444' },
        ];
    }, [history]);

    const benchmarkSeries = [
        { metric: 'ROP', actual: clamp((rop / planRop) * 100), plan: 100 },
        { metric: 'Conn', actual: clamp(100 - connectionTime * 2), plan: 88 },
        { metric: 'W2W', actual: clamp(100 - weightToWeight * 1.5), plan: 85 },
        { metric: 'ILT', actual: clamp(100 - invisibleLostTime), plan: 90 },
        { metric: 'NPT', actual: clamp(100 - activityBreakdown.find((row) => row.name === 'Idle / NPT')?.value * 5), plan: 92 },
    ];

    const powerPackNames = ['1', '2', '3', '4'];
    const equipmentHealth = powerPackNames.map((id) => {
        const prefix = `PP${id}_`;
        const ppRpm = getFieldValue(live, [`${prefix}RPM`]);
        const ppCoolant = getFieldValue(live, [`${prefix}CoolantTemp`]);
        const ppOil = getFieldValue(live, [`${prefix}OilPressure`]);
        const health = clamp(100 - ppCoolant * 0.6 - Math.max(0, 18 - ppOil) * 2 - Math.max(0, 900 - ppRpm) * 0.02, 0, 100);
        return { name: `Power Pack ${id}`, health, detail: `${ppRpm.toFixed(0)} rpm` };
    }).concat([
        { name: 'Mud Pump 1', health: clamp(100 - pump1 * 0.4 - strokes1 * 0.05), detail: `${pump1.toFixed(0)} spm` },
        { name: 'Mud Pump 2', health: clamp(100 - pump2 * 0.4 - strokes2 * 0.05), detail: `${pump2.toFixed(0)} spm` },
        { name: 'Top Drive', health: clamp(100 - torque * 0.22 - rpm * 0.12), detail: `${torque.toFixed(0)} torque` },
        { name: 'Drawworks', health: clamp(100 - hookLoad * 0.8), detail: `${hookLoad.toFixed(1)} ton` },
        { name: 'BOP / Accumulator', health: clamp(98 - Math.max(gasSS, gasBN) * 2 - Math.max(lelSS, lelBN) * 1.5), detail: 'pressure reserve' },
    ]);

    const dataQualityRows = useMemo(() => {
        const signals = [
            { label: 'Hook Load', keys: ['WOH', 'HookLoad', 'WOHLoad'], key: 'HookLoad', value: hookLoad },
            { label: 'Standpipe Pressure', keys: ['STANDPIPE PRESSURE', 'STANDPIPE PRE', 'StandpipePressure'], key: 'StandpipePressure', value: standpipePressure },
            { label: 'Flow In', keys: ['FLOW  IN', 'FLOW IN', 'FlowRate'], key: 'FlowIn', value: flowIn },
            { label: 'Flow Out', keys: ['FLOW  OUT', 'FLOW OUT', 'FlowOutPercent'], key: 'FlowOut', value: flowOut },
            { label: 'ROP', keys: ['ROP', 'RateOfPenetration'], key: 'ROP', value: rop },
            { label: 'Mud Volume', keys: ['TANK 1', 'TANK1'], key: 'MudVolume', value: totalMudVolume },
        ];

        return signals.map((signal) => {
            const samples = history
                .map((row) => getFieldValue(row, signal.keys, null))
                .filter((value) => typeof value === 'number');
            const missing = history.length - samples.length;
            const flatline = samples.length > 4 && samples.slice(-5).every((value) => value === samples[samples.length - 1]);
            const poor = missing > history.length * 0.35;
            const watch = flatline || Math.abs(samples[samples.length - 1] - samples[0] || 0) < 0.001;
            return {
                ...signal,
                missing,
                flatline,
                quality: poor ? 'Poor' : watch ? 'Watch' : 'Good',
            };
        });
    }, [history, hookLoad, standpipePressure, flowIn, flowOut, rop, totalMudVolume]);

    const sensorQualityChart = dataQualityRows.map((row) => ({
        name: row.label,
        score: row.quality === 'Good' ? 96 : row.quality === 'Watch' ? 72 : 38,
    }));

    const wellBalanceAlerts = useMemo(() => {
        const alerts = [];
        if (Math.abs(flowDelta) > 12) alerts.push({ label: 'Inflow vs outflow delta exceeds watch threshold', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' });
        if (gainLoss < -3) alerts.push({ label: 'Loss severity rising from pit volume trend', tone: 'border-red-500/30 bg-red-500/10 text-red-300' });
        if (gainLoss > 3) alerts.push({ label: 'Influx severity rising from gain trend', tone: 'border-red-500/30 bg-red-500/10 text-red-300' });
        if (tripTank > 4 && pump1 + pump2 < 10) alerts.push({ label: 'Trip tank movement during pump-off connection', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' });
        if (alerts.length === 0) alerts.push({ label: 'Well balance conditions stable', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' });
        return alerts;
    }, [flowDelta, gainLoss, tripTank, pump1, pump2]);

    const hydraulicsAlerts = useMemo(() => {
        const alerts = [];
        if (ecd > 13.3) alerts.push({ label: 'ECD approaching fracture limit', tone: 'border-red-500/30 bg-red-500/10 text-red-300' });
        if (esd < 9.6) alerts.push({ label: 'ESD drifting toward influx risk', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' });
        if (Math.abs(standpipePressure - (170 + flowIn * 0.8)) > 90) alerts.push({ label: 'Standpipe pressure deviates from model', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' });
        if (actualLossIndex > ballooningIndex + 20) alerts.push({ label: 'Real loss signature stronger than ballooning signature', tone: 'border-red-500/30 bg-red-500/10 text-red-300' });
        if (alerts.length === 0) alerts.push({ label: 'Hydraulics and pressure window within target band', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' });
        return alerts;
    }, [ecd, esd, standpipePressure, flowIn, actualLossIndex, ballooningIndex]);

    const efficiencyAlerts = useMemo(() => {
        const alerts = [];
        if (parameterAdherence < 70) alerts.push({ label: 'Drilling parameters drifting away from plan', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' });
        if (bitPerformance < 55) alerts.push({ label: 'Bit performance degrading', tone: 'border-red-500/30 bg-red-500/10 text-red-300' });
        if (connectionTime > 15) alerts.push({ label: 'Connection time above expected envelope', tone: 'border-amber-500/30 bg-amber-500/10 text-amber-300' });
        if (alerts.length === 0) alerts.push({ label: 'Efficiency indicators stable and on target', tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' });
        return alerts;
    }, [parameterAdherence, bitPerformance, connectionTime]);

    const integrityRadar = [
        { subject: 'Stuck', value: stuckPipeRisk },
        { subject: 'Buckling', value: bucklingRisk },
        { subject: 'Stick-Slip', value: stickSlip },
        { subject: 'Whirl', value: whirlRisk },
        { subject: 'Shock', value: shockVibration },
        { subject: 'Washout', value: washoutIndicator },
    ];

    return (
        <div className="w-full min-h-full p-4 md:p-6 text-white">
            <div className="mx-auto max-w-[1700px] space-y-6">
                <header className={`${shellCard} p-5`}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white">Operations Dashboards</h1>
                            <p className="mt-2 max-w-4xl text-sm text-gray-400">
                                Dedicated operational dashboards for well balance, hydraulics, drilling efficiency, drillstring integrity,
                                hole cleaning, rig KPIs, equipment condition, and data/system health. The main Drillbit Twin page is unchanged.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                        {DASHBOARD_TABS.map((tab) => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black transition-colors ${
                                        active
                                            ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                                            : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                                    }`}
                                >
                                    <Icon size={16} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </header>

                {activeTab === 'well-balance' && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <SectionCard title="Well Balance And Kick / Loss Detection" subtitle="Inflow vs outflow delta, pit gain/loss, trip tank trend, and connection flowback watch.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                                <MetricCard label="Flow In" value={flowIn.toFixed(1)} unit="gpm" tone="text-cyan-400" />
                                <MetricCard label="Flow Out" value={flowOut.toFixed(1)} unit="gpm" tone="text-emerald-400" />
                                <MetricCard label="Delta" value={flowDelta.toFixed(1)} unit="gpm" tone={Math.abs(flowDelta) > 12 ? 'text-amber-400' : 'text-sky-400'} />
                                <MetricCard label="Pit Gain / Loss" value={gainLoss.toFixed(1)} unit="bbl" tone={gainLoss < 0 ? 'text-red-400' : gainLoss > 0 ? 'text-amber-400' : 'text-sky-400'} />
                                <MetricCard label="Trip Tank" value={tripTank.toFixed(1)} unit="m3" tone="text-violet-400" />
                                <div className={`${shellCard} p-4 flex flex-col justify-between transition-all duration-300 ${
                                    !flowbackOverride && pump1 + pump2 < 10 && Math.abs(flowDelta) > 5 
                                        ? 'border-amber-500/50 shadow-lg shadow-amber-500/10 animate-pulse' 
                                        : 'border-white/10'
                                }`}>
                                    <div>
                                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">Flowback State</div>
                                        <div className="mt-3 flex items-baseline gap-2">
                                            <span className={`text-3xl font-black tracking-tight font-sans ${
                                                flowbackOverride 
                                                    ? 'text-violet-400' 
                                                    : (pump1 + pump2 < 10 && Math.abs(flowDelta) > 5 ? 'text-amber-400' : 'text-emerald-400')
                                            }`}>
                                                {flowbackOverride 
                                                    ? 'MUTED' 
                                                    : (pump1 + pump2 < 10 && Math.abs(flowDelta) > 5 ? 'WATCH' : 'NORMAL')
                                                }
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Mute Watch</span>
                                        <button
                                            onClick={() => setFlowbackOverride(!flowbackOverride)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                                                flowbackOverride ? 'bg-violet-600' : 'bg-slate-700'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                    flowbackOverride ? 'translate-x-4.5' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6">
                                <TrendAreaChart
                                    data={wellBalanceSeries}
                                    areas={[
                                        { key: 'inflow', stroke: '#38bdf8', fill: 'rgba(56,189,248,0.16)' },
                                        { key: 'outflow', stroke: '#10b981', fill: 'rgba(16,185,129,0.12)' },
                                        { key: 'gainLoss', stroke: '#f59e0b', fill: 'rgba(245,158,11,0.10)' },
                                    ]}
                                />
                            </div>
                        </SectionCard>

                        <SectionCard title="Safety Alarm State" subtitle="Clear visual kick/loss severity classification.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <MetricCard label="Loss Severity" value={actualLossIndex.toFixed(0)} unit="%" tone={actualLossIndex > 65 ? 'text-red-400' : actualLossIndex > 35 ? 'text-amber-400' : 'text-emerald-400'} />
                                <MetricCard label="Influx Severity" value={clamp(gainLoss * 10 + Math.max(0, flowOut - flowIn) * 2).toFixed(0)} unit="%" tone={gainLoss > 3 ? 'text-red-400' : gainLoss > 1 ? 'text-amber-400' : 'text-emerald-400'} />
                            </div>
                            <div className="mt-5">
                                <AlarmList items={wellBalanceAlerts} />
                            </div>
                            <div className="mt-6">
                                <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-400 mb-3">Trip Tank & Flow Delta Trend</div>
                                <TrendAreaChart
                                    data={wellBalanceSeries}
                                    areas={[
                                        { key: 'tripTank', stroke: '#a855f7', fill: 'rgba(168,85,247,0.16)' },
                                        { key: 'delta', stroke: '#f43f5e', fill: 'rgba(244,63,94,0.10)' },
                                    ]}
                                    height={280}
                                />
                            </div>
                        </SectionCard>
                    </div>
                )}

                {activeTab === 'hydraulics' && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <SectionCard title="Hydraulics And Wellbore Integrity" subtitle="ECD / ESD, standpipe pressure vs model, ballooning vs real losses, and pressure-window adherence.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                                <MetricCard label="ECD" value={ecd.toFixed(2)} unit="ppg" tone="text-cyan-400" hint={`${mudWindowBottom.toFixed(1)}-${mudWindowTop.toFixed(1)} ppg window`} />
                                <MetricCard label="ESD" value={esd.toFixed(2)} unit="ppg" tone="text-sky-400" />
                                <MetricCard label="SPP vs Model" value={`${standpipePressure.toFixed(0)} / ${(170 + flowIn * 0.8).toFixed(0)}`} unit="psi" tone="text-amber-400" />
                                <MetricCard label="Fracture Risk" value={fractureRisk.toFixed(0)} unit="%" tone={fractureRisk > 65 ? 'text-red-400' : fractureRisk > 35 ? 'text-amber-400' : 'text-emerald-400'} />
                                <MetricCard label="Influx Risk" value={influxRisk.toFixed(0)} unit="%" tone={influxRisk > 65 ? 'text-red-400' : influxRisk > 35 ? 'text-amber-400' : 'text-emerald-400'} />
                                <MetricCard label="Window Adherence" value={pressureWindowAdherence.toFixed(0)} unit="%" tone={pressureWindowAdherence < 65 ? 'text-red-400' : pressureWindowAdherence < 80 ? 'text-amber-400' : 'text-emerald-400'} />
                            </div>
                            <div className="mt-6">
                                <TrendAreaChart
                                    data={hydraulicsSeries}
                                    areas={[
                                        { key: 'ecd', stroke: '#38bdf8', fill: 'rgba(56,189,248,0.14)' },
                                        { key: 'windowTop', stroke: '#ef4444', fill: 'rgba(239,68,68,0.02)' },
                                        { key: 'windowBottom', stroke: '#10b981', fill: 'rgba(16,185,129,0.02)' },
                                    ]}
                                />
                            </div>
                        </SectionCard>

                        <SectionCard title="Integrity Watchboard" subtitle="Ballooning discrimination and real-loss / influx decision support.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <MetricCard label="Ballooning Signature" value={ballooningIndex.toFixed(0)} unit="%" tone="text-violet-400" />
                                <MetricCard label="Real Loss Signature" value={actualLossIndex.toFixed(0)} unit="%" tone="text-red-400" />
                                <MetricCard label="Mud Volume Balance" value={activePit.toFixed(1)} unit="m3" tone="text-cyan-400" />
                                <MetricCard label="Pressure Envelope" value={pressureWindowAdherence > 80 ? 'IN WINDOW' : pressureWindowAdherence > 60 ? 'WATCH' : 'OUTSIDE'} tone={pressureWindowAdherence > 80 ? 'text-emerald-400' : pressureWindowAdherence > 60 ? 'text-amber-400' : 'text-red-400'} />
                            </div>
                            <div className="mt-5">
                                <AlarmList items={hydraulicsAlerts} />
                            </div>
                            <div className="mt-6">
                                <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-400 mb-3">Standpipe Pressure vs Model Trend</div>
                                <div style={{ height: 280 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={hydraulicsSeries}>
                                            <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }} />
                                            <Line type="monotone" dataKey="spp" name="SPP" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="model" name="Model SPP" stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </SectionCard>
                    </div>
                )}

                {activeTab === 'drilling-efficiency' && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <SectionCard title="Drilling Efficiency Dashboard" subtitle="ROP, MSE, parameter adherence, bit performance, connection time, W2W, ILT, and NPT watch.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                                <MetricCard label="ROP" value={rop.toFixed(2)} unit="m/hr" tone="text-emerald-400" />
                                <MetricCard label="MSE" value={mse.toFixed(0)} unit="psi eq" tone="text-cyan-400" />
                                <MetricCard label="Bit Performance" value={bitPerformance.toFixed(0)} unit="%" tone={bitPerformance < 55 ? 'text-red-400' : bitPerformance < 75 ? 'text-amber-400' : 'text-emerald-400'} />
                                <MetricCard label="Conn Time" value={connectionTime.toFixed(1)} unit="min" tone="text-violet-400" />
                                <MetricCard label="W2W Time" value={weightToWeight.toFixed(1)} unit="min" tone="text-amber-400" />
                                <MetricCard label="ILT" value={invisibleLostTime.toFixed(0)} unit="%" tone="text-rose-400" />
                            </div>
                            <div className="mt-6 h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={efficiencySeries}>
                                        <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }} />
                                        <Line type="monotone" dataKey="rop" name="ROP (m/hr)" stroke="#10b981" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="adherence" name="Parameter Adherence (%)" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </SectionCard>

                        <SectionCard title="Efficiency Coaching Panel" subtitle="Operational plan adherence and drilling break signals.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <MetricCard label="Plan Adherence" value={parameterAdherence.toFixed(0)} unit="%" tone={parameterAdherence < 70 ? 'text-red-400' : parameterAdherence < 85 ? 'text-amber-400' : 'text-emerald-400'} />
                                <MetricCard label="Drilling Break Index" value={drillingBreakRisk.toFixed(0)} unit="%" tone="text-cyan-400" />
                            </div>
                            <div className="mt-5">
                                <AlarmList items={efficiencyAlerts} />
                            </div>
                            <div className="mt-6 h-80">
                                <div className="text-xs font-black uppercase tracking-[0.18em] text-gray-400 mb-3">Mechanical Specific Energy (MSE) Trend</div>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={efficiencySeries}>
                                        <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }} />
                                        <Area type="monotone" dataKey="mse" name="MSE (psi eq)" stroke="#38bdf8" fill="rgba(56,189,248,0.14)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </SectionCard>
                    </div>
                )}

                {activeTab === 'drillstring-integrity' && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <SectionCard title="Drillstring And BHA Integrity" subtitle="Torque and drag, overpull/slackoff, buckling, stuck-pipe, whirl, shock/vibration, and washout watch.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                                <MetricCard label="Torque" value={torque.toFixed(1)} unit="kNm" tone="text-amber-400" />
                                <MetricCard label="Drag" value={currentDrag.toFixed(1)} unit="ton" tone="text-cyan-400" />
                                <MetricCard label="Overpull" value={overpull.toFixed(1)} unit="ton" tone="text-rose-400" />
                                <MetricCard label="Slackoff" value={slackoff.toFixed(1)} unit="ton" tone="text-violet-400" />
                                <MetricCard label="Buckling" value={bucklingRisk.toFixed(0)} unit="%" tone="text-amber-400" />
                                <MetricCard label="Stuck Pipe" value={stuckPipeRisk.toFixed(0)} unit="%" tone={stuckPipeRisk > 65 ? 'text-red-400' : stuckPipeRisk > 35 ? 'text-amber-400' : 'text-emerald-400'} />
                            </div>
                            <div className="mt-6 h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={integritySeries}>
                                        <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }} />
                                        <Line type="monotone" dataKey="torque" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="drag" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </SectionCard>

                        <SectionCard title="Dynamic Dysfunction Radar" subtitle="Stick-slip, whirl, vibration, and washout abnormality indicators.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <MetricCard label="Stick-Slip" value={stickSlip.toFixed(0)} unit="%" tone="text-violet-400" />
                                <MetricCard label="Whirl" value={whirlRisk.toFixed(0)} unit="%" tone="text-cyan-400" />
                                <MetricCard label="Shock / Vib" value={shockVibration.toFixed(0)} unit="%" tone="text-amber-400" />
                                <MetricCard label="Washout" value={washoutIndicator.toFixed(0)} unit="%" tone="text-rose-400" />
                            </div>
                            <div className="mt-6 h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={integrityRadar}>
                                        <PolarGrid stroke="#334155" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                                        <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <Radar dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.25} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </SectionCard>
                    </div>
                )}

                {activeTab === 'hole-cleaning' && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <SectionCard title="Hole Cleaning And Borehole Quality" subtitle="Cuttings transport, bed height, packoff tendency, sweep effectiveness, microdoglegs, spiraling proxy, and casing-run risk.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                                <MetricCard label="Transport Eff." value={cuttingsTransport.toFixed(0)} unit="%" tone={cuttingsTransport < 60 ? 'text-red-400' : cuttingsTransport < 80 ? 'text-amber-400' : 'text-emerald-400'} />
                                <MetricCard label="Bed Height Risk" value={bedHeightRisk.toFixed(0)} unit="%" tone="text-amber-400" />
                                <MetricCard label="Packoff" value={packoffRisk.toFixed(0)} unit="%" tone={packoffRisk > 65 ? 'text-red-400' : packoffRisk > 35 ? 'text-amber-400' : 'text-emerald-400'} />
                                <MetricCard label="Sweep Eff." value={sweepEffectiveness.toFixed(0)} unit="%" tone="text-cyan-400" />
                                <MetricCard label="Microdogleg" value={microDoglegRisk.toFixed(0)} unit="%" tone="text-violet-400" />
                                <MetricCard label="Casing Run Risk" value={casingRunRisk.toFixed(0)} unit="%" tone={casingRunRisk > 65 ? 'text-red-400' : casingRunRisk > 35 ? 'text-amber-400' : 'text-emerald-400'} />
                            </div>
                            <div className="mt-6 h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={cleaningSeries}>
                                        <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }} />
                                        <Line type="monotone" dataKey="transport" stroke="#10b981" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="packoff" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="bedHeight" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </SectionCard>

                        <SectionCard title="Cleaning Support Signals" subtitle="Flow and circulation context behind hole-cleaning performance.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <MetricCard label="Annular Velocity" value={annularVelocity.toFixed(0)} unit="ft/min eq" tone="text-cyan-400" />
                                <MetricCard label="Total SPM" value={totalSpm.toFixed(0)} unit="spm" tone="text-emerald-400" />
                                <MetricCard label="Slip State" value={slipStatus} tone="text-violet-400" />
                                <MetricCard label="Depth Spread" value={(holeDepth - bitDepth).toFixed(1)} unit="m" tone="text-amber-400" />
                            </div>
                            <div className="mt-6 h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={cleaningSeries}>
                                        <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }} />
                                        <Line type="monotone" dataKey="annularVelocity" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="totalSpm" stroke="#10b981" strokeWidth={2.5} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </SectionCard>
                    </div>
                )}

                {activeTab === 'rig-kpi' && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <SectionCard title="Rig Activity And Operational KPIs" subtitle="Automatic rig-state segmentation, time breakdown, benchmark vs plan, and non-productive time view.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <MetricCard label="Rig Activity" value={rigActivity} tone="text-cyan-300" />
                                <MetricCard label="NPT Signal" value={(activityBreakdown.find((row) => row.name === 'Idle / NPT')?.value || 0).toFixed(0)} unit="samples" tone="text-rose-400" />
                            </div>
                            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={activityBreakdown} innerRadius={70} outerRadius={105} paddingAngle={4} dataKey="value">
                                                {activityBreakdown.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-3">
                                    {activityBreakdown.map((item) => (
                                        <div key={item.name} className="rounded-xl border border-white/10 bg-white/5 p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                    <span className="font-bold text-white">{item.name}</span>
                                                </div>
                                                <span className="text-xl font-black text-white">{item.value}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Benchmark Vs Plan / Offset" subtitle="Quick benchmark view for current run efficiency against internal target.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
                                <MetricCard label="Connection" value={connectionTime.toFixed(1)} unit="min" tone="text-violet-400" />
                                <MetricCard label="W2W" value={weightToWeight.toFixed(1)} unit="min" tone="text-amber-400" />
                            </div>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={benchmarkSeries}>
                                        <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }} />
                                        <Bar dataKey="actual" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                                        <Bar dataKey="plan" fill="#10b981" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </SectionCard>
                    </div>
                )}

                {activeTab === 'equipment-health' && (
                    <div className="space-y-6">
                        <SectionCard title="Equipment Health And Predictive Maintenance" subtitle="Mud pumps, top drive, drawworks, power packs, BOP / accumulator health, and maintenance watch signals.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {equipmentHealth.map((asset) => (
                                    <div key={asset.name} className={`${shellCard} p-4`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-black text-white">{asset.name}</div>
                                                <div className="mt-1 text-xs text-gray-500">{asset.detail}</div>
                                            </div>
                                            <Gauge size={18} className={asset.health > 85 ? 'text-emerald-400' : asset.health > 65 ? 'text-amber-400' : 'text-red-400'} />
                                        </div>
                                        <div className="mt-5 flex items-baseline gap-2">
                                            <span className={`text-4xl font-black font-sans tabular-nums ${asset.health > 85 ? 'text-emerald-400' : asset.health > 65 ? 'text-amber-400' : 'text-red-400'}`}>
                                                {asset.health.toFixed(0)}
                                            </span>
                                            <span className="text-xs font-black uppercase tracking-wider text-gray-500">health</span>
                                        </div>
                                        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/5">
                                            <div
                                                className={`h-full rounded-full ${asset.health > 85 ? 'bg-emerald-500' : asset.health > 65 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                style={{ width: `${asset.health}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={equipmentHealth}>
                                        <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={70} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }} />
                                        <Bar dataKey="health" radius={[8, 8, 0, 0]}>
                                            {equipmentHealth.map((asset) => (
                                                <Cell key={asset.name} fill={asset.health > 85 ? '#10b981' : asset.health > 65 ? '#f59e0b' : '#ef4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </SectionCard>
                    </div>
                )}

                {activeTab === 'data-quality' && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <SectionCard title="Data Quality And System Health" subtitle="Stale data, missing channels, flatline watch, historian coverage, and feed health confidence.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <MetricCard label="Realtime Link" value={connectionStatus === 'connected' ? 'GOOD' : 'POLL'} tone={connectionStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'} />
                                <MetricCard label="History Samples" value={history.length.toString()} tone="text-cyan-400" />
                            </div>
                            <div className="mt-6 overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-gray-500">
                                        <tr>
                                            <th className="pb-3 pr-4">Signal</th>
                                            <th className="pb-3 pr-4">Live Value</th>
                                            <th className="pb-3 pr-4">Missing Samples</th>
                                            <th className="pb-3 pr-4">Flatline</th>
                                            <th className="pb-3">Quality</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dataQualityRows.map((row) => (
                                            <tr key={row.key} className="border-b border-white/5">
                                                <td className="py-3 pr-4 font-bold text-white">{row.label}</td>
                                                <td className="py-3 pr-4 text-gray-300 font-sans tabular-nums">{typeof row.value === 'number' ? row.value.toFixed(2) : row.value ?? '--'}</td>
                                                <td className="py-3 pr-4 text-gray-300 font-sans tabular-nums">{row.missing}</td>
                                                <td className="py-3 pr-4 text-gray-300 font-sans">{row.flatline ? 'Yes' : 'No'}</td>
                                                <td className="py-3">
                                                    <TinyStatusPill
                                                        label={row.quality}
                                                        tone={
                                                            row.quality === 'Good'
                                                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                                                : row.quality === 'Watch'
                                                                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                                                    : 'border-red-500/30 bg-red-500/10 text-red-300'
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </SectionCard>

                        <SectionCard title="Sensor Confidence Score" subtitle="Signal family confidence score across current Modbus / historian feed.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
                                <MetricCard label="Historian Gap Risk" value={(history.length < 8 ? 80 : history.length < 14 ? 45 : 10).toFixed(0)} unit="%" tone={history.length < 8 ? 'text-red-400' : history.length < 14 ? 'text-amber-400' : 'text-emerald-400'} />
                                <MetricCard label="Feed Latency" value={connectionStatus === 'connected' ? 'LOW' : 'WATCH'} tone={connectionStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'} />
                            </div>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sensorQualityChart} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid stroke="#334155" strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={130} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }} />
                                        <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                                            {sensorQualityChart.map((row) => (
                                                <Cell key={row.name} fill={row.score > 85 ? '#10b981' : row.score > 60 ? '#f59e0b' : '#ef4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </SectionCard>
                    </div>
                )}
            </div>
        </div>
    );
}
