import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, employeeIdToEmail } from '../lib/supabase';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');

  .reg-root { font-family:'Inter',sans-serif; background:#eff4f7; color:#283439; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px 16px; }
  .reg-card { width:100%; max-width:400px; background:#fff; border-radius:12px; padding:40px; box-shadow:0 12px 40px rgba(40,52,57,0.06); }
  .reg-input { width:100%; padding:12px 16px; background:#eff4f7; border:none; outline:none; border-radius:8px; font-family:'Inter',sans-serif; font-size:14px; color:#283439; transition:box-shadow 0.15s; box-sizing:border-box; }
  .reg-input::placeholder { color:#a7b4ba; }
  .reg-input:focus { box-shadow:0 0 0 2.5px rgba(69,95,136,0.3); }
  .reg-input-wrap { position:relative; }
  .reg-btn { width:100%; background:linear-gradient(135deg,#455f88 0%,#39537c 100%); color:#f6f7ff; font-family:'Manrope',sans-serif; font-weight:700; font-size:14px; border:none; border-radius:8px; padding:13px; cursor:pointer; transition:opacity 0.15s,transform 0.1s; }
  .reg-btn:hover { opacity:0.9; } .reg-btn:active { transform:scale(0.98); } .reg-btn:disabled { opacity:0.5; cursor:not-allowed; }
  .reg-label { display:block; font-size:11px; font-weight:700; color:#546166; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:7px; font-family:'Manrope',sans-serif; }
  .reg-error { background:rgba(254,137,131,0.15); color:#752121; border-radius:8px; padding:11px 14px; font-size:13px; display:flex; align-items:flex-start; gap:8px; margin-bottom:18px; line-height:1.5; }
  .mi { font-family:'Material Symbols Outlined'; font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; font-size:20px; line-height:1; user-select:none; display:inline-flex; align-items:center; }
`;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [form,     setForm]     = useState({ employeeId: '', fullName: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (form.password !== form.confirm) { setError('Konfirmasi sandi tidak cocok'); return; }
    if (form.password.length < 6) { setError('Sandi minimal 6 karakter'); return; }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({ email: employeeIdToEmail(form.employeeId), password: form.password, options: { data: { full_name: form.fullName, employee_id: form.employeeId } } });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').insert([{ id: data.user.id, employee_id: form.employeeId, full_name: form.fullName, role: 'user', status: 'pending' }]);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 4000);
    }
    setLoading(false);
  };

  return (
    <>
      <style>{css}</style>
      <div className="reg-root">
        <div className="reg-card">
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#455f88,#39537c)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="mi" style={{ color: '#f6f7ff', fontSize: 18, fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>security</span>
            </div>
            <div>
              <p style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 15, color: '#1A365D', letterSpacing: '-0.02em' }}>Sistem Manajemen K3</p>
              <p style={{ fontSize: 11, color: '#546166', marginTop: 1 }}>EHS Division</p>
            </div>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: 56, height: 56, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <span className="mi" style={{ color: '#14532d', fontSize: 28, fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24" }}>check_circle</span>
              </div>
              <h2 style={{ fontFamily: 'Manrope', fontSize: 18, fontWeight: 800, color: '#1A365D', marginBottom: 8 }}>Pendaftaran Berhasil!</h2>
              <p style={{ fontSize: 13, color: '#546166', lineHeight: 1.6 }}>Akun Anda sedang menunggu persetujuan Superadmin.<br />Anda akan diarahkan ke halaman login.</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily: 'Manrope', fontSize: 22, fontWeight: 800, color: '#1A365D', letterSpacing: '-0.025em', marginBottom: 4 }}>Buat Akun Baru</h2>
              <p style={{ fontSize: 13, color: '#546166', marginBottom: 24, lineHeight: 1.5 }}>Akun memerlukan persetujuan Superadmin sebelum dapat digunakan</p>

              {error && (
                <div className="reg-error">
                  <span className="mi" style={{ fontSize: 16, color: '#9f403d', flexShrink: 0, marginTop: 1 }}>error</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[{ k: 'employeeId', l: 'ID Karyawan', ph: 'Contoh: KRY001', t: 'text' }, { k: 'fullName', l: 'Nama Lengkap', ph: 'Sesuai ID karyawan', t: 'text' }].map(f => (
                  <div key={f.k}>
                    <label className="reg-label">{f.l}</label>
                    <div className="reg-input-wrap">
                      <input className="reg-input" type={f.t} placeholder={f.ph} required value={form[f.k as keyof typeof form]} onChange={e => set(f.k as keyof typeof form, e.target.value)} />
                    </div>
                  </div>
                ))}

                <div>
                  <label className="reg-label">Sandi</label>
                  <div className="reg-input-wrap">
                    <input className="reg-input" type={showPass ? 'text' : 'password'} placeholder="Min. 6 karakter" required value={form.password} onChange={e => set('password', e.target.value)} style={{ paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
                      <span className="mi" style={{ color: '#a7b4ba', fontSize: 18 }}>{showPass ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="reg-label">Konfirmasi Sandi</label>
                  <input className="reg-input" type="password" placeholder="Ulangi sandi" required value={form.confirm} onChange={e => set('confirm', e.target.value)} />
                </div>

                <button type="submit" disabled={loading} className="reg-btn" style={{ marginTop: 4 }}>
                  {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: '#546166', marginTop: 20 }}>
                Sudah punya akun?{' '}
                <Link to="/login" style={{ color: '#455f88', fontFamily: 'Manrope', fontWeight: 700, textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                  Masuk di sini
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
};
