import React, { useState } from 'react';
import { X, Target, AlertCircle } from 'lucide-react';
import { writeModbusFloat, writeModbusRegister } from '../api';
import NumericKeypad from './NumericKeypad';

const SinglePointModal = ({ isOpen, onClose, data }) => {
    const [knownHeight, setKnownHeight] = useState('');
    const [keypadOpen, setKeypadOpen] = useState(false);

    if (!isOpen) return null;

    // Use dynamic configuration from data if available, otherwise fallback
    // BlockPosition_DEV represents the device ID (e.g. DAQ-10 or Twinstop)
    // BlockPosition_ADDR represents the register address for Block Height (e.g. 1100 for DAQ-10 or 416 for Twinstop)
    const targetDeviceId = data.BlockPosition_DEV ?? 34; // Fallback to DAQ-10 Device ID 34
    const targetAddress = data.BlockPosition_ADDR ?? 1100; // Fallback to DAQ-10 default address of BH (1100)

    const isTwinstop = targetDeviceId === 1;

    const handleActionDirect = (value) => {
        // Fire-and-forget write to PLC register
        writeModbusFloat(targetDeviceId, targetAddress, parseFloat(value || 0), null)
            .catch(err => console.error("Error writing block height:", err));

        // Trigger calibration pulse only if it's Twinstop PLC
        if (isTwinstop) {
            writeModbusRegister(targetDeviceId, 36, 1, null)
                .then(() => new Promise(resolve => setTimeout(resolve, 500)))
                .then(() => writeModbusRegister(targetDeviceId, 36, 0, null))
                .catch(err => console.error("Error writing twinstop trigger pulse:", err));
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-nov-card border border-nov-border w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-white/5 px-6 py-4 border-b border-nov-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Target className="text-purple-400" size={20} />
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Single Point Config</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                            <span className="text-sm font-bold text-gray-400 uppercase">1. Block Height</span>
                            <div className="flex bg-black/40 rounded-lg border border-white/10 overflow-hidden">
                                <input 
                                    type="text" 
                                    placeholder="Enter Height (m)"
                                    className="w-full bg-transparent px-4 py-3 text-white focus:outline-none font-sans tabular-nums placeholder:text-gray-600 text-xl cursor-pointer select-none"
                                    value={knownHeight}
                                    readOnly
                                    onClick={() => setKeypadOpen(true)}
                                    onFocus={(e) => e.target.blur()}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Live Data Monitoring */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-cyan-500/5 rounded-xl p-3 border border-cyan-500/10 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-black text-cyan-500/70 uppercase tracking-widest mb-1 leading-none">Live Encoder</span>
                            <span className="text-2xl font-sans tabular-nums font-bold text-cyan-400 tracking-tighter leading-none pt-1">
                                {(data.EDMSCOUNT || 0).toFixed(0)}
                            </span>
                        </div>
                        <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/10 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest mb-1 leading-none">Live Block Height</span>
                            <span className="text-2xl font-sans tabular-nums font-bold text-amber-400 tracking-tighter leading-none pt-1">
                                {(data[data.BlockPosition_LABEL] || data.BLOCK_HEIGHT || data.BlockPosition || 0).toFixed(2)}m
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-white/5 border-t border-white/5 text-center flex flex-col items-center">
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest leading-relaxed">
                        {isTwinstop 
                            ? "This workflow assigns the known block height and triggers MX50.3 boolean flag simultaneously on the PLC."
                            : `This workflow assigns the known block height directly to register ${targetAddress} on the PLC (Device ID: ${targetDeviceId}).`
                        }
                    </p>
                </div>
            </div>

            <NumericKeypad
                isOpen={keypadOpen}
                title="SINGLE POINT CONFIG"
                fieldLabel="Block Height"
                initialValue={knownHeight}
                unit="m"
                onAccept={(value) => {
                    setKnownHeight(value.toString());
                    setKeypadOpen(false);
                    handleActionDirect(value.toString());
                    onClose(); // Automatically close the popup immediately on accept
                }}
                onCancel={() => setKeypadOpen(false)}
            />
        </div>
    );
};

export default SinglePointModal;
