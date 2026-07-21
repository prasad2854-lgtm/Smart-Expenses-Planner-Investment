import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { LayoutDashboard, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { NotificationToast, ToastType } from './NotificationToast';
import { Capacitor } from '@capacitor/core';

const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id';
const API_BASE_URL = Capacitor.isNativePlatform() ? 'https://smart-income-planner.onrender.com' : '';

interface AuthProps {
    onLogin: (token: string, user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const showNotification = (message: string, type: ToastType) => {
        setToast({ message, type });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || (!isLogin && !name)) {
            showNotification('Please fill in all fields', 'critical');
            return;
        }

        setLoading(true);
        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const body = isLogin ? { email, password } : { email, password, name };

            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            let data;
            try {
                data = await res.json();
            } catch (jsonErr) {
                if (!res.ok) throw new Error("Backend server is offline! Restart terminal.");
                throw new Error("Invalid response format from server");
            }

            if (!res.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            if (data.token && data.user) {
                onLogin(data.token, data.user);
            }
        } catch (err: any) {
            showNotification(err.message, 'critical');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: credentialResponse.credential })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Google authentication failed');

            if (data.token && data.user) {
                onLogin(data.token, data.user);
            }
        } catch (err: any) {
            showNotification(err.message, 'critical');
        } finally {
            setLoading(false);
        }
    };

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div className="min-h-screen bg-slate-900 flex flex-col justify-center relative overflow-hidden text-white sm:py-12">
                {/* Background Gradients */}
                <div className="absolute top-0 left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-pulse"></div>
                <div className="absolute bottom-0 right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-slate-800/10 backdrop-blur-3xl border border-white/5 skew-y-6 transform-gpu -z-10"></div>

                {toast && <NotificationToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

                <div className="relative px-6 py-10 bg-white/5 backdrop-blur-xl border border-white/10 sm:max-w-md sm:mx-auto sm:rounded-3xl shadow-2xl sm:p-12 z-10 mx-4">

                    <div className="flex justify-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
                            <LayoutDashboard size={32} className="text-white" />
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            {isLogin ? 'Smart Expenses Planner & Investment' : 'Create Account'}
                        </h2>
                        <p className="text-slate-400 mt-2 text-sm">
                            {isLogin ? 'Enter your details to access your dashboard' : 'Join us to manage your finances smartly'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                    <User size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                placeholder="Email Address"
                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                placeholder="Password"
                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold flex justify-center items-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Sign Up'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>



                    <p className="mt-8 text-center text-sm text-slate-400">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors focus:outline-none"
                        >
                            {isLogin ? 'Sign up now' : 'Sign in instead'}
                        </button>
                    </p>
                </div>
            </div>
        </GoogleOAuthProvider>
    );
};
