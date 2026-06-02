import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api';
import { Lock, User } from 'lucide-react';
import { storeAuthSession } from '../auth';

export default function Login({ setAuth, setRole }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showSplash, setShowSplash] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 4000);
        return () => clearTimeout(timer);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const data = await loginUser(username, password);
            storeAuthSession(data);
            setAuth(true);
            setRole(data.role);
            navigate('/');
        } catch (err) {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-gray-900 via-slate-950 to-gray-900 px-4 py-12">
            {/* Top / Upper Side: Logo */}
            <div className="flex-1 flex items-center justify-center">
                <img src="/ongc_logo.png" alt="ONGC Logo" className="h-40 md:h-48 object-contain" />
            </div>

            {/* Center: Sign in Box / Splash Wait Message */}
            <div className="max-w-md w-full mx-auto my-8 min-h-[200px] flex items-center justify-center">
                {showSplash ? (
                    <div className="text-center text-nov-accent font-bold animate-pulse text-sm tracking-wider uppercase">
                        Starting Drillbit Twin...
                    </div>
                ) : (
                    <div className="w-full bg-gray-800/40 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-gray-700/50">
                        <p className="text-gray-400 mb-6 text-xs uppercase tracking-widest font-semibold text-center">Sign in to your account</p>
                        {error && <div className="bg-red-500/20 text-red-500 p-3 rounded-lg mb-6 text-sm text-center border border-red-500/30">{error}</div>}

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-1">Username</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-gray-950/60 border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white focus:border-nov-accent focus:ring-1 focus:ring-nov-accent outline-none transition-all"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 pl-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-gray-950/60 border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white focus:border-nov-accent focus:ring-1 focus:ring-nov-accent outline-none transition-all"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-nov-accent hover:bg-nov-accent/90 text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-nov-accent/25 mt-2"
                            >
                                Sign In
                            </button>
                        </form>
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
