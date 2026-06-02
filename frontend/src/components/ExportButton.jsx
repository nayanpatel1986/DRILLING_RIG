import React from 'react';
import { Download } from 'lucide-react';

export default function ExportButton() {
    const handleExport = () => {
        const token = localStorage.getItem('token');
        // Direct download link logic
        // For auth-protected downloads, we might need to fetch blob or use a signed URL.
        // For simplicity in this demo, accessing via window.open assumes browser handles auth (cookies) or we append token query param if supported.
        // But headers are harder with window.open.

        // Fetch method
        fetch('/api/export/csv?measurement=realtime_drilling', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "drilling_data.csv";
                document.body.appendChild(a);
                a.click();
                a.remove();
            })
            .catch(err => alert("Export failed"));
    };

    return (
        <button
            onClick={handleExport}
            className="btn bg-gray-800 hover:bg-gray-700 text-white"
        >
            <Download size={16} className="inline mr-2" /> Export Data
        </button>
    );
}
