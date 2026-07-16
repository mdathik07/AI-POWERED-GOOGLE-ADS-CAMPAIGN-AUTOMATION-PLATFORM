import { Link } from 'react-router-dom';
import { isLoggedIn } from '../auth.js';

const steps = [
  {
    title: '1. Chat about your business',
    text: 'Tell our AI assistant what you sell, who your customers are, and your budget — in plain language.',
  },
  {
    title: '2. Review your campaign',
    text: 'The AI drafts headlines, descriptions, and keywords that fit Google Ads rules. Edit anything you like.',
  },
  {
    title: '3. Launch safely',
    text: 'Your campaign is created paused — nothing spends until you press "Go live". You stay in control.',
  },
];

export default function HomePage() {
  const cta = isLoggedIn() ? '/chat' : '/signup';

  return (
    <main className="page">
      <section className="hero">
        <h1>
          Google Ads campaigns, <span className="accent">written by AI</span>,
          launched in minutes.
        </h1>
        <p className="hero-sub">
          AdPilot helps small businesses create professional Google Ads
          campaigns through a simple chat — no marketing expertise required.
        </p>
        <div className="hero-actions">
          <Link to={cta} className="btn btn-primary btn-lg">
            Create your first campaign
          </Link>
          <Link to="/login" className="btn btn-ghost btn-lg">
            I already have an account
          </Link>
        </div>
      </section>

      <section className="steps">
        {steps.map((s) => (
          <div className="card step-card" key={s.title}>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
