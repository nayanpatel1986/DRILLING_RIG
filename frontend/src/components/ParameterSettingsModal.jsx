import React, { useEffect, useState } from 'react';
import { Bell, RotateCcw, Save, X } from 'lucide-react';
import { writeModbusFloat } from '../api';

const ParameterSettingsModal = ({
    paramKey,
    label = 'PARAMETER',
    unit = '',
    defaultMax = 100,
    defaultHighHigh,
    defaultHigh,
    defaultLow,
    defaultLowLow,
    address,
    deviceId,
    liveData,
    onClose
}) => {
    const storageKey = `alarm_config_${paramKey}`;

    const defaults = {
        hornEnabled: true,
        scaleMin: 0,
        scaleMax: defaultMax,
        highHigh: defaultHighHigh ?? Math.round(defaultMax * 0.97),
        high: defaultHigh ?? Math.round(defaultMax * 0.90),
        low: defaultLow ?? Math.round(defaultMax * 0.05),
        lowLow: defaultLowLow ?? Math.round(defaultMax * 0.02),
        scaleColorNoAlarm: false,
        displayColorNoAlarm: false,
        interpolateColors: false
    };

    const [config, setConfig] = useState(defaults);
    const [keypadTarget, setKeypadTarget] = useState(null);
    const [keypadValue, setKeypadValue] = useState('');

    const openKeypad = (field, label) => {
        setKeypadTarget({ field, label });
        setKeypadValue(config[field]?.toString() || '0');
    };

    const handleKeypadInput = (key) => {
        setKeypadValue((prev) => {
            if (key === 'BACKSPACE') {
                return prev.length <= 1 ? '0' : prev.slice(0, -1);
            }
            if (key === 'CLEAR') {
                return '0';
            }
            if (key === '.') {
                if (prev.includes('.')) return prev;
                return prev + '.';
            }
            if (key === '-') {
                if (prev.startsWith('-')) return prev.slice(1);
                if (prev === '0') return '-';
                return '-' + prev;
            }
            // Number key
            if (prev === '0') return key;
            if (prev === '-0') return '-' + key;
            return prev + key;
        });
    };

    const handleKeypadAccept = () => {
        if (keypadTarget) {
            const parsed = parseFloat(keypadValue);
            handleChange(keypadTarget.field, isNaN(parsed) ? 0 : parsed);
            setKeypadTarget(null);
        }
    };

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                setConfig(JSON.parse(stored));
            } catch {
                setConfig(defaults);
            }
        } else {
            setConfig(defaults);
        }
    }, [storageKey]);

    const handleChange = (field, value) => {
        setConfig((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        localStorage.setItem(storageKey, JSON.stringify(config));
        onClose();
    };

    const inputClass =
        'w-full rounded-xl border border-white/5 bg-slate-900/50 px-4 py-3 text-xl font-mono font-black text-white outline-none transition-all focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20';
    const fieldLabelClass =
        'mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500';
    const unitLabelClass =
        'absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-gray-600';

    const checkboxCard = (active, activeClass) =>
        `flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-900/60 transition-all ${active ? activeClass : ''}`;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-nov-border bg-nov-card shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-red-500/10 p-2">
                            <Bell className="text-red-400" size={20} />
                        </div>
                        <h2 className="text-lg font-black uppercase tracking-tighter text-white">{label}</h2>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-2">
                    <div className="flex flex-col gap-5 rounded-2xl border border-white/5 bg-slate-900/30 p-5">
                        <div className="relative">
                            <div className={fieldLabelClass}>Scale Range Min</div>
                            <input
                                type="text"
                                className={`${inputClass} cursor-pointer select-none`}
                                value={config.scaleMin}
                                readOnly
                                onClick={() => openKeypad('scaleMin', 'Scale Range Min')}
                                onFocus={(e) => e.target.blur()}
                            />
                            <span className={unitLabelClass}>{unit}</span>
                        </div>

                        <div className="relative">
                            <div className={fieldLabelClass}>Scale Range Max</div>
                            <input
                                type="text"
                                className={`${inputClass} cursor-pointer select-none`}
                                value={config.scaleMax}
                                readOnly
                                onClick={() => openKeypad('scaleMax', 'Scale Range Max')}
                                onFocus={(e) => e.target.blur()}
                            />
                            <span className={unitLabelClass}>{unit}</span>
                        </div>

                        <div className="mx-2 h-px bg-white/5" />

                        <div className="flex flex-col gap-4">
                            <label className="flex cursor-pointer items-center gap-3">
                                <div
                                    onClick={() => handleChange('scaleColorNoAlarm', !config.scaleColorNoAlarm)}
                                    className={checkboxCard(config.scaleColorNoAlarm, 'border-blue-400/40')}
                                >
                                    {config.scaleColorNoAlarm && <div className="h-5 w-5 rounded bg-blue-500" />}
                                </div>
                                <span className="text-sm font-bold text-gray-300">Scale Color (No Alarm)</span>
                            </label>

                            <label className="flex cursor-pointer items-center gap-3">
                                <div
                                    onClick={() => handleChange('displayColorNoAlarm', !config.displayColorNoAlarm)}
                                    className={checkboxCard(config.displayColorNoAlarm, 'border-emerald-400/40')}
                                >
                                    {config.displayColorNoAlarm && <div className="h-5 w-5 rounded bg-emerald-500" />}
                                </div>
                                <span className="text-sm font-bold text-gray-300">Display Value Color (No Alarm)</span>
                            </label>

                            <label className="flex cursor-pointer items-center gap-3">
                                <div
                                    onClick={() => handleChange('interpolateColors', !config.interpolateColors)}
                                    className={checkboxCard(config.interpolateColors, 'border-amber-400/40')}
                                >
                                    {config.interpolateColors && <div className="h-5 w-5 rounded bg-amber-500" />}
                                </div>
                                <span className="text-sm font-bold text-gray-300">Interpolate Colors</span>
                            </label>
                        </div>

                        <div className="mt-2 space-y-4">
                             {['WOB', 'WOH', 'HookLoad'].includes(paramKey) && (
                                <div className="space-y-3">
                                    <button
                                        onClick={async () => {
                                            try {
                                                const targetDeviceId = deviceId || 34;
                                                const currentHkld = liveData?.HookLoad || liveData?.WOH || 0;
                                                // Ch 98: Bit Wt 0 Off Bottom -> Address 1196
                                                await writeModbusFloat(targetDeviceId, 1196, currentHkld);
                                                alert(`WOB Zeroed! Baseline set to ${currentHkld.toFixed(1)} ${unit}`);
                                            } catch (err) {
                                                alert(`Failed to Zero WOB: ${err.response?.data?.detail || err.message}`);
                                            }
                                        }}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 py-4 text-sm font-black uppercase tracking-tighter text-white shadow-lg shadow-cyan-900/20 transition-all hover:bg-cyan-500 active:scale-[0.98]"
                                    >
                                        <RotateCcw size={18} />
                                        Zero WOB (Set Baseline)
                                    </button>
                                    
                                    <button
                                        onClick={async () => {
                                            try {
                                                const targetDeviceId = deviceId || 34;
                                                // Ch 116: Bit on Bottom Reset -> Address 1232
                                                await writeModbusFloat(targetDeviceId, 1232, 1.0);
                                                alert(`Bit on Bottom Reset trigger sent!`);
                                            } catch (err) {
                                                alert(`Failed to Reset Bit on Bottom: ${err.response?.data?.detail || err.message}`);
                                            }
                                        }}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-4 text-sm font-black uppercase tracking-tighter text-white shadow-lg shadow-orange-900/20 transition-all hover:bg-orange-500 active:scale-[0.98]"
                                    >
                                        <RotateCcw size={18} />
                                        Reset Bit On Bottom
                                    </button>
                                </div>
                            )}

                            {(paramKey === 'STROKES1' || paramKey === 'STROKES2' || paramKey === 'TOT_STRK') && (
                                <button
                                    onClick={async () => {
                                        try {
                                            const targetDeviceId = deviceId || 1; // Default to ID 1 (standard for seeded DAQ-10)

                                            if (paramKey === 'STROKES1') {
                                                const strokes2Val = parseFloat(liveData?.PumpStrokes2) || 0.0;
                                                await Promise.all([
                                                    writeModbusFloat(targetDeviceId, 24, 0.0),
                                                    writeModbusFloat(targetDeviceId, 30, strokes2Val)
                                                ]);
                                            } else if (paramKey === 'STROKES2') {
                                                const strokes1Val = parseFloat(liveData?.PumpStrokes1) || 0.0;
                                                await Promise.all([
                                                    writeModbusFloat(targetDeviceId, 26, 0.0),
                                                    writeModbusFloat(targetDeviceId, 30, strokes1Val)
                                                ]);
                                            } else if (paramKey === 'TOT_STRK') {
                                                await Promise.all([
                                                    writeModbusFloat(targetDeviceId, 24, 0.0),
                                                    writeModbusFloat(targetDeviceId, 26, 0.0),
                                                    writeModbusFloat(targetDeviceId, 30, 0.0)
                                                ]);
                                            }
                                            
                                            // Save the current config and close the settings modal automatically
                                            localStorage.setItem(storageKey, JSON.stringify(config));
                                            onClose();
                                        } catch (err) {
                                            alert(`Failed to reset: ${err.response?.data?.detail || err.message}`);
                                        }
                                    }}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-4 text-sm font-black uppercase tracking-tighter text-white shadow-lg shadow-red-900/20 transition-all hover:bg-red-500 active:scale-[0.98]"
                                >
                                    <RotateCcw size={18} />
                                    Reset Value
                                </button>
                            )}

                            <button
                                onClick={handleSave}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-sm font-black uppercase tracking-tighter text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-500 active:scale-[0.98]"
                            >
                                <Save size={18} />
                                Accept & Exit
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-slate-900/30 p-5">
                        <div className="mb-2 flex items-center justify-center gap-4 border-b border-white/5 pb-4">
                            <button
                                onClick={() => handleChange('hornEnabled', !config.hornEnabled)}
                                className={`flex h-14 w-14 flex-col items-center justify-center rounded-full border-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] transition-all active:scale-90 ${
                                    config.hornEnabled ? 'border-green-300 bg-[#15803d]' : 'border-red-300 bg-red-700'
                                }`}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                    <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" />
                                </svg>
                                <span className="text-[9px] font-bold text-white">{config.hornEnabled ? 'On' : 'Off'}</span>
                            </button>
                            <span className="text-sm font-bold text-gray-300">Horn Enable / Disable</span>
                        </div>

                        <div className="flex flex-col gap-3">
                            {[
                                ...(!['rap'].includes(paramKey) ? [
                                    { field: 'highHigh', label: 'High High Alarm', color: 'bg-red-600' },
                                    { field: 'high', label: 'High Alarm', color: 'bg-yellow-400' }
                                ] : []),
                                ...(!['LELGasSS', 'LELGasBN', 'H2SGasSS', 'H2SGasBN', 'WOB'].includes(paramKey) ? [
                                    { field: 'low', label: 'Low Alarm', color: 'bg-yellow-400', spacer: true },
                                    { field: 'lowLow', label: 'Low Low Alarm', color: 'bg-red-600' }
                                ] : [])
                            ].map(({ field, label: alarmLabel, color, spacer }) => (
                                <div key={field} className={`relative flex items-end gap-2 ${spacer ? 'mt-3' : ''}`}>
                                    <div className="flex-1">
                                        <div className={fieldLabelClass}>{alarmLabel}</div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className={`${inputClass} cursor-pointer select-none`}
                                                value={config[field]}
                                                readOnly
                                                onClick={() => openKeypad(field, alarmLabel)}
                                                onFocus={(e) => e.target.blur()}
                                            />
                                            <span className={unitLabelClass}>{unit}</span>
                                        </div>
                                    </div>
                                    <div className={`mb-1 h-10 w-10 rounded-lg border border-white/10 ${color} shadow-[inset_0_0_5px_rgba(0,0,0,0.3)]`} />
                                </div>
                            ))}
                        </div>

                        <div className="mt-4">
                            <button
                                onClick={onClose}
                                className="w-full rounded-xl bg-white/5 py-4 text-sm font-bold uppercase tracking-tighter text-gray-400 transition-all hover:bg-white/10"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Numeric Touchscreen Keypad Modal */}
            {keypadTarget && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-nov-border bg-nov-card p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-150">
                        {/* Title showing which parameter & limit is being changed */}
                        <div className="text-center mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
                            <h3 className="text-xl font-black uppercase tracking-tight text-white mt-0.5">{keypadTarget.label}</h3>
                        </div>

                        {/* Numeric Screen Display */}
                        <div className="relative mb-5 flex h-20 items-center justify-between rounded-xl border border-white/5 bg-slate-950/80 px-5 text-right shadow-inner">
                            <span className="text-xs font-black uppercase text-slate-500 select-none">{unit}</span>
                            <div className="flex items-center gap-1 font-mono text-3xl font-black tracking-widest text-emerald-400">
                                <span>{keypadValue}</span>
                                <span className="h-6 w-1 rounded-full bg-emerald-400 animate-pulse" />
                            </div>
                        </div>

                        {/* Keypad Grid & Side Panel */}
                        <div className="flex gap-4">
                            {/* Numbers */}
                            <div className="grid grid-cols-3 gap-3 flex-1">
                                {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '-', '.'].map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => handleKeypadInput(key)}
                                        className="h-16 rounded-xl border border-white/5 bg-slate-900/60 font-mono text-2xl font-black text-white shadow-md transition-all active:scale-[0.93] active:bg-slate-800 hover:bg-slate-800/80"
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>

                            {/* Actions Right Column */}
                            <div className="flex w-28 flex-col gap-3">
                                <button
                                    onClick={() => handleKeypadInput('BACKSPACE')}
                                    className="flex-1 rounded-xl border border-amber-500/10 bg-amber-600/20 font-black text-amber-400 text-sm tracking-wider uppercase transition-all active:scale-[0.93] active:bg-amber-600/30 hover:bg-amber-600/15"
                                >
                                    &lt;--
                                </button>
                                <button
                                    onClick={() => handleKeypadInput('CLEAR')}
                                    className="flex-1 rounded-xl border border-red-500/10 bg-red-600/20 font-black text-red-400 text-sm tracking-wider uppercase transition-all active:scale-[0.93] active:bg-red-600/30 hover:bg-red-600/15"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={() => setKeypadTarget(null)}
                                    className="flex-1 rounded-xl border border-white/5 bg-slate-800/40 font-bold text-slate-400 text-sm tracking-wider uppercase transition-all active:scale-[0.93] active:bg-slate-800/60 hover:bg-slate-800/20"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleKeypadAccept}
                                    className="flex-[1.5] rounded-xl border border-emerald-500/10 bg-emerald-600 font-black text-white text-base tracking-wider uppercase transition-all active:scale-[0.93] active:bg-emerald-500 shadow-lg shadow-emerald-950/30 hover:bg-emerald-500"
                                >
                                    Accept
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export function getParamConfig(paramKey) {
    try {
        const raw = localStorage.getItem(`alarm_config_${paramKey}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function getAlarmColorClass(value, paramKey, defaultColor = 'text-white') {
    if (localStorage.getItem('global_alarms_enabled') === 'false') return defaultColor;

    const cfg = getParamConfig(paramKey);
    if (!cfg) return defaultColor;
    if (value >= cfg.highHigh && !['rap'].includes(paramKey)) return 'text-red-500';
    if (value >= cfg.high && !['rap'].includes(paramKey)) return 'text-yellow-400';
    if (['LELGasSS', 'LELGasBN', 'H2SGasSS', 'H2SGasBN', 'WOB'].includes(paramKey)) return defaultColor;
    if (value !== 0 && value <= cfg.lowLow) return 'text-red-500';
    if (value !== 0 && value <= cfg.low) return 'text-yellow-400';
    return defaultColor;
}

export default ParameterSettingsModal;
