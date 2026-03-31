/* ═══════════════════════════════════════════════════════════
   AdminDashboard.tsx
═══════════════════════════════════════════════════════════ */
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { useToast } from '../hooks/useToast';
import { Profile } from '../types';

const MI = ({ icon, style = {}, className = '' }: { icon: string; style?: React.CSSProperties; className?: string }) => (
  <span className={`mi ${className}`} style={style}>{icon}</span>
);

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 1024);
  useEffect(() => { const fn = () => setV(window.innerWidth < 1024); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);
  return v;
};

export const AdminDashboard: React.FC = () => {
  const { toast }  = useToast();
  const isMobile   = useIsMobile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setProfiles(data.map(p => ({ id: p.id, employeeId: p.employee_id, fullName: p.full_name, role: p.role, status: p.status, createdAt: p.created_at })));
        setLoading(false);
      });
  }, []);

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
    if (error) { toast.error('Gagal memperbarui status'); return; }
    setProfiles(p => p.map(u => u.id === id ? { ...u, status } : u));
    toast.success(status === 'approved' ? 'Akun disetujui' : 'Akun ditolak');
  };

  const deleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Hapus akun "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) { toast.error('Gagal menghapus akun'); return; }
    setProfiles(p => p.filter(u => u.id !== id));
    toast.success('Akun berhasil dihapus');
  };

  const filtered  = profiles.filter(p => p.fullName.toLowerCase().includes(search.toLowerCase()) || p.employeeId.toLowerCase().includes(search.toLowerCase()));
  const pending   = profiles.filter(p => p.status === 'pending').length;
  const approved  = profiles.filter(p => p.status === 'approved').length;

  const statusBadge = (s: string) => {
    if (s === 'approved') return <span className="badge badge-active">Aktif</span>;
    if (s === 'rejected') return <span className="badge badge-expired">Ditolak</span>;
    return <span className="badge badge-warning">Pending</span>;
  };

  const Avatar = ({ name }: { name: string }) => (
    <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: 'Manrope', fontWeight: 800, color: 'var(--on-primary-container)', flexShrink: 0 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );

  const ActionBtns = ({ p }: { p: Profile }) => {
    if (p.role === 'superadmin') return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--primary-container)', color: 'var(--on-primary-container)', borderRadius: 99, padding: '3px 10px', fontSize: 10, fontFamily: 'Manrope', fontWeight: 700, letterSpacing: '0.04em' }}>
        <MI icon="shield" className="mi-sm" /> Superadmin
      </span>
    );
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {p.status !== 'approved' && <button onClick={() => updateStatus(p.id, 'approved')} className="btn btn-success btn-sm" style={{ gap: 4 }}><MI icon="check_circle" className="mi-sm" /> Setuju</button>}
        {p.status !== 'rejected' && <button onClick={() => updateStatus(p.id, 'rejected')} className="btn btn-danger btn-sm" style={{ gap: 4 }}><MI icon="cancel" className="mi-sm" /> Tolak</button>}
        <button onClick={() => deleteUser(p.id, p.fullName)} className="btn-icon" style={{ width: 30, height: 30 }} title="Hapus akun">
          <MI icon="delete" className="mi-sm" style={{ color: 'var(--error)' }} />
        </button>
      </div>
    );
  };

  if (isMobile) return (
    <Layout>
      <div style={{ background: 'var(--surface-container-low)', minHeight: '100vh' }}>
        <div style={{ background: 'var(--surface-container-lowest)', padding: '14px 14px 0', position: 'sticky', top: 'var(--topbar-h)', zIndex: 40, borderBottom: '1px solid var(--surface-container)' }}>
          <div style={{ marginBottom: 12 }}>
            <h1 style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 20, color: '#1A365D', letterSpacing: '-0.02em' }}>Admin Console</h1>
            <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 }}>Kelola akses pengguna sistem EHS</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[{ l: 'Total', v: profiles.length, c: 'var(--primary)', bg: 'var(--primary-container)' }, { l: 'Aktif', v: approved, c: '#14532d', bg: '#dcfce7' }, { l: 'Pending', v: pending, c: 'var(--on-tertiary-container)', bg: 'var(--tertiary-container)' }].map(s => (
              <div key={s.l} style={{ background: s.bg, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontFamily: 'Manrope', fontSize: 22, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</p>
                <p style={{ fontSize: 10, color: s.c, opacity: 0.7, marginTop: 3, fontFamily: 'Manrope', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.l}</p>
              </div>
            ))}
          </div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <MI icon="search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)', fontSize: 16, pointerEvents: 'none' }} />
            <input className="input-field" placeholder="Cari nama atau ID karyawan..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)', display: 'flex', padding: 2 }}><MI icon="close" className="mi-sm" /></button>}
          </div>
        </div>
        <div style={{ padding: '12px 14px 20px' }}>
          {pending > 0 && <div className="notif notif-warning" style={{ marginBottom: 12, fontSize: 13 }}><MI icon="schedule" className="mi-sm" style={{ flexShrink: 0 }} /><span><strong>{pending} akun</strong> menunggu persetujuan Anda</span></div>}
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          : filtered.map(p => (
            <div key={p.id} className="m-card" style={{ marginBottom: 8 }}>
              <div style={{ padding: '13px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={p.fullName} />
                    <div>
                      <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, color: 'var(--on-surface)', lineHeight: 1.3 }}>{p.fullName}</p>
                      <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{p.employeeId}</p>
                    </div>
                  </div>
                  {statusBadge(p.status)}
                </div>
                <div style={{ paddingTop: 10, borderTop: '1px solid var(--surface-container-low)' }}><ActionBtns p={p} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div style={{ padding: '40px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'Manrope', fontSize: 28, fontWeight: 800, color: '#1A365D', letterSpacing: '-0.025em' }}>Admin Console</h1>
          <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 5 }}>Kelola akses pengguna sistem EHS</p>
        </div>

        {pending > 0 && <div className="notif notif-warning" style={{ marginBottom: 20, fontSize: 13 }}><MI icon="schedule" className="mi-sm" style={{ flexShrink: 0 }} /><span><strong>{pending} akun</strong> menunggu persetujuan Anda</span></div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,200px)', gap: 16, marginBottom: 24 }}>
          {[{ l: 'Total Pengguna', v: profiles.length, icon: 'group', ic: 'var(--primary)', ib: 'var(--primary-container)' }, { l: 'Akun Aktif', v: approved, icon: 'check_circle', ic: '#14532d', ib: '#dcfce7' }, { l: 'Menunggu Persetujuan', v: pending, icon: 'schedule', ic: 'var(--on-tertiary-container)', ib: 'var(--tertiary-container)' }].map(s => (
            <div key={s.l} className="stat-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 'auto', padding: 18 }}>
              <div className="icon-pill" style={{ background: s.ib, flexShrink: 0 }}><MI icon={s.icon} style={{ color: s.ic }} /></div>
              <div>
                <p style={{ fontFamily: 'Manrope', fontSize: 26, fontWeight: 800, color: 'var(--on-surface)', letterSpacing: '-0.025em', lineHeight: 1 }}>{s.v}</p>
                <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 3 }}>{s.l}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
          <MI icon="search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)', fontSize: 16, pointerEvents: 'none' }} />
          <input className="input-field" placeholder="Cari nama atau ID karyawan..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)', display: 'flex', padding: 2 }}><MI icon="close" className="mi-sm" /></button>}
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
          : filtered.length === 0 ? <div style={{ textAlign: 'center', padding: '60px 20px' }}><MI icon="group" style={{ color: 'var(--outline-variant)', fontSize: 40, marginBottom: 14 }} /><p style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 14, color: 'var(--on-surface-variant)' }}>Tidak ada pengguna ditemukan</p></div>
          : (
            <table className="data-table">
              <thead><tr><th>Nama & ID Karyawan</th><th>Role</th><th>Status</th><th>Terdaftar</th><th>Aksi</th></tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} style={{ cursor: 'default' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <Avatar name={p.fullName} />
                        <div>
                          <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, color: 'var(--on-surface)' }}>{p.fullName}</p>
                          <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{p.employeeId}</p>
                        </div>
                      </div>
                    </td>
<td>
  <span className={`badge ${p.role === 'superadmin' ? 'badge-active' : 'badge-unknown'}`}>
    {p.role === 'superadmin' ? 'Superadmin' : 'User'}
  </span>
</td>
                    <td>{statusBadge(p.status)}</td>
                    <td style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{new Date(p.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>{p.role !== 'superadmin' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {p.status !== 'approved' && <button onClick={() => updateStatus(p.id, 'approved')} className="btn btn-success btn-sm" style={{ gap: 4 }}><MI icon="check_circle" className="mi-sm" /> Setuju</button>}
                        {p.status !== 'rejected' && <button onClick={() => updateStatus(p.id, 'rejected')} className="btn btn-danger btn-sm" style={{ gap: 4 }}><MI icon="cancel" className="mi-sm" /> Tolak</button>}
                        <button onClick={() => deleteUser(p.id, p.fullName)} className="btn-icon" style={{ width: 30, height: 30 }} title="Hapus"><MI icon="delete" className="mi-sm" style={{ color: 'var(--error)' }} /></button>
                      </div>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};
