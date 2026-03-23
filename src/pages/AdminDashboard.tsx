import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { useToast } from '../hooks/useToast';
import { Profile } from '../types';
import { Users, CheckCircle2, XCircle, Trash2, Search, Clock, ShieldCheck } from 'lucide-react';

const useIsMobile = () => {
  const [isMob, setIsMob] = useState(window.innerWidth < 1024);
  useEffect(() => { const fn = () => setIsMob(window.innerWidth < 1024); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);
  return isMob;
};

export const AdminDashboard: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
    if (!window.confirm(`Hapus akun ${name}?`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) { toast.error('Gagal menghapus'); return; }
    setProfiles(p => p.filter(u => u.id !== id)); toast.success('Akun dihapus');
  };

  const filtered = profiles.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  const pending = profiles.filter(p => p.status === 'pending').length;

  const ActionBtns: React.FC<{ p: Profile }> = ({ p }) => p.role === 'superadmin' ? null : (
    <div style={{ display: 'flex', gap: 6 }}>
      {p.status !== 'approved' && (
        <button onClick={() => updateStatus(p.id, 'approved')} className="btn btn-success btn-sm" style={{ gap: 5 }}>
          <CheckCircle2 size={13} /> Setuju
        </button>
      )}
      {p.status !== 'rejected' && (
        <button onClick={() => updateStatus(p.id, 'rejected')} className="btn btn-danger btn-sm" style={{ gap: 5 }}>
          <XCircle size={13} /> Tolak
        </button>
      )}
      <button onClick={() => deleteUser(p.id, p.fullName)} className="btn-icon">
        <Trash2 size={14} style={{ color: '#DC2626' }} />
      </button>
    </div>
  );

  return (
    <Layout>
      <div style={{ padding: isMobile ? '16px' : '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="text-display">Admin Console</h1>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 6 }}>Kelola akses pengguna sistem EHS</p>
        </div>

        {pending > 0 && (
          <div className="notif notif-warning" style={{ marginBottom: 20, fontSize: 13 }}>
            <Clock size={15} style={{ flexShrink: 0 }} />
            <span><strong>{pending} akun</strong> menunggu persetujuan Anda</span>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : 'repeat(3,200px)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total User', value: profiles.length, icon: Users, color: 'var(--accent)', bg: 'var(--accent-light)' },
            { label: 'Aktif', value: profiles.filter(p => p.status === 'approved').length, icon: CheckCircle2, color: 'var(--green)', bg: 'var(--green-bg)' },
            { label: 'Pending', value: pending, icon: Clock, color: 'var(--amber)', bg: 'var(--amber-bg)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, background: s.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <s.icon size={18} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3, fontWeight: 500 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={14} color="var(--ink-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input className="input-field" placeholder="Cari nama atau ID karyawan..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>

        {/* PC Table */}
        {!isMobile && (
          <div className="surface" style={{ overflow: 'hidden' }}>
            {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div> : (
              <table className="data-table">
                <thead><tr><th>Nama & ID</th><th>Role</th><th>Status</th><th>Terdaftar</th><th>Aksi</th></tr></thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} style={{ cursor: 'default' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', flexShrink: 0 }}>
                            {p.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{p.fullName}</p>
                            <p style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{p.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {p.role === 'superadmin'
                          ? <span style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #BFDBFE', borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={11} />Superadmin</span>
                          : <span className="badge badge-unknown">User</span>}
                      </td>
                      <td>
                        <span className={`badge badge-${p.status === 'approved' ? 'active' : p.status === 'rejected' ? 'expired' : 'warning'}`}>
                          {p.status === 'approved' ? 'Aktif' : p.status === 'rejected' ? 'Ditolak' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{new Date(p.createdAt).toLocaleDateString('id-ID')}</td>
                      <td><ActionBtns p={p} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Mobile Cards */}
        {isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div> :
              filtered.map(p => (
                <div key={p.id} className="m-card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: p.role !== 'superadmin' ? 12 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, background: '#F3F4F6', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#6B7280' }}>
                        {p.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{p.fullName}</p>
                        <p style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{p.employeeId}</p>
                      </div>
                    </div>
                    <span className={`badge badge-${p.status === 'approved' ? 'active' : p.status === 'rejected' ? 'expired' : 'warning'}`}>
                      {p.status === 'approved' ? 'Aktif' : p.status === 'rejected' ? 'Ditolak' : 'Pending'}
                    </span>
                  </div>
                  {p.role !== 'superadmin' && (
                    <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                      <ActionBtns p={p} />
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}
      </div>
    </Layout>
  );
};
