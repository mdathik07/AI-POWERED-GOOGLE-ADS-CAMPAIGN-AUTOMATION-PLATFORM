import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../api.js';
import { saveSession } from '../auth.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await auth.login(form);
      saveSession(data);
      navigate(location.state?.from || '/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-narrow">
      <div className="card auth-card">
        <h2>Welcome back</h2>
        <p className="muted">Log in to manage your campaigns.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onSubmit} className="form">
          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              required
              autoComplete="current-password"
            />
          </label>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="muted">
          No account yet? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </main>
  );
}
