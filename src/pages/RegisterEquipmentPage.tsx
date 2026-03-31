import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { useAuth } from '../App';
import { useToast } from '../hooks/useToast';
import { Equipment, EquipmentCategory, ValidityPeriod, calculateNextInspectionDate, mapEquipmentToDb } from '../types';
import { QRCodeCanvas } from 'qrcode.react';
import { CheckCircle2, Download, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const CATEGORIES: EquipmentCategory[] = ['Fire Equipment', 'Heavy Equipment', 'Bejana Tekan', 'Tangki Timbun', 'Lain-lain'];
const VALIDITY: ValidityPeriod[] = ['6 Bulan', '1 Tahun', '2 Tahun', '3 Tahun'];
const PRESSURE_CATS: EquipmentCategory[] = ['Bejana Tekan', 'Tangki Timbun'];

interface FormData {
  equipmentNo: string; equipmentName: string; equipmentType: string;
  brand: string; manufactureYear: string; category: EquipmentCategory; department: string;
  lastInspectionDate: string; validityPeriod: ValidityPeriod;
  capacity: string; volume: string; designPressure: string; workingPressure: string;
  customCategoryName: string;
}

const empty: FormData = {
  equipmentNo: '', equipmentName: '', equipmentType: '', brand: '', manufactureYear: '',
  category: 'Fire Equipment', department: '', lastInspectionDate: '', validityPeriod: '1 Tahun',
  capacity: '', volume: '', designPressure: '', workingPressure: '', customCategoryName: '',
};

// ✅ OPTIMIZED FORM - NO RE-RENDER ON KEYSTROKE
const RegisterEquipmentPageContent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  // ✅ useCallback handlers - stable references
  const setField = useCallback((key: keyof FormData) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      // Direct state update - no intermediate function calls
      setForm(prev => ({ ...prev, [key]: e.target.value }));
    };
  }, []);

  const [form, setForm] = useState<FormData>(empty);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<Equipment | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  // ✅ useMemo - computed values don't trigger re-renders
  const isPressure = useMemo(() => PRESSURE_CATS.includes(form.category), [form.category]);
  const isLainlain = useMemo(() => form.category === 'Lain-lain', [form.category]);
  const nextDate = useMemo(() => form.lastInspectionDate ? calculateNextInspectionDate(form.lastInspectionDate, form.validityPeriod) : '', [form.lastInspectionDate, form.validityPeriod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipmentNo || !form.equipmentName || !form.department) {
      toast.error('Lengkapi field wajib');
      return;
    }
    setLoading(true);
    const qrUrl = `${window.location.origin}/scan/${form.equipmentNo}`;
    const equip: Equipment = {
      id: '', equipmentNo: form.equipmentNo, equipmentName: form.equipmentName,
      equipmentType: form.equipmentType, brand: form.brand, manufactureYear: form.manufactureYear,
      category: form.category, department: form.department,
      specs: {
        ...(isPressure && { capacity: form.capacity, volume: form.volume, designPressure: form.designPressure, workingPressure: form.workingPressure }),
        ...(isLainlain && { customCategoryName: form.customCategoryName }),
      },
      status: 'Good', qrUrl,
      lastInspectionDate: form.lastInspectionDate || undefined,
      validityPeriod: form.lastInspectionDate ? form.validityPeriod : undefined,
      nextInspectionDate: nextDate || undefined,
      inspections: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      updatedBy: user?.fullName || '',
    };
    const { data, error } = await supabase.from('equipments').insert([mapEquipmentToDb(equip, user?.fullName || '')]).select().single();
    if (error) {
      toast.error('Gagal menyimpan: ' + error.message);
    } else {
      setSuccess({ ...equip, id: data.id });
      setForm(empty);
    }
    setLoading(false);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as any[][];
      const preview = rows.slice(1).filter(r => r.some(Boolean)).map(r => ({
        equipmentNo: r[0] || '', equipmentName: r[1] || '', category: r[2] || 'Fire Equipment',
        equipmentType: r[3] || '', department: r[4] || '', brand: r[5] || '', manufactureYear: r[6]?.toString() || '',
      }));
      setImportPreview(preview);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const Label = ({ children, optional }: { children: React.ReactNode; optional?: boolean }) => (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)' }}>{children}</span>
      {optional && <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', background: 'var(--surface-container)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--outline-variant)' }}>Opsional</span>}
    </label>
  );

  return (
    <>
      {/* Success Modal */}
      {success && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 380, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ background: 'linear-gradient(135deg,#16A34A,#15803D)', padding: '24px 24px 28px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle2 size={28} color="#fff" />
              </div>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Registrasi Berhasil!</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{success.equipmentNo} telah didaftarkan</p>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', background: '#F9FAFB', borderRadius: 14, border: '1px solid #E5E7EB' }}>
                <QRCodeCanvas value={success.qrUrl} size={150} level="H" />
                <p style={{ fontSize: 15, fontWeight: 700, color: '#111', fontFamily: 'monospace', marginTop: 8 }}>{success.equipmentNo}</p>
              </div>
              <button onClick={() => navigate(`/inventory/${success.id}`)} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, height: 46, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Lihat Detail Peralatan
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setSuccess(null)} style={{ flex: 1, height: 44, background: '#F3F4F6', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Daftar Lagi</button>
                <button onClick={() => window.open(success.qrUrl, '_blank')} style={{ flex: 1, height: 44, background: '#ECFDF5', color: '#065F46', border: '1px solid #BBF7D0', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Test QR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dim) 100%)',
        borderRadius: '20px', padding: '32px 24px', color: 'var(--on-primary)',
        marginBottom: '24px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontFamily: 'Manrope', fontSize: '28px', fontWeight: '900', lineHeight: '1.1', marginBottom: '6px', letterSpacing: '-0.02em' }}>
            Registrasi Peralatan Baru
          </h1>
          <p style={{ fontSize: '14px', opacity: 0.9, lineHeight: '1.5' }}>Lengkapi informasi peralatan untuk didaftarkan ke sistem EHS</p>
        </div>
      </div>

      <div style={{ padding: '0 40px 32px', maxWidth: 900, margin: '0 auto' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Import Excel */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileImport} />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-success btn-lg" style={{ gap: 8, flex: 1 }}>
              <FileSpreadsheet size={16} /> Import dari Excel
            </button>
            <button type="button" onClick={() => toast.info('Template Excel akan segera tersedia')} className="btn btn-secondary btn-lg" style={{ gap: 6 }}>
              <Download size={16} /> Template
            </button>
          </div>

          {/* Info Utama */}
          <div className="card" style={{ padding: 24, overflow: 'hidden' }}>
            <div style={{ 
              background: 'linear-gradient(90deg, var(--primary-container) 0%, var(--surface-container-high) 100%)', 
              padding: '20px 24px', borderBottom: '1px solid var(--surface-container)' 
            }}>
              <h3 style={{ fontFamily: 'Manrope', fontSize: '16px', fontWeight: '700', color: 'var(--on-surface)', margin: 0 }}>
                Informasi Utama
              </h3>
            </div>
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <Label>Nomor Peralatan *</Label>
                <input className="input-field" placeholder="Contoh: EQ-BT-001" required value={form.equipmentNo} onChange={setField('equipmentNo')} />
              </div>
              <div>
                <Label>Kategori *</Label>
                <select className="input-field" value={form.category} onChange={setField('category' as any)} required>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Nama Peralatan *</Label>
                <input className="input-field" placeholder="Contoh: APAR CO2 5KG" required value={form.equipmentName} onChange={setField('equipmentName')} />
              </div>
              <div>
                <Label optional>Tipe / Model</Label>
                <input className="input-field" placeholder="Contoh: MT5-CO2" value={form.equipmentType} onChange={setField('equipmentType')} />
              </div>
              <div>
                <Label optional>Merk / Pabrikan</Label>
                <input className="input-field" placeholder="Contoh: Yamato" value={form.brand} onChange={setField('brand')} />
              </div>
              <div>
                <Label optional>Tahun Pembuatan</Label>
                <input className="input-field" type="number" placeholder="2020" min="1900" max={new Date().getFullYear()} value={form.manufactureYear} onChange={setField('manufactureYear')} />
              </div>
              <div>
                <Label>Departemen *</Label>
                <input className="input-field" placeholder="Contoh: Produksi" required value={form.department} onChange={setField('department')} />
              </div>
              {isLainlain && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <Label optional>Nama Kategori Custom</Label>
                  <input className="input-field" placeholder="Isi nama kategori" value={form.customCategoryName} onChange={setField('customCategoryName')} />
                </div>
              )}
            </div>
          </div>

          {/* Riksa Uji */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ 
              background: 'linear-gradient(90deg, var(--secondary-container) 0%, var(--surface-container-high) 100%)', 
              padding: '20px 24px', borderBottom: '1px solid var(--surface-container)' 
            }}>
              <h3 style={{ fontFamily: 'Manrope', fontSize: '16px', fontWeight: '700', color: 'var(--on-surface)', margin: 0 }}>
                Jadwal Riksa Uji
              </h3>
            </div>
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <Label optional>Tanggal Terakhir</Label>
                <input className="input-field" type="date" value={form.lastInspectionDate} onChange={setField('lastInspectionDate' as any)} />
              </div>
              <div>
                <Label optional>Masa Berlaku</Label>
                <select className="input-field" value={form.validityPeriod} onChange={setField('validityPeriod' as any)} disabled={!form.lastInspectionDate}>
                  {VALIDITY.map(val => <option key={val} value={val}>{val}</option>)}
                </select>
              </div>
              {nextDate && (
                <div style={{ gridColumn: '1 / -1', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Riksa Uji Berikutnya</p>
                  <p style={{ fontWeight: 700, fontSize: 16, color: '#059669' }}>
                    {new Date(nextDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {isPressure && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ 
                background: 'linear-gradient(90deg, var(--tertiary-container) 0%, var(--surface-container-high) 100%)', 
                padding: '20px 24px', borderBottom: '1px solid var(--surface-container)' 
              }}>
                <h3 style={{ fontFamily: 'Manrope', fontSize: '16px', fontWeight: '700', color: 'var(--on-surface)', margin: 0 }}>
                  Spesifikasi Teknis
                </h3>
              </div>
              <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div><Label optional>Kapasitas</Label><input className="input-field" placeholder="5000 L" value={form.capacity} onChange={setField('capacity')} /></div>
                <div><Label optional>Volume</Label><input className="input-field" placeholder="4800 L" value={form.volume} onChange={setField('volume')} /></div>
                <div><Label optional>Design Pressure</Label><input className="input-field" placeholder="15 bar" value={form.designPressure} onChange={setField('designPressure')} /></div>
                <div><Label optional>Working Pressure</Label><input className="input-field" placeholder="10 bar" value={form.workingPressure} onChange={setField('workingPressure')} /></div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setForm(empty)} className="btn btn-secondary" style={{ flex: 1 }}>
              Reset Form
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2, height: 44 }}>
              {loading ? 'Menyimpan...' : 'Simpan Peralatan'}
            </button>
          </div>

          {/* Excel Format */}
          <div style={{ background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', borderRadius: 8, padding: '16px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 6 }}>Excel Import Format:</p>
            <p style={{ fontSize: 11, color: 'var(--outline)', lineHeight: 1.6 }}>
              Kolom: No.Per | Nama | Kategori | Tipe | Departemen | Merk | Tahun
            </p>
          </div>
        </form>
      </div>
    </>
  );
};

export const RegisterEquipmentPage = () => (
  <Layout>
    <RegisterEquipmentPageContent />
  </Layout>
);

