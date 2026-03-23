import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase, employeeIdToEmail } from '../lib/supabase';
import { useToast } from '../hooks/useToast';

/* ─── Inline styles for this page only ──────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');

  .login-root {
    font-family: 'Inter', sans-serif;
    background: #f7fafc;
    color: #283439;
    min-height: 100vh;
    display: flex;
    overflow: hidden;
  }

  /* ── Left panel ── */
  .login-left {
    width: 60%;
    background: linear-gradient(135deg, #455f88 0%, #39537c 100%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 64px;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }
  .login-left-blob1 {
    position: absolute; top: -96px; left: -96px;
    width: 384px; height: 384px; border-radius: 50%;
    background: #d6e3ff; opacity: 0.1;
    filter: blur(48px); pointer-events: none;
  }
  .login-left-blob2 {
    position: absolute; bottom: -96px; right: -96px;
    width: 512px; height: 512px; border-radius: 50%;
    background: #d8e3fa; opacity: 0.05;
    filter: blur(48px); pointer-events: none;
  }
  .login-headline { font-family: 'Manrope', sans-serif; }

  /* Glass card */
  .glass-card {
    background: rgba(255,255,255,0.08);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 12px;
    padding: 24px;
    transition: background 0.25s;
  }
  .glass-card:hover { background: rgba(255,255,255,0.14); }

  /* ── Right panel ── */
  .login-right {
    flex: 1;
    background: #eff4f7;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 32px;
    position: relative;
  }
  .login-card {
    width: 100%; max-width: 420px;
    background: #ffffff;
    border-radius: 12px;
    padding: 48px;
    box-shadow: 0 12px 40px rgba(40,52,57,0.06);
  }

  /* ── Form inputs ── */
  .login-input {
    width: 100%;
    padding: 12px 44px 12px 16px;
    background: #eff4f7;
    border: none; outline: none;
    border-radius: 8px;
    font-family: 'Inter', sans-serif;
    font-size: 14px; color: #283439;
    transition: box-shadow 0.15s;
    box-sizing: border-box;
  }
  .login-input::placeholder { color: #a0adb4; }
  .login-input:focus { box-shadow: 0 0 0 2.5px rgba(69,95,136,0.3); }

  /* ── Primary button ── */
  .login-btn-primary {
    width: 100%;
    background: linear-gradient(135deg, #455f88 0%, #39537c 100%);
    color: #f6f7ff;
    font-family: 'Manrope', sans-serif;
    font-weight: 700; font-size: 15px;
    border: none; border-radius: 8px;
    padding: 14px 20px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: opacity 0.15s, transform 0.1s;
  }
  .login-btn-primary:hover { opacity: 0.9; }
  .login-btn-primary:active { transform: scale(0.98); }
  .login-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Secondary button ── */
  .login-btn-secondary {
    width: 100%;
    background: transparent;
    color: #455f88;
    font-family: 'Manrope', sans-serif;
    font-weight: 700; font-size: 14px;
    border: 2px solid rgba(112,125,130,0.2);
    border-radius: 8px;
    padding: 13px 20px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: background 0.15s;
  }
  .login-btn-secondary:hover { background: #dfeaef; }

  /* ── Error banner ── */
  .login-error {
    background: #fee2e2; color: #7f1d1d;
    border-radius: 8px; padding: 11px 14px;
    font-size: 13px; display: flex; align-items: flex-start; gap: 8px;
    margin-bottom: 20px; line-height: 1.5;
  }

  /* ── Divider ── */
  .login-divider {
    display: flex; align-items: center; gap: 16px;
    margin: 4px 0;
  }
  .login-divider-line { flex: 1; height: 1px; background: rgba(112,125,130,0.2); }
  .login-divider-text { font-size: 11px; color: #707d82; text-transform: uppercase; letter-spacing: 0.12em; }

  /* ── Label ── */
  .login-label {
    display: block; font-size: 11px; font-weight: 600;
    color: #546166; text-transform: uppercase; letter-spacing: 0.07em;
    margin-bottom: 8px;
  }

  /* ── Material icon helper ── */
  .mi { font-family: 'Material Symbols Outlined'; font-size: 20px; line-height: 1; user-select: none; }

  /* ── Responsive ── */
  @media (max-width: 1023px) {
    .login-left { display: none; }
    .login-right { background: #f7fafc; padding: 24px 16px; }
    .login-card { padding: 32px 24px; }
    .login-mobile-brand { display: flex; }
  }
  @media (min-width: 1024px) {
    .login-mobile-brand { display: none; }
  }
`;

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
      if (!profile)                           { setError('Profil tidak ditemukan.'); await supabase.auth.signOut(); }
      else if (profile.status === 'pending')  { await supabase.auth.signOut(); setError('Akun menunggu persetujuan Superadmin.'); }
      else if (profile.status === 'rejected') { await supabase.auth.signOut(); setError('Pendaftaran ditolak. Hubungi Superadmin.'); }
      else {
        toast.success(`Selamat datang, ${profile.full_name}!`);
        navigate(profile.role === 'superadmin' ? '/admin' : '/dashboard', { replace: true });
      }
    }
    setLoading(false);
  };

  const features = [
    { icon: 'analytics',    title: 'Monitoring Riksa Uji',   desc: 'Pantau status pengujian berkala peralatan secara real-time dengan notifikasi otomatis.' },
    { icon: 'qr_code_2',    title: 'QR Code Peralatan',      desc: 'Identifikasi instan setiap unit peralatan hanya dengan pemindaian kode unik.' },
    { icon: 'inventory_2',  title: 'Manajemen Inventory',    desc: 'Lacak pergerakan, histori perawatan, dan lokasi fisik aset K3 secara presisi.' },
    { icon: 'monitoring',   title: 'Laporan & Statistik',    desc: 'Visualisasi data kepatuhan untuk pengambilan keputusan strategis yang akurat.' },
  ];

  return (
    <>
      <style>{css}</style>

      <div className="login-root">

        {/* ════════════════════ LEFT PANEL ════════════════════ */}
        <section className="login-left">
          <div className="login-left-blob1" />
          <div className="login-left-blob2" />

          {/* Header */}
          <header style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
              <div style={{ width: 40, height: 40, background: '#f6f7ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="mi" style={{ color: '#455f88', fontSize: 22 }}>security</span>
              </div>
              <span className="login-headline" style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em', color: '#f6f7ff' }}>
                Sistem Manajemen K3
              </span>
            </div>

            <h1 className="login-headline" style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, maxWidth: 480, marginBottom: 20, color: '#f6f7ff', letterSpacing: '-0.025em' }}>
              Presisi dalam Keselamatan,<br />Kepercayaan Institusi.
            </h1>
            <p style={{ color: 'rgba(246,247,255,0.75)', fontSize: 16, lineHeight: 1.7, maxWidth: 440 }}>
              Platform digital terpadu untuk monitoring riksa uji, inventarisasi, dan kepatuhan standar K3 di lingkungan operasional Anda.
            </p>
          </header>

          {/* Bento grid */}
          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 40 }}>
            {features.map(f => (
              <div key={f.icon} className="glass-card">
                <span className="mi" style={{ color: '#d9d7f8', marginBottom: 14, display: 'block', fontSize: 24 }}>{f.icon}</span>
                <h3 className="login-headline" style={{ fontWeight: 700, fontSize: 14, color: '#f6f7ff', marginBottom: 6 }}>{f.title}</h3>
                <p style={{ color: 'rgba(246,247,255,0.55)', fontSize: 12, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <footer style={{ position: 'relative', zIndex: 1, paddingTop: 40 }}>
            <p style={{ fontSize: 10, color: 'rgba(246,247,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
              © {new Date().getFullYear()} Sistem Manajemen Peralatan K3. Precise Safety &amp; Institutional Trust.
            </p>
          </footer>
        </section>

        {/* ════════════════════ RIGHT PANEL ════════════════════ */}
        <section className="login-right">

          {/* Subtle bg blob */}
          <div style={{ position: 'absolute', top: '25%', right: 0, width: 256, height: 256, borderRadius: '50%', background: 'rgba(69,95,136,0.05)', filter: 'blur(48px)', pointerEvents: 'none' }} />

          <div className="login-card">

            {/* Mobile brand */}
            <div className="login-mobile-brand" style={{ alignItems: 'center', gap: 10, marginBottom: 28 }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#455f88,#39537c)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="mi" style={{ color: '#f6f7ff', fontSize: 18 }}>security</span>
              </div>
              <div>
                <p className="login-headline" style={{ fontWeight: 800, fontSize: 15, color: '#283439' }}>Sistem Manajemen K3</p>
                <p style={{ fontSize: 11, color: '#546166', marginTop: 1 }}>Peralatan &amp; Riksa Uji</p>
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 36 }}>
              <h2 className="login-headline" style={{ fontSize: 28, fontWeight: 800, color: '#283439', letterSpacing: '-0.02em', marginBottom: 6 }}>
                Masuk ke Sistem
              </h2>
              <p style={{ fontSize: 13, color: '#546166' }}>Gunakan kredensial resmi untuk mengakses dashboard.</p>
            </div>

            {/* Error */}
            {error && (
              <div className="login-error">
                <span className="mi" style={{ fontSize: 16, marginTop: 1, flexShrink: 0, color: '#b91c1c' }}>error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ID Karyawan */}
              <div>
                <label className="login-label" htmlFor="employee_id">ID Karyawan</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="employee_id"
                    className="login-input"
                    type="text"
                    placeholder="Contoh: KRY001"
                    required
                    autoComplete="username"
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                  />
                  <span className="mi" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#a7b4ba', fontSize: 20, pointerEvents: 'none' }}>person</span>
                </div>
              </div>

              {/* Sandi */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="login-label" htmlFor="password" style={{ marginBottom: 0 }}>Sandi</label>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    className="login-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}
                  >
                    <span className="mi" style={{ color: '#a7b4ba', fontSize: 20 }}>{showPass ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <button type="submit" disabled={loading} className="login-btn-primary">
                  {loading ? 'Memverifikasi...' : (
                    <>
                      Masuk
                      <span className="mi" style={{ fontSize: 18 }}>arrow_forward</span>
                    </>
                  )}
                </button>

                <div className="login-divider">
                  <div className="login-divider-line" />
                  <span className="login-divider-text">Atau</span>
                  <div className="login-divider-line" />
                </div>

                <button type="button" onClick={() => navigate('/public-scan')} className="login-btn-secondary">
                  <span className="mi" style={{ fontSize: 20 }}>qr_code_scanner</span>
                  Scan QR Tanpa Login
                </button>
              </div>
            </form>

            {/* Register link */}
            <p style={{ textAlign: 'center', fontSize: 13, color: '#546166', marginTop: 28 }}>
              Belum punya akun?{' '}
              <Link to="/register" style={{ color: '#455f88', fontWeight: 700, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                Daftar di sini
              </Link>
            </p>

            {/* Support links */}
            <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center', gap: 24, opacity: 0.4, transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}>
              {['Bantuan', 'Syarat & Ketentuan', 'Kontak'].map(t => (
                <span key={t} style={{ fontSize: 11, color: '#546166', cursor: 'default', letterSpacing: '0.01em' }}>{t}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};
