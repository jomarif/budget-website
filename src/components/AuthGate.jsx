// Blocks the app behind a simple email/password login until a Supabase
// session exists. Single personal user — no roles/invites, just sign in.

import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthGate({ children }) {
  const { session, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) {
    return <div className="auth-loading">🌸 Loading…</div>;
  }

  if (session) {
    return children;
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const { error: err } =
      mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (err) return setError(err.message);
    if (mode === 'signup') setNotice('Check your email to confirm, then sign in.');
  }

  return (
    <div className="auth-screen">
      <div className="auth-card card">
        <h1 className="app-title">
          <span className="heart">🌸</span> Bloom Budget
        </h1>
        <p className="auth-subtitle">
          {mode === 'signin' ? 'Sign in to sync your budget.' : 'Create your account.'}
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          {notice && <p className="auth-notice">{notice}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
        <button
          type="button"
          className="btn btn-sm auth-toggle"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError('');
            setNotice('');
          }}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
