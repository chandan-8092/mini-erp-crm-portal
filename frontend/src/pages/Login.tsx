import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Frontend validations
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(typeof err === 'string' ? err : 'Invalid login credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center items-center gap-2.5">
          <ShieldCheck className="h-10 w-10 text-indigo-400" />
          <h2 className="text-center text-3xl font-extrabold text-slate-100 tracking-tight">
            ERP OPERATIONS
          </h2>
        </div>
        <p className="mt-2 text-center text-sm text-slate-400">
          mini ERP + CRM secure employee portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="tactile-panel py-8 px-6 sm:px-10 rounded-2xl">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-lg caution-stripes text-amber-400 text-sm flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 input-tactile rounded-lg text-slate-100 placeholder-slate-500 text-sm"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="mt-1.5 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 input-tactile rounded-lg text-slate-100 placeholder-slate-500 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-tactile w-full flex justify-center py-3.5 px-4 rounded-lg text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Verifying access...' : 'Authenticate Login'}
              </button>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-800/60 pt-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Test Accounts (Demo Mode)
            </h4>
            <div className="sunken-well p-4 rounded-xl grid grid-cols-2 gap-2.5 text-[11px] text-slate-400 font-mono">
              <div>
                <span className="text-slate-500">Admin:</span> admin@example.com
              </div>
              <div>
                <span className="text-slate-400 text-emerald-500/70">&bull;</span> admin123
              </div>
              <div>
                <span className="text-slate-500">Sales:</span> sales@example.com
              </div>
              <div>
                <span className="text-slate-400 text-emerald-500/70">&bull;</span> sales123
              </div>
              <div>
                <span className="text-slate-500">Warehouse:</span> warehouse@example.com
              </div>
              <div>
                <span className="text-slate-400 text-emerald-500/70">&bull;</span> warehouse123
              </div>
              <div>
                <span className="text-slate-500">Accounts:</span> accounts@example.com
              </div>
              <div>
                <span className="text-slate-400 text-emerald-500/70">&bull;</span> accounts123
              </div>
              <div className="col-span-2 text-center text-indigo-400 mt-2 border-t border-slate-800/40 pt-2 font-semibold">
                Universal Password: <span className="text-indigo-300 underline underline-offset-2">password123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
