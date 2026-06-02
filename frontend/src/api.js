import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Vite proxy handles redirection to http://localhost:8000
});

// Request interceptor to add Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor to handle Auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user_role');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const loginUser = async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await api.post('/auth/login', formData);
    return response.data;
}

export const registerUser = async (username, email, password) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
}

export const createUser = async (username, email, password, role = 'viewer') => {
    const response = await api.post('/auth/users', { username, email, password, role });
    return response.data;
}

export const createWell = async (wellData) => {
    const response = await api.post('/wells/', wellData);
    return response.data;
}

export const endWell = async (wellId) => {
    const response = await api.put(`/wells/${wellId}/end`);
    return response.data;
}

export const getActiveWell = async () => {
    try {
        const response = await api.get('/wells/active');
        return response.data;
    } catch {
        return null;
    }
}

export const getRigData = async () => {
    try {
        const response = await api.get('/rig/latest');
        if (response.data && !response.data.error) return response.data;
        return null;
    } catch {
        return null;
    }
};

export const getRigHistory = async (range = '-5m') => {
    try {
        const response = await api.get(`/rig/history?range=${range}`);
        return response.data || [];
    } catch {
        return [];
    }
};

export const getRigSensors = async () => {
    try {
        const response = await api.get('/rig/sensors');
        return response.data || {};
    } catch {
        return {};
    }
};

export const getUsers = async () => {
    try {
        const response = await api.get('/auth/users');
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const getEquipmentStatus = async () => {
    // Placeholder for equipment endpoint
    return null;
}

// ── Modbus Config ──────────────────────────────────────────
export const getModbusDevices = async () => {
    const response = await api.get('/modbus-config/');
    return response.data;
}

export const getModbusStatus = async () => {
    try {
        const response = await api.get('/modbus-config/status');
        return response.data;
    } catch {
        return {};
    }
}

export const createModbusDevice = async (data) => {
    const response = await api.post('/modbus-config/', data);
    return response.data;
}

export const updateModbusDevice = async (id, data) => {
    const response = await api.put(`/modbus-config/${id}`, data);
    return response.data;
}

export const deleteModbusDevice = async (id) => {
    const response = await api.delete(`/modbus-config/${id}`);
    return response.data;
}

export const toggleModbusDevice = async (id) => {
    const response = await api.put(`/modbus-config/${id}/toggle`);
    return response.data;
}

export const bulkUpdateRegisters = async (deviceId, registers) => {
    const response = await api.put(`/modbus-config/${deviceId}/registers/bulk`, registers);
    return response.data;
}

// ── Modbus Control ──────────────────────────────────────────
export const writeModbusCoil = async (deviceId, address, value, pin = null) => {
    const headers = pin ? { 'X-Safety-PIN': pin } : {};
    const response = await api.post('/modbus/write-coil', 
        { device_id: deviceId, address, value },
        { headers }
    );
    return response.data;
}

export const writeModbusRegister = async (deviceId, address, value, pin = null) => {
    const headers = pin ? { 'X-Safety-PIN': pin } : {};
    const response = await api.post('/modbus/write-register', 
        { device_id: deviceId, address, value },
        { headers }
    );
    return response.data;
}

export const writeModbusFloat = async (deviceId, address, value, pin = null) => {
    const headers = pin ? { 'X-Safety-PIN': pin } : {};
    const response = await api.post('/modbus/write-float', 
        { device_id: deviceId, address, value },
        { headers }
    );
    return response.data;
}

// ── Live Trend / History ─────────────────────────────────────
export const getRigHistoryRange = async (start, stop) => {
    try {
        const response = await api.get(`/rig/history-range?start=${encodeURIComponent(start)}&stop=${encodeURIComponent(stop)}`);
        return response.data || [];
    } catch {
        return [];
    }
};

export const exportExcel = async (startDate, endDate, fields = null) => {
    try {
        let url = `/export/excel?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
        if (fields && fields.length > 0) {
            url += `&fields=${encodeURIComponent(fields.join(','))}`;
        }
        const token = localStorage.getItem('token');
        const response = await fetch(`/api${url}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Export failed');
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `trend_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
        return true;
    } catch (err) {
        console.error('Excel export error:', err);
        return false;
    }
};

export const exportCsv = async (startDate, endDate, fields = null) => {
    try {
        let url = `/export/csv?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
        if (fields && fields.length > 0) {
            url += `&fields=${encodeURIComponent(fields.join(','))}`;
        }
        const token = localStorage.getItem('token');
        const response = await fetch(`/api${url}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('CSV Export failed');
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `trend_export_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
        return true;
    } catch (err) {
        console.error('CSV export error:', err);
        return false;
    }
};

export const exportWellData = async (wellId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/wells/${wellId}/export`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            throw new Error('Export failed or no data found');
        }
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        
        let filename = `well_export_${wellId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition && contentDisposition.includes('filename=')) {
            const match = contentDisposition.match(/filename=([^;]+)/);
            if (match && match[1]) filename = match[1];
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
        return true;
    } catch (err) {
        console.error('Well Data export error:', err);
        return false;
    }
};

// ── System Preferences ───────────────────────────────────────
export const getPreference = async (key) => {
    try {
        const response = await api.get(`/preferences/${key}`);
        return response.data.value;
    } catch {
        return null;
    }
};

export const setPreference = async (key, value) => {
    try {
        const response = await api.post(`/preferences/${key}`, value);
        return response.data;
    } catch (error) {
        console.error(`Failed to set preference ${key}:`, error);
        throw error;
    }
};
