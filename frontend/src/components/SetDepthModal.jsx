import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowDownCircle, MapPin, Check, Save } from 'lucide-react';
import { writeModbusFloat } from '../api';
import NumericKeypad from './NumericKeypad';

export default function SetDepthModal({ isOpen, onClose, currentDepth, currentBitDepth }) {
    const [depthVal, setDepthVal] = useState('');
    const [bitPosVal, setBitPosVal] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [keypadOpen, setKeypadOpen] = useState(false);
    const [keypadField, setKeypadField] = useState('');
    const [keypadLabel, setKeypadLabel] = useState('');

    const openKeypad = (field, label) => {
        setKeypadField(field);
        setKeypadLabel(label);
        setKeypadOpen(true);
    };

    const handleKeypadAccept = (value) => {
        if (keypadField === 'depth') {
            setDepthVal(value.toString());
        } else if (keypadField === 'bitPos') {
            setBitPosVal(value.toString());
        }
        setKeypadOpen(false);
    };

    const DAQ10_ID = 34; // DAQ-10 Device ID
    const HOLE_DEPTH_ADDR = 1242;
    const BIT_POS_ADDR = 1234;

    useEffect(() => {
        if (isOpen) {
            setDepthVal(currentDepth.toFixed(2));
            setBitPosVal(currentBitDepth.toFixed(2));
            setSuccessMsg('');
            setErrorMsg('');
        }
    }, [isOpen, currentDepth, currentBitDepth]);

    const triggerAction = (address, value, label, isBulk = false) => {
        handleWrite(address, value, label, isBulk);
    };

    const handleWrite = async (address, value, label, isBulk) => {
        setIsSaving(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const pin = ''; // No PIN required anymore
            if (isBulk) {
                // Handle On-Bottom Sync (writing to both), convert to feet for PLC
                const valueInFeet = parseFloat(value) / 0.3048;
                const res1 = await writeModbusFloat(DAQ10_ID, HOLE_DEPTH_ADDR, valueInFeet, pin);
                const res2 = await writeModbusFloat(DAQ10_ID, BIT_POS_ADDR, valueInFeet, pin);
                
                if (res1.success && res2.success) {
                    setSuccessMsg(`Successfully synchronized both channels to ${value}m`);
                } else {
                    setErrorMsg("Synchronization failed on one or more registers.");
                }
            } else {
                // Single register write, convert to feet for PLC
                const valueInFeet = parseFloat(value) / 0.3048;
                const result = await writeModbusFloat(DAQ10_ID, address, valueInFeet, pin);
                if (result.success) {
                    setSuccessMsg(`Successfully set ${label} to ${value}m`);
                } else {
                    setErrorMsg(result.error || `Failed to set ${label}`);
                }
            }
            
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setErrorMsg(`Network error setting values`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    // USE PORTAL TO AVOID CLIPPING BY DASHBOARD PARENTS
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-nov-accent/10 rounded-lg">
                            <ArrowDownCircle className="text-nov-accent" size={20} />
                        </div>
                        <h2 className="text-lg font-black text-white tracking-tighter uppercase">Set Depth Configuration</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    
                    {/* Hole Depth Field */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <ArrowDownCircle size={12} className="text-blue-400" /> Total Hole Depth (m)
                        </label>
                        <div className="relative group">
                            <input 
                                type="text" 
                                value={depthVal}
                                readOnly
                                onClick={() => openKeypad('depth', 'Total Hole Depth')}
                                onFocus={(e) => e.target.blur()}
                                className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-2xl font-sans tabular-nums font-black text-blue-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-gray-700 cursor-pointer select-none"
                                placeholder="0.00"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold pointer-events-none uppercase text-xs">METERS</div>
                        </div>
                        <button 
                            disabled={isSaving || !depthVal}
                            onClick={() => triggerAction(HOLE_DEPTH_ADDR, depthVal, 'Hole Depth')}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-tighter text-sm mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} /> Set Total Depth
                        </button>
                    </div>

                    <div className="h-px bg-white/5 mx-2" />

                    {/* Bit Position Field */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <MapPin size={12} className="text-emerald-400" /> Bit Position (m)
                        </label>
                        <div className="relative group">
                            <input 
                                type="text" 
                                value={bitPosVal}
                                readOnly
                                onClick={() => openKeypad('bitPos', 'Bit Position')}
                                onFocus={(e) => e.target.blur()}
                                className="w-full bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 text-2xl font-sans tabular-nums font-black text-emerald-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-gray-700 cursor-pointer select-none"
                                placeholder="0.00"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold pointer-events-none uppercase text-xs">METERS</div>
                        </div>
                        <button 
                            disabled={isSaving || !bitPosVal}
                            onClick={() => triggerAction(BIT_POS_ADDR, bitPosVal, 'Bit Position')}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-tighter text-sm mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} /> Set Bit Position
                        </button>
                    </div>

                    <div className="h-px bg-white/5 mx-2" />

                    {/* Sync / On Bottom Action */}
                    <div className="pt-2">
                        <button 
                            disabled={isSaving || !depthVal}
                            onClick={() => triggerAction(null, depthVal, 'On Bottom', true)}
                            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-orange-900/20 active:scale-[0.98] flex flex-col items-center justify-center gap-0 uppercase tracking-tighter text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="flex items-center gap-2"><Check size={18} /> Set On Bottom Depth</span>
                            <span className="text-[9px] opacity-70 font-bold lowercase italic">(Syncs Both Channels to Total Depth)</span>
                        </button>
                    </div>

                    {/* Status Messages */}
                    {successMsg && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-xs font-bold text-center animate-in zoom-in-95 duration-200">
                            {successMsg}
                        </div>
                    )}
                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs font-bold text-center animate-in zoom-in-95 duration-200">
                            {errorMsg}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="bg-slate-900/50 px-6 py-4 border-t border-white/5 flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-3 rounded-xl transition-all uppercase tracking-tighter text-sm"
                    >
                        Cancel & Exit
                    </button>
                </div>
            </div>

            {/* Safety Gate Logic Removed */}
            <NumericKeypad
                isOpen={keypadOpen}
                title="SET DEPTH CONFIGURATION"
                fieldLabel={keypadLabel}
                initialValue={keypadField === 'depth' ? depthVal : bitPosVal}
                unit="m"
                onAccept={handleKeypadAccept}
                onCancel={() => setKeypadOpen(false)}
            />
        </div>,
        document.body
    );
}
