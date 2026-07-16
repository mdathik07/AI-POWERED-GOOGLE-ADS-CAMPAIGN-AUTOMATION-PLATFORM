import { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { campaign as campaignApi } from '../api.js';

export default function SuccessPage() {
  const location = useLocation();
  const result = location.state?.result;
  const [status, setStatus] = useState(result?.status || 'paused');
  const [error, setError] = useState('');
  const [enabling, setEnabling] = useState(false);

  if (!result) return <Navigate to="/dashboard" replace />;

  const enable = async () => {
    setError('');
    setEnabling(true);
    try {
      await campaignApi.enable(result.campaignId);
      setStatus('enabled');
    } catch (err) {
      setError(
        err.response?.data?.details ||
          err.response?.data?.error ||
          'Could not enable the campaign.'
      );
    } finally {
      setEnabling(false);
    }
  };

  return (
    <main className="page page-narrow">
      <div className="card success-card">
        <div className="success-icon">{status === 'enabled' ? '🎉' : '✅'}</div>
        <h2>
          {status === 'enabled'
            ? 'Your campaign is live!'
            : 'Campaign created (paused)'}
        </h2>
        <p className="muted">
          <strong>{result.campaignName}</strong> was created in your Google Ads
          account.
          {status !== 'enabled' &&
            ' It is paused and not spending yet — enable it when you are ready.'}
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        {status !== 'enabled' && (
          <button className="btn btn-primary btn-lg" onClick={enable} disabled={enabling}>
            {enabling ? 'Enabling…' : '▶ Go live now'}
          </button>
        )}

        <div className="page-actions center">
          <Link to="/dashboard" className="btn btn-ghost">
            View my campaigns
          </Link>
          <Link to="/chat" className="btn btn-ghost">
            Create another
          </Link>
        </div>
      </div>
    </main>
  );
}
