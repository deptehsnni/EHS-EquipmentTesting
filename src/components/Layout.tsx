import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  LayoutDashboard, ClipboardList, PlusCircle,
  ShieldCheck, LogOut, QrCode, Menu, X, ChevronRight,
} from 'lucide-react';

interface LayoutProps { children: React.ReactNode; }

const baseNav = [
  { name: 'Dashboard', path: '/dashboard',          icon: LayoutDashboard },
  { name: 'Inventory',  path: '/inventory',           icon: ClipboardList   },
  { name: 'Registrasi', path: '/register-equipment',  icon: PlusCircle      },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [drawer,        setDrawer]        = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const nav = user?.role === 'superadmin'
    ? [...baseNav, { name: 'Admin', path: '/admin', icon: ShieldCheck }]
    : baseNav;

  const active   = (p: string) => location.pathname === p;
  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const doLogout = async () => {
    setLogoutConfirm(false);
    setDrawer(false);
    await signOut();
    navigate('/login');
  };

  /* ── Logout confirmation modal ───────────────────────────────────────── */
  const LogoutModal = () => (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 16, padding: 24,
        width: '100%', maxWidth: 320,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        animation: 'scaleIn 0.18s ease',
      }}>
        <div style={{ width: 44, height: 44, background: 'var(--red-light)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <LogOut size={20} color="var(--red)" />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', marginBottom: 6 }}>Keluar dari Sistem?</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', marginBottom: 22, lineHeight: 1.5 }}>
          Sesi Anda akan diakhiri. Pastikan pekerjaan sudah tersimpan.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setLogoutConfirm(false)} className="btn btn-secondary" style={{ flex: 1, height: 40 }}>
            Batal
          </button>
          <button onClick={doLogout} className="btn btn-danger" style={{ flex: 1, height: 40, gap: 6 }}>
            <LogOut size={14} /> Keluar
          </button>
        </div>
      </div>
      <style>{`@keyframes scaleIn { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }`}</style>
    </div>
  );

  /* ── Brand ───────────────────────────────────────────────────────────── */
  const Brand = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <QrCode size={14} color="#fff" />
      </div>
      <div>
        <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>EHS Equipment</p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 1 }}>Testing System</p>
      </div>
    </div>
  );

  return (
    <div className="app-layout">

      {/* ══════════════════════════════════════════
          PC SIDEBAR
      ══════════════════════════════════════════ */}
      <aside className="sidebar hidden lg:flex" style={{ flexDirection: 'column' }}>

        {/* Brand */}
        <div style={{ padding: '18px 14px 10px' }}>
          <Brand />
        </div>

        {/* Nav label */}
        <div style={{ padding: '8px 14px 4px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>MENU</p>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '2px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {nav.map(item => (
            <Link key={item.path} to={item.path} className={`nav-item ${active(item.path) ? 'active' : ''}`}>
              <item.icon size={15} />
              <span style={{ flex: 1 }}>{item.name}</span>
              {active(item.path) && <ChevronRight size={12} style={{ opacity: 0.35 }} />}
            </Link>
          ))}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '10px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 10px 10px', marginBottom: 6 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName}</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, textTransform: 'capitalize', marginTop: 1 }}>{user?.role}</p>
            </div>
          </div>

          {/* Logout button — clearly visible */}
          <button
            onClick={() => setLogoutConfirm(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
              color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 500,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.15)'; e.currentTarget.style.color = '#FCA5A5'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            <LogOut size={14} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          MOBILE TOP BAR
      ══════════════════════════════════════════ */}
      <div className="m-topbar lg:hidden">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, background: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={13} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>EHS Equipment</span>
        </div>
        <button
          onClick={() => setDrawer(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--ink-2)', display: 'flex', alignItems: 'center' }}>
          <Menu size={20} />
        </button>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE DRAWER
      ══════════════════════════════════════════ */}
      {drawer && (
        <div className="lg:hidden">
          {/* overlay */}
          <div
            onClick={() => setDrawer(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', zIndex: 200 }}
          />
          {/* panel */}
          <div style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: 272,
            background: 'var(--sidebar-bg)', display: 'flex', flexDirection: 'column',
            zIndex: 201, animation: 'drawerIn 0.22s var(--ease)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <Brand />
              <button onClick={() => setDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
              {nav.map(item => (
                <Link key={item.path} to={item.path} onClick={() => setDrawer(false)}
                  className={`nav-item ${active(item.path) ? 'active' : ''}`}
                  style={{ marginBottom: 2, fontSize: 14 }}>
                  <item.icon size={16} />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>

            {/* User + logout */}
            <div style={{ padding: '12px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              {/* User info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName}</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, textTransform: 'capitalize', marginTop: 1 }}>{user?.role}</p>
                </div>
              </div>

              {/* Logout — prominent in drawer */}
              <button
                onClick={() => { setDrawer(false); setLogoutConfirm(true); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '11px', borderRadius: 9,
                  border: '1px solid rgba(220,38,38,0.35)',
                  background: 'rgba(220,38,38,0.12)', cursor: 'pointer',
                  color: '#FCA5A5', fontSize: 14, fontWeight: 600,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.22)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.12)'; }}
              >
                <LogOut size={15} />
                Keluar dari Sistem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════ */}
      <div className="main-wrap">
        <div className="page-scroll">
          {children}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE BOTTOM NAV
      ══════════════════════════════════════════ */}
      <nav className="bottom-nav lg:hidden">
        {nav.slice(0, 3).map(item => (
          <Link key={item.path} to={item.path} className={`bottom-nav-item ${active(item.path) ? 'active' : ''}`}>
            {active(item.path) && <span className="nav-pill" />}
            <item.icon size={20} strokeWidth={active(item.path) ? 2.2 : 1.7} style={{ position: 'relative', zIndex: 1 }} />
            <span style={{ position: 'relative', zIndex: 1 }}>{item.name}</span>
          </Link>
        ))}

        {/* Admin link jika superadmin */}
        {user?.role === 'superadmin' && (
          <Link to="/admin" className={`bottom-nav-item ${active('/admin') ? 'active' : ''}`}>
            {active('/admin') && <span className="nav-pill" />}
            <ShieldCheck size={20} strokeWidth={active('/admin') ? 2.2 : 1.7} style={{ position: 'relative', zIndex: 1 }} />
            <span style={{ position: 'relative', zIndex: 1 }}>Admin</span>
          </Link>
        )}

        {/* Logout di bottom nav — selalu terlihat */}
        <button
          onClick={() => setLogoutConfirm(true)}
          className="bottom-nav-item"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}
        >
          <LogOut size={20} strokeWidth={1.7} />
          <span style={{ color: 'var(--red)', fontSize: 10, fontWeight: 500 }}>Keluar</span>
        </button>
      </nav>

      {/* ══════════════════════════════════════════
          LOGOUT CONFIRM MODAL
      ══════════════════════════════════════════ */}
      {logoutConfirm && <LogoutModal />}

    </div>
  );
};
