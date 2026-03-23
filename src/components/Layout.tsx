import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  LayoutDashboard, ClipboardList, PlusCircle, ShieldCheck,
  LogOut, QrCode, Menu, X, ChevronRight, Settings
} from 'lucide-react';

interface LayoutProps { children: React.ReactNode; }

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', path: '/inventory', icon: ClipboardList },
  { name: 'Registrasi', path: '/register-equipment', icon: PlusCircle },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const allNav = user?.role === 'superadmin'
    ? [...navItems, { name: 'Admin', path: '/admin', icon: ShieldCheck }]
    : navItems;

  const isActive = (path: string) => location.pathname === path;
  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--surface-2)' }}>

      {/* ── PC SIDEBAR ── */}
      <aside className="sidebar hidden lg:flex">
        {/* Brand */}
        <div style={{ padding: '20px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 4 }}>
            <div style={{
              width: 28, height: 28, background: 'var(--accent)', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <QrCode size={15} color="#fff" />
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, lineHeight: 1 }}>EHS Equipment</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2, letterSpacing: '0.04em' }}>Testing System</p>
            </div>
          </div>
        </div>

        {/* Nav Section */}
        <div style={{ padding: '4px 12px', flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 12px 6px' }}>
            Menu
          </p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {allNav.map(item => (
              <Link key={item.path} to={item.path} className={`nav-item ${isActive(item.path) ? 'active' : ''}`}>
                <item.icon size={16} />
                <span style={{ flex: 1 }}>{item.name}</span>
                {isActive(item.path) && <ChevronRight size={13} style={{ opacity: 0.4 }} />}
              </Link>
            ))}
          </nav>
        </div>

        {/* User Section */}
        <div style={{ padding: '8px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 6, background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#fff', fontSize: 12, fontWeight: 600, lineHeight: 1, marginBottom: 2 }} className="truncate">{user?.fullName}</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, textTransform: 'capitalize' }}>{user?.role}</p>
            </div>
            <button onClick={handleLogout} title="Keluar" style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: 'rgba(255,255,255,0.3)', borderRadius: 4, transition: 'color 0.12s',
              display: 'flex', alignItems: 'center',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#FC8181')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <div className="lg:hidden" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 56, background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, background: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={13} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>EHS Equipment</span>
        </div>
        <button onClick={() => setDrawerOpen(true)} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--ink-2)',
        }}>
          <Menu size={20} />
        </button>
      </div>

      {/* ── MOBILE DRAWER ── */}
      {drawerOpen && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setDrawerOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 280,
            background: 'var(--sidebar-bg)', display: 'flex', flexDirection: 'column',
            animation: 'slideRight 0.22s ease',
          }}>
            <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, background: 'var(--accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCode size={13} color="#fff" />
                </div>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>EHS Equipment</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                <X size={20} />
              </button>
            </div>
            <nav style={{ flex: 1, padding: '12px' }}>
              {allNav.map(item => (
                <Link key={item.path} to={item.path} onClick={() => setDrawerOpen(false)}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                  style={{ marginBottom: 2 }}>
                  <item.icon size={17} />
                  {item.name}
                </Link>
              ))}
            </nav>
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{initials}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{user?.fullName}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'capitalize' }}>{user?.role}</p>
                </div>
                <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}>
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <main style={{ flex: 1, overflowY: 'auto' }}
          className="pt-14 lg:pt-0 main-content">
          {children}
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="bottom-nav lg:hidden">
        {allNav.map(item => (
          <Link key={item.path} to={item.path} className={`bottom-nav-item ${isActive(item.path) ? 'active' : ''}`}>
            {isActive(item.path) && <span className="nav-pill" />}
            <item.icon size={22} strokeWidth={isActive(item.path) ? 2.5 : 1.8} />
            {item.name}
          </Link>
        ))}
      </nav>

      <style>{`
        @keyframes slideRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
};
