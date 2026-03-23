import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { useAuth } from '../App';
import { useToast } from '../hooks/useToast';
import {
  Equipment, Inspection, mapDbToEquipment, mapEquipmentToDb,
  getRiksaUjiStatus, riksaUjiStatusLabel, formatDate, formatDateShort,
} from '../types';
import { QRCodeCanvas } from 'qrcode.react';
import {
  ChevronLeft, Download, ShieldCheck, CheckCircle2,
  Clock, Package, Calendar, Building2, Tag, Wrench,
  AlertTriangle, XCircle, X,
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

/* Status color helpers */
const statusColor = (s: string) =>
  s === 'active' ? 'var(--green)' : s === 'warning' ? 'var(--amber)' : s === 'expired' ? 'var(--red)' : 'var(--ink-3)';

const conditionColor = (s: string) =>
  s === 'Good' ? 'var(--green)' : s === 'Needs Repair' ? 'var(--amber)' : 'var(--red)';

export const EquipmentDetailPage: React.FC = () => {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const { toast }  = useToast();
  const isMobile   = useIsMobile();
  const qrRef      = useRef<HTMLDivElement>(null);

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [updating,  setUpdating]  = useState(false);
  const [newStatus, setNewStatus] = useState<'Good' | 'Needs Repair' | 'Critical'>('Good');
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from('equipments').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) { toast.error('Peralatan tidak ditemukan'); navigate('/inventory'); return; }
        const mapped = mapDbToEquipment(data);
        setEquipment(mapped); setNewStatus(mapped.status); setLoading(false);
      });
  }, [id]);

  const downloadQR = () => {
    if (!qrRef.current || !equipment) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    const fc  = document.createElement('canvas');
    const ctx = fc.getContext('2d');
    if (!ctx) return;
    const pad = 48;
    fc.width  = canvas.width  + pad * 2;
    fc.height = canvas.height + pad * 2 + 140;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, fc.width, fc.height);
    ctx.drawImage(canvas, pad, pad);
    ctx.fillStyle = '#111111'; ctx.textAlign = 'center';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('EHS Equipment Testing', fc.width / 2, canvas.height + pad + 44);
    ctx.font = 'bold 52px monospace';
    ctx.fillText(equipment.equipmentNo, fc.width / 2, canvas.height + pad + 108);
    const a = document.createElement('a');
    a.download = `QR-${equipment.equipmentNo}.png`;
    a.href = fc.toDataURL('image/png', 1.0);
    a.click();
  };

  const handleUpdate = async () => {
    if (!equipment || !user) return;
    setSaving(true);
    const insp: Inspection = {
      id:          Math.random().toString(36).slice(2),
      date:        new Date().toISOString(),
      status:      newStatus,
      notes,
      performedBy: user.fullName || user.employeeId,
      type:        `Riksa Uji ${(equipment.inspections?.length || 0) + 1}`,
    };
    const updated: Equipment = {
      ...equipment,
      status:     newStatus,
      updatedAt:  new Date().toISOString(),
      updatedBy:  user.fullName || user.employeeId,
      inspections: [insp, ...(equipment.inspections || [])],
    };
    const { error } = await supabase
      .from('equipments')
      .update(mapEquipmentToDb(updated, user.fullName || ''))
      .eq('id', equipment.id);
    if (error) { toast.error('Gagal menyimpan: ' + error.message); }
    else { toast.success('Status berhasil diperbarui'); setEquipment(updated); setUpdating(false); setNotes(''); }
    setSaving(false);
  };

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" />
      </div>
    </Layout>
  );
  if (!equipment) return null;

  const riksaStatus  = getRiksaUjiStatus(equipment.nextInspectionDate);
  const qrValue      = `${window.location.origin}/scan/${equipment.equipmentNo}`;
  const specItems    = Object.entries(equipment.specs || {}).filter(([, v]) => v && v !== equipment.equipmentName);

  /* ── Hero gradient by status ─────────────────────────────────────────── */
  const heroGrad =
    riksaStatus === 'expired' ? 'linear-gradient(135deg,#991B1B,#DC2626)' :
    riksaStatus === 'warning' ? 'linear-gradient(135deg,#92400E,#D97706)' :
    'linear-gradient(135deg,#0F172A,#1E3A8A)';

  /* ── Update form (shared mobile + PC) ───────────────────────────────── */
  const UpdateForm = ({ compact = false }: { compact?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {(['Good', 'Needs Repair', 'Critical'] as const).map(s => {
          const active = newStatus === s;
          const color  = conditionColor(s);
          return (
            <button key={s} onClick={() => setNewStatus(s)} style={{
              padding: compact ? '10px 4px' : '12px 8px',
              borderRadius: 9, cursor: 'pointer', fontWeight: 600,
              fontSize: compact ? 12 : 13, textAlign: 'center',
              border: `2px solid ${active ? color : 'var(--border)'}`,
              background: active ? (s === 'Good' ? 'var(--green-light)' : s === 'Needs Repair' ? 'var(--amber-light)' : 'var(--red-light)') : 'var(--surface)',
              color: active ? color : 'var(--ink-3)',
              transition: 'all 0.15s',
            }}>
              {s === 'Good' ? 'Baik' : s === 'Needs Repair' ? 'Perlu Perbaikan' : 'Kritis'}
            </button>
          );
        })}
      </div>
      <textarea className="input-field" placeholder="Catatan inspeksi (opsional)..."
        value={notes} onChange={e => setNotes(e.target.value)}
        style={{ height: 72 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { setUpdating(false); setNotes(''); }} className="btn btn-secondary" style={{ flex: 1 }}>
          Batal
        </button>
        <button onClick={handleUpdate} disabled={saving} className="btn btn-accent" style={{ flex: 2, gap: 6 }}>
          {saving ? 'Menyimpan...' : <><ShieldCheck size={14} /> Simpan</>}
        </button>
      </div>
    </div>
  );

  /* ════════ MOBILE ════════ */
  if (isMobile) return (
    <Layout>
      <div style={{ background: '#F0F0EE', minHeight: '100vh' }}>

        {/* Hero */}
        <div style={{ background: heroGrad, padding: '14px 14px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <button onClick={() => navigate('/inventory')} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,255,255,0.13)', border: 'none', borderRadius: 8,
            padding: '6px 12px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 14,
          }}>
            <ChevronLeft size={14} /> Kembali
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 4 }}>{equipment.category}</p>
              <h1 style={{ color: '#fff', fontWeight: 700, fontSize: 28, letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {equipment.equipmentNo}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4 }}>{equipment.equipmentName}</p>
            </div>
            <span style={{
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 99, padding: '4px 11px', fontSize: 11, fontWeight: 600, color: '#fff',
              display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginTop: 2,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
              {riksaUjiStatusLabel[riksaStatus]}
            </span>
          </div>

          {equipment.nextInspectionDate && (
            <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 13px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>Riksa Uji Berikutnya</p>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{formatDate(equipment.nextInspectionDate)}</p>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 14px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Update button / form */}
          {!updating ? (
            <button onClick={() => setUpdating(true)} className="btn btn-accent btn-lg" style={{ width: '100%', gap: 7 }}>
              <ShieldCheck size={17} /> Update Status Riksa Uji
            </button>
          ) : (
            <div className="m-card" style={{ padding: 14 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 12 }}>Update Kondisi Peralatan</p>
              <UpdateForm compact />
            </div>
          )}

          {/* Info */}
          <div className="m-card">
            <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>Informasi Peralatan</p>
            </div>
            {[
              { icon: Tag,       label: 'Kategori',   value: equipment.category },
              { icon: Building2, label: 'Departemen', value: equipment.department || '-' },
              { icon: Wrench,    label: 'Tipe/Model', value: equipment.equipmentType || '-' },
              { icon: Package,   label: 'Merk',       value: equipment.brand || '-' },
              { icon: Calendar,  label: 'Tahun Buat', value: equipment.manufactureYear || '-' },
            ].map((r, i, arr) => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <r.icon size={14} color="var(--ink-3)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--ink-3)', width: 90, flexShrink: 0 }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Riksa Uji schedule */}
          <div className="m-card">
            <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>Jadwal Riksa Uji</p>
            </div>
            {[
              { label: 'Terakhir',     value: formatDate(equipment.lastInspectionDate), highlight: false },
              { label: 'Masa Berlaku', value: equipment.validityPeriod || '-',           highlight: false },
              { label: 'Berikutnya',   value: formatDate(equipment.nextInspectionDate),  highlight: true  },
            ].map((r, i, arr) => (
              <div key={r.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                background: r.highlight && riksaStatus !== 'active' ? (riksaStatus === 'expired' ? 'var(--red-light)' : 'var(--amber-light)') : 'transparent',
              }}>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: r.highlight ? 700 : 600, color: r.highlight ? statusColor(riksaStatus) : 'var(--ink)' }}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>

          {/* QR Code */}
          <div className="m-card" style={{ padding: 16, textAlign: 'center' }}>
            <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', marginBottom: 14 }}>QR Code</p>
            <div ref={qrRef} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: 16, background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 12 }}>
              <QRCodeCanvas value={qrValue} size={130} level="H" includeMargin={false} />
              <p style={{ fontSize: 8, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 10 }}>EHS Equipment Testing</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{equipment.equipmentNo}</p>
            </div>
            <button onClick={downloadQR} className="btn btn-success" style={{ width: '100%', gap: 6 }}>
              <Download size={14} /> Download QR Code
            </button>
          </div>

          {/* Inspection history */}
          <div className="m-card">
            <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                Riwayat Riksa Uji
                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>({equipment.inspections?.length || 0})</span>
              </p>
            </div>
            {!equipment.inspections?.length ? (
              <div style={{ padding: '24px 14px', textAlign: 'center' }}>
                <Clock size={22} color="var(--ink-4)" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Belum ada riwayat</p>
              </div>
            ) : equipment.inspections.map((insp, i, arr) => (
              <div key={insp.id} style={{ display: 'flex', gap: 10, padding: '11px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: conditionColor(insp.status) }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{insp.type}</p>
                    <p style={{ fontSize: 11, color: 'var(--ink-3)' }}>{formatDateShort(insp.date)}</p>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{insp.notes || 'Tidak ada catatan'}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>oleh {insp.performedBy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );

  /* ════════ PC ════════ */
  return (
    <Layout>
      <div style={{ padding: '28px 32px 40px', maxWidth: 1280, margin: '0 auto' }}>

        {/* Back + title */}
        <button onClick={() => navigate('/inventory')}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 13, fontWeight: 500, marginBottom: 18, transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}>
          <ChevronLeft size={14} /> Kembali ke Inventory
        </button>

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {equipment.equipmentNo}
            </h1>
            <span className={`badge badge-${riksaStatus}`} style={{ fontSize: 12 }}>
              {riksaUjiStatusLabel[riksaStatus]}
            </span>
          </div>
          {!updating && (
            <button onClick={() => setUpdating(true)} className="btn btn-primary" style={{ gap: 6 }}>
              <ShieldCheck size={14} /> Update Status
            </button>
          )}
        </div>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, fontWeight: 500, marginBottom: 26 }}>{equipment.equipmentName}</p>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18 }}>

          {/* ── LEFT ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Update form (inline) */}
            {updating && (
              <div className="card" style={{ padding: 22, borderColor: '#BFDBFE', background: '#F8FBFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div className="section-header"><h2 className="text-heading">Update Kondisi Peralatan</h2></div>
                  <button onClick={() => { setUpdating(false); setNotes(''); }} className="btn-icon">
                    <X size={14} />
                  </button>
                </div>
                <UpdateForm />
              </div>
            )}

            {/* Info grid */}
            <div className="card" style={{ padding: 22 }}>
              <div className="section-header" style={{ marginBottom: 20 }}>
                <h2 className="text-heading">Informasi Peralatan</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {[
                  { label: 'Kategori',        value: equipment.category                },
                  { label: 'Departemen',       value: equipment.department || '-'       },
                  { label: 'Tipe / Model',     value: equipment.equipmentType || '-'    },
                  { label: 'Merk / Pabrikan',  value: equipment.brand || '-'            },
                  { label: 'Tahun Pembuatan',  value: equipment.manufactureYear || '-'  },
                  { label: 'Status Kondisi',   value: equipment.status                  },
                ].map(r => (
                  <div key={r.label}>
                    <p className="text-label" style={{ marginBottom: 4 }}>{r.label}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: r.label === 'Status Kondisi' ? conditionColor(r.value) : 'var(--ink)' }}>{r.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Riksa Uji schedule */}
            <div className="card" style={{ padding: 22 }}>
              <div className="section-header" style={{ marginBottom: 20 }}>
                <h2 className="text-heading">Jadwal Riksa Uji</h2>
              </div>
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
                  <p style={{ fontSize: 16, fontWeight: 700, color: statusColor(riksaStatus) }}>{formatDate(equipment.nextInspectionDate)}</p>
                </div>
              </div>
            </div>

            {/* Specs */}
            {specItems.length > 0 && (
              <div className="card" style={{ padding: 22 }}>
                <div className="section-header" style={{ marginBottom: 20 }}>
                  <h2 className="text-heading">Spesifikasi Teknis</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
                  {specItems.map(([k, v]) => (
                    <div key={k}>
                      <p className="text-label" style={{ marginBottom: 4 }}>{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inspection history */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
                <div className="section-header">
                  <h2 className="text-heading">
                    Riwayat Riksa Uji
                    <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>({equipment.inspections?.length || 0})</span>
                  </h2>
                </div>
              </div>
              {!equipment.inspections?.length ? (
                <div style={{ padding: '36px 22px', textAlign: 'center' }}>
                  <Clock size={24} color="var(--ink-4)" style={{ margin: '0 auto 10px' }} />
                  <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Belum ada riwayat riksa uji</p>
                </div>
              ) : equipment.inspections.map((insp, i, arr) => (
                <div key={insp.id} style={{ display: 'flex', gap: 14, padding: '14px 22px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: conditionColor(insp.status) }} />
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

          {/* ── RIGHT ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* QR Code */}
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <div className="section-header" style={{ marginBottom: 16, justifyContent: 'center' }}>
                <h2 className="text-heading">QR Code</h2>
              </div>
              <div ref={qrRef} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: 16, background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 12 }}>
                <QRCodeCanvas value={qrValue} size={150} level="H" includeMargin={false} />
                <p style={{ fontSize: 8, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 10 }}>EHS Equipment Testing</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{equipment.equipmentNo}</p>
              </div>
              <button onClick={downloadQR} className="btn btn-success" style={{ width: '100%', gap: 6 }}>
                <Download size={14} /> Download QR
              </button>
              <p style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 10, wordBreak: 'break-all', lineHeight: 1.5 }}>{qrValue}</p>
            </div>

            {/* System log */}
            <div className="card" style={{ padding: 20 }}>
              <div className="section-header" style={{ marginBottom: 14 }}>
                <h2 className="text-heading">Log Sistem</h2>
              </div>
              {[
                { label: 'Diperbarui oleh',   value: equipment.updatedBy || '-'        },
                { label: 'Terakhir diperbarui', value: formatDateShort(equipment.updatedAt) },
                { label: 'Terdaftar pada',     value: formatDateShort(equipment.createdAt) },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
                  <span style={{ color: 'var(--ink-3)' }}>{r.label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
