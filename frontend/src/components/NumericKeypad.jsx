import React, { useState, useEffect } from 'react';

const NumericKeypad = ({
    isOpen,
    title = '',
    fieldLabel = '',
    initialValue = '0',
    unit = '',
    onAccept,
    onCancel
}) => {
    const [keypadValue, setKeypadValue] = useState('0');

    useEffect(() => {
        if (isOpen) {
            setKeypadValue(initialValue?.toString() || '0');
        }
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

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
        const parsed = parseFloat(keypadValue);
        onAccept(isNaN(parsed) ? 0 : parsed);
    };

    return (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#15171e] p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-150">
                {/* Title and Subtitle */}
                <div className="text-center mb-4 select-none">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</span>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white mt-0.5">{fieldLabel}</h3>
                </div>

                {/* Numeric Screen Display */}
                <div className="relative mb-5 flex h-20 items-center justify-between rounded-xl border border-white/5 bg-slate-950/80 px-5 text-right shadow-inner">
                    <span className="text-xs font-black uppercase text-slate-500 select-none">{unit}</span>
                    <div className="flex items-center gap-1 font-mono text-3xl font-black tracking-widest text-emerald-400">
                        <span>{keypadValue}</span>
                        <span className="h-6 w-1 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                </div>

                {/* Keypad Grid & Action Buttons */}
                <div className="flex gap-4">
                    {/* Digit Buttons */}
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

                    {/* Action Column */}
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
                            onClick={onCancel}
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
    );
};

export default NumericKeypad;
