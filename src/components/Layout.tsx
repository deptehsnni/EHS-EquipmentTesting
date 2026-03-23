import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  LayoutDashboard, ClipboardList, PlusCircle,
  ShieldCheck, LogOut, QrCode, Menu, X, ChevronRight,
} from 'lucide-react';

interface LayoutProps { children: React.ReactNode; }

const baseNav = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventory',  path: '/inventory',  icon: ClipboardList  },
  { name: 'Registrasi', path: '/register-equipment', icon: PlusCircle },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();
  const [drawer, setDrawer] = useState(false);

  const nav = user?.role === 'superadmin'
    ? [...baseNav, { name: 'Admin', path: '/admin', icon: ShieldCheck }]
    : baseNav;

  const active   = (p: string) => location.pathname === p;
  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const logout   = async () => { setDrawer(false); await signOut(); navigate('/login'); };

  /* ── shared brand ────────────────────────────────────────────────────────── */
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

  /* ── user row ────────────────────────────────────────────────────────────── */
  const UserRow = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}>
      <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="truncate" style={{ color: '#fff', fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{user?.fullName}</p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, textTransform: 'capitalize', marginTop: 1 }}>{user?.role}</p>
      </div>
      <button onClick={logout} title="Keluar"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, color: 'rgba(255,255,255,0.28)', borderRadius: 5, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#FCA5A5')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.28)')}>
        <LogOut size={14} />
      </button>
    </div>
  );

  return (
    <div className="app-layout">

      {/* ═══════════════ PC SIDEBAR ═══════════════ */}
      <aside className="sidebar hidden lg:flex" style={{ flexDirection: 'column' }}>

        {/* brand */}
        <div style={{ padding: '18px 14px 10px' }}>
          <Brand />
        </div>

        {/* section label */}
        <div style={{ padding: '6px 14px 4px' }}>
          <p className="text-label" style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>MENU</p>
        </div>

        {/* nav */}
        <nav style={{ flex: 1, padding: '2px 10px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {nav.map(item => (
            <Link key={item.path} to={item.path} className={`nav-item ${active(item.path) ? 'active' : ''}`}>
              <item.icon size={15} />
              <span style={{ flex: 1 }}>{item.name}</span>
              {active(item.path) && <ChevronRight size={12} style={{ opacity: 0.35 }} />}
            </Link>
          ))}
        </nav>

        {/* user */}
        <div style={{ padding: '10px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <UserRow />
        </div>
      </aside>

      {/* ═══════════════ MOBILE TOP BAR ═══════════════ */}
      <div className="m-topbar lg:hidden">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, background: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={13} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>EHS Equipment</span>
        </div>
        <button onClick={() => setDrawer(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--ink-2)', display: 'flex', alignItems: 'center' }}>
          <Menu size={20} />
        </button>
      </div>

      {/* ═══════════════ MOBILE DRAWER ═══════════════ */}
      {drawer && (
        <div className="lg:hidden">
          <div className="m-drawer-overlay" onClick={() => setDrawer(false)} />
          <div className="m-drawer">
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <Brand />
              <button onClick={() => setDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* nav */}
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

            {/* user */}
            <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <UserRow />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      <div className="main-wrap">
        <div className="page-scroll">
          {children}
        </div>
      </div>

      {/* ═══════════════ MOBILE BOTTOM NAV ═══════════════ */}
      <nav className="bottom-nav lg:hidden">
        {nav.slice(0, 4).map(item => (
          <Link key={item.path} to={item.path} className={`bottom-nav-item ${active(item.path) ? 'active' : ''}`}>
            {active(item.path) && <span className="nav-pill" />}
            <item.icon size={20} strokeWidth={active(item.path) ? 2.2 : 1.7} style={{ position: 'relative', zIndex: 1 }} />
            <span style={{ position: 'relative', zIndex: 1 }}>{item.name}</span>
          </Link>
        ))}
        {nav.length > 4 && (
          <button className="bottom-nav-item" onClick={() => setDrawer(true)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Menu size={20} strokeWidth={1.7} />
            <span>Lainnya</span>
          </button>
        )}
      </nav>

    </div>
  );
};
