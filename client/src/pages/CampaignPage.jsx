import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { campaign as campaignApi } from '../api.js';

const LIMITS = { headline: 30, description: 90, keyword: 80 };

function ListEditor({ label, items, limit, minCount, onChange }) {
  const update = (i, value) => {
    const next = [...items];
    next[i] = value;
    onChange(next);
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, '']);

  return (
    <div className="field-group">
      <div className="field-group-header">
        <h4>{label}</h4>
        <button type="button" className="btn btn-ghost btn-sm" onClick={add}>
          + Add
        </button>
      </div>
      {items.map((item, i) => (
        <div className="list-row" key={i}>
          <input
            value={item}
            maxLength={limit}
            onChange={(e) => update(i, e.target.value)}
          />
          <span className={`char-count ${item.length > limit - 5 ? 'warn' : ''}`}>
            {item.length}/{limit}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => remove(i)}
            disabled={items.length <= (minCount || 0)}
            aria-label={`Remove ${label} ${i + 1}`}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default function CampaignPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initial = location.state?.campaign;
  const campaignId = location.state?.campaignId;

  const [data, setData] = useState(initial);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');

  if (!initial) return <Navigate to="/chat" replace />;

  const set = (patch) => setData((d) => ({ ...d, ...patch }));

  const launch = async () => {
    setError('');
    setLaunching(true);
    try {
      const { data: result } = await campaignApi.launch(data, campaignId);
      navigate('/success', { state: { result } });
    } catch (err) {
      setError(
        err.response?.data?.details ||
          err.response?.data?.error ||
          'Launch failed. Please try again.'
      );
    } finally {
      setLaunching(false);
    }
  };

  return (
    <main className="page page-medium">
      <h2>Review your campaign</h2>
      <p className="muted">
        Edit anything below. Your campaign is created <strong>paused</strong> —
        it won't spend money until you enable it.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="form-grid">
          <label>
            Business name
            <input
              value={data.businessName || ''}
              onChange={(e) => set({ businessName: e.target.value })}
            />
          </label>
          <label>
            Daily budget (USD)
            <input
              type="number"
              min="1"
              value={data.budget?.daily || ''}
              onChange={(e) =>
                set({ budget: { ...data.budget, daily: Number(e.target.value) } })
              }
            />
          </label>
          <label className="span-2">
            Landing page URL
            <input
              value={data.landingPageURLs?.[0] || ''}
              onChange={(e) => set({ landingPageURLs: [e.target.value] })}
              placeholder="https://your-website.com"
            />
          </label>
        </div>
      </div>

      <div className="card">
        <ListEditor
          label="Headlines (min 3)"
          items={data.adCopy?.headlines || []}
          limit={LIMITS.headline}
          minCount={3}
          onChange={(headlines) => set({ adCopy: { ...data.adCopy, headlines } })}
        />
        <ListEditor
          label="Descriptions (min 2)"
          items={data.adCopy?.descriptions || []}
          limit={LIMITS.description}
          minCount={2}
          onChange={(descriptions) => set({ adCopy: { ...data.adCopy, descriptions } })}
        />
        <ListEditor
          label="Keywords"
          items={data.keywords || []}
          limit={LIMITS.keyword}
          minCount={1}
          onChange={(keywords) => set({ keywords })}
        />
      </div>

      <div className="page-actions">
        <button className="btn btn-ghost" onClick={() => navigate('/chat')}>
          ← Back to chat
        </button>
        <button className="btn btn-primary btn-lg" onClick={launch} disabled={launching}>
          {launching ? 'Creating in Google Ads…' : '🚀 Create campaign (paused)'}
        </button>
      </div>
    </main>
  );
}
