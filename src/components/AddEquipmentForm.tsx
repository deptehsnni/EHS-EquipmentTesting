import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  ChevronRight, 
  Save, 
  CheckCircle2, 
  QrCode, 
  FileSpreadsheet, 
  ArrowRight,
  ClipboardList,
  Download,
  Calendar,
  Building2,
  Tag,
  Info
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Equipment, EquipmentCategory } from '../types';
import { cn } from '../utils/cn';
import { Modal } from './Modal';

interface AddEquipmentFormProps {
  onAdd: (e: Equipment) => void;
  onCancel: () => void;
  isMobile: boolean;
}

export const AddEquipmentForm: React.FC<AddEquipmentFormProps> = ({ onAdd, onCancel, isMobile }) => {
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastAddedEquip, setLastAddedEquip] = useState<Equipment | null>(null);
  const [recentActions, setRecentActions] = useState<Equipment[]>([]);
  
  React.useEffect(() => {
    const fetchRecent = async () => {
      const { data, error } = await import('../lib/supabase').then(m => m.supabase
        .from('equipments')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5));
      
      if (data) {
        setRecentActions(data.map(item => ({
          id: item.id,
          equipmentNo: item.equipment_no,
          equipmentName: item.equipment_name || item.specs?.equipment_name || '',
          equipmentType: item.equipment_type || item.specs?.equipment_type || '',
          category: item.category,
          department: item.department || item.specs?.department || '',
          specs: item.specs || {},
          status: item.status || 'Good',
          qrUrl: item.qr_url,
          updatedAt: item.updated_at,
          updatedBy: item.updated_by
        })));
      }
    };
    fetchRecent();
  }, []);
  
  const [formData, setFormData] = useState<Partial<Equipment>>({
    equipmentNo: '',
    equipmentName: '',
    equipmentType: '',
    category: 'Fire Equipment',
    department: '',
    lastInspectionDate: '',
    validityPeriod: '1 Tahun',
    specs: {},
    status: 'Good'
  });
  const [excelData, setExcelData] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);

  const categories: EquipmentCategory[] = ['Fire Equipment', 'Heavy Equipment', 'Bejana Tekan', 'Tangki Timbun', 'Lain-lain'];
  const validityOptions = ['6 Bulan', '1 Tahun', '2 Tahun', '3 Tahun'];

  const handleSave = async () => {
    if (!formData.equipmentNo || !formData.category || !formData.equipmentName || !formData.department) {
      alert('Mohon lengkapi data wajib (No. Alat, Nama, Kategori, Departemen)');
      return;
    }
    
    const nextDate = calculateNextInspection(formData.lastInspectionDate || '', formData.validityPeriod as any);

    const newEquip: Equipment = {
      id: Math.random().toString(36).substr(2, 9),
      equipmentNo: formData.equipmentNo,
      equipmentName: formData.equipmentName || '',
      equipmentType: formData.equipmentType || '',
      category: formData.category as EquipmentCategory,
      department: formData.department || '',
      specs: formData.specs || {},
      status: (formData.status as any) || 'Good',
      qrUrl: `${window.location.origin}/scan/${formData.equipmentNo}`,
      lastInspectionDate: formData.lastInspectionDate,
      validityPeriod: formData.validityPeriod as any,
      nextInspectionDate: nextDate,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Admin'
    };

    try {
      await onAdd(newEquip);
      setLastAddedEquip(newEquip);
      setRecentActions(prev => [newEquip, ...prev].slice(0, 5));
      setIsManualModalOpen(false);
      setIsSuccessModalOpen(true);
      
      // Reset form
      setFormData({
        equipmentNo: '',
        equipmentName: '',
        equipmentType: '',
        category: 'Fire Equipment',
        department: '',
        lastInspectionDate: '',
        validityPeriod: '1 Tahun',
        specs: {},
        status: 'Good'
      });
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const calculateNextInspection = (lastDate: string, period: string) => {
    if (!lastDate) return undefined;
    const date = new Date(lastDate);
    if (isNaN(date.getTime())) return undefined;

    switch (period) {
      case '6 Bulan': date.setMonth(date.getMonth() + 6); break;
      case '1 Tahun': date.setFullYear(date.getFullYear() + 1); break;
      case '2 Tahun': date.setFullYear(date.getFullYear() + 2); break;
      case '3 Tahun': date.setFullYear(date.getFullYear() + 3); break;
    }
    return date.toISOString().split('T')[0];
  };

  const handleExcelPaste = async () => {
    const rows = excelData.trim().split('\n');
    if (rows.length === 0) return;
    
    const addedItems: Equipment[] = [];
    for (const row of rows) {
      const cols = row.split('\t');
      if (cols.length >= 5) {
        const equip: Equipment = {
          id: Math.random().toString(36).substr(2, 9),
          equipmentNo: cols[0],
          equipmentName: cols[1],
          category: cols[2] as EquipmentCategory,
          equipmentType: cols[3],
          department: cols[4],
          specs: {},
          status: 'Good',
          qrUrl: `${window.location.origin}/scan/${cols[0]}`,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Excel Import'
        };
        try {
          await onAdd(equip);
          addedItems.push(equip);
        } catch (error) {
          console.error('Error importing row:', row, error);
        }
      }
    }

    if (addedItems.length > 0) {
      setRecentActions(prev => [...addedItems, ...prev].slice(0, 10));
      setIsExcelModalOpen(false);
      setExcelData('');
      alert(`${addedItems.length} aset berhasil diimpor.`);
      
      // Refresh recent actions from DB to be sure
      const { data } = await import('../lib/supabase').then(m => m.supabase
        .from('equipments')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5));
      if (data) {
        setRecentActions(data.map(item => ({
          id: item.id,
          equipmentNo: item.equipment_no,
          equipmentName: item.equipment_name || item.specs?.equipment_name || '',
          equipmentType: item.equipment_type || item.specs?.equipment_type || '',
          category: item.category,
          department: item.department || item.specs?.department || '',
          specs: item.specs || {},
          status: item.status || 'Good',
          qrUrl: item.qr_url,
          updatedAt: item.updated_at,
          updatedBy: item.updated_by
        })));
      }
    }
  };

  const downloadQR = () => {
    if (!qrRef.current || !lastAddedEquip) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (canvas) {
      const finalCanvas = document.createElement('canvas');
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) return;

      // High resolution for print
      const padding = 80;
      const textSpace = 220;
      finalCanvas.width = canvas.width + (padding * 2);
      finalCanvas.height = canvas.height + (padding * 2) + textSpace;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // Draw QR
      ctx.drawImage(canvas, padding, padding);

      // Draw Text
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      // Line 1: EHS Equipment Testing
      ctx.font = 'bold 48px "IBM Plex Sans", sans-serif';
      ctx.fillText('EHS Equipment Testing', finalCanvas.width / 2, canvas.height + padding + 40);
      
      // Line 2: Equipment No
      ctx.font = '800 84px "IBM Plex Sans", sans-serif';
      ctx.fillText(lastAddedEquip.equipmentNo, finalCanvas.width / 2, canvas.height + padding + 100);

      const url = finalCanvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `QR-HIGHRES-${lastAddedEquip.equipmentNo}.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <div className="space-y-12">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <ClipboardList size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Opsi Pendaftaran</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pilih metode pendaftaran aset</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <button 
            onClick={() => setIsManualModalOpen(true)}
            className="flex-1 md:flex-none px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
          >
            <Plus size={20} />
            Registrasi Manual
          </button>
          <button 
            onClick={() => setIsExcelModalOpen(true)}
            className="flex-1 md:flex-none px-8 py-4 bg-white border border-slate-100 text-slate-900 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-3"
          >
            <FileSpreadsheet size={20} className="text-emerald-600" />
            Import via Excel
          </button>
        </div>
      </div>

      {/* Recent Actions Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Aktivitas Pendaftaran Terakhir</h3>
        </div>

        {recentActions.length > 0 ? (
          <div className="grid grid-cols-1 gap-0 border-y border-slate-100 divide-y divide-slate-100">
            {recentActions.map((action, i) => (
              <motion.div 
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="py-6 flex items-center justify-between group hover:bg-slate-50/50 transition-all px-4 -mx-4 rounded-2xl"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all border border-slate-100">
                    <Tag size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-900 tracking-tight">{action.equipmentNo}</h4>
                    <p className="label-micro text-slate-400 mt-1">{action.equipmentName} • {action.category}</p>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="label-micro text-slate-300 mb-1">Terdaftar Pada</p>
                  <p className="text-sm font-bold text-slate-600">{new Date(action.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50/50 rounded-[2.5rem] p-12 text-center border border-dashed border-slate-200">
            <Info size={32} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-400 font-medium">Belum ada aktivitas pendaftaran baru-baru ini.</p>
          </div>
        )}
      </div>

      {/* Manual Registration Modal */}
      <Modal 
        isOpen={isManualModalOpen} 
        onClose={() => setIsManualModalOpen(false)} 
        title="Registrasi Peralatan Baru"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="label-micro text-slate-400">Nomor Peralatan *</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="EQ-BT-001"
                value={formData.equipmentNo}
                onChange={e => setFormData({...formData, equipmentNo: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="label-micro text-slate-400">Kategori Aset *</label>
              <select 
                className="input-field appearance-none cursor-pointer"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value as EquipmentCategory})}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="label-micro text-slate-400">Nama Peralatan *</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="Contoh: Forklift 5T"
                value={formData.equipmentName}
                onChange={e => setFormData({...formData, equipmentName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="label-micro text-slate-400">Type Peralatan</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="Contoh: Toyota 8FD"
                value={formData.equipmentType}
                onChange={e => setFormData({...formData, equipmentType: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="label-micro text-slate-400">Departemen *</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="Contoh: Logistik"
                value={formData.department}
                onChange={e => setFormData({...formData, department: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="label-micro text-slate-400">Masa Berlaku Riksa Uji</label>
              <select 
                className="input-field appearance-none cursor-pointer"
                value={formData.validityPeriod}
                onChange={e => setFormData({...formData, validityPeriod: e.target.value as any})}
              >
                {validityOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="label-micro text-slate-400 flex items-center gap-2">
                <Calendar size={12} /> Tanggal Riksa Uji Terakhir (Opsional)
              </label>
              <input 
                type="date" 
                className="input-field"
                value={formData.lastInspectionDate}
                onChange={e => setFormData({...formData, lastInspectionDate: e.target.value})}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button 
              onClick={() => setIsManualModalOpen(false)}
              className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
            >
              Batal
            </button>
            <button 
              onClick={handleSave}
              className="flex-[2] px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
            >
              <Save size={20} />
              Simpan Aset
            </button>
          </div>
        </div>
      </Modal>

      {/* Excel Import Modal */}
      <Modal 
        isOpen={isExcelModalOpen} 
        onClose={() => setIsExcelModalOpen(false)} 
        title="Import via Excel"
      >
        <div className="space-y-6">
          <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <Info className="text-emerald-600" size={20} />
              <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-widest">Petunjuk Format</h4>
            </div>
            <p className="text-xs text-emerald-700 font-medium leading-relaxed">
              Salin baris dari Excel dan tempelkan di bawah. Pastikan urutan kolom adalah: <br/>
              <span className="font-bold">[No. Alat] [Nama Alat] [Kategori] [Tipe] [Departemen]</span>
            </p>
          </div>

          <textarea 
            className="w-full h-64 bg-slate-50 border border-slate-100 rounded-3xl p-6 font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none shadow-inner"
            placeholder="EQ-001	Forklift	Heavy Equipment	Toyota 8FD	Logistik"
            value={excelData}
            onChange={e => setExcelData(e.target.value)}
          />

          <div className="flex gap-4">
            <button 
              onClick={() => setIsExcelModalOpen(false)}
              className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
            >
              Batal
            </button>
            <button 
              onClick={handleExcelPaste}
              className="flex-[2] px-8 py-4 bg-emerald-500 text-slate-900 font-bold rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-3"
            >
              <ArrowRight size={20} />
              Proses Import
            </button>
          </div>
        </div>
      </Modal>

      {/* Success Modal with QR Code */}
      <Modal 
        isOpen={isSuccessModalOpen} 
        onClose={() => setIsSuccessModalOpen(false)} 
        title="Registrasi Berhasil!"
        maxWidth="max-w-md"
      >
        <div className="text-center space-y-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto shadow-inner">
            <CheckCircle2 size={40} />
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Aset Terdaftar</h3>
            <p className="text-slate-500 font-medium mt-1">Data peralatan telah berhasil disimpan ke sistem.</p>
          </div>

          <div className="p-10 bg-slate-50 rounded-[4rem] border border-slate-100 inline-block relative group shadow-inner">
            <div ref={qrRef} className="p-8 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col items-center gap-6 transition-transform group-hover:scale-[1.02] duration-500">
              <div className="w-[240px] h-[240px] flex items-center justify-center overflow-hidden">
                <QRCodeCanvas 
                  value={lastAddedEquip?.qrUrl || ''} 
                  size={1024}
                  level="H"
                  includeMargin={false}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              <div className="text-center border-t border-slate-50 pt-6 w-full">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">EHS Equipment Testing</p>
                <p className="text-2xl font-bold text-slate-900 uppercase tracking-tighter leading-none">{lastAddedEquip?.equipmentNo}</p>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 w-14 h-14 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-slate-300 animate-bounce-slow">
              <QrCode size={28} />
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl text-left space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No. Alat</span>
              <span className="text-white font-bold">{lastAddedEquip?.equipmentNo}</span>
            </div>
            <div className="h-px bg-slate-800" />
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nama</span>
              <span className="text-emerald-400 font-bold">{lastAddedEquip?.equipmentName}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={downloadQR}
              className="w-full px-8 py-4 bg-emerald-500 text-slate-900 font-bold rounded-2xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-100"
            >
              <Download size={20} />
              Download QR Code
            </button>
            <button 
              onClick={() => setIsSuccessModalOpen(false)}
              className="w-full px-8 py-4 bg-white border border-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all"
            >
              Selesai
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
;
