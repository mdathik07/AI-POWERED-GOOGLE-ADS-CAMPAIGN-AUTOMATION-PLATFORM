import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../api.js';
import { saveSession } from '../auth.js';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await auth.signup(form);
      saveSession(data);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-narrow">
      <div className="card auth-card">
        <h2>Create your account</h2>
        <p className="muted">Start advertising in minutes.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onSubmit} className="form">
          <label>
            Username
            <input
              name="username"
              value={form.username}
              onChange={onChange}
              required
              autoComplete="username"
            />
          </label>
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
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p className="muted">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
