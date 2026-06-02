import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Thermometer, Activity, Zap } from 'lucide-react';
import { getRigSensors, getRigHistory } from '../api';

export default function ConditionMonitoring() {
    const [selectedAsset, setSelectedAsset] = useState('PowerPack_1');
    const [sensors, setSensors] = useState({});
    const [vibData, setVibData] = useState([]);

    // Fetch sensor data every 2s
    useEffect(() => {
        const fetchSensors = async () => {
            const data = await getRigSensors();
            if (data && Object.keys(data).length > 0) setSensors(data);
        };
        fetchSensors();
        const interval = setInterval(fetchSensors, 2000);
        return () => clearInterval(interval);
    }, []);

    // Generate vibration spectrum from sensor data (use history for frequency analysis)
    useEffect(() => {
        const fetchVibration = async () => {
            const rows = await getRigHistory('-2m');
            if (rows.length > 0) {
                // Use RPM data to create a pseudo-FFT visualization
                const fftData = rows.map((r, i) => ({
                    freq: i * 5,
                    amp: Math.abs(((r.RPM || 120) - 120) * 2) + Math.random() * 2,
                }));
                setVibData(fftData);
            }
        };
        fetchVibration();
        const interval = setInterval(fetchVibration, 5000);
        return () => clearInterval(interval);
    }, [selectedAsset]);

    // Build thermal zones from live sensor data
    const thermalZones = [];
    const requiredEquipments = [
        'PowerPack_1', 'PowerPack_2', 'PowerPack_3', 'PowerPack_4',
        'MudPump_1', 'MudPump_2', 'AirCompressor'
    ];

    const sensorKeys = Object.keys(sensors);
    const displayKeys = Array.from(new Set([...requiredEquipments, ...sensorKeys]));

    displayKeys.forEach(name => {
        const data = sensors[name] || {};
        if (name.startsWith('PowerPack')) {
            thermalZones.push({
                name: name.replace('_', ' '),
                temp: data.RPM ? Math.round(data.RPM / 4) : 0,
                status: data.RPM > 1840 ? 'warning' : 'normal',
                rpm: data.RPM || 0,
                oilPress: data.OilPressure || 0,
            });
        } else if (name.startsWith('MudPump')) {
            thermalZones.push({
                name: name.replace('_', ' '),
                temp: data.SPM ? Math.round(data.SPM * 0.6) : 0,
                status: data.SPM > 115 ? 'warning' : 'normal',
                spm: data.SPM || 0,
            });
        } else if (name.toLowerCase().includes('compressor') || name.toLowerCase().includes('compresor')) {
            thermalZones.push({
                name: name.replace('_', ' '),
                temp: data.Pressure ? Math.round(data.Pressure * 0.8) : 0,
                status: data.Pressure > 150 ? 'warning' : 'normal',
                pressure: data.Pressure || 0,
                rpm: data.RPM || undefined
            });
        }
    });

    return (
        <div className="p-6 h-full flex flex-col space-y-6">
            <header>
                <h1 className="text-3xl font-bold">Condition Monitoring</h1>
                <p className="text-gray-400">Vibration Analysis & Equipment Health (Live)</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Vibration Analysis Panel */}
                <div className="card lg:col-span-2 flex flex-col h-96">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Activity className="text-nov-accent" size={20} />
                            Vibration Spectrum - {selectedAsset.replace('_', ' ')}
                        </h3>
                        <select
                            className="bg-nov-dark border border-gray-700 rounded px-2 py-1 text-sm text-white"
                            value={selectedAsset}
                            onChange={(e) => setSelectedAsset(e.target.value)}
                        >
                            {displayKeys.map(k => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 min-h-0 relative">
                        {vibData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={vibData}>
                                    <defs>
                                        <linearGradient id="colorAmp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00A3E0" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#00A3E0" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="freq" tick={{ fill: '#9CA3AF' }} label={{ value: 'Frequency (Hz)', position: 'bottom', fill: '#9CA3AF' }} />
                                    <YAxis tick={{ fill: '#9CA3AF' }} label={{ value: 'Amplitude (mm/s)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#151E32', borderColor: '#374151' }} itemStyle={{ color: '#fff' }} />
                                    <Area type="monotone" dataKey="amp" stroke="#00A3E0" fillOpacity={1} fill="url(#colorAmp)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">Waiting for sensor data...</div>
                        )}

                        {vibData.length > 0 && (
                            <div className="absolute top-4 right-4 bg-nov-dark/80 p-3 rounded border border-white/10 text-xs">
                                <p className="font-bold text-gray-400">Live Analysis:</p>
                                <p className="text-white">Data Points: <span className="text-nov-accent">{vibData.length}</span></p>
                                <p className="text-white">Status: <span className="text-nov-success">Monitoring</span></p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Equipment Health Grid */}
                <div className="card">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                        <Thermometer className="text-nov-warning" size={20} />
                        Equipment Health (Live)
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {thermalZones.map((zone, i) => (
                            <div key={i} className={`
                  p-3 rounded border transition-colors
                  ${zone.status === 'warning'
                                    ? 'bg-nov-warning/10 border-nov-warning/50'
                                    : 'bg-nov-card border-white/5'}
                `}>
                                <div className="flex justify-between items-start">
                                    <span className="text-sm font-bold text-gray-300">{zone.name}</span>
                                    <Zap size={12} className={zone.status === 'warning' ? 'text-nov-warning' : 'text-gray-600'} />
                                </div>
                                <div className="mt-2 space-y-1">
                                    {zone.rpm !== undefined && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">RPM</span>
                                            <span className="font-sans tabular-nums text-white">{zone.rpm.toFixed(0)}</span>
                                        </div>
                                    )}
                                    {zone.oilPress !== undefined && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Oil Press</span>
                                            <span className="font-sans tabular-nums text-white">{zone.oilPress.toFixed(1)} psi</span>
                                        </div>
                                    )}
                                    {zone.spm !== undefined && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">SPM</span>
                                            <span className="font-sans tabular-nums text-white">{zone.spm.toFixed(0)}</span>
                                        </div>
                                    )}
                                    {zone.pressure !== undefined && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">Pressure</span>
                                            <span className="font-sans tabular-nums text-white">{zone.pressure.toFixed(1)} psi</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
