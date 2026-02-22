import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Lock, Mail, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.message || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500 mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Financial Reporting System</h1>
          <p className="text-slate-400 mt-2 text-sm">Secure Access Portal</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {success && (
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm text-center border border-emerald-100">
                {success}
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
