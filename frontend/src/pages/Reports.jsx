import React from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import ExportButton from '../components/ExportButton';

const REPORTS = [
    { id: 1, name: 'Daily Drilling Report (DDR)', date: '2023-11-24', size: '2.4 MB', type: 'PDF' },
    { id: 2, name: 'Engine Fuel Consumption', date: '2023-11-24', size: '156 KB', type: 'CSV' },
    { id: 3, name: 'Mud Pump Efficiency Analysis', date: '2023-11-23', size: '1.1 MB', type: 'PDF' },
    { id: 4, name: 'BHA & Bit Run Summary', date: '2023-11-23', size: '845 KB', type: 'PDF' },
    { id: 5, name: 'DDR - 2023-11-23', date: '2023-11-23', size: '2.3 MB', type: 'PDF' },
];

export default function Reports() {
    return (
        <div className="p-6">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Reports & Logs</h1>
                    <p className="text-gray-400">Automated Daily Reports and Performance Exports</p>
                </div>
                <ExportButton />
            </header>

            <div className="card">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Date Filter */}
                    <div className="bg-nov-dark border border-white/10 p-3 rounded flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Date Range</span>
                        <div className="flex items-center gap-2 text-white font-medium">
                            <Calendar size={16} />
                            <span>Nov 20, 2023 - Nov 24, 2023</span>
                        </div>
                    </div>

                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search reports..."
                        className="bg-nov-dark border border-white/10 rounded p-3 text-white focus:border-nov-accent outline-none"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-500 text-sm border-b border-white/10">
                                <th className="p-4 font-medium">Report Name</th>
                                <th className="p-4 font-medium">Date Generated</th>
                                <th className="p-4 font-medium">Type</th>
                                <th className="p-4 font-medium">Size</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {REPORTS.map((report) => (
                                <tr key={report.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="p-2 bg-nov-blue/10 text-nov-blue rounded group-hover:bg-nov-accent/20 group-hover:text-nov-accent transition-colors">
                                            <FileText size={20} />
                                        </div>
                                        <span className="font-medium">{report.name}</span>
                                    </td>
                                    <td className="p-4 text-gray-400">{report.date}</td>
                                    <td className="p-4">
                                        <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs font-bold">{report.type}</span>
                                    </td>
                                    <td className="p-4 text-gray-500 font-mono text-sm">{report.size}</td>
                                    <td className="p-4 text-right">
                                        <button className="text-gray-400 hover:text-nov-accent transition-colors">
                                            <Download size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
