import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase, employeeIdToEmail } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { QrCode, Eye, EyeOff, AlertCircle, ArrowRight, Scan, CheckCircle2, Shield, BarChart2, Package } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const s = params.get('status');
    if (s === 'pending')  setError('Akun Anda sedang menunggu persetujuan Superadmin.');
    if (s === 'rejected') setError('Pendaftaran ditolak. Hubungi Superadmin.');
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true });
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: employeeIdToEmail(employeeId), password,
    });
    if (err) {
      setError(err.message.includes('Invalid login credentials') ? 'ID Karyawan atau sandi salah.' : err.message);
      setLoading(false); return;
    }
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (!profile)                        { setError('Profil tidak ditemukan.'); await supabase.auth.signOut(); }
      else if (profile.status === 'pending')  { await supabase.auth.signOut(); setError('Akun menunggu persetujuan Superadmin.'); }
      else if (profile.status === 'rejected') { await supabase.auth.signOut(); setError('Pendaftaran ditolak. Hubungi Superadmin.'); }
      else { toast.success(`Selamat datang, ${profile.full_name}!`); navigate(profile.role === 'superadmin' ? '/admin' : '/dashboard', { replace: true }); }
    }
    setLoading(false);
  };

  const features = [
    { icon: CheckCircle2, label: 'Monitoring Riksa Uji', desc: 'Pantau jadwal & status otomatis' },
    { icon: QrCode,       label: 'QR Code Peralatan',    desc: 'Identifikasi cepat & akurat'    },
    { icon: Package,      label: 'Manajemen Inventory',  desc: 'Kelola seluruh aset terpusat'   },
    { icon: BarChart2,    label: 'Laporan & Statistik',  desc: 'Export Excel & PDF'             },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'var(--font-sans)', background: 'var(--surface-2)' }}>

      {/* ── LEFT PANEL (PC only) ── */}
      <div className="hidden lg:flex" style={{
        width: 460, background: 'var(--sidebar-bg)',
        flexDirection: 'column', justifyContent: 'space-between',
        padding: '44px 40px', flexShrink: 0,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -120, right: -120, width: 360, height: 360, borderRadius: '50%', background: 'rgba(37,99,235,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(37,99,235,0.05)', pointerEvents: 'none' }} />

        {/* Brand */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 52 }}>
            <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={16} color="#fff" />
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>EHS Equipment Testing</p>
            </div>
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.025em', marginBottom: 14 }}>
            Sistem Manajemen<br />Peralatan K3
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.7 }}>
            Platform terpadu untuk monitoring riksa uji, manajemen inventaris, dan identifikasi peralatan EHS secara real-time.
          </p>
        </div>

        {/* Features */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 36 }}>
            {features.map(f => (
              <div key={f.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 11, padding: '13px 14px' }}>
                <f.icon size={14} color="rgba(255,255,255,0.5)" style={{ marginBottom: 6 }} />
                <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{f.label}</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{f.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>© {new Date().getFullYear()} EHS Equipment Testing System</p>
        </div>
      </div>

      {/* ── RIGHT PANEL (form) ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          {/* Mobile brand */}
          <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, background: 'var(--accent)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <QrCode size={24} color="#fff" />
            </div>
            <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.02em' }}>EHS Equipment Testing</p>
            <p style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 4 }}>Sistem Manajemen Peralatan K3</p>
          </div>

          {/* Form card */}
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '28px 26px', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 4 }}>Masuk ke Sistem</h2>
            <p style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 22 }}>Gunakan ID Karyawan dan sandi Anda</p>

            {error && (
              <div className="notif notif-danger" style={{ marginBottom: 18, fontSize: 13 }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>ID Karyawan</label>
                <input className="input-field" placeholder="Contoh: KRY001"
                  required value={employeeId} onChange={e => setEmployeeId(e.target.value)}
                  autoComplete="username" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>Sandi</label>
                <div style={{ position: 'relative' }}>
                  <input className="input-field" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                    required value={password} onChange={e => setPassword(e.target.value)}
                    style={{ paddingRight: 40 }} autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', padding: 2 }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 2, gap: 8 }}>
                {loading ? 'Memverifikasi...' : <><span>Masuk</span><ArrowRight size={15} /></>}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>atau</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <button onClick={() => navigate('/public-scan')} className="btn btn-secondary" style={{ width: '100%', gap: 7 }}>
              <Scan size={14} /> Scan QR Tanpa Login
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', marginTop: 18 }}>
              Belum punya akun?{' '}
              <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Daftar di sini</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
