import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend, LabelList } from 'recharts';
import { Flame, AlertTriangle, Zap, Target, X, RefreshCw, ChevronRight, Activity, Settings, ArrowDownCircle, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRigData, writeModbusCoil, writeModbusFloat, getPreference, setPreference } from '../api';
import RadialGauge from '../components/RadialGauge';
import { ResponsiveGridLayout } from 'react-grid-layout';
import SinglePointModal from '../components/SinglePointModal';
import ParameterSettingsModal, { getAlarmColorClass } from '../components/ParameterSettingsModal';
import NumericKeypad from '../components/NumericKeypad';
import { canAccessCalibration, getStoredRole, isViewer } from '../auth';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Reusable Card component with a dark layout props via forwardRef
const Card = React.forwardRef(({ title, children, className = '', contentClassName = '', style, customHeader, dragEnabled = false, ...props }, ref) => (
    <div ref={ref} style={style} className={`bg-nov-card border border-nov-border rounded-xl shadow-xl flex flex-col overflow-hidden ${className}`} {...props}>
        {title && (
            <div className={`bg-white/5 p-2 border-b border-nov-border flex items-center justify-between transition-colors relative group`}>
                <span className="text-sm text-gray-400 font-bold uppercase tracking-wider w-full text-center">{title}</span>
            </div>
        )}
        <div className={`p-4 flex-1 flex flex-col min-h-0 relative ${contentClassName}`}>
            {children}
        </div>
    </div>
));

// KPI Card for the left column, supports grid layout props
const KPICard = React.forwardRef(({ title, value, subtitle, valueColor = 'text-white', className = '', style, ...props }, ref) => (
    <div ref={ref} style={style} className={`bg-[#1a1c23] border border-white/5 rounded-xl flex flex-col items-center justify-center shadow-lg transition-colors ${className}`} {...props}>
        <span className="text-sm text-gray-400 font-bold mb-2 text-center uppercase">{title}</span>
        <span className={`text-4xl font-bold font-sans tabular-nums ${valueColor}`}>{value}</span>
        {subtitle && <span className="text-xs text-gray-500 mt-1">{subtitle}</span>}
    </div>
));

// Animated progress bar with high-fidelity glow effect
const ProgressBar = ({ title, value, max, displayValue, gradient, glowColor = 'rgba(6,182,212,0.3)' }) => {
    const percent = Math.min(100, Math.max(0, (value / max) * 100));
    const isActive = value > 0;
    return (
        <div className="w-full mb-1 group">
            <div className="flex justify-between items-baseline mb-1 px-1">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">{title}</span>
                <span className={`text-xl font-sans tabular-nums font-black text-white ${isActive ? 'text-glow-green' : ''} drop-shadow-lg`}>{displayValue}</span>
            </div>
            <div className="h-2.5 w-full bg-slate-900/90 rounded-full overflow-hidden relative border border-white/5">
                <div 
                    className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-1000 ease-in-out relative`}
                    style={{ 
                        width: `${percent}%`,
                        boxShadow: isActive ? `0 0 15px ${glowColor}, 0 0 5px ${glowColor}` : 'none'
                    }}
                >
                    {isActive && (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-pulse rounded-full" />
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/60 blur-[2px]" />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

function useActualContainerDimensions() {
    const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });
    const ref = useRef(null);
    useEffect(() => {
        if (!ref.current) return;
        const observer = new ResizeObserver((entries) => {
            if (entries && entries.length > 0) {
                setDimensions({
                    width: entries[0].contentRect.width - 10,
                    height: entries[0].contentRect.height
                });
            }
        });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);
    return { ref, ...dimensions };
}

const TWIN_LAYOUT_STORAGE_KEY = 'drillingTwinLayout_v10';

function mergeWidgetsWithSavedLayout(defaultWidgets, savedLayout) {
    if (!Array.isArray(savedLayout) || savedLayout.length === 0) {
        return defaultWidgets;
    }

    const savedById = new Map(savedLayout.map((item) => [item.i || item.id, item]));

    return defaultWidgets.map((widget) => {
        const savedWidget = savedById.get(widget.i);
        if (!savedWidget) {
            return widget;
        }

        return {
            ...widget,
            x: typeof savedWidget.x === 'number' ? savedWidget.x : widget.x,
            y: typeof savedWidget.y === 'number' ? savedWidget.y : widget.y,
            w: typeof savedWidget.w === 'number' ? savedWidget.w : widget.w,
            h: typeof savedWidget.h === 'number' ? savedWidget.h : widget.h,
        };
    });
}



export default function DrillingTwin() {
    const navigate = useNavigate();
    const [realData, setRealData] = useState({});
    const [history, setHistory] = useState([]);
    const [isSinglePointModalOpen, setIsSinglePointModalOpen] = useState(false);
    const [isTwinstopModalOpen, setIsTwinstopModalOpen] = useState(false);
    const [bgTheme, setBgTheme] = useState(() => {
        return localStorage.getItem('drillbit_twin_bg_theme') || '#0b0c10';
    });

    useEffect(() => {
        const handleThemeChange = () => {
            setBgTheme(localStorage.getItem('drillbit_twin_bg_theme') || '#0b0c10');
        };
        window.addEventListener('bg_theme_changed', handleThemeChange);
        return () => window.removeEventListener('bg_theme_changed', handleThemeChange);
    }, []);

    const isDemoMode = false;
    const data = realData;

    // Twinstop and Air Pressure Safety Alarms
    const livePopups = [];
    const bhVal = data.BlockPosition || data.BLOCK_POS || data.BLOCK_HEIGHT || 0;
    const crownLimitVal = data.Crownomatic || 0;
    const floorLimitVal = data.Flooromatic || 0;
    const offsetVal = data.AlarmOffset || 0;
    const airPressureVal = data.rap || 0;
    const airPressureSetPointVal = data.AirPressureSetPoint || 0;

    // 1. Crownomatic Setpoint => BH (Crown saver ON)
    if (crownLimitVal > 0 && bhVal >= crownLimitVal) {
        livePopups.push({
            id: 'crown_on',
            type: 'critical',
            title: 'Crown saver ON',
            message: `Block Height (${bhVal.toFixed(2)}m) has reached or exceeded the Crownomatic setpoint (${crownLimitVal.toFixed(2)}m)!`
        });
    }
    // 2. Alarm Offset => BH (CROWN SAVER alert)
    else if (crownLimitVal > 0 && offsetVal > 0 && bhVal >= (crownLimitVal - offsetVal)) {
        livePopups.push({
            id: 'crown_alert',
            type: 'warning',
            title: 'CROWN SAVER alert',
            message: `Block Height (${bhVal.toFixed(2)}m) has reached the warning zone (${(crownLimitVal - offsetVal).toFixed(2)}m)!`
        });
    }

    // 3. Flooromatic Setpoint =< BH (Floor saver ON)
    if (floorLimitVal > 0 && bhVal <= floorLimitVal) {
        livePopups.push({
            id: 'floor_on',
            type: 'critical',
            title: 'Floor saver ON',
            message: `Block Height (${bhVal.toFixed(2)}m) has reached or fallen below the Flooromatic setpoint (${floorLimitVal.toFixed(2)}m)!`
        });
    }
    // 4. Alarm Offset =< BH (Floor saver alert)
    else if (floorLimitVal > 0 && offsetVal > 0 && bhVal <= (floorLimitVal + offsetVal)) {
        livePopups.push({
            id: 'floor_alert',
            type: 'warning',
            title: 'Floor saver alert',
            message: `Block Height (${bhVal.toFixed(2)}m) has reached the warning zone (${(floorLimitVal + offsetVal).toFixed(2)}m)!`
        });
    }

    // 5. Air Pressure Setpoint =< Air Pressure (Rig air pressure low)
    if (airPressureSetPointVal > 0 && airPressureVal > 0 && airPressureVal <= airPressureSetPointVal) {
        livePopups.push({
            id: 'air_low',
            type: 'critical',
            title: 'Rig air pressure low',
            message: `Air Pressure (${airPressureVal.toFixed(1)} psi) is below or equal to setpoint (${airPressureSetPointVal.toFixed(1)} psi)!`
        });
    }

    const activePopupsToShow = livePopups;
    // Universal alarm config popup — set to { paramKey, label, unit, defaultMax } to open
    const [activeConfigParam, setActiveConfigParam] = useState(null);
    const role = getStoredRole();
    const calibrationEnabled = canAccessCalibration(role);
    const canConfigure = !isViewer(role); // viewer: read-only, cannot set alarm thresholds
    const canEditLayout = role === 'admin';
    const { ref: containerRef, width: containerWidth, height: containerHeight } = useActualContainerDimensions();
    const calculatedRowHeight = useMemo(() => {
        if (role === 'admin') return 78;
        const rows = 8;
        const totalMarginGaps = 7 * 4;
        const calculated = (containerHeight - totalMarginGaps) / rows;
        return Math.max(50, Math.floor(calculated));
    }, [containerHeight, role]);
    
    // Initial default widget configuration - perfectly matching the requested layout proportions
    const defaultWidgets = [
        { id: 'twinstop', i: 'twinstop', type: 'Graphic', title: 'TWINSTOP', x: 0, y: 0, w: 2, h: 4, minW: 2, minH: 3 },
        { id: 'mudPump', i: 'mudPump', type: 'PumpPanel', title: 'MUD PUMP', x: 2, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
        { id: 'hookload', i: 'hookload', type: 'Gauge', title: 'HOOKLOAD', x: 8, y: 0, w: 4, h: 4, minW: 2, minH: 3, dataKey: 'HookLoad', subKey: 'WOV' },
        
        { id: 'bop', i: 'bop', type: 'BOPStatus', title: 'BOP STATUS', x: 0, y: 4, w: 3, h: 2, minW: 2, minH: 2,
          params: [
              { label: 'ANNULAR', key: 'AnnularPressure', color: 'purple', unit: 'psi' },
              { label: 'ACCUM', key: 'AccumPressure', color: 'sky', unit: 'psi' },
              { label: 'MANIFOLD', key: 'ManifoldPressure', color: 'violet', unit: 'psi' }
          ]
        },
        { id: 'mudVol', i: 'mudVol', type: 'MudVolume', title: 'MUD VOLUME', x: 3, y: 4, w: 5, h: 4, minW: 2, minH: 2,
          keys: ['PitVolume1', 'PitVolume2', 'PitVolume3', 'TripTank1']
        },
        { id: 'keyParams', i: 'keyParams', type: 'StatusGrid', title: 'KEY PARAMETERS', x: 8, y: 4, w: 4, h: 2, minW: 2, minH: 2, 
          params: [
              { label: 'ROT.RPM', key: 'RPM', color: 'cyan', icon: 'Activity', unit: '' },
              { label: 'ROT.TORQUE', key: 'Torque', color: 'amber', icon: 'Settings', unit: 'A' },
              { label: 'Air Pressure', key: 'rap', color: 'cyan', icon: 'Zap', unit: 'psi' },
              { label: 'TLP TORQUE', key: 'Pipe Torque', color: 'amber', icon: 'Settings', unit: 'kNm' },
              { label: 'BLOCK HEIGHT', key: 'BlockPosition', fallbackKey: 'BLOCK_HEIGHT', color: 'cyan', unit: 'm', defaultMax: 50 },
              { label: 'ROP', key: 'ROP', color: 'emerald', unit: 'm/hr', defaultMax: 100 }
          ]
        },

        { id: 'powerPack', i: 'powerPack', type: 'PowerGrid', title: 'POWER PACK', x: 0, y: 6, w: 3, h: 2, minW: 2, minH: 2 },
        { id: 'gas', i: 'gas', type: 'StatusGrid', title: 'GAS MONITORING', x: 8, y: 6, w: 4, h: 2, minW: 2, minH: 2,
          params: [
              { label: 'LEL SS', key: 'LELGasSS', color: 'cyan', icon: 'Flame', unit: '%' },
              { label: 'LEL BN', key: 'LELGasBN', color: 'amber', icon: 'Flame', unit: '%' },
              { label: 'H2S SS', key: 'H2SGasSS', color: 'cyan', icon: 'AlertTriangle', unit: 'ppm' },
              { label: 'H2S BN', key: 'H2SGasBN', color: 'amber', icon: 'AlertTriangle', unit: 'ppm' }
          ]
        }
    ];

    console.log("🚀 MISSION CONTROL UI v22 ACTIVE");
    
    const [widgets, setWidgets] = useState(defaultWidgets);

    const isLayoutLoadedRef = useRef(false);

    useEffect(() => {
        // Clean up old localStorage layout data from all devices
        localStorage.removeItem(TWIN_LAYOUT_STORAGE_KEY);

        const loadLayout = async () => {
            try {
                const saved = await getPreference(TWIN_LAYOUT_STORAGE_KEY);
                if (saved && Array.isArray(saved)) {
                    setWidgets(mergeWidgetsWithSavedLayout(defaultWidgets, saved));
                }
            } catch (e) {
                console.error("Failed to fetch layout from server", e);
            } finally {
                isLayoutLoadedRef.current = true;
            }
        };
        loadLayout();
    }, []);

    // Listen to real-time layout changes broadcasted by other admin actions via WebSocket
    useEffect(() => {
        let ws;
        let reconnectTimeout;
        let isDestroyed = false;

        const connect = () => {
            if (isDestroyed) return;
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const token = localStorage.getItem('token');
            if (!token) return;

            ws = new WebSocket(`${protocol}//${host}/ws/realtime?token=${token}`);

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message._type === 'preference_updated' && message.key === TWIN_LAYOUT_STORAGE_KEY) {
                        console.log("🔄 Real-time Layout Update Received:", message.value);
                        setWidgets(mergeWidgetsWithSavedLayout(defaultWidgets, message.value));
                    }
                } catch (err) {
                    // Ignore parse errors
                }
            };

            ws.onclose = () => {
                if (!isDestroyed) {
                    reconnectTimeout = setTimeout(connect, 3000);
                }
            };

            ws.onerror = () => {
                if (ws) ws.close();
            };
        };

        connect();

        return () => {
            isDestroyed = true;
            if (ws) ws.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, []);

    const gridLayoutItems = widgets.map(widget => ({
        ...widget,
        static: !canEditLayout,
        isDraggable: canEditLayout,
        isResizable: canEditLayout,
        resizeHandles: canEditLayout ? ['s', 'e', 'se'] : [],
    }));

    const onLayoutChange = (currentLayout, allLayouts) => {
        setWidgets(prev => {
            const targetLayout = allLayouts.lg || currentLayout;
            const nextWidgets = prev.map(w => {
                const layoutItem = targetLayout.find(l => l.i === w.i);
                return layoutItem ? { ...w, ...layoutItem } : w;
            });
            // Admin only: if they move a widget, save the layout to the backend
            if (canEditLayout && isLayoutLoadedRef.current) {
                const layoutSnapshot = nextWidgets.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }));
                setPreference(TWIN_LAYOUT_STORAGE_KEY, layoutSnapshot).catch(e => console.error("Failed to sync layout", e));
            }
            return nextWidgets;
        });
    };

    useEffect(() => {
        const fetch = async () => {
            try {
                const rigData = await getRigData();
                if (rigData && !rigData.error) {
                    setRealData(rigData);
                }
            } catch (error) {
                // handle error
            }
        };
        fetch();
        const interval = setInterval(fetch, 1000);
        return () => clearInterval(interval);
    }, []);


    const checkCalibrationEnabled = () => {
        if (!calibrationEnabled) {
            alert('Viewer access is read-only. Sign in as operator or admin to use calibration controls.');
            return false;
        }
        return true;
    };

    // Mud Volumes mapped to telemetry keys
    const mudVolumes = [
        { name: 'Tank 1', value: data.PitVolume1 || data.TANK1_VOL || 0, fill: '#60A5FA' },
        { name: 'Tank 2', value: data.PitVolume2 || data.TANK2_VOL || 0, fill: '#34D399' },
        { name: 'Tank 3', value: data.PitVolume3 || data.TANK3_VOL || 0, fill: '#FBBF24' },
        { name: 'Trip Tank', value: data.TripTank1 || data.TT1_VOL || 0, fill: '#F87171' }
    ];

    // Pump Data mapped to telemetry keys
    const spm1 = data.SPM1 || data.MP1_SPM || 0;
    const spm2 = data.SPM2 || data.MP2_SPM || 0;
    const totalSpm = data.TotalSPM || data.TOT_SPM || (spm1 + spm2);
    const pumpPressure = data.StandpipePressure || data['Standpipe Pressure'] || 0;
    const pump1Status = spm1 > 0 ? "ON" : "OFF";
    const pump2Status = spm2 > 0 ? "ON" : "OFF";

    // Power Pack Engines Status
    const powerPacks = [1, 2, 3, 4].map(id => {
        const rawRpm = data[`PP${id}_RPM`] || (data.RPM ? data.RPM * (0.95 + (id * 0.01)) : 0);
        const rpm = rawRpm > 10 ? Math.floor(rawRpm) : 0;
        return {
            id,
            name: `Eng ${id}`,
            rpm,
            isOn: rpm > 500,
        };
    });

    const activeEngines = powerPacks.filter(p => p.isOn).length;

    // ── Live Alarm Scanner ───────────────────────────────────────────────────────
    // Scans all stored alarm configs and checks current data values.
    // Returns an array of active alarm events with severity.
    const [alarmsAck, setAlarmsAck] = useState(false);

    // Global Alarm State Listener
    const [globalAlarmsEnabled, setGlobalAlarmsEnabled] = useState(() => {
        return localStorage.getItem('global_alarms_enabled') !== 'false';
    });

    useEffect(() => {
        const handleToggle = () => {
            setGlobalAlarmsEnabled(localStorage.getItem('global_alarms_enabled') !== 'false');
        };
        window.addEventListener('global_alarms_toggled', handleToggle);
        return () => window.removeEventListener('global_alarms_toggled', handleToggle);
    }, []);

    // hasData: true only when the backend actually sent a numeric value (not a fallback 0)
    const allMonitoredParams = [
        // Hook Load / WOB
        { paramKey: 'WOH',        label: 'HOOK LOAD',         value: data.WOH  || data.HookLoad || 0, hasData: data.WOH != null || data.HookLoad != null },
        { paramKey: 'WOB',        label: 'WEIGHT ON BIT',     value: data.WOB  || 0,                  hasData: data.WOB != null },
        // Mud Pump
        { paramKey: 'MP1_SPM',    label: 'PUMP 1 SPM',        value: data.SPM1 || data.MP1_SPM || 0,  hasData: data.SPM1 != null || data.MP1_SPM != null },
        { paramKey: 'MP2_SPM',    label: 'PUMP 2 SPM',        value: data.SPM2 || data.MP2_SPM || 0,  hasData: data.SPM2 != null || data.MP2_SPM != null },
        { paramKey: 'STP_PRS',    label: 'STANDPIPE PRESSURE',value: data.StandpipePressure || 0,      hasData: data.StandpipePressure != null },
        // Rotary
        { paramKey: 'RPM',        label: 'ROTARY RPM',        value: data.RPM  || 0,                  hasData: data.RPM != null },
        { paramKey: 'Torque',     label: 'TORQUE',            value: data.Torque || 0,                hasData: data.Torque != null },
        { paramKey: 'rap',        label: 'Air Pressure',      value: data.rap  || 0,                  hasData: data.rap != null },
        // Gas
        { paramKey: 'LELGasSS',   label: 'LEL (SS)',          value: data.LELGasSS || 0,              hasData: data.LELGasSS != null },
        { paramKey: 'LELGasBN',   label: 'LEL (BN)',          value: data.LELGasBN || 0,              hasData: data.LELGasBN != null },
        { paramKey: 'H2SGasSS',   label: 'H2S (SS)',          value: data.H2SGasSS || 0,              hasData: data.H2SGasSS != null },
        { paramKey: 'H2SGasBN',   label: 'H2S (BN)',          value: data.H2SGasBN || 0,              hasData: data.H2SGasBN != null },
        // Mud Volume
        { paramKey: 'PitVolume1', label: 'TANK 1',            value: data.PitVolume1 || 0,            hasData: data.PitVolume1 != null },
        { paramKey: 'PitVolume2', label: 'TANK 2',            value: data.PitVolume2 || 0,            hasData: data.PitVolume2 != null },
        { paramKey: 'PitVolume3', label: 'TANK 3',            value: data.PitVolume3 || 0,            hasData: data.PitVolume3 != null },
        { paramKey: 'TripTank1',  label: 'TRIP TANK',         value: data.TripTank1  || 0,            hasData: data.TripTank1 != null },
        { paramKey: 'FlowRate',   label: 'FLOW RATE',         value: data.FlowRate   || 0,            hasData: data.FlowRate != null },
        { paramKey: 'GainLoss',   label: 'GAIN/LOSS',         value: data.GainLoss   || 0,            hasData: data.GainLoss != null },
    ];

    const activeAlarms = allMonitoredParams.reduce((acc, { paramKey, label, value, hasData }) => {
        if (!globalAlarmsEnabled) return acc;
        // Skip all alarm checks when no real data has arrived from the source.
        // This prevents false Low/LowLow alarms caused by the fallback 0 value
        // when no sensor/modbus input is connected.
        if (!hasData) return acc;

        const cfg = (() => { 
            try { 
                const stored = localStorage.getItem(`alarm_config_${paramKey}`);
                if (stored) return JSON.parse(stored);
                return null; 
            } catch { 
                return null; 
            } 
        })();
        if (!cfg) return acc;
        let severity = null;
        if (value >= cfg.highHigh && !['rap'].includes(paramKey))    severity = 'HH';
        else if (value >= cfg.high && !['rap'].includes(paramKey))   severity = 'H';
        // LOW-side alarms: skip when value is exactly 0 — this means the sensor
        // is offline / no signal received. A genuine 0 reading is indistinguishable
        // from "no data" at this layer, so we suppress to avoid false alarms.
        // Also bypass low alarms for gas, WOH, HookLoad, and WOB monitoring parameters.
        else if (value !== 0 && value <= cfg.lowLow && !['LELGasSS', 'LELGasBN', 'H2SGasSS', 'H2SGasBN', 'WOB'].includes(paramKey)) severity = 'LL';
        else if (value !== 0 && value <= cfg.low && !['LELGasSS', 'LELGasBN', 'H2SGasSS', 'H2SGasBN', 'WOB'].includes(paramKey))    severity = 'L';
        if (severity) acc.push({ paramKey, label, value, severity });
        return acc;
    }, []);


    // Reset ack when all alarms clear
    useEffect(() => {
        if (activeAlarms.length === 0) setAlarmsAck(false);
    }, [activeAlarms.length]);

    // ── Alarm Audio Engine (Web Audio API — no external files needed) ──────────
    const alarmAudioRef = useRef(null);   // holds the repeating interval ID

    const playAlarmTone = (isCritical) => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const beep = (startTime, freq, duration) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0.18, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            const now = ctx.currentTime;
            if (isCritical) {
                // Two short urgent beeps — HH / LL
                beep(now,        1200, 0.12);
                beep(now + 0.18, 1200, 0.12);
            } else {
                // Single soft beep — H / L
                beep(now, 800, 0.18);
            }
        } catch (e) {
            // AudioContext blocked or unavailable — silently skip
        }
    };

    useEffect(() => {
        // Clear any previous alarm interval
        if (alarmAudioRef.current) {
            clearInterval(alarmAudioRef.current);
            alarmAudioRef.current = null;
        }

        if (activeAlarms.length === 0 || alarmsAck) return;

        const hasCritical = activeAlarms.some(a => a.severity === 'HH' || a.severity === 'LL');

        // Play immediately then repeat
        playAlarmTone(hasCritical);
        alarmAudioRef.current = setInterval(() => playAlarmTone(hasCritical), hasCritical ? 1500 : 4000);

        return () => {
            if (alarmAudioRef.current) clearInterval(alarmAudioRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeAlarms.length, alarmsAck]);

    // ── Physical Hardware Hooter Synchronization ──────────────────────────
    const physicalHooterStateRef = useRef(false);

    useEffect(() => {
        const isAlarmActive = activeAlarms.length > 0 && !alarmsAck;
        
        // Only send update if the state has changed locally
        if (isAlarmActive !== physicalHooterStateRef.current) {
            const syncHooter = async () => {
                try {
                    const response = await fetch('/api/modbus/twinstop/hooter-sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ active: isAlarmActive })
                    });
                    const result = await response.json();
                    if (result.status === 'ok') {
                        physicalHooterStateRef.current = isAlarmActive;
                    }
                } catch (error) {
                    console.error('Failed to sync physical hooter:', error);
                }
            };
            syncHooter();
        }
    }, [activeAlarms.length, alarmsAck]);

    // Helper to render widget content based on type
    const renderWidgetContent = (w) => {
        switch(w.type) {
            case 'Gauge':
                const isHookload = w.id === 'hookload';
                const wohCfg = JSON.parse(localStorage.getItem('alarm_config_WOH') || localStorage.getItem('hookload_config') || '{}');
                const maxScale = isHookload ? (wohCfg.scaleMax || 200) : (w.max || 100);
                const wohAlarm = isHookload ? activeAlarms.find(a => a.paramKey === 'WOH' && (a.severity === 'HH' || a.severity === 'H')) : null;

                return (
                    <div className="w-full h-full flex flex-col items-center justify-start relative pt-2">
                        {/* Demo Mode Button Removed */}
                        {wohAlarm && (
                            <div className="absolute top-1.5 inset-x-0 z-30 flex flex-col items-center pointer-events-none px-2">
                                <div className={`${wohAlarm.severity === 'HH' ? 'bg-red-600 border border-red-500 text-white' : 'bg-amber-500 border border-amber-400 text-black'} font-black text-[8px] px-2.5 py-0.5 rounded shadow tracking-wider animate-pulse flex items-center gap-1`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${wohAlarm.severity === 'HH' ? 'bg-white' : 'bg-black'} animate-ping`} />
                                    HOOK LOAD {wohAlarm.severity === 'HH' ? 'HIGH HIGH ALARM' : 'HIGH ALARM'}
                                </div>
                            </div>
                        )}
                        <RadialGauge 
                            value={isHookload ? (data['HookLoad'] || data['WOH'] || 0) : (data[w.dataKey] || 0)} 
                            min={0} max={maxScale} 
                            majorStep={isHookload ? (maxScale / 10) : 10}
                            minorStep={isHookload ? (maxScale / 50) : 2}
                            label={isHookload ? 'WOH' : w.title} 
                            unit={isHookload ? 'ton' : (w.unit || '')} 
                            size="lg"
                            subValue={isHookload ? (data['WOB'] || 0) : (w.subKey ? data[w.subKey] : null)}
                            subLabel={isHookload ? 'WOB' : w.subLabel}
                            subUnit={isHookload ? 'ton' : undefined}
                            onLabelClick={isHookload && canConfigure ? () => setActiveConfigParam({ paramKey:'WOH', label:'HOOK LOAD', unit:'ton', defaultMax:200 }) : undefined}
                            onSubLabelClick={isHookload && canConfigure ? () => setActiveConfigParam({ paramKey:'WOB', label:'WEIGHT ON BIT', unit:'ton', defaultMax:100 }) : undefined}
                        />
                    </div>
                );
            case 'MudVolume':
                const mudVolumes = [
                    { key: 'PitVolume1', name: 'Tank 1', value: data.PitVolume1 || 0, unit: 'm³', fill: '#38bdf8', defaultMax: 62 },
                    { key: 'PitVolume2', name: 'Tank 2', value: data.PitVolume2 || 0, unit: 'm³', fill: '#4ade80', defaultMax: 62 },
                    { key: 'PitVolume3', name: 'Tank 3', value: data.PitVolume3 || 0, unit: 'm³', fill: '#fbbf24', defaultMax: 62 },
                    { key: 'TripTank1',  name: 'Trip Tank', value: data.TripTank1 || 0, unit: 'm³', fill: '#f87171', defaultMax: 20 }
                ];
                return (
                    <div className="flex flex-col h-full gap-1 p-1">
                        <div className="flex-1 w-full flex items-end justify-around px-2 mb-1 pt-1 relative overflow-hidden">
                            {mudVolumes.map((tank, i) => {
                                const tankCfg = JSON.parse(localStorage.getItem(`alarm_config_${tank.key}`) || '{}');
                                const tankMax = tankCfg.scaleMax || tank.defaultMax;
                                return (
                                <div key={i}
                                     className={`flex flex-col items-center gap-1.5 h-full justify-end w-1/4 z-10 group ${canConfigure ? 'cursor-pointer' : 'cursor-default'}`}
                                     onClick={canConfigure ? () => setActiveConfigParam({ paramKey: tank.key, label: tank.name, unit: tank.unit, defaultMax: tank.defaultMax }) : undefined}>
                                    <div className="w-full flex justify-center items-end" style={{ height: '85%' }}>
                                        <div 
                                            className="w-10 sm:w-12 rounded-t-xl transition-all duration-1000 relative group-hover:scale-110 shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden" 
                                            style={{ 
                                                height: `${Math.max(5, Math.min(100, (tank.value / tankMax) * 100))}%`, 
                                                background: `linear-gradient(to top, ${tank.fill}, ${tank.fill}cc)`,
                                                border: `1px solid ${tank.fill}44`,
                                                boxShadow: `0 0 30px ${tank.fill}22, inset 0 0 10px white/10`
                                            }}
                                        >
                                            <div className="absolute inset-y-0 left-0.5 w-1.5 bg-white/20 blur-[1px] rounded-full" />
                                            <div className="absolute top-0 inset-x-0 h-1 bg-white/40 blur-[0.5px]" />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className={`flex items-baseline justify-center gap-0.5 ${getAlarmColorClass(tank.value, tank.key)}`} style={{ color: getAlarmColorClass(tank.value, tank.key) === 'text-white' ? tank.fill : undefined }}>
                                            <span className="text-xl font-black font-sans tabular-nums leading-none">{(tank.value || 0).toFixed(1)}</span>
                                            <span className="text-[8px] font-bold opacity-60 uppercase">{tank.unit}</span>
                                        </div>
                                        <span className="block text-[9px] text-gray-500 font-black tracking-widest uppercase mt-0.5">{tank.name}</span>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                        <div className="flex w-full pt-2 pb-1.5 border-t border-white/5 bg-black/20 rounded-xl overflow-x-auto custom-scrollbar">
                             {[
                                 { key: 'TotalVolume',    label: 'TOTAL VOL.', val: data.TotalVolume     || 0, unit: 'm³', color: 'text-blue-400',     defaultMax: 800 },
                                 { key: 'FlowRate',       label: 'FLOW IN',   val: data.FlowRate        || 0, unit: 'gpm', color: 'text-sky-400',     defaultMax: 1200 },
                                 { key: 'FlowOutPercent', label: 'FLOW OUT',  val: data.FlowOutPercent  || 0, unit: '%',   color: 'text-emerald-400', defaultMax: 100 },
                                 { key: 'GainLoss',       label: 'GAIN/LOSS', val: data.GainLoss        || 0, unit: 'bbl', color: 'text-amber-400',   defaultMax: 50 }
                             ].map((s, i) => (
                                 <div key={i}
                                      className={`flex flex-col items-center flex-1 rounded-lg transition-colors ${i === 1 ? 'border-x border-white/5' : ''} ${canConfigure ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}`}
                                      onClick={canConfigure ? () => setActiveConfigParam({ paramKey: s.key, label: s.label, unit: s.unit, defaultMax: s.defaultMax }) : undefined}>
                                     <span className="text-[8px] text-gray-500 font-black tracking-widest mb-1 uppercase">{s.label}</span>
                                     <span className={`text-xl font-black font-sans tabular-nums leading-none drop-shadow-lg mb-0.5 ${getAlarmColorClass(s.val, s.key, s.color)}`}>{s.val.toFixed(1)}</span>
                                     <span className="text-[7px] text-gray-600 font-black uppercase tracking-widest">{s.unit}</span>
                                 </div>
                             ))}
                        </div>
                    </div>
                );
            case 'StatusGrid':
                const gridClass = (w.params || []).length > 4 ? 'grid-cols-3 grid-rows-2' : 'grid-cols-2 grid-rows-2';
                const lelAlarms = w.id === 'gas' ? activeAlarms.filter(a => ['LELGasSS', 'LELGasBN'].includes(a.paramKey) && (a.severity === 'HH' || a.severity === 'H')) : [];
                const h2sAlarms = w.id === 'gas' ? activeAlarms.filter(a => ['H2SGasSS', 'H2SGasBN'].includes(a.paramKey) && (a.severity === 'HH' || a.severity === 'H')) : [];

                return (
                    <div className="w-full h-full relative">
                        {/* LEL Alarms - Upper side (between Gas Monitoring title and LEL boxes) */}
                        {lelAlarms.length > 0 && (
                            <div className="absolute top-0.5 inset-x-0 z-30 flex flex-col items-center pointer-events-none gap-0.5 px-2">
                                {lelAlarms.map((alarm, idx) => {
                                    const cleanLabel = alarm.paramKey === 'LELGasSS' ? 'LEL SS' : 'LEL BN';
                                    const isHighHigh = alarm.severity === 'HH';
                                    const alarmText = `${cleanLabel} ${isHighHigh ? 'HIGH HIGH ALARM' : 'HIGH ALARM'}`;
                                    const bgColor = isHighHigh ? 'bg-red-600 border border-red-500 text-white' : 'bg-amber-500 border border-amber-400 text-black';
                                    const dotColor = isHighHigh ? 'bg-white' : 'bg-black';

                                    return (
                                        <div key={idx} className={`${bgColor} font-black text-[8px] px-2.5 py-0.5 rounded shadow tracking-wider animate-pulse flex items-center gap-1`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-ping`} />
                                            {alarmText}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* H2S Alarms - Lower side (below H2S boxes) */}
                        {h2sAlarms.length > 0 && (
                            <div className="absolute bottom-0.5 inset-x-0 z-30 flex flex-col items-center pointer-events-none gap-0.5 px-2">
                                {h2sAlarms.map((alarm, idx) => {
                                    const cleanLabel = alarm.paramKey === 'H2SGasSS' ? 'H2S SS' : 'H2S BN';
                                    const isHighHigh = alarm.severity === 'HH';
                                    const alarmText = `${cleanLabel} ${isHighHigh ? 'HIGH HIGH ALARM' : 'HIGH ALARM'}`;
                                    const bgColor = isHighHigh ? 'bg-red-600 border border-red-500 text-white' : 'bg-amber-500 border border-amber-400 text-black';
                                    const dotColor = isHighHigh ? 'bg-white' : 'bg-black';

                                    return (
                                        <div key={idx} className={`${bgColor} font-black text-[8px] px-2.5 py-0.5 rounded shadow tracking-wider animate-pulse flex items-center gap-1`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-ping`} />
                                            {alarmText}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className={`grid ${gridClass} gap-1 h-full pb-0.5 px-0.5`}>
                            {(w.params || []).map((p, idx) => {
                                let val = typeof data[p.key] === 'number' ? data[p.key] : 0;
                                if (val === 0 && p.fallbackKey && typeof data[p.fallbackKey] === 'number') {
                                    val = data[p.fallbackKey];
                                }
                                const colorClass = p.color === 'emerald' ? 'text-emerald-400' : p.color === 'amber' ? 'text-amber-500' : 'text-cyan-400';
                                const alarmClass = getAlarmColorClass(val, p.key, colorClass);
                                const paramLabel = p.label;
                                const paramUnit  = p.unit;
                                const decimalPlaces = p.key.includes('TORQUE') || p.key.includes('Trq') ? 0 : (p.key === 'BlockPosition' || p.key === 'ROP' ? 2 : 1);
                                
                                return (
                                    <div key={idx}
                                         className={`bg-white/[0.03] border border-white/5 rounded-xl p-1 flex flex-col items-center justify-center relative transition-all group overflow-hidden ${p.key === 'BlockPosition' ? (calibrationEnabled ? 'cursor-pointer hover:bg-white/10' : 'cursor-default') : (canConfigure ? 'cursor-pointer hover:bg-white/10' : 'cursor-default')}`}
                                         onClick={() => {
                                             if (p.key === 'BlockPosition') {
                                                 if (checkCalibrationEnabled()) setIsSinglePointModalOpen(true);
                                             } else if (canConfigure) {
                                                 setActiveConfigParam({ paramKey: p.key, label: paramLabel, unit: paramUnit, defaultMax: p.defaultMax || 500 });
                                             }
                                         }}>
                                        <span className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase tracking-wide mb-0 z-10 w-full text-center leading-tight">{paramLabel}</span>
                                        <div className="flex items-baseline gap-1 z-10">
                                            <span className={`text-xl leading-none font-sans tabular-nums font-black ${alarmClass}`}>
                                                {p.type === 'status'
                                                    ? (val > 0 ? 'ON' : 'OFF')
                                                    : val.toFixed(decimalPlaces)
                                                }
                                            </span>
                                            {(!p.type && paramUnit) && <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">{paramUnit}</span>}
                                        </div>
                                        {/* Hover hint */}
                                        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="#6B7280"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#6B7280" strokeWidth="2" fill="none"/></svg>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'Graphic':
                if (w.id === 'twinstop') {
                    const rawHeight = data.BlockPosition || data.BLOCK_POS || data.BLOCK_HEIGHT || 0;
                    const bh = data.BlockPosition || data.BLOCK_HEIGHT || 0;
                    const hasValidBh = Number.isFinite(bh) && bh > 0;
                    const crownLimit = data.Crownomatic || 0;
                    const floorLimit = data.Flooromatic || 0;
                    const alarmOffset = data.AlarmOffset || 0;
                    const isCrownSaverOn = hasValidBh && crownLimit > 0 && bh >= crownLimit;
                    const isCrownAlarm = !isCrownSaverOn && hasValidBh && crownLimit > 0 && alarmOffset > 0 && bh >= (crownLimit - alarmOffset);
                    const isFloorSaverOn = hasValidBh && floorLimit > 0 && bh <= floorLimit;
                    const isFloorAlarm = !isFloorSaverOn && hasValidBh && floorLimit > 0 && alarmOffset > 0 && bh <= (floorLimit + alarmOffset);
                    const isCrownActive = isCrownSaverOn || isCrownAlarm;
                    const isFloorActive = isFloorSaverOn || isFloorAlarm;
                    const airPressure = data.rap || 0;
                    const airPressureSP = data.AirPressureSetPoint || 0;
                    const isAirPressureLow = airPressureSP > 0 && airPressure > 0 && airPressure <= airPressureSP;
                    const maxLimit = data.Crownomatic || 34;
                    const travelY = 220 - (Math.max(0, Math.min(1, rawHeight / maxLimit)) * 190);
                    const rawSlip = data.SLIPS_STAT ?? 0;
                    const isSlipIn = rawSlip === 0;
                    const isSlipOut = rawSlip === 1;
                    const showStatus = isSlipIn ? 'IN' : isSlipOut ? 'OUT' : 'OFF';
                    const toneClass = isSlipIn
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                        : isSlipOut
                            ? 'border-amber-500/25 bg-amber-500/10 text-amber-400'
                            : 'border-white/10 bg-white/5 text-gray-400';
                    const dotClass = isSlipIn ? 'bg-emerald-400' : isSlipOut ? 'bg-amber-400' : 'bg-gray-500';

                    return (
                        <div 
                            className="w-full h-full flex flex-col transition-colors group cursor-pointer hover:bg-white/5 relative"
                            onClick={() => setIsTwinstopModalOpen(true)}
                        >
                            {/* Demo Mode Button Removed */}



                            <div className="flex-1 min-h-0 flex items-center justify-center pointer-events-none relative overflow-hidden px-1 py-1">
                                {/* Floating Alarm HTML Overlays */}
                                <div className="absolute inset-0 z-30 flex flex-col justify-between items-center pointer-events-none py-10 px-4">
                                    {/* Top Crown Alarms */}
                                    <div className="flex flex-col items-center gap-1.5 w-full">
                                        {isCrownSaverOn && (
                                            <div className="bg-red-600/90 border border-red-500 text-white font-black text-[10px] px-3 py-1.5 rounded-lg shadow-lg tracking-widest animate-pulse flex items-center gap-1.5 backdrop-blur-sm whitespace-nowrap">
                                                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                                CROWN SAVER ON
                                            </div>
                                        )}
                                        {isCrownAlarm && (
                                            <div className="bg-amber-500 border border-amber-400 text-black font-black text-[10px] px-3 py-1.5 rounded-lg shadow-lg tracking-widest animate-pulse flex items-center gap-1.5 backdrop-blur-sm whitespace-nowrap">
                                                <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                                                CROWN ALARM
                                            </div>
                                        )}
                                    </div>

                                    {/* Middle Air Pressure Alarms */}
                                    <div className="flex flex-col items-center gap-1.5 w-full">
                                        {isAirPressureLow && (
                                            <div className="bg-red-600/90 border border-red-500 text-white font-black text-[10px] px-3 py-1.5 rounded-lg shadow-lg tracking-widest animate-pulse flex items-center gap-1.5 backdrop-blur-sm whitespace-nowrap">
                                                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                                AIR PRESSURE LOW
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom Floor Alarms */}
                                    <div className="flex flex-col items-center gap-1.5 w-full">
                                        {isFloorSaverOn && (
                                            <div className="bg-red-600/90 border border-red-500 text-white font-black text-[10px] px-3 py-1.5 rounded-lg shadow-lg tracking-widest animate-pulse flex items-center gap-1.5 backdrop-blur-sm whitespace-nowrap">
                                                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                                FLOOR SAVER ON
                                            </div>
                                        )}
                                        {isFloorAlarm && (
                                            <div className="bg-amber-500 border border-amber-400 text-black font-black text-[10px] px-3 py-1.5 rounded-lg shadow-lg tracking-widest animate-pulse flex items-center gap-1.5 backdrop-blur-sm whitespace-nowrap">
                                                <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                                                FLOOR ALARM
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <svg viewBox="20 10 160 275" className="w-full h-full max-h-full drop-shadow-2xl" preserveAspectRatio="xMidYMid meet">
                                    <defs>
                                        <style>{`
                                            @keyframes alarmBlink {
                                                0%, 100% { opacity: 1; }
                                                50% { opacity: 0.3; }
                                            }
                                            @keyframes hudScanline {
                                                0% { transform: translateY(-100%); }
                                                100% { transform: translateY(100%); }
                                            }
                                            @keyframes hudGlow {
                                                0%, 100% { opacity: 0.4; filter: brightness(1); }
                                                50% { opacity: 0.8; filter: brightness(1.5); }
                                            }
                                            @keyframes textGlitch {
                                                0%, 90% { transform: skew(0deg); opacity: 1; }
                                                92% { transform: skew(10deg); opacity: 0.8; }
                                                94% { transform: skew(-10deg); opacity: 0.9; }
                                                96%, 100% { transform: skew(0deg); opacity: 1; }
                                            }
                                            .alarm-blink { animation: alarmBlink 0.8s ease-in-out infinite; }
                                            .hud-scanline { animation: hudScanline 4s linear infinite; }
                                            .hud-glow { animation: hudGlow 3s ease-in-out infinite; }
                                            .text-glitch { animation: textGlitch 5s ease-in-out infinite; }
                                        `}</style>
                                    </defs>
                                    {/* 1. Derrick Background Fill */}
                                    <polygon points="35,280 165,280 125,25 75,25" fill="#334155" />

                                    {/* Demo Mode Indicator Removed */}
                                    
                                    {/* 2. Top Safety Zones (Crown Saver) */}
                                    {/* Top Red Zone */}
                                    <polygon points="75,25 125,25 119,65 81,65" fill={isCrownActive ? "#dc2626" : "#ef4444"} />
                                    {/* Top Yellow Zone */}
                                    <polygon points="81,65 119,65 113,95 87,95" fill={isCrownAlarm ? "#f59e0b" : "#fbbf24"} />

                                    {/* 3. Bottom Safety Zones (Floor Saver) */}
                                    {/* Bottom Yellow Zone */}
                                    <polygon points="41,240 159,240 155,265 45,265" fill="#fbbf24" />
                                    {/* Bottom Red Zone */}
                                    <polygon points="45,265 155,265 151,280 49,280" fill={isFloorActive ? "#dc2626" : "#ef4444"} />


                                    {/* Crown Block with Dual Pulleys */}
                                    <rect x="70" y="10" width="60" height="15" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                                    <circle cx="85" cy="18" r="4" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                                    <circle cx="115" cy="18" r="4" fill="none" stroke="#94a3b8" strokeWidth="1.5" />

                                    {/* Vertical Rope Lines */}
                                    <line x1="85" y1="20" x2="85" y2="280" stroke="#1e293b" strokeWidth="1.5" />
                                    <line x1="115" y1="20" x2="115" y2="280" stroke="#1e293b" strokeWidth="1.5" />

                                    {/* Main Derrick Frame */}
                                    <line x1="75" y1="25" x2="35" y2="280" stroke="#1e293b" strokeWidth="4" />
                                    <line x1="125" y1="25" x2="165" y2="280" stroke="#1e293b" strokeWidth="4" />
                                    {/* Cross Bars */}
                                    {[80, 130, 180, 230].map((y, i) => {
                                        const t = (y - 25) / (280 - 25);
                                        const lx = 75 - t * (75 - 35);
                                        const rx = 125 + t * (165 - 125);
                                        return <line key={i} x1={lx} y1={y} x2={rx} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />;
                                    })}

                                    {/* Traveling Block (Moving) */}
                                    <g style={{ transform: `translateY(${travelY}px)`, transition: 'transform 0.5s ease-out' }}>
                                        <line x1="85" y1="-10" x2="85" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
                                        <line x1="115" y1="-10" x2="115" y2="10" stroke="#94a3b8" strokeWidth="1.5" />
                                        <rect x="75" y="0" width="50" height="25" rx="6" fill="#f59e0b" stroke="#92400e" strokeWidth="1.5" className="shadow-lg" />
                                        <rect x="80" y="5" width="40" height="15" rx="3" fill="rgba(146, 64, 14, 0.2)" />
                                        
                                        {/* Block Position Display Pill (Attached to block) */}
                                        <g transform="translate(100, 32)">
                                            <rect x="-60" y="0" width="120" height="24" rx="6" fill="#0f172a" fillOpacity="0.85" stroke="#0ea5e9" strokeWidth="2" />
                                            <text x="-52" y="12" textAnchor="start" dominantBaseline="middle" fill="#9ca3af" fontSize="10" fontWeight="bold" letterSpacing="1">
                                                HEIGHT:
                                            </text>
                                            <text x="52" y="12" textAnchor="end" dominantBaseline="middle" fill="#0ea5e9" fontSize="13" fontWeight="900" fontFamily="sans-serif">
                                                {(data.BlockPosition || data.BLOCK_POS || data.BLOCK_HEIGHT || 0).toFixed(2)}m
                                            </text>
                                        </g>
                                    </g>

                                    {/* Drill Floor / Base Line */}
                                    <line x1="25" y1="280" x2="175" y2="280" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div className="px-2 pb-2 w-full shrink-0">
                                <div className={`w-full rounded-xl border flex items-center justify-center gap-2 px-2 py-1 ${toneClass} shadow-inner`}>
                                    <div className={`w-2 h-2 rounded-full ${dotClass} shadow-[0_0_8px_currentColor]`} />
                                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-wider">SLIPS:</span>
                                    <span className="text-xs font-black font-mono tracking-wider">
                                        {showStatus}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                }
                return null;
            case 'StatCard':
                return (
                    <div 
                        className={`h-full flex flex-col items-center justify-center p-2 transition-colors group ${calibrationEnabled ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}`}
                        onClick={() => calibrationEnabled && checkCalibrationEnabled() && setIsSinglePointModalOpen(true)}
                    >
                         <div className="flex items-baseline gap-2">
                             <span className="text-4xl font-black text-[#0ea5e9] font-sans tabular-nums leading-none drop-shadow-md group-hover:scale-110 transition-transform">
                                 {(data[w.dataKey] || 0).toFixed(2)}
                             </span>
                             <span className="text-sm text-gray-500 font-bold uppercase">{w.unit}</span>
                         </div>
                         <div className="mt-2 text-[10px] text-gray-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
                            Click to Calibrate
                         </div>
                    </div>
                );
            case 'DualStatCard':
                return (
                    <div 
                        className="grid grid-cols-2 gap-2 h-full pb-1 px-1 w-full drag-handle"
                    >
                         {/* Block Height */}
                         <div 
                             className={`bg-slate-800/30 flex flex-col items-center justify-center rounded-xl border border-white/5 p-1 sm:p-2 transition-colors relative overflow-hidden group ${calibrationEnabled ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}`}
                             onClick={() => calibrationEnabled && checkCalibrationEnabled() && setIsSinglePointModalOpen(true)}
                         >
                             <span className="text-[9px] sm:text-[10px] text-[#0ea5e9] opacity-80 font-black uppercase tracking-wider mb-1 text-center leading-tight">BH</span>
                             <div className="flex items-baseline gap-1">
                                 <span className="text-xl sm:text-2xl font-black text-[#0ea5e9] font-sans tabular-nums leading-none drop-shadow-md">
                                     {(data.BlockPosition || data.BLOCK_HEIGHT || 0).toFixed(2)}
                                 </span>
                                 <span className="text-[8px] sm:text-[10px] text-gray-500 font-bold uppercase">m</span>
                             </div>
                         </div>
                         {/* ROP */}
                         <div className="bg-slate-800/30 flex flex-col items-center justify-center rounded-xl border border-white/5 p-1 sm:p-2 hover:bg-white/5 transition-colors relative overflow-hidden">
                             <span className="text-[9px] sm:text-[10px] text-[#4ade80] opacity-80 font-black uppercase tracking-wider mb-1 text-center leading-tight">ROP</span>
                             <div className="flex items-baseline gap-1">
                                 <span className="text-xl sm:text-2xl font-black text-[#4ade80] font-sans tabular-nums leading-none drop-shadow-md">
                                     {(data.ROP || 0).toFixed(2)}
                                 </span>
                                 <span className="text-[8px] sm:text-[10px] text-gray-500 font-bold uppercase">m/hr</span>
                             </div>
                         </div>
                    </div>
                );

            case 'PumpPanel':
                const pressure = data.StandpipePressure || 0;
                const pressurePercent = Math.min(100, (pressure / 5000) * 100);
                // SPM values come from DAQ-10 registers mapped dynamically by the backend
                const spm1Val = data.SPM1 || 0;
                const spm2Val = data.SPM2 || 0;
                // Total SPM: prefer the dedicated DAQ-10 register, fall back to computed
                const totalSpmVal = data.TotalSPM || (spm1Val + spm2Val);
                return (
                    <div className="flex flex-col h-full px-1 gap-2">
                        {/* Pump Status Cards */}
                        <div className="flex gap-2">
                                                {[
                                 { id: 1, spm: spm1Val, spmKey: 'MP1_SPM' },
                                 { id: 2, spm: spm2Val, spmKey: 'MP2_SPM' },
                             ].map(({ id, spm, spmKey }) => {
                                 const isOn = spm > 0;
                                 
                                 // Statically declared Tailwind classes so they are not purged/ignored during build time.
                                 const cardBgBorder = isOn 
                                     ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[inset_0_0_12px_rgba(16,185,129,0.05)] shadow-emerald-500/5' 
                                     : 'bg-red-500/10 border-red-500/30 shadow-[inset_0_0_12px_rgba(239,68,68,0.03)] shadow-red-500/5';
                                     
                                 const dotStyle = isOn 
                                     ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' 
                                     : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
                                     
                                 const labelStyle = isOn 
                                     ? 'text-white/60' 
                                     : 'text-white/50';
                                     
                                 const statusStyle = isOn 
                                     ? 'text-emerald-400 font-bold' 
                                     : 'text-red-400 font-bold';
                                     
                                 const spmAlarm = getAlarmColorClass(spm, spmKey, isOn ? 'text-emerald-400' : 'text-gray-400/80');
                                 
                                 const unitStyle = isOn 
                                     ? 'text-white/40' 
                                     : 'text-gray-400';
                                 
                                 return (
                                     <div key={id}
                                          className={`flex-1 p-2.5 rounded-xl border flex items-center gap-3 transition-all duration-500 shadow-inner ${canConfigure ? 'cursor-pointer hover:brightness-110' : 'cursor-default'} ${cardBgBorder}`}
                                          onClick={canConfigure ? () => setActiveConfigParam({ paramKey: spmKey, label: `PUMP ${id} SPM`, unit: 'spm', defaultMax: 120 }) : undefined}>
                                         <div className="relative">
                                             <div className={`w-2.5 h-2.5 rounded-full ${dotStyle}`}></div>
                                             {isOn && <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-40" />}
                                         </div>
                                         <div className="flex flex-col">
                                             <span className={`text-xs font-black uppercase tracking-widest ${labelStyle}`}>PUMP {id}</span>
                                             <span className={`text-sm font-black uppercase ${statusStyle}`}>
                                                 {isOn ? 'Active' : 'OFF'}
                                             </span>
                                         </div>
                                         <div className="ml-auto flex flex-col items-end">
                                             <div className="flex items-baseline gap-1">
                                                 <span className={`text-4xl font-sans tabular-nums font-black transition-all ${spmAlarm}`}>
                                                     {spm.toFixed(0)}
                                                 </span>
                                                 <span className={`text-[10px] font-black uppercase ${unitStyle}`}>spm</span>
                                             </div>
                                         </div>
                                     </div>
                                 );
                             })}
                         </div>

                        {/* STROKES 1 / STROKES 2 Row — from DAQ-10 PumpStrokes registers */}
                        <div className="flex gap-2">
                                               {[
                                 { id: 1, val: data.PumpStrokes1 || 0, accent: '#38bdf8', glow: 'rgba(56,189,248,0.35)', border: 'border-sky-500/30', bg: 'bg-sky-500/5',    label: 'STROKES 1', paramKey: 'STROKES1', dataKey: 'PumpStrokes1' },
                                 { id: 2, val: data.PumpStrokes2 || 0, accent: '#a78bfa', glow: 'rgba(167,139,250,0.35)', border: 'border-violet-500/30', bg: 'bg-violet-500/5', label: 'STROKES 2', paramKey: 'STROKES2', dataKey: 'PumpStrokes2' },
                             ].map((item) => {
                                  const { id, val, accent, glow, border, bg, label, paramKey: sKey } = item;
                                 const isOn = val > 0;
                                 return (
                                     <div key={id}
                                          className={`flex-1 flex items-center justify-between ${bg} border ${border} rounded-xl px-3 py-1.5 transition-all duration-500 ${canConfigure ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}`}
                                          onClick={canConfigure ? () => setActiveConfigParam({ 
                                              paramKey: sKey, 
                                              label, 
                                              unit: '', 
                                              defaultMax: 10000,
                                              address: data[item.dataKey + '_ADDR'],
                                              deviceId: data[item.dataKey + '_DEV']
                                          }) : undefined}>
                                         <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>{label}</span>
                                         <span className="text-2xl font-sans tabular-nums font-black transition-all duration-500" style={{
                                             color: isOn ? accent : '#4b5563',
                                             textShadow: isOn ? `0 0 12px ${glow}` : 'none',
                                         }}>
                                             {val.toFixed(0)}
                                         </span>
                                     </div>
                                 );
                             })}
                        </div>

                        {/* Standpipe Pressure + Totals */}
                        <div
                             className={`flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden group ${canConfigure ? 'cursor-pointer hover:border-white/10' : 'cursor-default'}`}
                             onClick={canConfigure ? () => setActiveConfigParam({ paramKey: 'STP_PRS', label: 'STANDPIPE PRESSURE', unit: 'psi', defaultMax: 5000 }) : undefined}>
                             {pressure > 3000 && <div className="absolute inset-x-0 bottom-0 h-1/2 bg-sky-500/5 animate-pulse" />}
                             <div className="flex justify-between items-end mb-4 relative z-10">
                                 <div className="flex flex-col">
                                     <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">Standpipe Pressure</span>
                                     <div className="h-2 bg-slate-900/90 rounded-full overflow-hidden border border-white/5 w-48 relative">
                                         <div
                                             className="h-full bg-gradient-to-r from-sky-600 to-blue-500 rounded-full transition-all duration-1000 ease-out"
                                             style={{
                                                 width: `${pressurePercent}%`,
                                                 boxShadow: pressure > 0 ? '0 0 15px rgba(56,189,248,0.5)' : 'none'
                                             }}
                                         />
                                         {pressure > 0 && <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 animate-pulse" />}
                                     </div>
                                 </div>
                                 <div className="flex items-baseline gap-2">
                                     <span className={`text-5xl font-sans tabular-nums font-black tracking-tighter transition-colors duration-500 ${
                                         pressure > 4000 ? 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'text-sky-400 text-glow-blue'
                                     }`}>
                                         {pressure.toFixed(0)}
                                     </span>
                                     <span className="text-xs font-black text-gray-500 uppercase tracking-widest">psi</span>
                                 </div>
                             </div>
                             <div className="grid grid-cols-2 gap-4 relative z-10 border-t border-white/5 pt-3">
                                 <div 
                                     className={`flex flex-col items-center border-r border-white/5 ${canConfigure ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'} px-2 rounded-lg transition-colors`}
                                     onClick={canConfigure ? (e) => {
                                         e.stopPropagation();
                                         setActiveConfigParam({ paramKey: 'TOT_STRK', label: 'TOTAL STROKES', unit: '', defaultMax: 100000, address: data['TotalStrokes_ADDR'], deviceId: data['TotalStrokes_DEV'] });
                                     } : undefined}
                                 >
                                     <span className="text-xs text-gray-400 font-black uppercase tracking-widest mb-1">Total Strokes</span>
                                     <span className="text-3xl font-sans tabular-nums font-black text-emerald-400">{Math.floor(data.TotalStrokes || 0).toLocaleString()}</span>
                                 </div>
                                 <div className="flex flex-col items-center">
                                     <span className="text-xs text-gray-400 font-black uppercase tracking-widest mb-1">Total SPM</span>
                                     <span className="text-3xl font-sans tabular-nums font-black text-emerald-400">{totalSpmVal.toFixed(0)}</span>
                                 </div>
                             </div>
                        </div>
                    </div>
                );
            case 'PowerGrid':
                const engineColors = ['bg-[#38bdf8]', 'bg-[#4ade80]', 'bg-[#fbbf24]', 'bg-[#a78bfa]'];
                return (
                    <div className="grid grid-cols-2 grid-rows-2 gap-1.5 h-full p-1">
                        {powerPacks.map((p, idx) => {
                            const baseColor = engineColors[idx];
                            const isRunning = p.rpm > 500;
                            const statusOpacity = isRunning ? 'opacity-100' : 'opacity-60 grayscale-[40%] brightness-75';
                            const textColor = 'text-slate-900';
                            const labelColor = 'text-slate-900/60';
                            
                            return (
                                <div 
                                    key={p.id} 
                                    className={`${baseColor} ${statusOpacity} ${textColor} rounded-xl flex flex-col items-center justify-center shadow-lg transition-all duration-1000 border border-white/10 cursor-pointer`}
                                    onClick={() => navigate(`/engine/${p.id}`)}
                                >
                                    <span className={`${labelColor} text-[9px] font-black uppercase tracking-widest mb-0.5`}>{p.name.toUpperCase()}</span>
                                    <div className="flex flex-col items-center justify-center">
                                        <span className={`text-2xl leading-none font-black font-sans tabular-nums ${isRunning ? 'text-nov-accent' : 'text-red-500'}`}>
                                            {isRunning ? 'ON' : 'OFF'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            case 'BOPStatus':
                const rams = [
                    { label: 'PIPE', status: '???', color: 'bg-slate-700' },
                    { label: 'BLIND', status: '???', color: 'bg-slate-700' },
                    { label: 'ANNLR', status: '???', color: 'bg-slate-700' },
                    { label: 'ANNULAR', val: 0, unit: 'PSI', color: 'text-cyan-400' },
                    { label: 'ACCUM', val: 0, unit: 'PSI', color: 'text-cyan-400' },
                    { label: 'MANIFOLD', val: 0, unit: 'PSI', color: 'text-cyan-400' }
                ];

                return (
                    <div className="grid grid-cols-3 grid-rows-2 gap-2 h-full pb-1 px-1">
                        {rams.map((r, i) => (
                            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-1 flex flex-col items-center justify-center">
                                <span className="text-[9px] text-gray-500 font-black uppercase mb-0.5">{r.label}</span>
                                {r.status ? (
                                    <span className="text-lg leading-none font-black text-white/90">{r.status}</span>
                                ) : (
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-xl leading-none font-black font-sans tabular-nums ${r.color}`}>{r.val}</span>
                                        <span className="text-[8px] text-gray-600 font-black uppercase">{r.unit}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full flex-1 flex flex-col relative transition-colors duration-500" style={{ backgroundColor: bgTheme }}>

            {/* ── LIVE ALARM BAR ─────────────────────────────────────────────── */}
            {activeAlarms.length > 0 && !alarmsAck && (
                <div className="relative overflow-hidden border-b border-red-500/40 bg-black/80 backdrop-blur-sm"
                     style={{ animation: 'none' }}>
                    {/* Red/yellow pulsing background based on worst severity */}
                    <div className={`absolute inset-0 opacity-20 animate-pulse ${
                        activeAlarms.some(a => a.severity === 'HH' || a.severity === 'LL')
                            ? 'bg-red-600'
                            : 'bg-yellow-500'
                    }`} />

                    <div className="flex items-center gap-3 px-3 py-1.5 relative z-10">
                        {/* Bell icon */}
                        <div className={`flex items-center gap-1.5 shrink-0 ${
                            activeAlarms.some(a => a.severity === 'HH' || a.severity === 'LL')
                                ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="animate-bounce">
                                <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z"/>
                            </svg>
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {activeAlarms.length} ALARM{activeAlarms.length > 1 ? 'S' : ''}
                            </span>
                        </div>

                        {/* Scrolling alarm ticker */}
                        <div className="flex-1 overflow-hidden">
                            <div className="flex gap-4 items-center flex-wrap">
                                {activeAlarms.map((alarm, i) => (
                                    <div key={i}
                                         className={`flex items-center gap-1.5 group ${canConfigure ? 'cursor-pointer' : 'cursor-default'}`}
                                         onClick={canConfigure ? () => setActiveConfigParam({ paramKey: alarm.paramKey, label: alarm.label, unit: '', defaultMax: 500 }) : undefined}>
                                        {/* Severity badge */}
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded font-mono tracking-widest ${
                                            alarm.severity === 'HH' || alarm.severity === 'LL'
                                                ? 'bg-red-600 text-white'
                                                : 'bg-yellow-500 text-black'
                                        }`}>
                                            {alarm.severity}
                                        </span>
                                        <span className="text-[10px] font-black text-white/80 uppercase tracking-wider group-hover:text-white transition-colors">
                                            {alarm.label}
                                        </span>
                                        <span className={`text-[10px] font-sans tabular-nums font-black ${
                                            alarm.severity === 'HH' || alarm.severity === 'LL' ? 'text-red-400' : 'text-yellow-400'
                                        }`}>
                                            {typeof alarm.value === 'number' ? alarm.value.toFixed(1) : alarm.value}
                                        </span>
                                        {i < activeAlarms.length - 1 && (
                                            <span className="text-gray-600 text-xs ml-1">|</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Silence button */}
                        <button
                            onClick={() => setAlarmsAck(true)}
                            className="shrink-0 text-[9px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 border border-white/20 px-2 py-1 rounded transition-colors text-white/60 hover:text-white">
                            SILENCE
                        </button>
                    </div>
                </div>
            )}

            {/* Silenced indicator */}
            {activeAlarms.length > 0 && alarmsAck && (
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-900/60 border-b border-white/5">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 opacity-50" />
                    <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">
                        {activeAlarms.length} alarm{activeAlarms.length > 1 ? 's' : ''} silenced
                    </span>
                    <button onClick={() => setAlarmsAck(false)}
                            className="ml-2 text-[9px] text-gray-500 hover:text-white underline transition-colors">
                        show
                    </button>
                </div>
            )}

            <div ref={containerRef} className={`flex-1 overflow-x-hidden px-2 pt-0 pb-2 custom-scrollbar ${role === 'operator' ? 'overflow-y-hidden' : 'overflow-y-auto'}`}>
                <ResponsiveGridLayout
                    key="layout-locked"
                    className="layout"
                    width={containerWidth || 1200}
                    layouts={{ lg: gridLayoutItems, md: gridLayoutItems, sm: gridLayoutItems, xs: gridLayoutItems, xxs: gridLayoutItems }}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
                    rowHeight={role === 'operator' ? calculatedRowHeight : 78}
                    onLayoutChange={() => {}}
                    isDraggable={false}
                    isResizable={false}
                    resizeHandles={[]}
                    margin={[6, 4]}
                >
                {gridLayoutItems.map(w => (
                    <div key={w.i} className="h-full">
                        <Card 
                            title={w.title} 
                            dragEnabled={canEditLayout}
                            contentClassName={w.id === 'twinstop' ? 'px-2 pt-2 pb-1' : ''}
                            className="h-full border-white/5 transition-all duration-300 shadow-2xl relative group"
                        >
                            {renderWidgetContent(w)}
                        </Card>
                    </div>
                ))}
                </ResponsiveGridLayout>
            </div>



            {/* Legacy Modals */}
            <SinglePointModal isOpen={isSinglePointModalOpen} onClose={() => setIsSinglePointModalOpen(false)} data={data} />
            
            {/* Twinstop Setpoints Modal */}
            <TwinstopSettingsModal 
                isOpen={isTwinstopModalOpen} 
                onClose={() => setIsTwinstopModalOpen(false)} 
                data={data} 

            />

            {/* Universal Parameter Alarm Config Modal */}
            {activeConfigParam && (
                <ParameterSettingsModal
                    paramKey={activeConfigParam.paramKey}
                    label={activeConfigParam.label}
                    unit={activeConfigParam.unit}
                    defaultMax={activeConfigParam.defaultMax}
                    address={activeConfigParam.address}
                    deviceId={activeConfigParam.deviceId}
                    liveData={data}
                    onClose={() => setActiveConfigParam(null)}
                />
            )}        </div>
    );
}

const TwinstopSettingsModal = ({ isOpen, onClose, data }) => {
    const [values, setValues] = useState({
        crown: '',
        floor: '',
        offset: '',
        air: ''
    });
    const [isUpdating, setIsUpdating] = useState(false);

    const [keypadOpen, setKeypadOpen] = useState(false);
    const [keypadField, setKeypadField] = useState('');
    const [keypadLabel, setKeypadLabel] = useState('');

    const fieldAddrMap = {
        crown: 2308,
        floor: 2306,
        offset: 2312,
        air: 2318
    };

    // Pre-populate values when modal opens or telemetry data changes
    useEffect(() => {
        if (isOpen) {
            setValues({
                crown: data.Crownomatic !== undefined && data.Crownomatic !== null ? data.Crownomatic.toString() : '',
                floor: data.Flooromatic !== undefined && data.Flooromatic !== null ? data.Flooromatic.toString() : '',
                offset: data.AlarmOffset !== undefined && data.AlarmOffset !== null ? data.AlarmOffset.toString() : '',
                air: data.AirPressureSetPoint !== undefined && data.AirPressureSetPoint !== null ? data.AirPressureSetPoint.toString() : ''
            });
        }
    }, [isOpen, data]);

    if (!isOpen) return null;

    const openKeypad = (field, label) => {
        setKeypadField(field);
        setKeypadLabel(label);
        setKeypadOpen(true);
    };

    const handleKeypadAccept = async (value) => {
        const valStr = value.toString();
        setValues(prev => ({ ...prev, [keypadField]: valStr }));
        setKeypadOpen(false);

        const val = parseFloat(valStr);
        if (isNaN(val)) return alert("Please enter a valid number");

        const address = fieldAddrMap[keypadField];
        setIsUpdating(true);
        try {
            await writeModbusFloat(34, address, val, null);
        } catch (err) {
            console.error(err);
            alert(`Failed to update ${keypadField}: ${err.response?.data?.detail || err.message}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdate = async (type, address) => {
        const val = parseFloat(values[type]);
        if (isNaN(val)) return alert("Please enter a valid number");

        setIsUpdating(true);
        try {
            // Using device_id 34 for DAQ-10 PLC
            await writeModbusFloat(34, address, val, null);
            alert(`${type.toUpperCase()} updated successfully!`);
        } catch (err) {
            console.error(err);
            alert(`Failed to update ${type}: ${err.response?.data?.detail || err.message}`);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-nov-card border border-nov-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
                <div className="p-4 border-b border-nov-border flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-cyan-400" />
                        <span className="text-sm font-black text-white uppercase tracking-widest">Twinstop Setpoints</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Demo Mode Toggle Removed */}
                    {[
                        { id: 'crown', label: 'Crownomatic', addr: 2308, field: 'Crownomatic', unit: 'm' },
                        { id: 'floor', label: 'Flooromatic', addr: 2306, field: 'Flooromatic', unit: 'm' },
                        { id: 'offset', label: 'Alarm Offset', addr: 2312, field: 'AlarmOffset', unit: 'm' },
                        { id: 'air', label: 'Air Pressure Set Point', addr: 2318, field: 'AirPressureSetPoint', unit: 'psi' }
                    ].map((item) => (
                        <div key={item.id} className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{item.label}</span>
                                <span className="text-xs text-cyan-400 font-bold">CURRENT: {(data[item.field] || 0).toFixed(2)}{item.unit}</span>
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={values[item.id]}
                                    placeholder="Enter value"
                                    readOnly
                                    onClick={() => openKeypad(item.id, item.label)}
                                    onFocus={(e) => e.target.blur()}
                                    className="flex-1 bg-[#0f172a] border border-white/5 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer select-none font-mono"
                                />
                                <button 
                                    onClick={() => handleUpdate(item.id, item.addr)}
                                    disabled={isUpdating}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-[10px] font-black text-white uppercase tracking-wider rounded-lg transition-colors active:scale-95"
                                >
                                    Update
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="p-4 bg-white/5 border-t border-white/5 text-center">
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tight">Warning: Setpoints affect rig safety shutdown logic.</p>
                </div>
            </div>

            <NumericKeypad
                isOpen={keypadOpen}
                title="TWINSTOP SETPOINTS"
                fieldLabel={keypadLabel}
                initialValue={values[keypadField] || ''}
                unit={keypadField === 'air' ? 'psi' : 'm'}
                onAccept={handleKeypadAccept}
                onCancel={() => setKeypadOpen(false)}
            />
        </div>
    );
};


