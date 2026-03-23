import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { useAuth } from '../App';
import { useToast } from '../hooks/useToast';
import { Equipment, EquipmentCategory, ValidityPeriod, calculateNextInspectionDate, mapEquipmentToDb } from '../types';
import { QRCodeCanvas } from 'qrcode.react';
import { CheckCircle2, Download, FileSpreadsheet, X, ChevronDown } from 'lucide-react';
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

const SuccessModal: React.FC<{ equipment: Equipment; onClose: () => void }> = ({ equipment, onClose }) => {
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);

  const downloadQR = () => {
    if (!qrRef.current) return;
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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 380, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ background: 'linear-gradient(135deg,#16A34A,#15803D)', padding: '24px 24px 28px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <CheckCircle2 size={28} color="#fff" />
          </div>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Registrasi Berhasil!</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{equipment.equipmentNo} telah didaftarkan ke sistem</p>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div ref={qrRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', background: '#F9FAFB', borderRadius: 14, border: '1px solid #E5E7EB' }}>
            <QRCodeCanvas value={equipment.qrUrl} size={150} level="H" includeMargin={false} />
            <p style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 10 }}>EHS Equipment Testing</p>
            <p style={{ fontWeight: 800, fontSize: 15, color: '#111', fontFamily: 'monospace', marginTop: 2 }}>{equipment.equipmentNo}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[{ l: 'Nama', v: equipment.equipmentName }, { l: 'Kategori', v: equipment.category }, { l: 'Departemen', v: equipment.department }, { l: 'Status', v: 'Terdaftar' }].map(r => (
              <div key={r.l} style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>{r.l}</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{r.v}</p>
              </div>
            ))}
          </div>
          <button onClick={downloadQR} style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #BBF7D0', borderRadius: 12, height: 46, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Download size={16} /> Download QR Code
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, height: 44, background: '#F3F4F6', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Daftar Lagi</button>
            <button onClick={() => navigate(`/inventory/${equipment.id}`)} style={{ flex: 1, height: 44, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Lihat Detail</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RegisterEquipmentPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(empty);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<Equipment | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }));
  const nextDate = form.lastInspectionDate ? calculateNextInspectionDate(form.lastInspectionDate, form.validityPeriod) : '';
  const isPressure = PRESSURE_CATS.includes(form.category);
  const isLainlain = form.category === 'Lain-lain';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipmentNo || !form.equipmentName || !form.department) { toast.error('Lengkapi field wajib'); return; }
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
    if (error) { toast.error('Gagal menyimpan: ' + error.message); }
    else { setSuccess({ ...equip, id: data.id }); setForm(empty); }
    setLoading(false);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as any[][];
      const preview = rows.slice(1).filter(r => r.some(Boolean)).map(r => ({
        equipmentNo: r[0] || '', equipmentName: r[1] || '', category: r[2] || 'Fire Equipment',
        equipmentType: r[3] || '', department: r[4] || '', brand: r[5] || '', manufactureYear: r[6]?.toString() || '',
      }));
      setImportPreview(preview); setShowImport(true);
    };
    reader.readAsArrayBuffer(file); e.target.value = '';
  };

  const handleBulkImport = async () => {
    setLoading(true); let ok = 0;
    for (const r of importPreview) {
      if (!r.equipmentNo) continue;
      const equip: Equipment = {
        id: '', equipmentNo: r.equipmentNo, equipmentName: r.equipmentName, equipmentType: r.equipmentType,
        brand: r.brand, manufactureYear: r.manufactureYear, category: r.category as EquipmentCategory,
        department: r.department, specs: {}, status: 'Good',
        qrUrl: `${window.location.origin}/scan/${r.equipmentNo}`,
        inspections: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), updatedBy: user?.fullName || '',
      };
      const { error } = await supabase.from('equipments').insert([mapEquipmentToDb(equip, user?.fullName || '')]);
      if (!error) ok++;
    }
    toast.success(`${ok} peralatan berhasil diimpor`);
    setShowImport(false); setImportPreview([]); setLoading(false);
  };

  const Label: React.FC<{ children: React.ReactNode; optional?: boolean }> = ({ children, optional }) => (
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{children}</span>
      {optional && <span style={{ fontSize: 11, color: 'var(--ink-3)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>Opsional</span>}
    </label>
  );

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="surface" style={{ padding: 24, overflow: 'hidden' }}>
      <div className="section-header" style={{ marginBottom: 20 }}><h2 className="text-heading">{title}</h2></div>
      {children}
    </div>
  );

  return (
    <Layout>
      {success && <SuccessModal equipment={success} onClose={() => setSuccess(null)} />}

      {showImport && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, fontSize: 16 }}>Preview Import ({importPreview.length} data)</h2>
              <button onClick={() => { setShowImport(false); setImportPreview([]); }} className="btn-icon"><X size={16} /></button>
            </div>
            <div style={{ overflow: 'auto', flex: 1, padding: '0 4px' }}>
              <table className="data-table">
                <thead><tr><th>No. Peralatan</th><th>Nama</th><th>Kategori</th><th>Departemen</th><th>Merk</th></tr></thead>
                <tbody>
                  {importPreview.map((r, i) => (
                    <tr key={i} style={{ cursor: 'default' }}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.equipmentNo}</td>
                      <td>{r.equipmentName}</td><td>{r.category}</td><td>{r.department}</td><td>{r.brand}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowImport(false); setImportPreview([]); }} className="btn btn-secondary" style={{ flex: 1 }}>Batal</button>
              <button onClick={handleBulkImport} disabled={loading} className="btn btn-accent" style={{ flex: 2 }}>{loading ? 'Mengimpor...' : `Import ${importPreview.length} Data`}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 className="text-display">Registrasi Peralatan</h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 6 }}>Daftarkan peralatan EHS baru ke dalam sistem</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileImport} />
            <button onClick={() => fileRef.current?.click()} className="btn btn-secondary" style={{ gap: 6 }}>
              <FileSpreadsheet size={14} style={{ color: '#16A34A' }} /> Import Excel
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section title="Informasi Umum">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <Label>Nomor Peralatan *</Label>
                <input className="input-field" placeholder="Contoh: EQ-BT-001" required value={form.equipmentNo} onChange={e => set('equipmentNo', e.target.value)} />
              </div>
              <div>
                <Label>Kategori *</Label>
                <select className="input-field" value={form.category} onChange={e => set('category', e.target.value as EquipmentCategory)} required>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Label>Nama Peralatan *</Label>
                <input className="input-field" placeholder="Contoh: APAR CO2 5KG" required value={form.equipmentName} onChange={e => set('equipmentName', e.target.value)} />
              </div>
              <div>
                <Label optional>Tipe / Model</Label>
                <input className="input-field" placeholder="Contoh: MT5-CO2" value={form.equipmentType} onChange={e => set('equipmentType', e.target.value)} />
              </div>
              <div>
                <Label optional>Merk / Pabrikan</Label>
                <input className="input-field" placeholder="Contoh: Yamato" value={form.brand} onChange={e => set('brand', e.target.value)} />
              </div>
              <div>
                <Label optional>Tahun Pembuatan</Label>
                <input className="input-field" type="number" placeholder="2020" min="1900" max={new Date().getFullYear()} value={form.manufactureYear} onChange={e => set('manufactureYear', e.target.value)} />
              </div>
              <div>
                <Label>Departemen *</Label>
                <input className="input-field" placeholder="Contoh: Produksi" required value={form.department} onChange={e => set('department', e.target.value)} />
              </div>
              {isLainlain && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <Label optional>Nama Kategori Custom</Label>
                  <input className="input-field" placeholder="Isi nama kategori" value={form.customCategoryName} onChange={e => set('customCategoryName', e.target.value)} />
                </div>
              )}
            </div>
          </Section>

          <Section title="Riksa Uji">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <div>
                <Label optional>Tanggal Riksa Uji Terakhir</Label>
                <input className="input-field" type="date" value={form.lastInspectionDate} onChange={e => set('lastInspectionDate', e.target.value)} />
              </div>
              <div>
                <Label optional>Masa Berlaku</Label>
                <select className="input-field" value={form.validityPeriod} onChange={e => set('validityPeriod', e.target.value as ValidityPeriod)} disabled={!form.lastInspectionDate}>
                  {VALIDITY.map(val => <option key={val} value={val}>{val}</option>)}
                </select>
              </div>
              {nextDate && (
                <div style={{ gridColumn: '1 / -1', background: 'var(--accent-light)', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Riksa Uji Berikutnya (otomatis)</p>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>
                    {new Date(nextDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </Section>

          {isPressure && (
            <Section title="Spesifikasi Teknis">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div><Label optional>Kapasitas</Label><input className="input-field" placeholder="Contoh: 5000 L" value={form.capacity} onChange={e => set('capacity', e.target.value)} /></div>
                <div><Label optional>Volume</Label><input className="input-field" placeholder="Contoh: 4800 L" value={form.volume} onChange={e => set('volume', e.target.value)} /></div>
                <div><Label optional>Design Pressure</Label><input className="input-field" placeholder="Contoh: 15 bar" value={form.designPressure} onChange={e => set('designPressure', e.target.value)} /></div>
                <div><Label optional>Working Pressure</Label><input className="input-field" placeholder="Contoh: 10 bar" value={form.workingPressure} onChange={e => set('workingPressure', e.target.value)} /></div>
              </div>
            </Section>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setForm(empty)} className="btn btn-secondary" style={{ flex: 1 }}>Reset Form</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2, height: 40 }}>
              {loading ? 'Menyimpan...' : 'Simpan Peralatan'}
            </button>
          </div>

          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px' }}>
            <p className="text-label" style={{ marginBottom: 6 }}>Format Excel untuk Import</p>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.8 }}>
              Kolom (urut):{' '}
              {['No. Peralatan', 'Nama Peralatan', 'Kategori', 'Tipe', 'Departemen', 'Merk', 'Tahun'].map(c => (
                <code key={c} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', fontSize: 11, marginRight: 4, fontFamily: 'var(--font-mono)' }}>{c}</code>
              ))}
            </p>
          </div>
        </form>
      </div>
    </Layout>
  );
};
