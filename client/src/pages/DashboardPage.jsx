import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { campaign as campaignApi } from '../api.js';

const STATUS_LABELS = {
  draft: { label: 'Draft', className: 'badge badge-draft' },
  paused: { label: 'Paused', className: 'badge badge-paused' },
  enabled: { label: 'Live', className: 'badge badge-live' },
  failed: { label: 'Failed', className: 'badge badge-failed' },
};

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    campaignApi
      .list()
      .then(({ data }) => setCampaigns(data.campaigns))
      .catch(() => setError('Could not load your campaigns.'));
  }, []);

  return (
    <main className="page page-medium">
      <div className="chat-header">
        <h2>My campaigns</h2>
        <Link to="/chat" className="btn btn-primary">
          + New campaign
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {campaigns === null && !error && <p className="muted">Loading…</p>}

      {campaigns?.length === 0 && (
        <div className="card empty-state">
          <p>No campaigns yet.</p>
          <Link to="/chat" className="btn btn-primary">
            Create your first campaign
          </Link>
        </div>
      )}

      {campaigns?.map((c) => {
        const status = STATUS_LABELS[c.status] || STATUS_LABELS.draft;
        return (
          <div className="card campaign-row" key={c._id}>
            <div>
              <h4>{c.campaignName || c.businessName || 'Untitled campaign'}</h4>
              <p className="muted">
                {c.keywords?.length || 0} keywords ·{' '}
                {c.headlines?.length || 0} headlines ·{' '}
                {c.dailyBudget ? `$${c.dailyBudget}/day` : 'no budget set'} ·{' '}
                {new Date(c.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className={status.className}>{status.label}</span>
          </div>
        );
      })}
    </main>
  );
}
