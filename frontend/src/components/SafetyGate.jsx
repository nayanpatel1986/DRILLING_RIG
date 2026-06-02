import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X, AlertCircle } from 'lucide-react';
import axios from 'axios';

const SafetyGate = ({ isOpen, onClose, onSuccess, title = "Safety Override Required" }) => {
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post('/api/auth/verify-pin', { pin });
            if (response.data.success) {
                const verifiedPin = pin;
                setPin('');
                onSuccess(verifiedPin);
            }
        } catch (err) {
            setError(err.response?.data?.detail || "Invalid Manager PIN");
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    const handlePinClick = (num) => {
        if (pin.length < 4) setPin(prev => prev + num);
    };

    const handleClear = () => setPin('');

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="bg-[#1a1c23] border border-white/10 rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl animate-zoom-in">
                {/* Header */}
                <div className="p-6 text-center space-y-2">
                    <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">{title}</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Enter Manager PIN to continue</p>
                </div>

                {/* PIN Display */}
                <div className="px-8 pb-4">
                    <div className="h-16 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center gap-3">
                        {[0, 1, 2, 3].map(i => (
                            <div 
                                key={i} 
                                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                                    pin.length > i ? 'bg-amber-500 scale-125 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-white/10'
                                }`} 
                            />
                        ))}
                    </div>
                    {error && (
                        <div className="mt-2 flex items-center justify-center gap-1 text-red-500 text-[10px] font-bold uppercase animate-bounce">
                            <AlertCircle size={12} />
                            {error}
                        </div>
                    )}
                </div>

                {/* Keypad */}
                <div className="px-6 pb-6">
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button
                                key={num}
                                onClick={() => handlePinClick(num.toString())}
                                className="h-14 bg-white/5 hover:bg-white/10 active:bg-white/20 rounded-xl text-xl font-black text-white transition-all active:scale-95"
                            >
                                {num}
                            </button>
                        ))}
                        <button
                            onClick={handleClear}
                            className="h-14 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black text-xs uppercase rounded-xl transition-all"
                        >
                            CLR
                        </button>
                        <button
                            onClick={() => handlePinClick('0')}
                            className="h-14 bg-white/5 hover:bg-white/10 active:bg-white/20 rounded-xl text-xl font-black text-white transition-all active:scale-95"
                        >
                            0
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={pin.length < 4 || loading}
                            className={`h-14 rounded-xl font-black text-xs uppercase transition-all shadow-lg ${
                                pin.length >= 4 
                                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20' 
                                    : 'bg-white/5 text-gray-500 cursor-not-allowed opacity-50'
                            }`}
                        >
                            {loading ? '...' : 'OK'}
                        </button>
                    </div>
                </div>

                {/* Cancel */}
                <button 
                    onClick={onClose}
                    className="w-full py-4 bg-white/5 border-t border-white/5 text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-[0.2em] transition-colors"
                >
                    Cancel Operation
                </button>
            </div>
        </div>,
        document.body
    );
};

export default SafetyGate;
