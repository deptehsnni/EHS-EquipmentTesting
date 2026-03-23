import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase, employeeIdToEmail } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { QrCode, Eye, EyeOff, AlertCircle, ArrowRight, Scan } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const s = params.get('status');
    if (s === 'pending') setError('Akun Anda sedang menunggu persetujuan Superadmin.');
    if (s === 'rejected') setError('Pendaftaran ditolak. Hubungi Superadmin.');
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true });
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: employeeIdToEmail(employeeId), password
    });
    if (err) {
      setError(err.message.includes('Invalid login credentials') ? 'ID Karyawan atau sandi salah.' : err.message);
      setLoading(false); return;
    }
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (!profile) { setError('Profil tidak ditemukan.'); await supabase.auth.signOut(); }
      else if (profile.status === 'pending') { await supabase.auth.signOut(); setError('Akun menunggu persetujuan Superadmin.'); }
      else if (profile.status === 'rejected') { await supabase.auth.signOut(); setError('Pendaftaran ditolak.'); }
      else { toast.success(`Selamat datang, ${profile.full_name}!`); navigate(profile.role === 'superadmin' ? '/admin' : '/dashboard', { replace: true }); }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'var(--font-sans)' }}>

      {/* ── PC LEFT PANEL ── */}
      <div className="hidden lg:flex" style={{
        width: 480, background: '#0F172A',
        flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px', flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(45,107,228,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(45,107,228,0.05)' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 56 }}>
            <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={16} color="#fff" />
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>EHS Equipment Testing</span>
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 16 }}>
            Sistem Manajemen<br />Peralatan K3
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 1.7 }}>
            Platform terpadu untuk monitoring riksa uji, manajemen inventaris, dan identifikasi peralatan EHS secara real-time.
          </p>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 40 }}>
            {[
              { t: 'Riksa Uji', d: 'Monitoring jadwal otomatis' },
              { t: 'QR Code', d: 'Identifikasi cepat & akurat' },
              { t: 'Inventory', d: 'Kelola aset terpusat' },
              { t: 'Export', d: 'Laporan Excel & PDF' },
            ].map(f => (
              <div key={f.t} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{f.t}</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{f.d}</p>
              </div>
            ))}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>© {new Date().getFullYear()} EHS Equipment Testing System</p>
        </div>
      </div>

      {/* ── RIGHT / MOBILE FORM ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'var(--surface-2)' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Mobile brand */}
          <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 56, height: 56, background: 'var(--accent)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <QrCode size={26} color="#fff" />
            </div>
            <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.02em' }}>EHS Equipment Testing</p>
            <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>Sistem Manajemen Peralatan K3</p>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 28, border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 4 }}>Masuk ke Sistem</h2>
            <p style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 24 }}>Gunakan ID Karyawan dan sandi Anda</p>

            {error && (
              <div className="notif notif-danger" style={{ marginBottom: 20, fontSize: 13 }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>ID Karyawan</label>
                <input className="input-field" placeholder="Contoh: KRY001" required value={employeeId} onChange={e => setEmployeeId(e.target.value)} autoComplete="username" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>Sandi</label>
                <div style={{ position: 'relative' }}>
                  <input className="input-field" type={showPass ? 'text' : 'password'} placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: 40 }} autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 4, gap: 8 }}>
                {loading ? 'Memverifikasi...' : <><span>Masuk</span><ArrowRight size={16} /></>}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>atau</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <button onClick={() => navigate('/public-scan')} className="btn btn-secondary" style={{ width: '100%', gap: 8 }}>
              <Scan size={15} /> Scan QR Tanpa Login
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-3)', marginTop: 20 }}>
              Belum punya akun?{' '}
              <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Daftar di sini</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
