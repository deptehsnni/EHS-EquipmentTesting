import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { useAuth } from '../App';
import { useToast } from '../hooks/useToast';
import { Equipment, Inspection, ValidityPeriod, mapDbToEquipment, mapEquipmentToDb, getRiksaUjiStatus, riksaUjiStatusLabel, formatDate, formatDateShort, calculateNextInspectionDate } from '../types';

const VALIDITY_OPTIONS: ValidityPeriod[] = ['6 Bulan', '1 Tahun', '2 Tahun', '3 Tahun'];
import { QRCodeCanvas } from 'qrcode.react';

const MI = ({ icon, style = {}, className = '' }: { icon: string; style?: React.CSSProperties; className?: string }) => (
  <span className={`mi ${className}`} style={style}>{icon}</span>
);

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 1024);
  useEffect(() => { const fn = () => setV(window.innerWidth < 1024); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);
  return v;
};

const condColor  = (s: string) => s === 'Good' ? '#14532d' : s === 'Needs Repair' ? 'var(--on-tertiary-container)' : 'var(--error)';
const condBg     = (s: string) => s === 'Good' ? '#dcfce7' : s === 'Needs Repair' ? 'var(--tertiary-container)' : 'rgba(254,137,131,0.2)';
const riksaColor = (s: string) => s === 'active' ? '#14532d' : s === 'warning' ? 'var(--on-tertiary-container)' : s === 'expired' ? 'var(--error)' : 'var(--on-surface-variant)';
const heroGrad   = (s: string) => s === 'expired' ? 'linear-gradient(135deg,#752121,#9f403d)' : s === 'warning' ? 'linear-gradient(135deg,#4a4a65,#5d5d78)' : 'linear-gradient(135deg,#1A365D,#455f88)';

export const EquipmentDetailPage: React.FC = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile  = useIsMobile();
  const qrRef     = useRef<HTMLDivElement>(null);

  const [equipment,      setEquipment]      = useState<Equipment | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [updating,       setUpdating]       = useState(false);
  const [newStatus,      setNewStatus]      = useState<'Good' | 'Needs Repair' | 'Critical'>('Good');
  const [newDepartment,  setNewDepartment]  = useState('');
  const [lastInspDate,   setLastInspDate]   = useState('');
  const [validityPeriod, setValidityPeriod] = useState<ValidityPeriod>('1 Tahun');
  const [notes,          setNotes]          = useState('');
  const [saving,         setSaving]         = useState(false);

  const initUpdateForm = (m: Equipment) => {
    setNewStatus(m.status);
    setNewDepartment(m.department || '');
    setLastInspDate(m.lastInspectionDate || '');
    setValidityPeriod((m.validityPeriod as ValidityPeriod) || '1 Tahun');
    setNotes('');
  };

  useEffect(() => {
    if (!id) return;
    supabase.from('equipments').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) { toast.error('Peralatan tidak ditemukan'); navigate('/inventory'); return; }
        const m = mapDbToEquipment(data);
        setEquipment(m);
        initUpdateForm(m);
        setLoading(false);
      });
  }, [id]);

  const downloadQR = () => {
    if (!qrRef.current || !equipment) return;
    const canvas = qrRef.current.querySelector('canvas'); if (!canvas) return;
    const fc = document.createElement('canvas'), ctx = fc.getContext('2d'); if (!ctx) return;
    const pad = 48; fc.width = canvas.width + pad * 2; fc.height = canvas.height + pad * 2 + 140;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, fc.width, fc.height);
    ctx.drawImage(canvas, pad, pad);
    ctx.fillStyle = '#1A365D'; ctx.textAlign = 'center';
    ctx.font = 'bold 28px Manrope,sans-serif'; ctx.fillText('EHS Equipment Testing', fc.width / 2, canvas.height + pad + 40);
    ctx.font = 'bold 48px monospace'; ctx.fillText(equipment.equipmentNo, fc.width / 2, canvas.height + pad + 100);
    const a = document.createElement('a'); a.download = `QR-${equipment.equipmentNo}.png`; a.href = fc.toDataURL('image/png', 1); a.click();
  };

  const handleUpdate = async () => {
    if (!equipment || !user) return;

    // Validate: if lastInspDate is set, validityPeriod must be set too
    if (lastInspDate && !validityPeriod) {
      toast.error('Pilih masa berlaku riksa uji');
      return;
    }

    setSaving(true);

    // Calculate next inspection date if lastInspDate provided
    const nextInspDate = lastInspDate && validityPeriod
      ? calculateNextInspectionDate(lastInspDate, validityPeriod)
      : equipment.nextInspectionDate;

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
      status:             newStatus,
      department:         newDepartment || equipment.department,
      lastInspectionDate: lastInspDate  || equipment.lastInspectionDate,
      validityPeriod:     validityPeriod || equipment.validityPeriod,
      nextInspectionDate: nextInspDate,
      updatedAt:          new Date().toISOString(),
      updatedBy:          user.fullName || user.employeeId,
      inspections:        [insp, ...(equipment.inspections || [])],
    };

    const { error } = await supabase
      .from('equipments')
      .update(mapEquipmentToDb(updated, user.fullName || ''))
      .eq('id', equipment.id);

    if (error) {
      toast.error('Gagal menyimpan: ' + error.message);
    } else {
      toast.success('Data berhasil diperbarui');
      setEquipment(updated);
      setUpdating(false);
      setNotes('');
    }
    setSaving(false);
  };

  if (loading) return <Layout><div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner" /></div></Layout>;
  if (!equipment) return null;

  const riksaStatus = getRiksaUjiStatus(equipment.nextInspectionDate);
  const qrValue     = `${window.location.origin}/scan/${equipment.equipmentNo}`;
  const specItems   = Object.entries(equipment.specs || {}).filter(([, v]) => v && typeof v === 'string');

  const cancelUpdate = () => {
    setUpdating(false);
    if (equipment) initUpdateForm(equipment);
  };

  const UpdateForm = ({ compact = false }: { compact?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Status Kondisi ── */}
      <div>
        <p style={{ fontFamily: 'Manrope', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: 8 }}>Status Kondisi</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {(['Good', 'Needs Repair', 'Critical'] as const).map(s => (
            <button key={s} onClick={() => setNewStatus(s)} style={{ padding: compact ? '9px 4px' : '11px 8px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Manrope', fontWeight: 700, fontSize: compact ? 11 : 12, letterSpacing: '0.02em', textAlign: 'center', border: `2px solid ${newStatus === s ? condColor(s) : 'var(--surface-container)'}`, background: newStatus === s ? condBg(s) : 'var(--surface-container-lowest)', color: newStatus === s ? condColor(s) : 'var(--on-surface-variant)', transition: 'all 0.15s' }}>
              {s === 'Good' ? 'Baik' : s === 'Needs Repair' ? 'Perlu Perbaikan' : 'Kritis'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Two column grid for dates ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Riksa Uji Terakhir */}
        <div>
          <p style={{ fontFamily: 'Manrope', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: 7 }}>Riksa Uji Terakhir</p>
          <div style={{ position: 'relative' }}>
            <input
              type="date"
              className="input-field"
              value={lastInspDate}
              onChange={e => setLastInspDate(e.target.value)}
              style={{ paddingRight: 10 }}
            />
          </div>
          {lastInspDate && validityPeriod && (
            <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 4 }}>
              → Berlaku hingga:{' '}
              <span style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--primary)' }}>
                {new Date(calculateNextInspectionDate(lastInspDate, validityPeriod)).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </p>
          )}
        </div>

        {/* Masa Berlaku */}
        <div>
          <p style={{ fontFamily: 'Manrope', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: 7 }}>Masa Berlaku</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {VALIDITY_OPTIONS.map(v => (
              <button key={v} onClick={() => setValidityPeriod(v)} style={{ padding: '8px 6px', borderRadius: 7, cursor: 'pointer', fontFamily: 'Manrope', fontWeight: 700, fontSize: 11, textAlign: 'center', border: `2px solid ${validityPeriod === v ? 'var(--primary)' : 'var(--surface-container)'}`, background: validityPeriod === v ? 'var(--primary-container)' : 'var(--surface-container-lowest)', color: validityPeriod === v ? 'var(--on-primary-container)' : 'var(--on-surface-variant)', transition: 'all 0.15s' }}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Departemen ── */}
      <div>
        <p style={{ fontFamily: 'Manrope', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: 7 }}>Departemen</p>
        <div style={{ position: 'relative' }}>
          <MI icon="corporate_fare" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)', fontSize: 16, pointerEvents: 'none' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Nama departemen..."
            value={newDepartment}
            onChange={e => setNewDepartment(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
        </div>
      </div>

      {/* ── Catatan ── */}
      <div>
        <p style={{ fontFamily: 'Manrope', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginBottom: 7 }}>Catatan Inspeksi</p>
        <textarea className="input-field" placeholder="Catatan opsional..." value={notes} onChange={e => setNotes(e.target.value)} style={{ height: 70 }} />
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
        <button onClick={cancelUpdate} className="btn btn-secondary" style={{ flex: 1 }}>Batal</button>
        <button onClick={handleUpdate} disabled={saving} className="btn btn-primary" style={{ flex: 2, gap: 6 }}>
          <MI icon="save" className="mi-sm" /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  );

  /* ════════ MOBILE ════════ */
  if (isMobile) return (
    <Layout>
      <div style={{ background: 'var(--surface-container-low)', minHeight: '100vh' }}>
        <div style={{ background: heroGrad(riksaStatus), padding: '14px 14px 22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 160, height: 160, borderRadius: '50%', background: 'rgba(214,227,255,0.1)', pointerEvents: 'none' }} />
          <button onClick={() => navigate('/inventory')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.13)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontFamily: 'Manrope', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 14, letterSpacing: '0.04em' }}>
            <MI icon="arrow_back" className="mi-sm" /> Kembali
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'Manrope', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{equipment.category}</p>
              <h1 style={{ color: '#fff', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.01em', lineHeight: 1 }}>{equipment.equipmentNo}</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>{equipment.equipmentName}</p>
            </div>
            <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 99, padding: '4px 11px', fontSize: 10, fontFamily: 'Manrope', fontWeight: 700, letterSpacing: '0.05em', color: '#fff', flexShrink: 0 }}>
              {riksaUjiStatusLabel[riksaStatus]}
            </span>
          </div>
          {equipment.nextInspectionDate && (
            <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 13px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'Manrope', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Riksa Uji Berikutnya</p>
              <p style={{ color: '#fff', fontFamily: 'Manrope', fontWeight: 700, fontSize: 14 }}>{formatDate(equipment.nextInspectionDate)}</p>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 14px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!updating ? (
            <button onClick={() => { initUpdateForm(equipment); setUpdating(true); }} className="btn btn-primary btn-lg" style={{ width: '100%', gap: 8 }}>
              <MI icon="shield_check" className="mi-sm" /> Update Status Riksa Uji
            </button>
          ) : (
            <div className="m-card" style={{ padding: 16 }}>
              <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, color: '#1A365D', marginBottom: 12 }}>Update Kondisi Peralatan</p>
              <UpdateForm compact />
            </div>
          )}

          {/* Info */}
          <div className="m-card">
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--surface-container-low)' }}>
              <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, color: '#1A365D' }}>Informasi Peralatan</p>
            </div>
            {[{ icon: 'category', label: 'Kategori', value: equipment.category }, { icon: 'corporate_fare', label: 'Departemen', value: equipment.department || '-' }, { icon: 'settings', label: 'Tipe/Model', value: equipment.equipmentType || '-' }, { icon: 'precision_manufacturing', label: 'Merk', value: equipment.brand || '-' }, { icon: 'calendar_today', label: 'Tahun Buat', value: equipment.manufactureYear || '-' }].map((r, i, arr) => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--surface-container-low)' : 'none' }}>
                <MI icon={r.icon} style={{ color: 'var(--outline)', fontSize: 16, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', width: 90, flexShrink: 0 }}>{r.label}</span>
                <span style={{ fontFamily: 'Manrope', fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', flex: 1 }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Riksa Uji */}
          <div className="m-card">
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--surface-container-low)' }}>
              <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, color: '#1A365D' }}>Jadwal Riksa Uji</p>
            </div>
            {[{ label: 'Terakhir', value: formatDate(equipment.lastInspectionDate), hi: false }, { label: 'Masa Berlaku', value: equipment.validityPeriod || '-', hi: false }, { label: 'Berikutnya', value: formatDate(equipment.nextInspectionDate), hi: true }].map((r, i, arr) => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--surface-container-low)' : 'none', background: r.hi && riksaStatus !== 'active' ? (riksaStatus === 'expired' ? 'rgba(254,137,131,0.1)' : 'rgba(217,215,248,0.3)') : 'transparent' }}>
                <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{r.label}</span>
                <span style={{ fontFamily: 'Manrope', fontWeight: r.hi ? 700 : 600, fontSize: 13, color: r.hi ? riksaColor(riksaStatus) : 'var(--on-surface)' }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* QR */}
          <div className="m-card" style={{ padding: 16, textAlign: 'center' }}>
            <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, color: '#1A365D', marginBottom: 14 }}>QR Code</p>
            <div ref={qrRef} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: 16, background: 'var(--surface-container-low)', borderRadius: 12, marginBottom: 12 }}>
              <QRCodeCanvas value={qrValue} size={128} level="H" />
              <p style={{ fontSize: 8, fontFamily: 'Manrope', fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 10 }}>EHS Equipment Testing</p>
              <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--on-surface)', marginTop: 2 }}>{equipment.equipmentNo}</p>
            </div>
            <button onClick={downloadQR} className="btn btn-success" style={{ width: '100%', gap: 6 }}><MI icon="download" className="mi-sm" /> Download QR Code</button>
          </div>

          {/* History */}
          <div className="m-card">
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--surface-container-low)' }}>
              <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, color: '#1A365D' }}>Riwayat Riksa Uji <span style={{ fontWeight: 400, color: 'var(--on-surface-variant)' }}>({equipment.inspections?.length || 0})</span></p>
            </div>
            {!equipment.inspections?.length ? (
              <div style={{ padding: '24px 14px', textAlign: 'center' }}><MI icon="history" style={{ color: 'var(--outline-variant)', fontSize: 28, marginBottom: 8 }} /><p style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>Belum ada riwayat</p></div>
            ) : equipment.inspections.map((insp, i, arr) => (
              <div key={insp.id} style={{ display: 'flex', gap: 10, padding: '11px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--surface-container-low)' : 'none' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: condColor(insp.status) }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, color: 'var(--on-surface)' }}>{insp.type}</p>
                    <p className="label-caps">{formatDateShort(insp.date)}</p>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{insp.notes || 'Tidak ada catatan'}</p>
                  <p className="label-caps" style={{ marginTop: 3 }}>oleh {insp.performedBy}</p>
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
      <div style={{ padding: '40px 48px', maxWidth: 1280, margin: '0 auto' }}>
        <button onClick={() => navigate('/inventory')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', fontFamily: 'Manrope', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20, transition: 'color 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--on-surface-variant)')}>
          <MI icon="arrow_back" className="mi-sm" /> Kembali ke Inventory
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 30, fontWeight: 700, color: '#1A365D', letterSpacing: '-0.01em' }}>{equipment.equipmentNo}</h1>
            <span className={`badge badge-${riksaStatus}`}>{riksaUjiStatusLabel[riksaStatus]}</span>
          </div>
          {!updating && (
            <button onClick={() => { initUpdateForm(equipment); setUpdating(true); }} className="btn btn-primary" style={{ gap: 6 }}>
              <MI icon="shield_check" className="mi-sm" /> Update Status
            </button>
          )}
        </div>
        <p style={{ fontFamily: 'Manrope', fontSize: 15, fontWeight: 500, color: 'var(--on-surface-variant)', marginBottom: 28 }}>{equipment.equipmentName}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {updating && (
              <div className="card" style={{ padding: 24, borderTop: `3px solid var(--primary)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, color: '#1A365D' }}>Update Kondisi Peralatan</h3>
                  <button onClick={() => { setUpdating(false); setNotes(''); }} className="btn-icon"><MI icon="close" className="mi-sm" /></button>
                </div>
                <UpdateForm />
              </div>
            )}

            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, color: '#1A365D', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Informasi Peralatan</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {[{ l: 'Kategori', v: equipment.category }, { l: 'Departemen', v: equipment.department || '-' }, { l: 'Tipe / Model', v: equipment.equipmentType || '-' }, { l: 'Merk / Pabrikan', v: equipment.brand || '-' }, { l: 'Tahun Pembuatan', v: equipment.manufactureYear || '-' }, { l: 'Status Kondisi', v: equipment.status }].map(r => (
                  <div key={r.l}>
                    <p className="label-caps" style={{ marginBottom: 5 }}>{r.l}</p>
                    <p style={{ fontFamily: 'Manrope', fontSize: 14, fontWeight: 600, color: r.l === 'Status Kondisi' ? condColor(r.v) : 'var(--on-surface)' }}>{r.v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <h3 className="label-caps" style={{ marginBottom: 20, fontSize: 11 }}>Jadwal Riksa Uji</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                <div><p className="label-caps" style={{ marginBottom: 5 }}>Riksa Uji Terakhir</p><p style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 14, color: 'var(--on-surface)' }}>{formatDate(equipment.lastInspectionDate)}</p></div>
                <div><p className="label-caps" style={{ marginBottom: 5 }}>Masa Berlaku</p><p style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 14, color: 'var(--on-surface)' }}>{equipment.validityPeriod || '-'}</p></div>
                <div><p className="label-caps" style={{ marginBottom: 5 }}>Riksa Uji Berikutnya</p><p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 15, color: riksaColor(riksaStatus) }}>{formatDate(equipment.nextInspectionDate)}</p></div>
              </div>
            </div>

            {specItems.length > 0 && (
              <div className="card" style={{ padding: 24 }}>
                <h3 className="label-caps" style={{ marginBottom: 20, fontSize: 11 }}>Spesifikasi Teknis</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
                  {specItems.map(([k, v]) => (
                    <div key={k}><p className="label-caps" style={{ marginBottom: 5 }}>{k.replace(/([A-Z])/g, ' $1').trim()}</p><p style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 14, color: 'var(--on-surface)' }}>{v as string}</p></div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--surface-container-low)' }}>
                <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, color: '#1A365D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Riwayat Riksa Uji <span style={{ fontWeight: 400, color: 'var(--on-surface-variant)', textTransform: 'none', letterSpacing: 0 }}>({equipment.inspections?.length || 0})</span></h3>
              </div>
              {!equipment.inspections?.length ? (
                <div style={{ padding: '36px 24px', textAlign: 'center' }}><MI icon="history" style={{ color: 'var(--outline-variant)', fontSize: 36, marginBottom: 12 }} /><p style={{ color: 'var(--on-surface-variant)', fontSize: 13 }}>Belum ada riwayat riksa uji</p></div>
              ) : (
                <div style={{ position: 'relative', padding: '20px 24px' }}>
                  <div style={{ position: 'absolute', left: 32, top: 30, bottom: 30, width: 1, background: 'var(--outline-variant)', opacity: 0.3 }} />
                  {equipment.inspections.map((insp, i) => (
                    <div key={insp.id} style={{ display: 'flex', gap: 20, marginBottom: i < equipment.inspections.length - 1 ? 24 : 0, opacity: i >= 3 ? 0.6 : 1 }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: condColor(insp.status), flexShrink: 0, marginTop: 3, zIndex: 1, boxShadow: `0 0 0 3px var(--surface-container-lowest)` }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, color: 'var(--on-surface)' }}>{insp.type}</p>
                          <p className="label-caps">{formatDateShort(insp.date)}</p>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>{insp.notes || 'Tidak ada catatan'}</p>
                        <p className="label-caps" style={{ marginTop: 4 }}>Dilakukan oleh {insp.performedBy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 22, textAlign: 'center' }}>
              <h3 className="label-caps" style={{ marginBottom: 16, textAlign: 'left' }}>QR Code</h3>
              <div ref={qrRef} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: 16, background: 'var(--surface-container-low)', borderRadius: 12, marginBottom: 14 }}>
                <QRCodeCanvas value={qrValue} size={148} level="H" />
                <p style={{ fontSize: 8, fontFamily: 'Manrope', fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 10 }}>EHS Equipment Testing</p>
                <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--on-surface)', marginTop: 2 }}>{equipment.equipmentNo}</p>
              </div>
              <button onClick={downloadQR} className="btn btn-success" style={{ width: '100%', gap: 6 }}><MI icon="download" className="mi-sm" /> Download QR</button>
              <p style={{ fontSize: 10, color: 'var(--outline)', marginTop: 10, wordBreak: 'break-all', lineHeight: 1.5 }}>{qrValue}</p>
            </div>

            <div className="card" style={{ padding: 22 }}>
              <h3 className="label-caps" style={{ marginBottom: 14 }}>Log Sistem</h3>
              {[{ l: 'Diperbarui oleh', v: equipment.updatedBy || '-' }, { l: 'Terakhir diperbarui', v: formatDateShort(equipment.updatedAt) }, { l: 'Terdaftar pada', v: formatDateShort(equipment.createdAt) }].map(r => (
                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>{r.l}</span>
                  <span style={{ fontFamily: 'Manrope', fontWeight: 600, color: 'var(--on-surface)' }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
