import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, employeeIdToEmail } from '../lib/supabase';
import { QrCode, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate  = useNavigate();
  const [form,     setForm]     = useState({ employeeId: '', fullName: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (form.password !== form.confirm) { setError('Konfirmasi sandi tidak cocok'); return; }
    if (form.password.length < 6)       { setError('Sandi minimal 6 karakter'); return; }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: employeeIdToEmail(form.employeeId), password: form.password,
      options: { data: { full_name: form.fullName, employee_id: form.employeeId } },
    });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').insert([{
        id: data.user.id, employee_id: form.employeeId,
        full_name: form.fullName, role: 'user', status: 'pending',
      }]);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 4000);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'var(--font-sans)' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 24 }}>
          <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <QrCode size={14} color="#fff" />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', lineHeight: 1.2 }}>EHS Equipment Testing</p>
            <p style={{ color: 'var(--ink-3)', fontSize: 11, marginTop: 1 }}>Daftar Akun Baru</p>
          </div>
        </div>

        {/* Success state */}
        {success ? (
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '32px 26px', border: '1px solid var(--border)', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 56, height: 56, background: 'var(--green-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={26} color="var(--green)" />
            </div>
            <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>Pendaftaran Berhasil!</h2>
            <p style={{ color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.6 }}>
              Akun Anda sedang menunggu persetujuan Superadmin.<br />Anda akan diarahkan ke halaman login.
            </p>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '26px', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 4 }}>Buat Akun Baru</h2>
            <p style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 22 }}>Akun memerlukan persetujuan Superadmin sebelum dapat digunakan</p>

            {error && (
              <div className="notif notif-danger" style={{ marginBottom: 16, fontSize: 13 }}>
                <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {[
                { key: 'employeeId', label: 'ID Karyawan',  placeholder: 'Contoh: KRY001',     type: 'text'     },
                { key: 'fullName',   label: 'Nama Lengkap', placeholder: 'Sesuai ID karyawan', type: 'text'     },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5 }}>{f.label}</label>
                  <input className="input-field" type={f.type} placeholder={f.placeholder}
                    required value={form[f.key as keyof typeof form]}
                    onChange={e => set(f.key as keyof typeof form, e.target.value)} />
                </div>
              ))}

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5 }}>Sandi</label>
                <div style={{ position: 'relative' }}>
                  <input className="input-field" type={showPass ? 'text' : 'password'} placeholder="Min. 6 karakter"
                    required value={form.password} onChange={e => set('password', e.target.value)}
                    style={{ paddingRight: 38 }} />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', padding: 2 }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5 }}>Konfirmasi Sandi</label>
                <input className="input-field" type="password" placeholder="Ulangi sandi"
                  required value={form.confirm} onChange={e => set('confirm', e.target.value)} />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ height: 42, marginTop: 4, borderRadius: 9 }}>
                {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}>
                <ArrowLeft size={13} /> Kembali ke Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
