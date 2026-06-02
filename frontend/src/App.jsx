import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'

import Assets from './pages/Assets'
import Reports from './pages/Reports'
import Login from './pages/Login'
import WellManager from './components/WellManager'
import Users from './pages/Users'

import BOP from './pages/BOP'
import EDR from './pages/EDR'
import LiveTrend from './pages/LiveTrend'
import DrillingTwin from './pages/DrillingTwin'
import EnergyDashboard from './pages/EnergyDashboard'
import EngineDetails from './pages/EngineDetails'
import OperationsDashboards from './pages/OperationsDashboards'
import { clearAuthSession, getStoredRole, hasStoredToken, isAdmin, isOperator, storeAuthSession } from './auth';
import { loginUser } from './api';

function AutoLogin({ setAuth, setRole }) {
    const navigate = React.useRouter ? React.useRouter().navigate : null; // fallback
    const [error, setError] = useState('');
    const [timerFinished, setTimerFinished] = useState(false);
    const [loginData, setLoginData] = useState(null);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setTimerFinished(true);
        }, 3000);

        const doLogin = async () => {
            try {
                const data = await loginUser('Driller', 'operator123');
                setLoginData(data);
            } catch (err) {
                setError('Auto-login failed. Backend may be unreachable or Driller account missing.');
            }
        };
        doLogin();

        return () => clearTimeout(timer);
    }, []);

    React.useEffect(() => {
        if (timerFinished && loginData) {
            storeAuthSession(loginData);
            setAuth(true);
            setRole(loginData.role);
            window.location.href = '/';
        }
    }, [timerFinished, loginData, setAuth, setRole]);

    return (
        <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-gray-900 via-slate-950 to-gray-900 px-4 py-12">
            {/* Top / Upper Side: Logo */}
            <div className="flex-1 flex items-center justify-center">
                <img src="/ongc_logo.png" alt="ONGC Logo" className="h-40 md:h-48 object-contain" />
            </div>

            {/* Center: Status Box */}
            <div className="max-w-md w-full mx-auto bg-gray-800/40 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-gray-700/50 my-8 text-center">
                {error ? (
                    <div className="bg-red-500/20 text-red-500 p-3 rounded-lg text-sm border border-red-500/30">{error}</div>
                ) : (
                    <div className="text-nov-accent font-bold animate-pulse text-sm tracking-wider uppercase">
                        Starting Drillbit Twin...
                    </div>
                )}
            </div>

            {/* Bottom Side: Branding Text */}
            <div className="flex-1 flex flex-col justify-end text-center">
                <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-wide drop-shadow-lg">
                    DRILLBIT_TWIN
                </h1>
                <p className="text-2xl md:text-3xl font-bold text-nov-accent mt-3 tracking-widest uppercase">
                    (Drilling Services ANKLESHWAR)
                </p>
            </div>
        </div>
    );
}

class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, message: '' }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, message: error?.message || 'Unexpected application error' }
    }

    componentDidCatch(error) {
        console.error('App render error:', error)
    }

    handleReset = () => {
        clearAuthSession()
        window.location.href = '/login'
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-6">
                    <div className="max-w-lg w-full bg-slate-900 border border-red-500/20 rounded-2xl p-8 text-center shadow-2xl">
                        <h1 className="text-2xl font-black mb-3">Application Recovery</h1>
                        <p className="text-red-300 mb-2">The page hit a client-side error while loading.</p>
                        <p className="text-sm text-slate-400 mb-6">{this.state.message}</p>
                        <button
                            onClick={this.handleReset}
                            className="px-5 py-3 rounded-lg bg-nov-accent text-white font-bold hover:bg-nov-accent/80 transition-colors"
                        >
                            Reset Session And Open Login
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

function ProtectedRoute({ children, isAuthenticated }) {
    if (!isAuthenticated) return <Navigate to="/login" />;
    return children;
}

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(hasStoredToken());
    const [role, setRole] = useState(getStoredRole());

    const handleLogout = () => {
        clearAuthSession();
        setIsAuthenticated(false);
        setRole('viewer');
    };

    return (
        <AppErrorBoundary>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login setAuth={setIsAuthenticated} setRole={setRole} />} />
                    <Route path="/operator-autologin" element={<AutoLogin setAuth={setIsAuthenticated} setRole={setRole} />} />

                    <Route path="/*" element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <AppShell
                                role={role}
                                handleLogout={handleLogout}
                            />
                        </ProtectedRoute>
                    } />
                </Routes>
            </BrowserRouter>
        </AppErrorBoundary>
    );
}

function AppShell({ role }) {
    const location = useLocation();
    const operatorOnly = isOperator(role);
    const isTwinPage = location.pathname === '/twin' || location.pathname === '/';
    const isEdrPage  = location.pathname === '/edr';
    const isScrollableMode = role === 'admin' || role === 'viewer';
    const contentPaddingClass = isEdrPage
        ? (isScrollableMode ? 'p-0 overflow-y-auto custom-scrollbar flex flex-col' : 'min-h-0 overflow-hidden flex flex-col')
        : isTwinPage
            ? (isScrollableMode ? 'px-1 pt-1 pb-4 overflow-y-auto custom-scrollbar flex flex-col' : 'px-1 pt-1 pb-4 overflow-hidden flex flex-col')
            : 'p-6 overflow-y-auto custom-scrollbar';

    return (
        <div className="flex h-screen w-full bg-nov-dark text-white overflow-hidden">
            <main className="flex-1 flex flex-col overflow-hidden bg-slate-900/50 relative w-full">
                <WellManager role={role} />
                <div className={`flex-1 ${contentPaddingClass}`}>
                    <Routes>
                        <Route path="/" element={<Navigate to={`/twin${location.search}`} replace />} />
                        <Route path="/twin" element={<DrillingTwin />} />
                        {!operatorOnly && <Route path="/operations" element={<OperationsDashboards />} />}
                        {!operatorOnly && <Route path="/energy" element={<EnergyDashboard />} />}
                        {!operatorOnly && <Route path="/bop" element={<BOP />} />}
                        {!operatorOnly && <Route path="/edr" element={<EDR />} />}
                        {!operatorOnly && <Route path="/trends" element={<LiveTrend />} />}
                        {!operatorOnly && <Route path="/assets" element={<Assets />} />}
                        {!operatorOnly && <Route path="/reports" element={<Reports />} />}
                        {!operatorOnly && <Route path="/users" element={isAdmin(role) ? <Users /> : <Navigate to="/twin" replace />} />}
                        {!operatorOnly && <Route path="/engine/:id" element={<EngineDetails />} />}
                        <Route path="*" element={<Navigate to="/twin" replace />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
}

function NavLink({ to, icon, label, isOpen, setOpen }) {
    return (
        <Link
            to={to}
            onClick={() => setOpen(false)}
            className={`flex items-center text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors group ${isOpen ? 'gap-3 px-4 py-3' : 'justify-center py-3'}`}
            title={!isOpen ? label : undefined}
        >
            <span className="text-gray-400 group-hover:text-nov-accent transition-colors flex-shrink-0">{icon}</span>
            {isOpen && <span className="font-medium whitespace-nowrap truncate">{label}</span>}
        </Link>
    )
}

export default App
