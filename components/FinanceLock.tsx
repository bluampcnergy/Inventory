
import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldAlert } from './invoices/Icons';

interface FinanceLockProps {
  onUnlock: () => void;
}

const FinanceLock: React.FC<FinanceLockProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (password === 'karmayogi') {
      setIsAnimating(true);
      setTimeout(() => onUnlock(), 300);
    } else {
      setError(true);
      setPassword('');
      // Shake effect
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <div className={`flex items-center justify-center min-h-[60vh] transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      <div className="bg-white/80 backdrop-blur-xl border border-[#A8BF75]/30 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center">
        <div className="w-20 h-20 bg-[#8EBF45]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="text-[#8EBF45]" size={40} />
        </div>
        
        <h2 className="text-2xl font-black text-[#0D0D0D] mb-2">Finance Vault</h2>
        <p className="text-slate-500 text-sm mb-8 font-medium">Please enter the administrative password to access the Finance section.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl text-center font-bold tracking-[0.5em] focus:outline-none transition-all ${
                error 
                  ? 'border-red-400 animate-shake bg-red-50 text-red-600' 
                  : 'border-slate-100 focus:border-[#8EBF45] text-slate-900'
              }`}
            />
            {error && (
              <div className="absolute -bottom-6 left-0 right-0 text-red-500 text-[10px] font-bold uppercase flex items-center justify-center gap-1">
                <ShieldAlert size={12} /> Access Denied
              </div>
            )}
          </div>
          
          <button
            type="submit"
            className="w-full bg-[#0D0D0D] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#404040] transition-all hover:gap-3 group active:scale-95 shadow-xl disabled:opacity-50"
          >
            Unlock Finance <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 italic text-[10px] text-slate-400">
          This section contains sensitive documents and GST data.
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default FinanceLock;
