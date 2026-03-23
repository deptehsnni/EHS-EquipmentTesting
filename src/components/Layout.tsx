import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

interface LayoutProps { children: React.ReactNode; }

const MI = ({ icon, className = '', style = {} }: { icon: string; className?: string; style?: React.CSSProperties }) => (
  <span className={`mi ${className}`} style={style}>{icon}</span>
);

const baseNav = [
  { name: 'Dashboard', path: '/dashboard',         icon: 'dashboard'        },
  { name: 'Inventory',  path: '/inventory',          icon: 'inventory_2'      },
  { name: 'Registrasi', path: '/register-equipment', icon: 'app_registration' },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [drawer,        setDrawer]        = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [mSearch,       setMSearch]       = useState('');

  const nav = user?.role === 'superadmin'
    ? [...baseNav, { name: 'Admin', path: '/admin', icon: 'admin_panel_settings' }]
    : baseNav;

  const active   = (p: string) => location.pathname === p || location.pathname.startsWith(p + '/');
  const initials = user?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const doLogout = async () => {
    setLogoutConfirm(false);
    setDrawer(false);
    await signOut();
    navigate('/login');
  };

  /* ── Logout Modal ─────────────────────────────────────────────────────── */
  const LogoutModal = () => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(40,52,57,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="animate-scaleIn" style={{ background: 'var(--surface-container-lowest)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 320, boxShadow: '0 24px 64px rgba(40,52,57,0.18)' }}>
        <div style={{ width: 48, height: 48, background: 'rgba(254,137,131,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <MI icon="logout" style={{ color: 'var(--error)', fontSize: 22 }} />
        </div>
        <h3 style={{ fontFamily: 'Manrope', fontSize: 17, fontWeight: 800, color: 'var(--on-surface)', textAlign: 'center', marginBottom: 8 }}>Keluar dari Sistem?</h3>
        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
          Sesi Anda akan diakhiri. Pastikan pekerjaan sudah tersimpan.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setLogoutConfirm(false)} className="btn btn-secondary" style={{ flex: 1 }}>Batal</button>
          <button onClick={doLogout} className="btn btn-danger" style={{ flex: 1, gap: 6 }}>
            <MI icon="logout" className="mi-sm" /> Keluar
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Nav link ─────────────────────────────────────────────────────────── */
  const NavLink = ({ item, onClick }: { item: typeof nav[0]; onClick?: () => void }) => (
    <Link to={item.path} onClick={onClick}
      className={`nav-item ${active(item.path) ? 'active' : ''}`}>
      <MI icon={item.icon} className="mi-md" style={{ color: active(item.path) ? 'var(--primary)' : 'var(--outline)' }} />
      <span>{item.name}</span>
    </Link>
  );

  return (
    <div className="app-layout">

      {/* ════════════════════════════════════
          PC SIDEBAR
      ════════════════════════════════════ */}
      <aside className="sidebar hidden lg:flex" style={{ flexDirection: 'column', padding: '24px 16px' }}>

        {/* Brand */}
        <div style={{ marginBottom: 36, paddingLeft: 8 }}>
          <h1 style={{ fontFamily: 'Manrope', fontWeight: 900, fontSize: 20, color: '#1A365D', letterSpacing: '-0.03em', lineHeight: 1.1 }}>Safety First</h1>
          <p style={{ fontFamily: 'Manrope', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--outline)', marginTop: 4 }}>EHS Division</p>
        </div>

        {/* Main nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {nav.map(item => <NavLink key={item.path} item={item} />)}
        </nav>

        {/* Bottom: user + help + logout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, borderTop: '1px solid var(--surface-container)', paddingTop: 16, marginTop: 16 }}>
          {/* User chip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#455f88,#39537c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, fontFamily: 'Manrope' }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="truncate" style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 12, color: 'var(--on-surface)' }}>{user?.fullName}</p>
              <p style={{ fontSize: 10, color: 'var(--outline)', textTransform: 'capitalize', marginTop: 1 }}>{user?.role}</p>
            </div>
          </div>

          {/* Logout */}
          <button className="nav-item logout-item" onClick={() => setLogoutConfirm(true)}>
            <MI icon="logout" className="mi-md" style={{ color: 'var(--outline)' }} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════
          MOBILE TOP BAR
      ════════════════════════════════════ */}
      <div className="m-topbar lg:hidden">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#455f88,#39537c)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MI icon="security" style={{ color: '#fff', fontSize: 16 }} className="mi-fill" />
          </div>
          <div>
            <p style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 15, color: '#1A365D', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Safety First</p>
            <p style={{ fontSize: 9, color: 'var(--outline)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Manrope', fontWeight: 600 }}>EHS Division</p>
          </div>
        </div>
        <button onClick={() => setDrawer(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center' }}>
          <MI icon="menu" />
        </button>
      </div>

      {/* ════════════════════════════════════
          MOBILE DRAWER
      ════════════════════════════════════ */}
      {drawer && (
        <div className="lg:hidden">
          <div className="m-drawer-overlay" onClick={() => setDrawer(false)} />
          <div className="m-drawer" style={{ padding: '24px 16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
              <div>
                <h1 style={{ fontFamily: 'Manrope', fontWeight: 900, fontSize: 18, color: '#1A365D', letterSpacing: '-0.03em' }}>Safety First</h1>
                <p style={{ fontFamily: 'Manrope', fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--outline)', marginTop: 3 }}>EHS Division</p>
              </div>
              <button onClick={() => setDrawer(false)} className="btn-icon">
                <MI icon="close" />
              </button>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {nav.map(item => <NavLink key={item.path} item={item} onClick={() => setDrawer(false)} />)}
            </nav>

            {/* Logout in drawer */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--surface-container)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#455f88,#39537c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0, fontFamily: 'Manrope' }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="truncate" style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, color: 'var(--on-surface)' }}>{user?.fullName}</p>
                  <p style={{ fontSize: 10, color: 'var(--outline)', textTransform: 'capitalize', marginTop: 1 }}>{user?.role}</p>
                </div>
              </div>
              <button className="btn btn-danger" style={{ width: '100%', gap: 8, height: 44 }}
                onClick={() => { setDrawer(false); setLogoutConfirm(true); }}>
                <MI icon="logout" className="mi-sm" /> Keluar dari Sistem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════ */}
      <div className="main-wrap">
        {/* PC TopBar */}
        <header className="topbar hidden lg:flex">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2 style={{ fontFamily: 'Manrope', fontSize: 18, fontWeight: 700, color: '#1A365D', letterSpacing: '-0.02em' }}>EHS Management</h2>
            <div style={{ width: 1, height: 24, background: 'var(--surface-container)' }} />
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <MI icon="search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)', fontSize: 16, pointerEvents: 'none' }} />
              <input
                className="input-field"
                placeholder="Cari peralatan..."
                style={{ paddingLeft: 34, width: 240, height: 36, fontSize: 13 }}
                onKeyDown={e => { if (e.key === 'Enter') navigate(`/inventory?q=${(e.target as HTMLInputElement).value}`); }}
              />
            </div>
          </div>

          {/* Right: user info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 20, borderLeft: '1px solid var(--surface-container)' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: 'Manrope', fontSize: 12, fontWeight: 700, color: 'var(--on-surface)' }}>{user?.fullName}</p>
                <p style={{ fontSize: 10, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 1, fontFamily: 'Manrope', fontWeight: 600 }}>
                  {user?.role === 'superadmin' ? 'Superadmin' : 'Safety Inspector'}
                </p>
              </div>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#455f88,#39537c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Manrope', boxShadow: '0 0 0 2px var(--surface-container)' }}>
                {initials}
              </div>
            </div>
          </div>
        </header>

        <div className="page-scroll">
          {children}
        </div>
      </div>

      {/* ════════════════════════════════════
          MOBILE BOTTOM NAV
      ════════════════════════════════════ */}
      <nav className="bottom-nav lg:hidden">
        {nav.slice(0, 3).map(item => (
          <Link key={item.path} to={item.path} className={`bottom-nav-item ${active(item.path) ? 'active' : ''}`}>
            {active(item.path) && <span className="nav-pill" />}
            <MI icon={item.icon} style={{ position: 'relative', zIndex: 1, fontSize: 22 }} />
            <span style={{ position: 'relative', zIndex: 1 }}>{item.name}</span>
          </Link>
        ))}
        {user?.role === 'superadmin' && (
          <Link to="/admin" className={`bottom-nav-item ${active('/admin') ? 'active' : ''}`}>
            {active('/admin') && <span className="nav-pill" />}
            <MI icon="admin_panel_settings" style={{ position: 'relative', zIndex: 1, fontSize: 22 }} />
            <span style={{ position: 'relative', zIndex: 1 }}>Admin</span>
          </Link>
        )}
        <button className="bottom-nav-item" onClick={() => setLogoutConfirm(true)} style={{ color: 'var(--error)' }}>
          <MI icon="logout" style={{ fontSize: 22, color: 'var(--error)' }} />
          <span style={{ color: 'var(--error)' }}>Keluar</span>
        </button>
      </nav>

      {/* Logout modal */}
      {logoutConfirm && <LogoutModal />}
    </div>
  );
};
