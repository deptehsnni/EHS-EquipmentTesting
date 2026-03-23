import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { useAuth } from '../App';
import { useToast } from '../hooks/useToast';
import { Equipment, Inspection, mapDbToEquipment, mapEquipmentToDb, getRiksaUjiStatus, getRiksaUjiColor, riksaUjiStatusLabel, formatDate, formatDateShort } from '../types';
import { QRCodeCanvas } from 'qrcode.react';
import { ChevronLeft, Download, ShieldCheck, CheckCircle2, Clock, User, Package, Wrench, Calendar, Building2, Tag } from 'lucide-react';

const useIsMobile = () => {
  const [isMob, setIsMob] = useState(window.innerWidth < 1024);
  useEffect(() => { const fn = () => setIsMob(window.innerWidth < 1024); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);
  return isMob;
};

export const EquipmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<'Good' | 'Needs Repair' | 'Critical'>('Good');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from('equipments').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { toast.error('Peralatan tidak ditemukan'); navigate('/inventory'); return; }
      const mapped = mapDbToEquipment(data);
      setEquipment(mapped); setNewStatus(mapped.status); setLoading(false);
    });
  }, [id]);

  const downloadQR = () => {
    if (!qrRef.current || !equipment) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    const fc = document.createElement('canvas'); const ctx = fc.getContext('2d'); if (!ctx) return;
    const pad = 60; fc.width = canvas.width + pad * 2; fc.height = canvas.height + pad * 2 + 160;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, fc.width, fc.height);
    ctx.drawImage(canvas, pad, pad);
    ctx.fillStyle = '#111'; ctx.textAlign = 'center';
    ctx.font = 'bold 40px sans-serif'; ctx.fillText('EHS Equipment Testing', fc.width / 2, canvas.height + pad + 50);
    ctx.font = 'bold 60px monospace'; ctx.fillText(equipment.equipmentNo, fc.width / 2, canvas.height + pad + 120);
    const a = document.createElement('a'); a.download = `QR-${equipment.equipmentNo}.png`; a.href = fc.toDataURL('image/png', 1.0); a.click();
  };

  const handleUpdate = async () => {
    if (!equipment || !user) return;
    setSaving(true);
    const insp: Inspection = {
      id: Math.random().toString(36).slice(2), date: new Date().toISOString(),
      status: newStatus, notes, performedBy: user.fullName || user.employeeId,
      type: `Riksa Uji ${(equipment.inspections?.length || 0) + 1}`,
    };
    const updated: Equipment = { ...equipment, status: newStatus, updatedAt: new Date().toISOString(), updatedBy: user.fullName || user.employeeId, inspections: [insp, ...(equipment.inspections || [])] };
    const { error } = await supabase.from('equipments').update(mapEquipmentToDb(updated, user.fullName || '')).eq('id', equipment.id);
    if (error) { toast.error('Gagal menyimpan: ' + error.message); }
    else { toast.success('Status berhasil diperbarui'); setEquipment(updated); setUpdating(false); setNotes(''); }
    setSaving(false);
  };

  if (loading) return <Layout><div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner" /></div></Layout>;
  if (!equipment) return null;

  const riksaStatus = getRiksaUjiStatus(equipment.nextInspectionDate);
  const statusColor = riksaStatus === 'active' ? 'var(--green)' : riksaStatus === 'warning' ? 'var(--amber)' : riksaStatus === 'expired' ? 'var(--red)' : 'var(--gray)';
  const qrValue = `${window.location.origin}/scan/${equipment.equipmentNo}`;

  const specItems = Object.entries(equipment.specs || {}).filter(([, val]) => val);

  // ── MOBILE ────────────────────────────────────────────────────────────────────
  if (isMobile) return (
    <Layout>
      <div style={{ background: '#F2F2F7', minHeight: '100vh' }}>
        {/* Hero */}
        <div style={{
          background: riksaStatus === 'expired' ? 'linear-gradient(135deg,#DC2626,#991B1B)' : riksaStatus === 'warning' ? 'linear-gradient(135deg,#D97706,#B45309)' : 'linear-gradient(135deg,#1E3A5F,#2D6BE4)',
          padding: '16px 16px 28px', position: 'relative', overflow: 'hidden',
        }}>
          <button onClick={() => navigate('/inventory')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '7px 12px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 16 }}>
            <ChevronLeft size={15} /> Kembali
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 4 }}>{equipment.category}</p>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 32, letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{equipment.equipmentNo}</h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>{equipment.equipmentName}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{riksaUjiStatusLabel[riksaStatus]}</span>
            </div>
          </div>
          {equipment.nextInspectionDate && (
            <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px' }}>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginBottom: 2 }}>Riksa Uji Berikutnya</p>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{formatDate(equipment.nextInspectionDate)}</p>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!updating && (
            <button onClick={() => setUpdating(true)} style={{
              background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 14,
              height: 52, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <ShieldCheck size={18} /> Update Status Riksa Uji
            </button>
          )}

          {updating && (
            <div className="m-card" style={{ padding: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 14 }}>Update Kondisi</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                {(['Good', 'Needs Repair', 'Critical'] as const).map(s => (
                  <button key={s} onClick={() => setNewStatus(s)} style={{
                    padding: '12px 6px', borderRadius: 12, border: '2px solid', cursor: 'pointer',
                    fontWeight: 700, fontSize: 12, textAlign: 'center',
                    background: newStatus === s ? (s === 'Good' ? '#ECFDF5' : s === 'Needs Repair' ? '#FFFBEB' : '#FEF2F2') : '#fff',
                    borderColor: newStatus === s ? (s === 'Good' ? '#16A34A' : s === 'Needs Repair' ? '#D97706' : '#DC2626') : '#E5E7EB',
                    color: newStatus === s ? (s === 'Good' ? '#16A34A' : s === 'Needs Repair' ? '#D97706' : '#DC2626') : '#9CA3AF',
                  }}>{s === 'Good' ? 'Baik' : s === 'Needs Repair' ? 'Perbaikan' : 'Kritis'}</button>
                ))}
              </div>
              <textarea className="input-field" placeholder="Catatan inspeksi..." value={notes} onChange={e => setNotes(e.target.value)} style={{ height: 80, marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setUpdating(false)} style={{ flex: 1, height: 46, background: '#F3F4F6', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
                <button onClick={handleUpdate} disabled={saving} style={{ flex: 2, height: 46, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="m-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>Informasi Peralatan</p>
            </div>
            {[
              { label: 'Kategori', value: equipment.category },
              { label: 'Departemen', value: equipment.department || '-' },
              { label: 'Tipe / Model', value: equipment.equipmentType || '-' },
              { label: 'Merk', value: equipment.brand || '-' },
              { label: 'Tahun Buat', value: equipment.manufactureYear || '-' },
            ].map((r, i, arr) => (
              <div key={r.label} style={{ padding: '11px 16px', borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#9CA3AF' }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Riksa Uji */}
          <div className="m-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>Jadwal Riksa Uji</p>
            </div>
            {[
              { label: 'Terakhir', value: formatDate(equipment.lastInspectionDate) },
              { label: 'Masa Berlaku', value: equipment.validityPeriod || '-' },
              { label: 'Berikutnya', value: formatDate(equipment.nextInspectionDate), highlight: true },
            ].map((r, i, arr) => (
              <div key={r.label} style={{ padding: '11px 16px', borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none', display: 'flex', justifyContent: 'space-between', background: r.highlight && riksaStatus !== 'active' ? (riksaStatus === 'expired' ? '#FEF2F2' : '#FFFBEB') : 'transparent' }}>
                <span style={{ fontSize: 13, color: '#9CA3AF' }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: r.highlight ? statusColor : '#111' }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* QR */}
          <div className="m-card" style={{ padding: 16, textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 12 }}>QR Code</p>
            <div ref={qrRef} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: 16, background: '#F9FAFB', borderRadius: 16, border: '1px solid #E5E7EB', marginBottom: 12 }}>
              <QRCodeCanvas value={qrValue} size={140} level="H" includeMargin={false} />
              <p style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 10 }}>EHS Equipment Testing</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111', fontFamily: 'monospace' }}>{equipment.equipmentNo}</p>
            </div>
            <button onClick={downloadQR} style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #BBF7D0', borderRadius: 12, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Download size={15} /> Download QR Code
            </button>
          </div>

          {/* Riwayat */}
          <div className="m-card" style={{ marginBottom: 8 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>Riwayat Riksa Uji ({equipment.inspections?.length || 0})</p>
            </div>
            {!equipment.inspections?.length ? (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <Clock size={24} color="#D1D5DB" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>Belum ada riwayat</p>
              </div>
            ) : equipment.inspections.map((insp, i, arr) => (
              <div key={insp.id} style={{ padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none', display: 'flex', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: insp.status === 'Good' ? '#16A34A' : insp.status === 'Needs Repair' ? '#D97706' : '#DC2626' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{insp.type}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF' }}>{formatDateShort(insp.date)}</p>
                  </div>
                  <p style={{ fontSize: 12, color: '#6B7280' }}>{insp.notes || 'Tidak ada catatan'}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>oleh {insp.performedBy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );

  // ── PC ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ padding: '32px 40px', maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <button onClick={() => navigate('/inventory')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13, fontWeight: 500, marginBottom: 20, transition: 'color 0.12s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}>
          <ChevronLeft size={15} /> Kembali ke Inventory
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{equipment.equipmentNo}</h1>
            <span className={`badge badge-${riksaStatus}`} style={{ fontSize: 12 }}>{riksaUjiStatusLabel[riksaStatus]}</span>
          </div>
          {!updating && (
            <button onClick={() => setUpdating(true)} className="btn btn-primary" style={{ gap: 6 }}>
              <ShieldCheck size={15} /> Update Status
            </button>
          )}
        </div>
        <p style={{ color: 'var(--ink-2)', fontSize: 16, fontWeight: 500, marginBottom: 28, marginTop: -18 }}>{equipment.equipmentName}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Info */}
            <div className="surface" style={{ padding: 24 }}>
              <div className="section-header" style={{ marginBottom: 20 }}><h2 className="text-heading">Informasi Peralatan</h2></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {[
                  { label: 'Kategori', value: equipment.category },
                  { label: 'Departemen', value: equipment.department || '-' },
                  { label: 'Tipe / Model', value: equipment.equipmentType || '-' },
                  { label: 'Merk / Pabrikan', value: equipment.brand || '-' },
                  { label: 'Tahun Pembuatan', value: equipment.manufactureYear || '-' },
                  { label: 'Status Kondisi', value: equipment.status },
                ].map(r => (
                  <div key={r.label}>
                    <p className="text-label" style={{ marginBottom: 4 }}>{r.label}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{r.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Riksa Uji */}
            <div className="surface" style={{ padding: 24 }}>
              <div className="section-header" style={{ marginBottom: 20 }}><h2 className="text-heading">Jadwal Riksa Uji</h2></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                <div>
                  <p className="text-label" style={{ marginBottom: 4 }}>Riksa Uji Terakhir</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{formatDate(equipment.lastInspectionDate)}</p>
                </div>
                <div>
                  <p className="text-label" style={{ marginBottom: 4 }}>Masa Berlaku</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{equipment.validityPeriod || '-'}</p>
                </div>
                <div>
                  <p className="text-label" style={{ marginBottom: 4 }}>Riksa Uji Berikutnya</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: statusColor }}>{formatDate(equipment.nextInspectionDate)}</p>
                </div>
              </div>
            </div>

            {/* Spesifikasi */}
            {specItems.length > 0 && (
              <div className="surface" style={{ padding: 24 }}>
                <div className="section-header" style={{ marginBottom: 20 }}><h2 className="text-heading">Spesifikasi Teknis</h2></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
                  {specItems.map(([specKey, specVal]) => (
                    <div key={specKey}>
                      <p className="text-label" style={{ marginBottom: 4 }}>{specKey.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{specVal}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Update Form */}
            {updating && (
              <div className="surface" style={{ padding: 24, border: '1px solid #BFDBFE', background: '#EFF6FF' }}>
                <div className="section-header" style={{ marginBottom: 20 }}><h2 className="text-heading">Update Kondisi</h2></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {(['Good', 'Needs Repair', 'Critical'] as const).map(s => (
                    <button key={s} onClick={() => setNewStatus(s)} style={{
                      padding: '12px', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                      background: newStatus === s ? (s === 'Good' ? '#ECFDF5' : s === 'Needs Repair' ? '#FFFBEB' : '#FEF2F2') : '#fff',
                      borderColor: newStatus === s ? (s === 'Good' ? '#16A34A' : s === 'Needs Repair' ? '#D97706' : '#DC2626') : 'var(--border-2)',
                      color: newStatus === s ? (s === 'Good' ? '#16A34A' : s === 'Needs Repair' ? '#D97706' : '#DC2626') : 'var(--ink-3)',
                      transition: 'all 0.12s',
                    }}>{s === 'Good' ? '✓ Baik' : s === 'Needs Repair' ? '⚠ Perlu Perbaikan' : '✕ Kritis'}</button>
                  ))}
                </div>
                <textarea className="input-field" placeholder="Catatan inspeksi..." value={notes} onChange={e => setNotes(e.target.value)} style={{ height: 80, marginBottom: 14 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setUpdating(false)} className="btn btn-secondary" style={{ flex: 1 }}>Batal</button>
                  <button onClick={handleUpdate} disabled={saving} className="btn btn-accent" style={{ flex: 2 }}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
                </div>
              </div>
            )}

            {/* Riwayat */}
            <div className="surface" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="section-header"><h2 className="text-heading">Riwayat Riksa Uji ({equipment.inspections?.length || 0})</h2></div>
              </div>
              {!equipment.inspections?.length ? (
                <div style={{ padding: '36px 24px', textAlign: 'center' }}>
                  <Clock size={28} color="var(--border-2)" style={{ margin: '0 auto 10px' }} />
                  <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Belum ada riwayat riksa uji</p>
                </div>
              ) : equipment.inspections.map((insp, i, arr) => (
                <div key={insp.id} style={{ padding: '14px 24px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: insp.status === 'Good' ? 'var(--green)' : insp.status === 'Needs Repair' ? 'var(--amber)' : 'var(--red)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{insp.type}</p>
                      <p style={{ fontSize: 11, color: 'var(--ink-3)' }}>{formatDateShort(insp.date)}</p>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>{insp.notes || 'Tidak ada catatan'}</p>
                    <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>Dilakukan oleh {insp.performedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* QR */}
            <div className="surface" style={{ padding: 20, textAlign: 'center' }}>
              <div className="section-header" style={{ marginBottom: 16, justifyContent: 'center' }}><h2 className="text-heading">QR Code</h2></div>
              <div ref={qrRef} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: 16, background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 12 }}>
                <QRCodeCanvas value={qrValue} size={160} level="H" includeMargin={false} />
                <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 10 }}>EHS Equipment Testing</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{equipment.equipmentNo}</p>
              </div>
              <button onClick={downloadQR} className="btn btn-success" style={{ width: '100%', gap: 6 }}>
                <Download size={14} /> Download QR
              </button>
              <p style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 10, wordBreak: 'break-all' }}>{qrValue}</p>
            </div>

            {/* Log */}
            <div className="surface" style={{ padding: 20 }}>
              <div className="section-header" style={{ marginBottom: 14 }}><h2 className="text-heading">Log Sistem</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Diperbarui oleh', value: equipment.updatedBy || '-' },
                  { label: 'Terakhir diperbarui', value: formatDateShort(equipment.updatedAt) },
                  { label: 'Terdaftar pada', value: formatDateShort(equipment.createdAt) },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--ink-3)' }}>{r.label}</span>
                    <span style={{ fontWeight: 500, color: 'var(--ink-2)' }}>{r.value}</span>
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
