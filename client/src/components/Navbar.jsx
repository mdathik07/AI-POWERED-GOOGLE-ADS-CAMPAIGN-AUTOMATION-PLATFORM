import { Link, NavLink, useNavigate } from 'react-router-dom';
import { isLoggedIn, getUser, clearSession } from '../auth.js';

export default function Navbar() {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();
  const user = getUser();

  const logout = () => {
    clearSession();
    navigate('/');
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-mark">▲</span> AdPilot
      </Link>
      <nav className="navbar-links">
        {loggedIn ? (
          <>
            <NavLink to="/chat">New Campaign</NavLink>
            <NavLink to="/dashboard">My Campaigns</NavLink>
            <span className="navbar-user">Hi, {user?.username || 'there'}</span>
            <button className="btn btn-ghost" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login">Log in</NavLink>
            <Link to="/signup" className="btn btn-primary btn-sm">
              Get started
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
