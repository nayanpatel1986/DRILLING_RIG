import React, { useState, useEffect } from 'react';
import { EquipmentCard } from '../components/EquipmentCard';
import { getRigSensors } from '../api';
import { getStoredRole } from '../auth';

export default function Assets() {
    const role = getStoredRole();
    const isScrollable = role === 'admin' || role === 'viewer';
    const [sensors, setSensors] = useState({});

    // Simulate live data feed tracking for Mud Pump run hours
    const [pumpHours, setPumpHours] = useState({ 1: 8500.1, 2: 8320.4 });

    useEffect(() => {
        const fetchSensors = async () => {
            const data = await getRigSensors();
            if (data && Object.keys(data).length > 0) setSensors(data);
        };
        fetchSensors();
        const interval = setInterval(fetchSensors, 2000);
        return () => clearInterval(interval);
    }, []);

    // Interval to actively increment running hours if SPM indicates running
    useEffect(() => {
        const simInterval = setInterval(() => {
            setPumpHours(prev => {
                const next = { ...prev };
                [1, 2].forEach(i => {
                    const key = `MudPump_${i}`;
                    const spm = sensors[key]?.SPM || 0;
                    if (spm > 10) {
                        // Increment by a tiny fraction so it moves visibly for demo purposes
                        next[i] = next[i] + (Math.random() * 0.005);
                    }
                });
                return next;
            });
        }, 1000);
        return () => clearInterval(simInterval);
    }, [sensors]);


    // Build pump cards from live Telegraf data
    const pumps = [1, 2].map(i => {
        const key = `MudPump_${i}`;
        const data = sensors[key] || {};
        const spm = data.SPM || 0;
        const isRunning = spm > 10;

        const runningHours = pumpHours[i];

        // Calculate alerts
        const activeAlerts = [];
        if (runningHours > 8550) {
            activeAlerts.push(`Liner Piston Change Recommended (Due at 8500h)`);
        } else if (spm > 120) {
            activeAlerts.push('High SPM Warning');
        }

        return {
            name: `Mud Pump #${i}`,
            type: 'Triplex Pump',
            health: isRunning ? Math.min(100, 70 + spm / 5) : 0,
            runningHours: runningHours,
            status: isRunning ? 'running' : 'standby',
            alerts: activeAlerts,
            metrics: [
                { label: 'SPM', value: spm.toFixed(0), unit: 'spm' },
                { label: 'Discharge', value: isRunning ? (3200 + Math.random() * 50).toFixed(0) : '0', unit: 'psi' },
                { label: 'Vibration', value: isRunning ? (0.2 + Math.random() * 0.3).toFixed(2) : '0', unit: 'ips' },
                { label: 'Lube Oil Press', value: isRunning ? (45 + Math.random() * 5).toFixed(1) : '0', unit: 'psi' },
                { label: 'Lube Oil Temp', value: isRunning ? (140 + Math.random() * 10).toFixed(1) : '75', unit: '°F' },
                { label: 'Motor Current', value: isRunning ? (850 + Math.random() * 50).toFixed(0) : '0', unit: 'A' },
            ]
        };
    });

    const hasData = Object.keys(sensors).length > 0;

    return (
        <div className={`w-full flex flex-col ${isScrollable ? 'overflow-y-auto custom-scrollbar min-h-fit' : 'h-full overflow-hidden'} bg-[#0a0f19] px-4 py-3 text-white`}>
            {/* Compact Header */}
            <header className="shrink-0 mb-3 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Equipment Assets</h1>
                    <p className="text-xs text-gray-400">
                        Digital Twin Condition Monitoring
                        {hasData ? (
                            <span className="ml-3 text-green-400 text-xs font-bold">● LIVE</span>
                        ) : (
                            <span className="ml-3 text-gray-500 text-xs">● CONNECTING...</span>
                        )}
                    </p>
                </div>
            </header>

            {/* 2x2 Grid: All equipment cards */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${isScrollable ? 'pb-4' : 'flex-1 min-h-0 grid-rows-2'}`}>
                {pumps.map(p => (
                    <div key={p.name} className={isScrollable ? 'min-h-[200px]' : 'min-h-0 overflow-hidden'}>
                        <EquipmentCard {...p} />
                    </div>
                ))}
                <div className={isScrollable ? 'min-h-[200px]' : 'min-h-0 overflow-hidden'}>
                    <EquipmentCard
                        name="Main Drawworks"
                        type="Gear Driven"
                        health={0}
                        runningHours={5000}
                        status="standby"
                        metrics={[
                            { label: 'Hook Load', value: '0', unit: 'kdaN' },
                            { label: 'Block Vel', value: '0.0', unit: 'm/s' },
                            { label: 'Motor Current', value: '0', unit: 'A' }
                        ]}
                    />
                </div>
                <div className={isScrollable ? 'min-h-[200px]' : 'min-h-0 overflow-hidden'}>
                    <EquipmentCard
                        name="Air Compressor"
                        type="Screw Compressor"
                        health={0}
                        runningHours={6200}
                        status="standby"
                        metrics={[
                            { label: 'Discharge P', value: '0', unit: 'psi' },
                            { label: 'Air Flow', value: '0', unit: 'cfm' },
                            { label: 'Oil Temp', value: '0', unit: '°F' },
                            { label: 'Motor Current', value: '0', unit: 'A' },
                        ]}
                    />
                </div>
            </div>
        </div>
    );
}
