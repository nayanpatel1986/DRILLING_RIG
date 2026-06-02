import React, { useState } from 'react';
import { X, Target, RefreshCw, Save, AlertCircle } from 'lucide-react';
import { writeModbusFloat, writeModbusRegister } from '../api';
import NumericKeypad from './NumericKeypad';

const CalibrationModal = ({ isOpen, onClose, data }) => {
    const [hValues, setHValues] = useState({ h1: '', h2: '', h3: '', h4: '', h5: '' });
    const [loading, setLoading] = useState({});
    const [error, setError] = useState(null);

    const [keypadOpen, setKeypadOpen] = useState(false);
    const [keypadField, setKeypadField] = useState('');
    const [keypadLabel, setKeypadLabel] = useState('');

    const openKeypad = (field, label) => {
        setKeypadField(field);
        setKeypadLabel(label);
        setKeypadOpen(true);
    };

    const handleKeypadAccept = (value) => {
        setHValues(prev => ({ ...prev, [keypadField]: value.toString() }));
        setKeypadOpen(false);
    };

    if (!isOpen) return null;

    const deviceId = 1; // Twinstop Device ID

    const handleAction = async (type, name, address, value) => {
        setLoading(prev => ({ ...prev, [name]: true }));
        setError(null);
        try {
            let res;
            if (type === 'float') {
                res = await writeModbusFloat(deviceId, address, parseFloat(value), null);
            } else if (type === 'pulse') {
                // Send 1 (Trigger)
                res = await writeModbusRegister(deviceId, address, 1, null);
                if (res.success) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    // Send 0 (Return to zero)
                    await writeModbusRegister(deviceId, address, 0, null);
                }
            }
            
            if (res && !res.success) {
                setError(`${name} failed: ${res.error}`);
            }
        } catch (err) {
            const apiError = err.response?.data?.detail || err.message || "Unknown error";
            setError(`${name}: ${apiError}`);
        } finally {
            setLoading(prev => ({ ...prev, [name]: false }));
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1a1c23] border border-white/10 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Target className="text-cyan-400" size={18} />
                        <h2 className="text-md font-bold text-white uppercase tracking-tight">Five Point Calibration</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4 overflow-y-auto max-h-[85vh]">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg flex items-center gap-2 text-red-400 text-xs">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    {/* Maintenance Section */}
                    <div className="flex gap-2 pb-3 border-b border-white/5">
                        <button 
                            onClick={() => handleAction('pulse', 'SET_ZERO', 34, 1)}
                            disabled={loading['SET_ZERO']}
                            className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold py-1.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={14} className={loading['SET_ZERO'] ? 'animate-spin' : ''} />
                            SET ZERO
                        </button>
                        <button 
                            onClick={() => handleAction('pulse', 'CAL_RESET', 33, 1)}
                            disabled={loading['CAL_RESET']}
                            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold py-1.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={14} className={loading['CAL_RESET'] ? 'animate-spin' : ''} />
                            CAL RESET
                        </button>
                    </div>

                    {/* Calibration Points */}
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Point {i}</span>
                                    <div className="flex items-center gap-3">
                                        {/* Captured Value */}
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] text-gray-500 uppercase font-black leading-none mb-1">Captured</span>
                                            <span className="text-base font-sans tabular-nums font-bold text-cyan-400 leading-none">
                                                {(data[`C${i}`] || 0).toFixed(0)}
                                            </span>
                                        </div>
                                        
                                        {/* Current Height Value */}
                                        <div className="flex flex-col items-end border-l border-white/10 pl-3">
                                            <span className="text-[9px] text-gray-500 uppercase font-black leading-none mb-1 text-amber-500/70">Current H{i}</span>
                                            <span className="text-base font-sans tabular-nums font-bold text-amber-400 leading-none">
                                                {(data[`H${i}`] || 0).toFixed(2)}m
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <button 
                                        onClick={() => {
                                            let addr = 29 + i;
                                            if (i === 4) addr = 37;
                                            if (i === 5) addr = 38;
                                            handleAction('pulse', `CAPTURE_C${i}`, addr, 1);
                                        }}
                                        disabled={loading[`CAPTURE_C${i}`]}
                                        className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-bold px-3 py-1.5 rounded-lg border border-cyan-500/20 text-xs transition-all flex items-center gap-2 shrink-0"
                                    >
                                        <Target size={14} />
                                        CAPTURE
                                    </button>
                                    <span className="bg-amber-500/20 text-amber-400 font-mono font-bold text-[10px] px-2 py-1.5 rounded-lg border border-amber-500/30 shrink-0">
                                        H{i}
                                    </span>
                                    <div className="flex-1 flex bg-black/40 rounded-lg border border-white/10 overflow-hidden h-8">
                                        <input 
                                            type="text" 
                                            placeholder={`Height ${i}`}
                                            className="w-full bg-transparent px-2 py-1 text-xs text-white focus:outline-none font-sans tabular-nums placeholder:text-gray-600 cursor-pointer select-none"
                                            value={hValues[`h${i}`]}
                                            readOnly
                                            onClick={() => openKeypad(`h${i}`, `Height ${i}`)}
                                            onFocus={(e) => e.target.blur()}
                                        />
                                        <button 
                                            onClick={() => {
                                                let addr = 448 + (i-1)*16;
                                                if (i === 4) addr = 640;
                                                if (i === 5) addr = 656;
                                                handleAction('float', `SET_H${i}`, addr, hValues[`h${i}`]);
                                            }}
                                            disabled={loading[`SET_H${i}`]}
                                            className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-2 transition-colors border-l border-white/10"
                                        >
                                            <Save size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Live Data Summary */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-cyan-500/5 rounded-lg p-2 border border-cyan-500/10 flex flex-col items-center justify-center">
                            <span className="text-[9px] font-black text-cyan-500/70 uppercase tracking-widest mb-1 leading-none">Live Encoder</span>
                            <span className="text-lg font-sans tabular-nums font-bold text-cyan-400 tracking-tighter leading-none pt-1">
                                {(data.EDMSCOUNT || 0).toFixed(0)}
                            </span>
                        </div>
                        <div className="bg-amber-500/5 rounded-lg p-2 border border-amber-500/10 flex flex-col items-center justify-center">
                            <span className="text-[9px] font-black text-amber-500/70 uppercase tracking-widest mb-1 leading-none">Live Block Height</span>
                            <span className="text-lg font-sans tabular-nums font-bold text-amber-400 tracking-tighter leading-none pt-1">
                                {(data.BLOCK_HEIGHT || 0).toFixed(2)}m
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 bg-white/5 border-t border-white/5 text-center">
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest leading-none">
                        Ensure block is steady before capture.
                    </p>
                </div>
            </div>
            <NumericKeypad
                isOpen={keypadOpen}
                title="FIVE POINT CALIBRATION"
                fieldLabel={keypadLabel}
                initialValue={hValues[keypadField] || '0'}
                unit="m"
                onAccept={handleKeypadAccept}
                onCancel={() => setKeypadOpen(false)}
            />
        </div>
    );
};

export default CalibrationModal;
