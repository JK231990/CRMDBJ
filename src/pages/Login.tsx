import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';

export function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) setError(error);
      else setError('Account created. You can now sign in.');
    }
    setLoading(false);
  };

  const fillDemo = (role: string) => {
    setEmail(`${role}@dubaijewellery.example.ch`);
    setPassword('demo1234');
    setMode('login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-swiss-red rounded-2xl flex items-center justify-center mb-4 shadow-card">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-ink">Dubai Jewellery</h1>
          <p className="text-sm text-ink-secondary">AI CRM Platform</p>
          <p className="text-xs text-ink-muted mt-1">Zürich, Switzerland</p>
        </div>

        <div className="card p-6">
          <div className="flex gap-1 mb-6 bg-surface-light rounded-xl p-1">
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'login' ? 'bg-white text-ink shadow-card' : 'text-ink-secondary'}`}
              onClick={() => setMode('login')}
            >
              Sign In
            </button>
            <button
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'signup' ? 'bg-white text-ink shadow-card' : 'text-ink-secondary'}`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Your name" />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
            </div>

            {error && (
              <div className={`text-sm rounded-xl p-3 ${error.includes('created') ? 'bg-success-light text-success' : 'bg-error-light text-error'}`}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner size={16} /> : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 pt-6 border-t border-surface-border">
              <p className="text-xs text-ink-muted text-center mb-3">Quick demo login (password: demo1234)</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => fillDemo('admin')} className="btn-secondary text-xs py-1.5">Admin</button>
                <button onClick={() => fillDemo('manager')} className="btn-secondary text-xs py-1.5">Manager</button>
                <button onClick={() => fillDemo('sales1')} className="btn-secondary text-xs py-1.5">Sales</button>
                <button onClick={() => fillDemo('marketing')} className="btn-secondary text-xs py-1.5">Marketing</button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-ink-muted mt-6">
          Dubai Jewellery GmbH · Gasometerstrasse 27, 8005 Zürich
        </p>
      </div>
    </div>
  );
}
