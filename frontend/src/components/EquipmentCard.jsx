import React from 'react';
import { Settings, Thermometer, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

export const EquipmentCard = ({ name, type, health, runningHours, metrics = [], status = 'running', alerts = [] }) => {
    const isWarning = health < 70;
    const isCritical = health < 40;

    return (
        <div className={`card h-full flex flex-col justify-between !p-2.5 sm:!p-3 xl:!p-4 group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl
      ${isCritical ? 'border-nov-danger/50 bg-nov-danger/5' :
                isWarning ? 'border-nov-warning/50 bg-nov-warning/5' : 'hover:border-nov-accent/30'}
    `}>
            {/* Status Overlays */}
            {isCritical && <AlertTriangle className="absolute -bottom-4 -right-4 text-nov-danger/10 w-24 h-24" />}
            {!isCritical && !isWarning && <CheckCircle className="absolute -bottom-4 -right-4 text-nov-success/10 w-24 h-24" />}

            <div className="flex justify-between items-start mb-1.5 sm:mb-2 relative z-10">
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-nov-accent transition-colors">{name}</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{type}</p>
                </div>
                <div className={`
          px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase flex items-center gap-1
          ${status === 'running' ? 'bg-nov-success/20 text-nov-success' : 'bg-gray-700 text-gray-400'}
        `}>
                    {status === 'running' && <div className="w-1.5 h-1.5 rounded-full bg-nov-success animate-pulse" />}
                    {status}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-1.5 sm:mb-2 relative z-10">
                <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-gray-500 text-[10px]">Health Index</p>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-nov-danger' : isWarning ? 'bg-nov-warning' : 'bg-nov-success'
                                    }`}
                                style={{ width: `${health}%` }}
                            />
                        </div>
                        <span className="text-xs sm:text-sm font-bold">{health}%</span>
                    </div>
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-gray-500 text-[10px]">Run Hours</p>
                    <p className="font-sans tabular-nums text-xs sm:text-sm">{runningHours.toLocaleString()} h</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-white/5 pt-1.5 sm:pt-2 relative z-10 flex-grow overflow-y-auto min-h-0 custom-scrollbar">
                {metrics.map((m, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] sm:text-xs xl:text-sm bg-slate-800/50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border border-white/5">
                        <span className="text-gray-400 text-[10px] truncate max-w-[60%]" title={m.label}>{m.label}</span>
                        <div className="flex items-baseline gap-1">
                            <span className="font-sans tabular-nums font-medium text-white">{m.value}</span>
                            <span className="text-[9px] sm:text-[10px] text-gray-500">{m.unit}</span>
                        </div>
                    </div>
                ))}
            </div>

            {alerts.length > 0 && (
                <div className="mt-1.5 sm:mt-2 space-y-1.5 sm:space-y-2 relative z-10">
                    {alerts.map((alert, idx) => (
                        <div key={idx} className="bg-yellow-500/10 border border-yellow-500/20 rounded px-2.5 py-1.5 flex items-start gap-2">
                            <AlertTriangle size={12} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                            <span className="text-[10px] text-yellow-200">{alert}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
