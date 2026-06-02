import React, { useState, useEffect } from 'react';
import { X, CheckCircle, StopCircle, LayoutPanelTop, Download } from 'lucide-react';
import { getActiveWell, createWell, endWell, exportWellData } from '../api';

const inputClass = "w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 focus:border-nov-accent focus:outline-none transition-colors text-sm text-white";
const inputMonoClass = inputClass + " font-mono";

function FormField({ label, children }) {
    return (
        <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block font-bold uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}

export default function WellManagementModal({ isOpen, onClose, onWellChanged }) {
    const [activeWell, setActiveWell] = useState(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [form, setForm] = useState({ name: '', api_number: '', operator: 'NOV', description: '' });

    const fetchWell = async () => {
        setLoading(true);
        try {
            const well = await getActiveWell();
            setActiveWell(well);
            if (!well) {
                const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const randName = Math.floor(100 + Math.random() * 900);
                const randApi1 = Math.floor(100 + Math.random() * 900);
                const randApi2 = Math.floor(10000 + Math.random() * 90000);
                setForm({
                    name: `WELL-${today}-${randName}`,
                    api_number: `42-${randApi1}-${randApi2}`,
                    operator: 'NOV',
                    description: 'Auto-generated drilling operation'
                });
            }
        } catch (err) {
            console.error('Failed to fetch active well:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchWell();
        }
    }, [isOpen]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createWell(form);
            setForm({ name: '', api_number: '', operator: 'NOV', description: '' });
            await fetchWell();
            if (onWellChanged) onWellChanged();
            alert("New well created and activated successfully.");
        } catch (err) {
            const msg = err.response?.data?.detail || "Failed to start well. Ensure no other well is active.";
            alert(msg);
        }
    };

    const handleExport = async () => {
        if (!activeWell) return;
        setExporting(true);
        try {
            const success = await exportWellData(activeWell.id);
            if (success) {
                alert("Well data exported successfully.");
            } else {
                alert("Failed to export well data. There might be no data for this well.");
            }
        } catch (err) {
            console.error("Export error:", err);
            alert("An error occurred during export.");
        } finally {
            setExporting(false);
        }
    };

    const [autoExport, setAutoExport] = useState(true);

    const handleEnd = async () => {
        if (!activeWell) return;
        
        let confirmMsg = `Are you sure you want to end the current active well '${activeWell.name}'?\n\nAll telemetry data for this well will be PERMANENTLY DELETED.`;
        if (autoExport) {
            confirmMsg += `\n\nThe data will be exported as an Excel file before deletion.`;
        }
        
        if (confirm(confirmMsg)) {
            try {
                if (autoExport) {
                    setExporting(true);
                    const success = await exportWellData(activeWell.id);
                    setExporting(false);
                    if (!success) {
                        if (!confirm("Data export failed or no data was found. Continue with ending the well and deleting data anyway?")) {
                            return;
                        }
                    }
                }

                await endWell(activeWell.id);
                await fetchWell();
                if (onWellChanged) onWellChanged();
                alert("Well ended and data purged successfully.");
            } catch (err) {
                setExporting(false);
                alert("Failed to end the well.");
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <div className="relative w-full max-w-lg bg-nov-card border border-nov-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-white/5 px-6 py-4 border-b border-nov-border flex items-center justify-between">
                    <h2 className="text-lg font-black text-white flex items-center gap-2 tracking-tight">
                        <LayoutPanelTop className="text-nov-accent" size={20} />
                        WELL MANAGEMENT
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    {loading ? (
                        <div className="py-12 text-center text-gray-500 animate-pulse font-bold tracking-widest text-xs">
                            LOADING WELL DATA...
                        </div>
                    ) : activeWell ? (
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 border border-green-500/30">
                                <CheckCircle size={32} className="text-green-500" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-1">{activeWell.name}</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-8">
                                API: {activeWell.api_number}
                            </p>
                            
                            <div className="w-full bg-blue-500/5 border border-blue-500/10 rounded-xl p-6 mb-8 text-center">
                                <p className="text-sm text-blue-300 font-medium leading-relaxed">
                                    A drilling operation is currently active. <br/>
                                    <strong>Ending this well will permanently delete all telemetry logs.</strong><br/>
                                    Please export the data before ending the well.
                                </p>
                            </div>

                            <div className="w-full flex flex-col gap-3">
                                <button 
                                    onClick={handleExport}
                                    disabled={exporting}
                                    className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black text-sm transition-all shadow-xl uppercase tracking-widest ${
                                        exporting 
                                        ? 'bg-green-600/50 text-white/70 cursor-not-allowed' 
                                        : 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/20 active:scale-95'
                                    }`}
                                >
                                    <Download size={20} /> {exporting ? 'EXPORTING...' : 'EXPORT WELL DATA (XLSX)'}
                                </button>
                                
                                <div className="flex items-center gap-3 px-2 py-1 mt-2">
                                    <input 
                                        type="checkbox" 
                                        id="autoExport" 
                                        checked={autoExport} 
                                        onChange={(e) => setAutoExport(e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-600 bg-gray-900 text-nov-accent focus:ring-nov-accent focus:ring-offset-gray-900 cursor-pointer"
                                    />
                                    <label htmlFor="autoExport" className="text-xs text-gray-300 font-bold uppercase tracking-widest cursor-pointer select-none">
                                        Auto-export data before ending
                                    </label>
                                </div>

                                <button 
                                    onClick={handleEnd}
                                    className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-black text-sm transition-all shadow-xl shadow-red-600/20 active:scale-95 uppercase tracking-widest"
                                >
                                    <StopCircle size={20} /> End Active Well & Delete Data
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleCreate} className="space-y-2">
                            <div className="mb-6">
                                <p className="text-sm text-gray-400 font-medium">
                                    No well is currently active. Enter the details below to start a new drilling operation.
                                </p>
                            </div>

                            <FormField label="Well Name *">
                                <input
                                    placeholder="e.g. SILVERSTONE-01"
                                    required
                                    className={inputClass}
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </FormField>

                            <FormField label="API Number *">
                                <input
                                    placeholder="e.g. 42-123-45678"
                                    required
                                    className={inputMonoClass}
                                    value={form.api_number} onChange={e => setForm({ ...form, api_number: e.target.value })}
                                />
                            </FormField>

                            <div className="pt-6">
                                <button 
                                    type="submit" 
                                    className="w-full py-4 bg-nov-accent rounded-xl text-white font-black text-sm hover:bg-nov-accent/80 transition-all shadow-xl shadow-nov-accent/20 active:scale-95 uppercase tracking-widest"
                                >
                                    Start New Well
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer Tip */}
                <div className="bg-black/20 px-6 py-3 border-t border-white/5">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">
                        Secure Drilling Management System v2.0
                    </p>
                </div>
            </div>
        </div>
    );
}
