import React, { useState, useEffect } from 'react';
import { getUsers, createUser, getModbusDevices, createModbusDevice, updateModbusDevice, deleteModbusDevice, toggleModbusDevice, bulkUpdateRegisters, getActiveWell, createWell, endWell, exportWellData, getModbusStatus } from '../api';
import { User, Plus, Shield, ShieldAlert, Trash2, Edit3, Power, CheckCircle, XCircle, ChevronDown, ChevronRight, Save, RotateCcw, Cpu, Wifi, WifiOff, LayoutPanelTop, StopCircle, Download } from 'lucide-react';

export default function Users() {
    const [activeTab, setActiveTab] = useState('users');

    return (
        <div className="p-6">
            <header className="mb-6">
                <h1 className="text-3xl font-bold">User Management</h1>
                <p className="text-gray-400">Manage system access, roles, and Modbus configuration</p>
            </header>

            {/* Tab Bar */}
            <div className="flex gap-1 mb-6 bg-gray-800/60 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'users'
                        ? 'bg-nov-accent text-white shadow-lg shadow-nov-accent/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <User size={16} /> Users
                </button>
                
                <button
                    onClick={() => setActiveTab('modbus')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'modbus'
                        ? 'bg-nov-accent text-white shadow-lg shadow-nov-accent/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Cpu size={16} /> Modbus Configuration
                </button>
                <button
                    onClick={() => setActiveTab('wells')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'wells'
                        ? 'bg-nov-accent text-white shadow-lg shadow-nov-accent/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <LayoutPanelTop size={16} /> Well Management
                </button>
            </div>

            {activeTab === 'users' && <UsersTab />}
            
            {activeTab === 'modbus' && <ModbusTab />}
            {activeTab === 'wells' && <WellManagementTab />}
        </div>
    );
}

// ─── Well Management Tab ────────────────────────────────────
function WellManagementTab() {
    const [activeWell, setActiveWell] = useState(null);
    const [autoExport, setAutoExport] = useState(true);
    const [form, setForm] = useState({ name: '', api_number: '', operator: 'NOV', description: '' });

    const fetchWell = async () => {
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
    };

    useEffect(() => {
        fetchWell();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createWell(form);
            setForm({ name: '', api_number: '', operator: 'NOV', description: '' });
            fetchWell();
            alert("New well created and activated successfully.");
        } catch (err) {
            const msg = err.response?.data?.detail || "Failed to start well. Ensure no other well is active.";
            alert(msg);
        }
    };

    const [exporting, setExporting] = useState(false);

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

    const handleEnd = async () => {
        if (!activeWell) return;
        
        let confirmMsg = `Are you sure you want to end '${activeWell.name}'?\n\nAll telemetry data for this well will be PERMANENTLY DELETED.`;
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
                fetchWell();
                alert("Well ended and data purged successfully.");
            } catch (err) {
                setExporting(false);
                alert("Failed to end the well.");
            }
        }
    };

    return (
        <div className="card bg-gray-800/40 border border-white/5 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <LayoutPanelTop className="text-nov-accent" /> Start New Well
            </h2>

            {activeWell ? (
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-6 rounded-lg mb-4 flex flex-col items-center text-center">
                    <CheckCircle size={32} className="mb-3 text-green-500" />
                    <p className="font-bold text-lg mb-1">A well is currently active: <span className="text-white">{activeWell.name}</span></p>
                    <p className="text-xs text-gray-400 mb-6 font-medium uppercase tracking-widest">
                        API: {activeWell.api_number}
                    </p>

                    <div className="w-full max-w-sm flex flex-col gap-3">
                        <button 
                            onClick={handleExport}
                            disabled={exporting}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all shadow-lg uppercase tracking-widest ${
                                exporting 
                                ? 'bg-green-600/50 text-white/70 cursor-not-allowed' 
                                : 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/20 active:scale-95'
                            }`}
                        >
                            <Download size={18} /> {exporting ? 'EXPORTING...' : 'EXPORT WELL DATA (XLSX)'}
                        </button>

                        <div className="flex items-center gap-3 px-2 py-1 mt-2">
                            <input 
                                type="checkbox" 
                                id="autoExportTab" 
                                checked={autoExport} 
                                onChange={(e) => setAutoExport(e.target.checked)}
                                className="w-5 h-5 rounded border-blue-500/30 bg-blue-500/10 text-nov-accent focus:ring-nov-accent focus:ring-offset-gray-900 cursor-pointer"
                            />
                            <label htmlFor="autoExportTab" className="text-xs text-blue-300 font-bold uppercase tracking-widest cursor-pointer select-none">
                                Auto-export data before ending
                            </label>
                        </div>

                        <button 
                            onClick={handleEnd}
                            className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-xl font-black text-sm transition-all shadow-lg shadow-red-500/20 active:scale-95 uppercase tracking-widest"
                        >
                            <StopCircle size={18} /> END ACTIVE WELL & DELETE DATA
                        </button>
                    </div>

                    <p className="text-[10px] text-gray-500 mt-4 leading-relaxed">
                        Ending the active well will finalize current data logging and permanently delete it. <br/>
                        Please export the data before ending the well. You can start a new well immediately after.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleCreate} className="space-y-4 max-w-xl">
                    <FormField label="Well Name *">
                        <input
                            placeholder="e.g. Well A"
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
                    <div className="pt-2">
                        <button type="submit" className="w-full py-2.5 bg-nov-accent rounded-lg text-white font-bold hover:bg-nov-accent/80 transition-colors">
                            Start Active Well
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

// ─── Users Tab ──────────────────────────────────────────────
function UsersTab() {
    const [users, setUsers] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState({ username: '', email: '', password: '', role: 'viewer' });
    const [error, setError] = useState('');
    const [canManageUsers, setCanManageUsers] = useState(false);

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(data);
            setError('');
            setCanManageUsers(true);
        } catch (err) {
            setCanManageUsers(false);
            if (err.response) {
                if (err.response.status === 401) {
                    setError('Session expired or unauthorized. Please log in again.');
                } else if (err.response.status === 403) {
                    setError('Access denied: Only administrators can manage users.');
                } else {
                    setError(`Failed to fetch users: ${err.response.data?.detail || err.response.statusText}`);
                }
            } else {
                setError('Failed to fetch users. Network error.');
            }
        }
    };
    useEffect(() => { fetchUsers(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createUser(form.username, form.email, form.password, form.role);
            setIsOpen(false);
            setForm({ username: '', email: '', password: '', role: 'viewer' });
            fetchUsers();
        } catch (err) {
            const message = err.response?.data?.detail || 'Failed to create user.';
            alert(message);
        }
    };

    return (
        <>
            {canManageUsers && (
                <div className="flex justify-end mb-4">
                    <button onClick={() => setIsOpen(true)} className="btn bg-nov-accent hover:bg-nov-accent/80 text-white flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors">
                        <Plus size={16} /> Add User
                    </button>
                </div>
            )}
            {canManageUsers && (
                <div className="grid gap-3 md:grid-cols-3 mb-4">
                    <div className="bg-gray-800/40 border border-white/5 rounded-xl p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-nov-accent mb-1">Admin</p>
                        <p className="text-sm text-gray-300">Full access to users, configuration, wells, and calibration actions.</p>
                    </div>
                    <div className="bg-gray-800/40 border border-white/5 rounded-xl p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-amber-400 mb-1">Operator</p>
                        <p className="text-sm text-gray-300">Can operate wells and calibration controls, but cannot manage users or system configuration.</p>
                    </div>
                    <div className="bg-gray-800/40 border border-white/5 rounded-xl p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Viewer</p>
                        <p className="text-sm text-gray-300">Read-only access to dashboards and monitoring screens.</p>
                    </div>
                </div>
            )}
            {error && <div className="bg-red-500/20 text-red-500 p-3 rounded mb-4">{error}</div>}
            {canManageUsers && (
                <div className="card overflow-hidden bg-gray-800/40 border border-white/5 rounded-xl">
                    <table className="w-full text-left border-collapse">
                        <thead><tr className="text-gray-500 text-sm border-b border-white/10"><th className="p-4">User</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Status</th></tr></thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.username} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4 flex items-center gap-3"><div className="p-2 bg-gray-700 rounded-full"><User size={16} /></div><span className="font-bold">{user.username}</span></td>
                                    <td className="p-4 text-gray-400">{user.email}</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold flex items-center w-fit gap-1 ${user.role === 'admin' ? 'bg-nov-accent/20 text-nov-accent' : user.role === 'operator' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-300'}`}>{user.role === 'admin' ? <ShieldAlert size={12} /> : <Shield size={12} />}{user.role.toUpperCase()}</span></td>
                                    <td className="p-4"><span className="text-green-500 text-sm">Active</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-xl w-96 border border-gray-700 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Add New User</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input placeholder="Username" required className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 focus:border-nov-accent focus:outline-none" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                            <input placeholder="Email" type="email" required className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 focus:border-nov-accent focus:outline-none" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            <input placeholder="Password" type="password" required className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 focus:border-nov-accent focus:outline-none" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                            <select className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 focus:border-nov-accent focus:outline-none" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                <option value="viewer">Viewer</option>
                                <option value="operator">Operator</option>
                                <option value="admin">Admin</option>
                            </select>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-nov-accent rounded-lg text-white font-bold">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Reusable Components ────────────────────────────────────
const inputClass = "w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 focus:border-nov-accent focus:outline-none transition-colors text-sm";
const inputMonoClass = inputClass + " font-mono";

function FormField({ label, children }) {
    return <div><label className="text-xs text-gray-400 mb-1 block">{label}</label>{children}</div>;
}

function FormSection({ title, expanded, onToggle, children }) {
    return (
        <div className="border border-white/5 rounded-lg overflow-hidden">
            <button type="button" onClick={onToggle} className="w-full flex items-center gap-2 px-4 py-3 bg-gray-900/50 text-sm font-semibold text-gray-300 hover:bg-gray-900/80 transition-colors">
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {title}
            </button>
            {expanded && <div className="p-4 space-y-3">{children}</div>}
        </div>
    );
}

function InfoCell({ label, value, mono }) {
    return (
        <div>
            <span className="text-xs text-gray-500 block">{label}</span>
            <span className={`text-sm text-gray-300 truncate block ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
        </div>
    );
}

// ─── Modbus Configuration Tab ────────────────────────────────
function ModbusTab() {
    console.log("ModbusTab loaded - v1.0.1 (TwinStop added)");
    const [devices, setDevices] = useState([]);
    const [statusMap, setStatusMap] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const [expandedReg, setExpandedReg] = useState(null);
    const [editingDevice, setEditingDevice] = useState(null);
    const [editDeviceForm, setEditDeviceForm] = useState({});
    const [editRegs, setEditRegs] = useState({});
    const [addForm, setAddForm] = useState({
        name: '', device_type: 'engine', ip_address: '', port: 502,
        slave_id: 1, protocol: 'tcp', baud_rate: 9600, timeout: '1s',
        measurement_name: 'rig_sensors'
    });

    const fetchDevices = async () => {
        try {
            const data = await getModbusDevices();
            setDevices(data);
        } catch (err) { console.error(err); alert('Failed to save!'); }
    };
    useEffect(() => { fetchDevices(); }, []);

    useEffect(() => {
        const fetchStatus = async () => {
            const data = await getModbusStatus();
            setStatusMap(data || {});
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await createModbusDevice(addForm);
            setShowAdd(false);
            setAddForm({ name: '', device_type: 'engine', ip_address: '', port: 502, slave_id: 1, protocol: 'tcp', baud_rate: 9600, timeout: '1s', measurement_name: 'rig_sensors' });
            fetchDevices();
        } catch (err) { console.error(err); alert('Failed to save!'); }
    };

    const handleToggle = async (id) => { await toggleModbusDevice(id); fetchDevices(); };
    const handleDelete = async (id) => { if (confirm('Delete this device?')) { await deleteModbusDevice(id); fetchDevices(); } };

    const handleUpdate = async (id, data) => {
        try {
            await updateModbusDevice(id, data);
            setEditingDevice(null);
            fetchDevices();
        } catch (err) { console.error(err); alert('Failed to save!'); }
    };

    const openEdit = (dev) => {
        setEditingDevice(dev.id);
        setEditDeviceForm({
            name: dev.name, device_type: dev.device_type,
            ip_address: dev.ip_address || '', port: dev.port,
            slave_id: dev.slave_id, protocol: dev.protocol,
            baud_rate: dev.baud_rate, timeout: dev.timeout,
            measurement_name: dev.measurement_name,
        });
    };

    const toggleRegs = (id) => {
        if (expandedReg === id) { setExpandedReg(null); return; }
        setExpandedReg(id);
        const dev = devices.find(d => d.id === id);
        if (dev) setEditRegs({ ...editRegs, [id]: JSON.parse(JSON.stringify(dev.registers)) });
    };

    const updateReg = (devId, idx, field, value) => {
        const regs = [...(editRegs[devId] || [])];
        let updatedReg = { ...regs[idx], [field]: value };
        
        // Auto-update register_type based on function_code
        if (field === 'function_code') {
            const code = Number(value);
            if ([1, 5, 15].includes(code)) updatedReg.register_type = 'coil';
            else if (code === 2) updatedReg.register_type = 'discrete';
            else if ([3, 6, 16].includes(code)) updatedReg.register_type = 'holding';
            else if (code === 4) updatedReg.register_type = 'input';
        }
        
        regs[idx] = updatedReg;
        setEditRegs({ ...editRegs, [devId]: regs });
    };

    // Returns the number of Modbus registers a given data type occupies (stride).
    const getRegisterStride = (dataType) => {
        if (['FLOAT64', 'FLOAT64-IEEE', 'INT64', 'UINT64'].includes(dataType)) return 4;
        if (['FLOAT32', 'FLOAT32-IEEE', 'INT32', 'UINT32'].includes(dataType)) return 2;
        return 1; // UINT16, INT16, FLOAT16, coils, etc.
    };

    const addReg = (devId) => {
        const regs = [...(editRegs[devId] || [])];
        // Auto-calculate the next available address based on the last register.
        let nextAddress = 0;
        if (regs.length > 0) {
            const last = regs[regs.length - 1];
            nextAddress = (last.address || 0) + getRegisterStride(last.data_type || 'FLOAT32');
        }
        regs.push({ field_name: '', register_type: 'holding', function_code: 3, address: nextAddress, data_type: 'FLOAT32', byte_order: 'ABCD', scale: 1.0, unit: '' });
        setEditRegs({ ...editRegs, [devId]: regs });
    };

    const delReg = (devId, idx) => {
        const regs = [...(editRegs[devId] || [])];
        regs.splice(idx, 1);
        setEditRegs({ ...editRegs, [devId]: regs });
    };

    const saveRegs = async (devId) => {
        try {
            await bulkUpdateRegisters(devId, editRegs[devId]);
            fetchDevices();
            alert('Modbus configuration saved successfully!');
        } catch (err) { 
            console.error(err);
            alert('Failed to save Modbus configuration.');
        }
    };

    const inputClass = 'bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none w-full';
    const typeLabels = { engine: 'Engine', mudpump: 'Mud Pump', bop: 'BOP', twinstop: 'TwinStop', daq10: 'DAQ-10' };
    const typeColors = { engine: 'text-orange-400 bg-orange-400/15', mudpump: 'text-blue-400 bg-blue-400/15', bop: 'text-red-400 bg-red-400/15', twinstop: 'text-cyan-400 bg-cyan-400/15', daq10: 'text-emerald-400 bg-emerald-400/15' };

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-gray-400">{devices.length} device(s) configured</div>
                <button onClick={() => setShowAdd(true)} className="btn btn-primary flex items-center gap-2">
                    <Plus size={16} /> Add Modbus Device
                </button>
            </div>

            {/* Add Device Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-xl w-[520px] border border-gray-700 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Add Modbus Device (V2)</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">Device Name *</label>
                                    <input required className={inputClass} placeholder="e.g. Engine 1"
                                        value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">Device Type *</label>
                                    <select className={inputClass}
                                        value={addForm.device_type} onChange={e => setAddForm({ ...addForm, device_type: e.target.value })}>
                                        <option value="engine">Engine</option>
                                        <option value="mudpump">Mud Pump</option>
                                        <option value="bop">BOP</option>
                                        <option value="twinstop">TwinStop</option>
                                        <option value="daq10">DAQ-10</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">Protocol</label>
                                    <select className={inputClass}
                                        value={addForm.protocol} onChange={e => setAddForm({ ...addForm, protocol: e.target.value })}>
                                        <option value="tcp">Modbus TCP</option>
                                        <option value="rtu">Modbus RTU</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">IP Address</label>
                                    <input className={inputClass} placeholder="192.168.1.10"
                                        value={addForm.ip_address} onChange={e => setAddForm({ ...addForm, ip_address: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">Port</label>
                                    <input type="number" className={inputClass}
                                        value={addForm.port} onChange={e => setAddForm({ ...addForm, port: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">Slave ID</label>
                                    <input type="number" className={inputClass}
                                        value={addForm.slave_id} onChange={e => setAddForm({ ...addForm, slave_id: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">Timeout</label>
                                    <input className={inputClass}
                                        value={addForm.timeout} onChange={e => setAddForm({ ...addForm, timeout: e.target.value })} />
                                </div>
                            </div>
                            {addForm.protocol === 'rtu' && (
                                <div>
                                    <label className="text-xs font-bold text-gray-400 mb-1 block">Baud Rate</label>
                                    <select className={inputClass}
                                        value={addForm.baud_rate} onChange={e => setAddForm({ ...addForm, baud_rate: Number(e.target.value) })}>
                                        <option value={9600}>9600</option>
                                        <option value={19200}>19200</option>
                                        <option value={38400}>38400</option>
                                        <option value={115200}>115200</option>
                                    </select>
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowAdd(false)} className="btn bg-gray-700 hover:bg-gray-600 text-gray-200">Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Device</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Device Cards */}
            <div className="space-y-4">
                {devices.map(dev => (
                    <div key={dev.id} className={`card border ${dev.is_enabled ? 'border-green-500/30' : 'border-gray-700'
                        } transition-all`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${typeColors[dev.device_type] || 'text-gray-400 bg-gray-400/15'}`}>
                                    <Cpu size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{dev.name}</h3>
                                    <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeColors[dev.device_type] || ''}`}>
                                            {typeLabels[dev.device_type] || dev.device_type}
                                        </span>
                                        <span className={`font-mono ${dev.ip_address ? 'text-cyan-400' : 'text-red-400'}`}>{dev.ip_address || 'No IP'}:{dev.port}</span>
                                        <span>Slave {dev.slave_id}</span>
                                        <span className="uppercase text-xs">{dev.protocol}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {dev.is_enabled && statusMap[dev.id] && (
                                    <span className={`flex items-center gap-1 text-[10px] font-black tracking-wider px-2.5 py-1 rounded-full ${statusMap[dev.id].connected ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${statusMap[dev.id].connected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></div>
                                        {statusMap[dev.id].connected ? 'CONNECTED' : 'DISCONNECTED'}
                                    </span>
                                )}
                                <span className={`flex items-center gap-1 text-xs font-bold ${dev.is_enabled ? 'text-green-400' : 'text-gray-500'
                                    }`}>
                                    {dev.is_enabled ? <Wifi size={14} /> : <WifiOff size={14} />}
                                    {dev.is_enabled ? 'ENABLED' : 'DISABLED'}
                                </span>
                                <button onClick={() => handleToggle(dev.id)}
                                    className={`p-2 rounded-lg transition-colors ${dev.is_enabled ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                        }`}>
                                    <Power size={16} />
                                </button>
                                <button onClick={() => openEdit(dev)} title="Edit Device"
                                    className="p-2 rounded-lg bg-gray-700 text-blue-400 hover:bg-blue-500/20 transition-colors">
                                    <Edit3 size={16} />
                                </button>
                                <button onClick={() => toggleRegs(dev.id)}
                                    className="p-2 rounded-lg bg-gray-700 text-cyan-400 hover:bg-gray-600 transition-colors">
                                    {expandedReg === dev.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                                <button onClick={() => handleDelete(dev.id)}
                                    className="p-2 rounded-lg bg-gray-700 text-red-400 hover:bg-red-500/20 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* ── Inline Edit Form ── */}
                        {editingDevice === dev.id && (
                            <div className="mt-4 pt-4 border-t border-white/10 bg-gray-900/50 -mx-4 -mb-4 p-4 rounded-b-xl">
                                <h4 className="font-bold text-sm text-blue-400 mb-3 flex items-center gap-2"><Edit3 size={14} /> Edit Device Connection</h4>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 mb-1 block">Device Name</label>
                                        <input className={inputClass} value={editDeviceForm.name}
                                            onChange={e => setEditDeviceForm({ ...editDeviceForm, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 mb-1 block">IP Address</label>
                                        <input className={inputClass} placeholder="e.g. 10.10.10.50" value={editDeviceForm.ip_address}
                                            onChange={e => setEditDeviceForm({ ...editDeviceForm, ip_address: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-3 mb-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 mb-1 block">Port</label>
                                        <input type="number" className={inputClass} value={editDeviceForm.port}
                                            onChange={e => setEditDeviceForm({ ...editDeviceForm, port: Number(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 mb-1 block">Slave ID</label>
                                        <input type="number" className={inputClass} value={editDeviceForm.slave_id}
                                            onChange={e => setEditDeviceForm({ ...editDeviceForm, slave_id: Number(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 mb-1 block">Protocol</label>
                                        <select className={inputClass} value={editDeviceForm.protocol}
                                            onChange={e => setEditDeviceForm({ ...editDeviceForm, protocol: e.target.value })}>
                                            <option value="tcp">Modbus TCP</option>
                                            <option value="rtu">Modbus RTU</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 mb-1 block">Timeout</label>
                                        <input className={inputClass} value={editDeviceForm.timeout}
                                            onChange={e => setEditDeviceForm({ ...editDeviceForm, timeout: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingDevice(null)} className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
                                    <button onClick={() => handleUpdate(dev.id, editDeviceForm)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                                        <Save size={14} /> Save Changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Registers Table (expanded) */}
                        {expandedReg === dev.id && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-bold text-sm text-gray-300">Modbus Register Map — {dev.registers?.length || 0} registers</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => addReg(dev.id)}
                                            className="text-xs bg-cyan-600/20 text-cyan-400 px-3 py-1 rounded hover:bg-cyan-600/30 flex items-center gap-1">
                                            <Plus size={12} /> Add Register
                                        </button>
                                        <button onClick={() => saveRegs(dev.id)}
                                            className="text-xs bg-green-600/20 text-green-400 px-3 py-1 rounded hover:bg-green-600/30 flex items-center gap-1">
                                            <Save size={12} /> Save
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-gray-500 text-xs border-b border-white/10">
                                                <th className="text-left p-2">Field Name</th>
                                                <th className="text-left p-2">Function</th>
                                                <th className="text-left p-2">Address</th>
                                                <th className="text-left p-2">Data Type</th>
                                                <th className="text-left p-2">Byte Order</th>
                                                <th className="text-left p-2">Scale</th>
                                                <th className="text-left p-2">Unit</th>
                                                <th className="text-right p-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(editRegs[dev.id] || dev.registers || []).map((reg, idx) => (
                                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="p-2">
                                                        <input className="bg-transparent border border-gray-700 rounded px-2 py-1 text-white text-xs w-28"
                                                            value={reg.field_name} onChange={e => updateReg(dev.id, idx, 'field_name', e.target.value)} />
                                                    </td>
                                                    <td className="p-2">
                                                        <select className="bg-gray-900 border border-gray-700 rounded px-1 py-1 text-[10px] text-white w-40"
                                                            value={reg.function_code || (reg.register_type === 'input' ? 4 : (reg.register_type === 'coil' ? 1 : 3))} 
                                                            onChange={e => updateReg(dev.id, idx, 'function_code', e.target.value)}>
                                                            <option value={1}>01 Read Coils (0x)</option>
                                                            <option value={2}>02 Read Discrete Inputs (1x)</option>
                                                            <option value={3}>03 Read Holding Registers (4x)</option>
                                                            <option value={4}>04 Read Input Registers (3x)</option>
                                                            <option value={5}>05 Write Single Coil</option>
                                                            <option value={6}>06 Write Single Register</option>
                                                            <option value={15}>15 Write Multiple Coils</option>
                                                            <option value={16}>16 Write Multiple Registers</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-2">
                                                        <input type="number" className="bg-transparent border border-gray-700 rounded px-2 py-1 text-cyan-400 font-mono text-xs w-16"
                                                            value={reg.address} onChange={e => updateReg(dev.id, idx, 'address', Number(e.target.value))} />
                                                    </td>
                                                    <td className="p-2">
                                                        <select className="bg-gray-900 border border-gray-700 rounded px-1 py-1 text-xs text-white"
                                                            value={reg.data_type} onChange={e => updateReg(dev.id, idx, 'data_type', e.target.value)}>
                                                            <option value="UINT16">UINT16</option>
                                                            <option value="INT16">INT16</option>
                                                            <option value="UINT32">UINT32</option>
                                                            <option value="INT32">INT32</option>
                                                            <option value="FLOAT32">FLOAT32</option>
                                                            <option value="FLOAT64">FLOAT64</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-2">
                                                        <select className="bg-gray-900 border border-gray-700 rounded px-1 py-1 text-xs text-white"
                                                            value={reg.byte_order} onChange={e => updateReg(dev.id, idx, 'byte_order', e.target.value)}>
                                                            <option value="ABCD">ABCD</option>
                                                            <option value="DCBA">DCBA</option>
                                                            <option value="BADC">BADC</option>
                                                            <option value="CDAB">CDAB</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-2">
                                                        <input type="number" step="0.01" className="bg-transparent border border-gray-700 rounded px-2 py-1 text-white text-xs w-14"
                                                            value={reg.scale} onChange={e => updateReg(dev.id, idx, 'scale', Number(e.target.value))} />
                                                    </td>
                                                    <td className="p-2">
                                                        <input className="bg-transparent border border-gray-700 rounded px-2 py-1 text-white text-xs w-14"
                                                            value={reg.unit || ''} onChange={e => updateReg(dev.id, idx, 'unit', e.target.value)} />
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        <button onClick={() => delReg(dev.id, idx)} className="text-red-400 hover:text-red-300">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {devices.length === 0 && (
                    <div className="text-center py-16 text-gray-500">
                        <Cpu size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-lg">No Modbus devices configured</p>
                        <p className="text-sm">Add your first engine, mud pump, or BOP device</p>
                    </div>
                )}
            </div>
        </>
    );
}

