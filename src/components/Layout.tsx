import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

interface LayoutProps { children: React.ReactNode; }

const MI = ({ icon, className = '', style = {} }: { icon: string; className?: string; style?: React.CSSProperties }) => (
  <span className={`mi ${className}`} style={style}>{icon}</span>
);

const baseNav = [
  { name: 'Dashboard', path: '/dashboard',          icon: 'dashboard'         },
  { name: 'Inventory',  path: '/inventory',           icon: 'inventory_2'       },
  { name: 'Registrasi', path: '/register-equipment',  icon: 'app_registration'  },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [drawer,        setDrawer]        = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const nav = user?.role === 'superadmin'
    ? [...baseNav, { name: 'Admin', path: '/admin', icon: 'admin_panel_settings' }]
    : baseNav;

  /* Active: exact match OR starts with path (for nested routes like /inventory/:id) */
  const active = (p: string) =>
    location.pathname === p ||
    (p !== '/dashboard' && location.pathname.startsWith(p + '/'));

  const initials = user?.fullName
    ?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const doLogout = async () => {
    setLogoutConfirm(false);
    setDrawer(false);
    await signOut();
    navigate('/login');
  };

  /* ── Logout confirmation modal ───────────────────────────────────────────── */
  const LogoutModal = () => (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(40,52,57,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="animate-scaleIn" style={{
        background: 'var(--surface-container-lowest)', borderRadius: 18, padding: 28,
        width: '100%', maxWidth: 320, boxShadow: '0 24px 64px rgba(40,52,57,0.2)',
      }}>
        <div style={{ width: 52, height: 52, background: 'rgba(254,137,131,0.15)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <MI icon="logout" style={{ color: 'var(--error)', fontSize: 24 }} />
        </div>
        <h3 style={{ fontFamily: 'Manrope', fontSize: 17, fontWeight: 800, color: 'var(--on-surface)', textAlign: 'center', marginBottom: 8 }}>
          Keluar dari Sistem?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
          Sesi Anda akan diakhiri. Pastikan semua pekerjaan sudah tersimpan.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setLogoutConfirm(false)} className="btn btn-secondary" style={{ flex: 1 }}>
            Batal
          </button>
          <button onClick={doLogout} className="btn btn-danger" style={{ flex: 1, gap: 6 }}>
            <MI icon="logout" className="mi-sm" /> Keluar
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Sidebar nav link ────────────────────────────────────────────────────── */
  const NavLink = ({ item, onClick }: { item: typeof nav[0]; onClick?: () => void }) => (
    <Link to={item.path} onClick={onClick}
      className={`nav-item${active(item.path) ? ' active' : ''}`}>
      <MI icon={item.icon} style={{ color: active(item.path) ? 'var(--primary)' : 'var(--outline)', fontSize: 20 }} />
      <span>{item.name}</span>
    </Link>
  );

  /* ── User chip ───────────────────────────────────────────────────────────── */
  const UserChip = ({ size = 32 }: { size?: number }) => (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.25),
      background: 'linear-gradient(135deg,#455f88,#39537c)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.34), fontWeight: 700, color: '#fff',
      fontFamily: 'Manrope', flexShrink: 0,
    }}>
      {initials}
    </div>
  );

  return (
    <div className="app-layout">

      {/* ══════════════════════════════════════════════════════════════════
          PC SIDEBAR — visible only on ≥1024px via CSS .pc-sidebar
      ══════════════════════════════════════════════════════════════════ */}
      <aside className="pc-sidebar">
        {/* Brand */}
        <div style={{ marginBottom: 32, paddingLeft: 6 }}>
          <h1 style={{ fontFamily: 'Manrope', fontWeight: 900, fontSize: 19, color: '#1A365D', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Safety First
          </h1>
          <p style={{ fontFamily: 'Manrope', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--outline)', marginTop: 4 }}>
            EHS Division
          </p>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {nav.map(item => <NavLink key={item.path} item={item} />)}
        </nav>

        {/* User + Logout */}
        <div style={{ borderTop: '1px solid var(--surface-container)', paddingTop: 16, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* User info row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', marginBottom: 4 }}>
            <UserChip size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 12, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.fullName}
              </p>
              <p style={{ fontSize: 10, color: 'var(--outline)', textTransform: 'capitalize', marginTop: 1 }}>
                {user?.role}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button className="nav-item logout-item" onClick={() => setLogoutConfirm(true)}>
            <MI icon="logout" style={{ color: 'var(--outline)', fontSize: 20 }} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE TOP BAR — visible only on <1024px via CSS .m-topbar
      ══════════════════════════════════════════════════════════════════ */}
      <div className="m-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#455f88,#39537c)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MI icon="security" className="mi-fill" style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <div>
            <p style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 15, color: '#1A365D', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Safety First
            </p>
            <p style={{ fontSize: 9, color: 'var(--outline)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Manrope', fontWeight: 600 }}>
              EHS Division
            </p>
          </div>
        </div>
        {/* Menu button — opens drawer for extra items (admin, etc.) */}
        <button
          onClick={() => setDrawer(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', borderRadius: 8 }}>
          <MI icon="menu" style={{ fontSize: 22 }} />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE DRAWER — side panel with ALL nav + logout
      ══════════════════════════════════════════════════════════════════ */}
      {drawer && (
        <>
          <div className="m-drawer-overlay" onClick={() => setDrawer(false)} />
          <div className="m-drawer" style={{ padding: '20px 14px 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <h1 style={{ fontFamily: 'Manrope', fontWeight: 900, fontSize: 18, color: '#1A365D', letterSpacing: '-0.03em' }}>
                  Safety First
                </h1>
                <p style={{ fontFamily: 'Manrope', fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--outline)', marginTop: 3 }}>
                  EHS Division
                </p>
              </div>
              <button onClick={() => setDrawer(false)} className="btn-icon">
                <MI icon="close" />
              </button>
            </div>

            {/* Nav */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
              {nav.map(item => <NavLink key={item.path} item={item} onClick={() => setDrawer(false)} />)}
            </nav>

            {/* User + logout */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--surface-container)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 14px', marginBottom: 10 }}>
                <UserChip size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.fullName}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--outline)', textTransform: 'capitalize', marginTop: 1 }}>
                    {user?.role}
                  </p>
                </div>
              </div>
              <button
                className="btn btn-danger"
                style={{ width: '100%', height: 44, gap: 8 }}
                onClick={() => { setDrawer(false); setLogoutConfirm(true); }}>
                <MI icon="logout" className="mi-sm" /> Keluar dari Sistem
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════════ */}
      <div className="main-wrap">

        {/* PC Top bar — visible only on ≥1024px */}
        <header className="pc-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2 style={{ fontFamily: 'Manrope', fontSize: 17, fontWeight: 700, color: '#1A365D', letterSpacing: '-0.02em' }}>
              EHS Management
            </h2>
            <div style={{ width: 1, height: 22, background: 'var(--surface-container)' }} />
            {/* Global search */}
            <div style={{ position: 'relative' }}>
              <MI icon="search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)', fontSize: 16, pointerEvents: 'none' }} />
              <input
                className="input-field"
                placeholder="Cari peralatan..."
                style={{ paddingLeft: 34, width: 230, height: 36, fontSize: 13 }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const q = (e.target as HTMLInputElement).value.trim();
                    if (q) navigate(`/inventory?q=${encodeURIComponent(q)}`);
                  }
                }}
              />
            </div>
          </div>

          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 20, borderLeft: '1px solid var(--surface-container)' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: 'Manrope', fontSize: 12, fontWeight: 700, color: 'var(--on-surface)' }}>
                {user?.fullName}
              </p>
              <p style={{ fontSize: 10, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 1, fontFamily: 'Manrope', fontWeight: 600 }}>
                {user?.role === 'superadmin' ? 'Superadmin' : 'Safety Inspector'}
              </p>
            </div>
            <UserChip size={38} />
          </div>
        </header>

        {/* Page content */}
        <div className="page-scroll" style={{ flex: 1 }}>
          {children}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE BOTTOM NAV — visible only on <1024px via CSS .bottom-nav
          Max 4 items + logout button
      ══════════════════════════════════════════════════════════════════ */}
      <nav className="bottom-nav">
        {/* Show first 3 nav items always */}
        {nav.slice(0, 3).map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-nav-item${active(item.path) ? ' active' : ''}`}>
            {active(item.path) && <span className="nav-pill" />}
            <MI icon={item.icon} className="nav-icon" />
            <span className="nav-label">{item.name}</span>
          </Link>
        ))}

        {/* 4th slot: Admin (if superadmin) or menu button */}
        {user?.role === 'superadmin' ? (
          <Link
            to="/admin"
            className={`bottom-nav-item${active('/admin') ? ' active' : ''}`}>
            {active('/admin') && <span className="nav-pill" />}
            <MI icon="admin_panel_settings" className="nav-icon" />
            <span className="nav-label">Admin</span>
          </Link>
        ) : (
          /* Empty slot for symmetry, or show menu */
          <button
            className="bottom-nav-item"
            onClick={() => setDrawer(true)}
            style={{ color: 'var(--outline)' }}>
            <MI icon="menu" className="nav-icon" />
            <span className="nav-label">Menu</span>
          </button>
        )}

        {/* Logout — always visible in bottom nav */}
        <button
          className="bottom-nav-item"
          onClick={() => setLogoutConfirm(true)}
          style={{ color: 'var(--error)' }}>
          <MI icon="logout" className="nav-icon" style={{ color: 'var(--error)' }} />
          <span className="nav-label" style={{ color: 'var(--error)' }}>Keluar</span>
        </button>
      </nav>

      {/* Logout modal */}
      {logoutConfirm && <LogoutModal />}
    </div>
  );
};
