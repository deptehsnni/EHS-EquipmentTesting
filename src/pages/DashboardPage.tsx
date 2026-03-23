import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { useAuth } from '../App';
import { Equipment, mapDbToEquipment, getRiksaUjiStatus, getRiksaUjiColor, riksaUjiStatusLabel, formatDateShort } from '../types';
import { Package, CheckCircle2, AlertTriangle, XCircle, ChevronRight, TrendingUp, Clock } from 'lucide-react';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isMobile;
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('equipments').select('*').order('updated_at', { ascending: false })
      .then(({ data }) => { if (data) setEquipments(data.map(mapDbToEquipment)); setLoading(false); });
  }, []);

  const total = equipments.length;
  const aktif = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length;
  const warning = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length;
  const expired = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length;
  const unknown = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'unknown').length;
  const perluPerhatian = equipments.filter(e => ['warning', 'expired'].includes(getRiksaUjiStatus(e.nextInspectionDate)));
  const recent = equipments.slice(0, 5);

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName = user?.fullName?.split(' ')[0] || 'Pengguna';

  // ── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) return (
    <Layout>
      <div style={{ background: '#F2F2F7', minHeight: '100vh' }}>
        {/* Hero */}
        <div className="mobile-hero">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 4 }}>{today}</p>
            <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>
              Hai, {firstName} 👋
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Berikut ringkasan sistem hari ini</p>
          </div>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20, position: 'relative', zIndex: 1 }}>
            {[
              { label: 'Total Alat', value: total, color: 'rgba(255,255,255,0.9)' },
              { label: 'Aktif', value: aktif, color: '#6EE7B7' },
              { label: 'Segera Habis', value: warning, color: '#FCD34D' },
              { label: 'Expired', value: expired, color: '#FCA5A5' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.1)', borderRadius: 14,
                padding: '14px 16px', backdropFilter: 'blur(10px)',
              }}>
                <p style={{ color: s.color, fontSize: 28, fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>
                  {loading ? '—' : s.value}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Notif */}
          {expired > 0 && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '14px 16px', marginBottom: 10, display: 'flex', gap: 10 }}>
              <XCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>{expired} peralatan riksa uji EXPIRED</p>
                <p style={{ fontSize: 12, color: '#B91C1C', marginTop: 2, opacity: 0.8 }}>{perluPerhatian.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').slice(0,2).map(e => e.equipmentNo).join(', ')}</p>
              </div>
              <button onClick={() => navigate('/inventory?filter=expired')} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0, flexShrink: 0 }}>Lihat</button>
            </div>
          )}
          {warning > 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 10 }}>
              <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{warning} riksa uji kurang dari 3 bulan</p>
              </div>
              <button onClick={() => navigate('/inventory?filter=warning')} style={{ background: 'none', border: 'none', color: '#D97706', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0, flexShrink: 0 }}>Lihat</button>
            </div>
          )}

          {/* Perlu Perhatian */}
          {perluPerhatian.length > 0 && (
            <div className="m-card" style={{ marginBottom: 16 }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>Perlu Perhatian</p>
                <button onClick={() => navigate('/inventory')} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>Lihat Semua</button>
              </div>
              {perluPerhatian.slice(0, 4).map((e, i, arr) => {
                const s = getRiksaUjiStatus(e.nextInspectionDate);
                const c = getRiksaUjiColor(s);
                return (
                  <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)} style={{
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none', cursor: 'pointer',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot === 'bg-red-500' ? '#EF4444' : '#F59E0B', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{e.equipmentNo}</p>
                      <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{e.equipmentName} · {formatDateShort(e.nextInspectionDate)}</p>
                    </div>
                    <ChevronRight size={14} color="#D1D5DB" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Aktivitas Terbaru */}
          <div className="m-card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>Aktivitas Terbaru</p>
            </div>
            {recent.map((e, i, arr) => (
              <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)} style={{
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none', cursor: 'pointer',
              }}>
                <div style={{ width: 36, height: 36, background: '#F3F4F6', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package size={16} color="#6B7280" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111', fontFamily: 'var(--font-mono)' }}>{e.equipmentNo}</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{formatDateShort(e.updatedAt)}</p>
                </div>
                <ChevronRight size={14} color="#D1D5DB" />
              </div>
            ))}
          </div>

          {/* Quick Action */}
          <button onClick={() => navigate('/register-equipment')} className="btn btn-accent btn-lg" style={{ width: '100%' }}>
            + Registrasi Peralatan Baru
          </button>
        </div>
      </div>
    </Layout>
  );

  // ── PC ───────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ padding: '32px 40px', maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>{today}</p>
            <h1 className="text-display">Selamat datang, {firstName}</h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 6 }}>Berikut ringkasan kondisi peralatan EHS hari ini.</p>
          </div>
          <button onClick={() => navigate('/register-equipment')} className="btn btn-primary">
            + Registrasi Peralatan
          </button>
        </div>

        {/* Notif Banners */}
        {(expired > 0 || warning > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {expired > 0 && (
              <div className="notif notif-danger" style={{ fontSize: 13 }}>
                <XCircle size={16} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}><strong>{expired} peralatan</strong> riksa uji sudah expired — segera tindak lanjuti</span>
                <button onClick={() => navigate('/inventory?filter=expired')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--red)', textDecoration: 'underline' }}>Lihat</button>
              </div>
            )}
            {warning > 0 && (
              <div className="notif notif-warning" style={{ fontSize: 13 }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}><strong>{warning} peralatan</strong> riksa uji kurang dari 3 bulan</span>
                <button onClick={() => navigate('/inventory?filter=warning')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--amber)', textDecoration: 'underline' }}>Lihat</button>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Peralatan', value: total, icon: Package, color: 'var(--accent)', bg: 'var(--accent-light)' },
            { label: 'Riksa Uji Aktif', value: aktif, icon: CheckCircle2, color: 'var(--green)', bg: 'var(--green-bg)' },
            { label: 'Segera Habis', value: warning, icon: AlertTriangle, color: 'var(--amber)', bg: 'var(--amber-bg)' },
            { label: 'Expired', value: expired, icon: XCircle, color: 'var(--red)', bg: 'var(--red-bg)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, background: s.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={18} color={s.color} />
                </div>
              </div>
              <p style={{ fontSize: 36, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>{loading ? '—' : s.value}</p>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6, fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Perlu Perhatian Table */}
          <div className="surface" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="section-header">
                <h2 className="text-heading">Perlu Perhatian</h2>
              </div>
              <button onClick={() => navigate('/inventory')} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
                Lihat Semua <ChevronRight size={13} />
              </button>
            </div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
            ) : perluPerhatian.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <CheckCircle2 size={32} color="var(--green)" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Semua riksa uji dalam kondisi baik</p>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>No. Peralatan</th><th>Nama</th><th>Departemen</th><th>Jatuh Tempo</th><th>Status</th></tr></thead>
                <tbody>
                  {perluPerhatian.map(e => {
                    const s = getRiksaUjiStatus(e.nextInspectionDate);
                    return (
                      <tr key={e.id} onClick={() => navigate(`/inventory/${e.id}`)}>
                        <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{e.equipmentNo}</span></td>
                        <td>{e.equipmentName || '-'}</td>
                        <td style={{ color: 'var(--ink-3)' }}>{e.department || '-'}</td>
                        <td style={{ fontWeight: 500, color: s === 'expired' ? 'var(--red)' : 'var(--amber)' }}>{formatDateShort(e.nextInspectionDate)}</td>
                        <td><span className={`badge badge-${s}`}>{riksaUjiStatusLabel[s]}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Ringkasan */}
            <div className="surface" style={{ padding: 20 }}>
              <div className="section-header" style={{ marginBottom: 16 }}>
                <h2 className="text-heading">Ringkasan Riksa Uji</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Aktif', value: aktif, color: '#16A34A' },
                  { label: 'Segera Habis', value: warning, color: '#D97706' },
                  { label: 'Expired', value: expired, color: '#DC2626' },
                  { label: 'Belum Diisi', value: unknown, color: '#9CA3AF' },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{item.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{item.value}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aktivitas */}
            <div className="surface" style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <div className="section-header"><h2 className="text-heading">Aktivitas Terbaru</h2></div>
              </div>
              <div>
                {recent.map((e, i, arr) => (
                  <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)} style={{
                    padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}
                    onMouseEnter={el => (el.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 32, height: 32, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={14} color="var(--ink-3)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{e.equipmentNo}</p>
                      <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{formatDateShort(e.updatedAt)}</p>
                    </div>
                    <ChevronRight size={13} color="var(--border-2)" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
