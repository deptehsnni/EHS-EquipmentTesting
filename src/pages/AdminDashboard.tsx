import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { useToast } from '../hooks/useToast';
import { Profile } from '../types';
import {
  Users, CheckCircle2, XCircle, Trash2,
  Search, Clock, ShieldCheck, X,
} from 'lucide-react';

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const fn = () => setV(window.innerWidth < 1024);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return v;
};

export const AdminDashboard: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setProfiles(data.map(p => ({
          id: p.id, employeeId: p.employee_id, fullName: p.full_name,
          role: p.role, status: p.status, createdAt: p.created_at,
        })));
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

  const filtered = profiles.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  const pending  = profiles.filter(p => p.status === 'pending').length;
  const approved = profiles.filter(p => p.status === 'approved').length;

  /* ── Avatar initials ─────────────────────────────────────────────────── */
  const Avatar = ({ name }: { name: string }) => (
    <div style={{
      width: 34, height: 34, borderRadius: 9,
      background: 'var(--accent-light)', border: '1px solid #BFDBFE',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: 'var(--accent-text)', flexShrink: 0,
      letterSpacing: '0.02em',
    }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );

  /* ── Action buttons ──────────────────────────────────────────────────── */
  const Actions = ({ p }: { p: Profile }) => {
    if (p.role === 'superadmin') return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'var(--accent-light)', color: 'var(--accent-text)',
        border: '1px solid #BFDBFE', borderRadius: 99,
        padding: '3px 10px', fontSize: 11, fontWeight: 600,
      }}>
        <ShieldCheck size={11} /> Superadmin
      </span>
    );
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {p.status !== 'approved' && (
          <button onClick={() => updateStatus(p.id, 'approved')} className="btn btn-success btn-sm" style={{ gap: 4 }}>
            <CheckCircle2 size={12} /> Setuju
          </button>
        )}
        {p.status !== 'rejected' && (
          <button onClick={() => updateStatus(p.id, 'rejected')} className="btn btn-danger btn-sm" style={{ gap: 4 }}>
            <XCircle size={12} /> Tolak
          </button>
        )}
        <button onClick={() => deleteUser(p.id, p.fullName)} className="btn-icon" style={{ width: 28, height: 28 }} title="Hapus akun">
          <Trash2 size={13} color="var(--red)" />
        </button>
      </div>
    );
  };

  /* ── Status badge ────────────────────────────────────────────────────── */
  const statusBadge = (s: string) => {
    if (s === 'approved') return <span className="badge badge-active">Aktif</span>;
    if (s === 'rejected') return <span className="badge badge-expired">Ditolak</span>;
    return <span className="badge badge-warning">Pending</span>;
  };

  /* ════════ MOBILE ════════ */
  if (isMobile) return (
    <Layout>
      <div style={{ background: '#F0F0EE', minHeight: '100vh' }}>

        {/* Sticky header */}
        <div style={{ background: 'var(--surface)', padding: '14px 14px 0', position: 'sticky', top: 54, zIndex: 40, borderBottom: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 12 }}>
            <h1 style={{ fontWeight: 700, fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Admin Console</h1>
            <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Kelola akses pengguna sistem EHS</p>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Total', value: profiles.length, color: 'var(--accent)', bg: 'var(--accent-light)' },
              { label: 'Aktif', value: approved, color: 'var(--green)', bg: 'var(--green-light)' },
              { label: 'Pending', value: pending, color: 'var(--amber)', bg: 'var(--amber-light)' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 10, color: s.color, opacity: 0.7, marginTop: 3, fontWeight: 600 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={15} color="var(--ink-3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input className="input-field" placeholder="Cari nama atau ID karyawan..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 38 }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', padding: 2 }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '12px 14px 20px' }}>
          {/* Pending alert */}
          {pending > 0 && (
            <div className="notif notif-warning" style={{ marginBottom: 12, fontSize: 13 }}>
              <Clock size={14} style={{ flexShrink: 0 }} />
              <span><strong>{pending} akun</strong> menunggu persetujuan Anda</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
              <Users size={28} color="var(--ink-4)" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Tidak ada pengguna ditemukan</p>
            </div>
          ) : filtered.map(p => (
            <div key={p.id} className="m-card" style={{ marginBottom: 8 }}>
              <div style={{ padding: '13px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={p.fullName} />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', lineHeight: 1.3 }}>{p.fullName}</p>
                      <p style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{p.employeeId}</p>
                    </div>
                  </div>
                  {statusBadge(p.status)}
                </div>
                {p.role !== 'superadmin' && (
                  <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <Actions p={p} />
                  </div>
                )}
                {p.role === 'superadmin' && (
                  <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <Actions p={p} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );

  /* ════════ PC ════════ */
  return (
    <Layout>
      <div style={{ padding: '28px 32px 40px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="text-display">Admin Console</h1>
          <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 5 }}>Kelola akses pengguna sistem EHS</p>
        </div>

        {/* Alert */}
        {pending > 0 && (
          <div className="notif notif-warning" style={{ marginBottom: 20, fontSize: 13 }}>
            <Clock size={14} style={{ flexShrink: 0 }} />
            <span><strong>{pending} akun</strong> menunggu persetujuan Anda</span>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 200px)', gap: 12, marginBottom: 22 }}>
          {[
            { label: 'Total Pengguna', value: profiles.length,  icon: Users,         color: 'var(--accent)', bg: 'var(--accent-light)' },
            { label: 'Akun Aktif',     value: approved,          icon: CheckCircle2,  color: 'var(--green)',  bg: 'var(--green-light)'  },
            { label: 'Menunggu',       value: pending,            icon: Clock,         color: 'var(--amber)',  bg: 'var(--amber-light)'  },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 38, height: 38, background: s.bg, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <s.icon size={17} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.025em', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3, fontWeight: 500 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
          <Search size={14} color="var(--ink-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input className="input-field" placeholder="Cari nama atau ID karyawan..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', padding: 2 }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Users size={28} color="var(--ink-4)" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Tidak ada pengguna ditemukan</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama & ID Karyawan</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Terdaftar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} style={{ cursor: 'default' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <Avatar name={p.fullName} />
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', lineHeight: 1.3 }}>{p.fullName}</p>
                          <p style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{p.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td><Actions p={p} /></td>
                    <td>{statusBadge(p.status)}</td>
                    <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      {new Date(p.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      {p.role !== 'superadmin' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {p.status !== 'approved' && (
                            <button onClick={() => updateStatus(p.id, 'approved')} className="btn btn-success btn-sm" style={{ gap: 4 }}>
                              <CheckCircle2 size={12} /> Setuju
                            </button>
                          )}
                          {p.status !== 'rejected' && (
                            <button onClick={() => updateStatus(p.id, 'rejected')} className="btn btn-danger btn-sm" style={{ gap: 4 }}>
                              <XCircle size={12} /> Tolak
                            </button>
                          )}
                          <button onClick={() => deleteUser(p.id, p.fullName)} className="btn-icon" style={{ width: 28, height: 28 }} title="Hapus akun">
                            <Trash2 size={13} color="var(--red)" />
                          </button>
                        </div>
                      )}
                    </td>
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
