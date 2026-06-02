import React, { useState } from 'react';
import { X, Calendar, Download, FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react';
import { exportExcel, exportCsv } from '../api';
import { toPng } from 'html-to-image';

const TIME_RANGES = [
    { label: 'LAST 15 MIN', minutes: 15 },
    { label: 'LAST 1 HOUR', minutes: 60 },
    { label: 'LAST 6 HOURS', minutes: 360 },
    { label: 'LAST 12 HOURS', minutes: 720 },
    { label: 'LAST 24 HOURS', minutes: 1440 },
    { label: 'LAST 3 DAYS', minutes: 4320 },
    { label: 'LAST 7 DAYS', minutes: 10080 },
    { label: 'LAST 30 DAYS', minutes: 43200 },
];

function toLocalDatetimeString(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ExportDataModal({ isOpen, onClose, selectedKeys = [], allOptions = [], graphSelector = '.capture-target-graph' }) {
    const [format, setFormat] = useState('excel'); // 'excel', 'csv', 'graph'
    const [rangeType, setRangeType] = useState('quick'); // 'quick', 'custom'
    const [quickMinutes, setQuickMinutes] = useState(60); // Default to 1 hour
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [exporting, setExporting] = useState(false);
    const [localSelectedKeys, setLocalSelectedKeys] = useState(selectedKeys);

    React.useEffect(() => {
        if (isOpen) {
            setLocalSelectedKeys(selectedKeys);
        }
    }, [isOpen, selectedKeys]);

    if (!isOpen) return null;

    const handleDownload = async () => {
        setExporting(true);
        try {
            let startDate, endDate;

            if (rangeType === 'quick') {
                endDate = new Date().toISOString();
                startDate = new Date(Date.now() - quickMinutes * 60000).toISOString();
            } else {
                if (!customStart || !customEnd) {
                    alert('Please select both start and end dates.');
                    setExporting(false);
                    return;
                }
                startDate = new Date(customStart).toISOString();
                endDate = new Date(customEnd).toISOString();
            }

            const fields = localSelectedKeys.length > 0 ? localSelectedKeys : null;

            if (format === 'excel') {
                const success = await exportExcel(startDate, endDate, fields);
                if (!success) alert('Export failed. Please try again.');
            } else if (format === 'csv') {
                const success = await exportCsv(startDate, endDate, fields);
                if (!success) alert('Export failed. Please try again.');
            } else if (format === 'graph') {
                const element = document.querySelector(graphSelector);
                if (!element) {
                    alert('Chart or graph element not found on screen for capture.');
                    setExporting(false);
                    return;
                }
                
                const dataUrl = await toPng(element, {
                    backgroundColor: '#0c1220',
                    style: {
                        borderRadius: '0px'
                    }
                });
                
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `graph_export_${new Date().toISOString().slice(0, 10)}.png`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
        } catch (err) {
            console.error('Export modal error:', err);
            alert('Export failed. Please try again.');
        } finally {
            setExporting(false);
            if (format !== 'graph') {
                onClose();
            }
        }
    };

    // Determine the summary text based on selection
    let summaryRangeText = '';
    if (rangeType === 'quick') {
        const tr = TIME_RANGES.find(t => t.minutes === quickMinutes);
        summaryRangeText = tr ? tr.label.toLowerCase() : 'selected period';
    } else {
        summaryRangeText = 'the selected custom range';
    }

    const summaryParamsText = localSelectedKeys.length > 0 
        ? `${localSelectedKeys.length} selected parameters` 
        : 'all recorded parameters';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="relative w-full max-w-2xl bg-[#374151] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        <Download className="text-amber-400" size={24} />
                        Export Data
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {/* EXPORT FORMAT */}
                    <div className="mb-8">
                        <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-3">Export Format</p>
                        <div className="grid grid-cols-3 gap-4">
                            <button
                                onClick={() => setFormat('excel')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-lg border font-bold text-sm transition-all ${
                                    format === 'excel'
                                        ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20'
                                        : 'bg-transparent text-gray-400 border-gray-500 hover:border-gray-400'
                                }`}
                            >
                                <FileSpreadsheet size={18} /> EXCEL (.XLSX)
                            </button>
                            <button
                                onClick={() => setFormat('csv')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-lg border font-bold text-sm transition-all ${
                                    format === 'csv'
                                        ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500 shadow-lg shadow-cyan-500/10'
                                        : 'bg-transparent text-gray-400 border-gray-500 hover:border-gray-400'
                                }`}
                            >
                                <FileText size={18} /> CSV (.CSV)
                            </button>
                            <button
                                onClick={() => setFormat('graph')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-lg border font-bold text-sm transition-all ${
                                    format === 'graph'
                                        ? 'bg-purple-600/20 text-purple-400 border-purple-500 shadow-lg shadow-purple-500/10'
                                        : 'bg-transparent text-gray-400 border-gray-500 hover:border-gray-400'
                                }`}
                            >
                                <ImageIcon size={18} /> GRAPH (.PNG)
                            </button>
                        </div>
                    </div>

                    {/* PARAMETER SELECTION */}
                    {allOptions.length > 0 && (
                        <div className="mb-8">
                            <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-3">Select Parameters to Export</p>
                            <div className="flex gap-2 mb-2">
                                <button
                                    onClick={() => setLocalSelectedKeys(allOptions.map(o => o.key))}
                                    className="text-[10px] font-bold px-2.5 py-1 rounded bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => setLocalSelectedKeys([])}
                                    className="text-[10px] font-bold px-2.5 py-1 rounded bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                                >
                                    Deselect All
                                </button>
                            </div>
                            <div className="max-h-40 overflow-y-auto border border-white/5 rounded-lg p-2 bg-[#1f2937]/50 grid grid-cols-2 sm:grid-cols-3 gap-1 custom-scrollbar">
                                {allOptions.map((opt) => {
                                    const isSel = localSelectedKeys.includes(opt.key);
                                    return (
                                        <button
                                            key={opt.key}
                                            onClick={() => {
                                                setLocalSelectedKeys(prev => 
                                                    prev.includes(opt.key) 
                                                        ? prev.filter(k => k !== opt.key) 
                                                        : [...prev, opt.key]
                                                );
                                            }}
                                            className={`flex items-center gap-2 px-2 py-1 rounded text-left text-xs transition-all border ${
                                                isSel 
                                                    ? 'bg-amber-400/10 border-amber-400/30 text-amber-400 font-bold' 
                                                    : 'bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-300'
                                            }`}
                                        >
                                            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                                isSel ? 'border-amber-400 bg-amber-400 text-black' : 'border-gray-500'
                                            }`}>
                                                {isSel && <span className="text-[10px] font-bold">✓</span>}
                                            </span>
                                            <span className="truncate">{opt.label || opt.key}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* QUICK SELECT */}
                    <div className="mb-8">
                        <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-3">Quick Select</p>
                        <div className="flex flex-wrap gap-2">
                            {TIME_RANGES.map((t) => (
                                <button
                                    key={t.minutes}
                                    onClick={() => {
                                        setRangeType('quick');
                                        setQuickMinutes(t.minutes);
                                    }}
                                    className={`px-4 py-2 rounded border text-sm transition-all ${
                                        rangeType === 'quick' && quickMinutes === t.minutes
                                            ? 'bg-amber-400 text-black border-amber-400 font-bold'
                                            : 'bg-transparent text-gray-300 border-gray-600 hover:bg-gray-700'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CUSTOM DATE RANGE */}
                    <div className="mb-8">
                        <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-3">Custom Date Range</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">From</label>
                                <div className={`flex items-center gap-2 bg-[#1f2937] border rounded-lg px-3 py-2 transition-colors ${
                                    rangeType === 'custom' ? 'border-amber-400/50' : 'border-gray-700'
                                }`}>
                                    <input
                                        type="datetime-local"
                                        value={customStart}
                                        onChange={(e) => {
                                            setCustomStart(e.target.value);
                                            setRangeType('custom');
                                        }}
                                        className="bg-transparent text-white w-full focus:outline-none text-sm"
                                    />
                                    <Calendar size={16} className="text-gray-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">To</label>
                                <div className={`flex items-center gap-2 bg-[#1f2937] border rounded-lg px-3 py-2 transition-colors ${
                                    rangeType === 'custom' ? 'border-amber-400/50' : 'border-gray-700'
                                }`}>
                                    <input
                                        type="datetime-local"
                                        value={customEnd}
                                        onChange={(e) => {
                                            setCustomEnd(e.target.value);
                                            setRangeType('custom');
                                        }}
                                        className="bg-transparent text-white w-full focus:outline-none text-sm"
                                    />
                                    <Calendar size={16} className="text-gray-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SUMMARY MSG */}
                    <div className="bg-[#111827] rounded-lg p-4 flex items-center gap-3 border border-gray-800">
                        <Download size={18} className="text-gray-400" />
                        <p className="text-sm text-gray-300">
                            Will export <strong className="text-amber-400">{summaryRangeText}</strong> of data for <strong className="bg-blue-600 px-1 text-white">{summaryParamsText}</strong>.
                        </p>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-4 flex items-center justify-end gap-4">
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white font-bold text-sm px-4 py-2 transition-colors"
                    >
                        CANCEL
                    </button>
                    <button 
                        onClick={handleDownload}
                        disabled={exporting}
                        className="bg-green-500 hover:bg-green-400 text-black px-6 py-2.5 rounded text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        {exporting ? (
                            <span className="animate-pulse">EXPORTING...</span>
                        ) : (
                            <>
                                <Download size={18} />
                                {format === 'excel' ? 'DOWNLOAD .XLSX' : format === 'csv' ? 'DOWNLOAD .CSV' : 'CAPTURE GRAPH'}
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
