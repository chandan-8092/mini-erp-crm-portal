import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center px-4 text-center">
      <div className="h-16 w-16 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20 flex items-center justify-center mb-6 animate-pulse">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight sm:text-4xl">
        Access Denied
      </h2>
      <p className="mt-3 max-w-md mx-auto text-base text-slate-400">
        You do not have the required role permissions to access this screen. If you believe this is an error, please contact your administrator.
      </p>
      <div className="mt-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900 text-sm font-semibold text-slate-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
