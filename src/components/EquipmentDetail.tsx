import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, User, History, Calendar, ShieldCheck, CheckCircle2, Download, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Equipment } from '../types';
import { cn } from '../utils/cn';

interface EquipmentDetailProps {
  equipment: Equipment;
  onBack: () => void;
  onUpdate: (e: Equipment) => void;
  isPublicMode?: boolean;
}

export const EquipmentDetail: React.FC<EquipmentDetailProps> = ({ equipment, onBack, onUpdate, isPublicMode = false }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<'Good' | 'Needs Repair' | 'Critical' | undefined>(equipment.status);
  const [newDepartment, setNewDepartment] = useState(equipment.department);
  const [notes, setNotes] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const qrRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleUpdate = () => {
    if (!newStatus) return;
    
    const newInspection = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      status: newStatus,
      notes: notes,
      performedBy: 'Petugas', // This should be the user's name if available
      type: `Riksa Uji ${ (equipment.inspections?.length || 0) + 1 }`
    };

    onUpdate({
      ...equipment,
      status: newStatus,
      department: newDepartment,
      updatedAt: new Date().toISOString(),
      inspections: [newInspection, ...(equipment.inspections || [])]
    });
    setIsUpdating(false);
    setNotes('');
  };

  const downloadQR = () => {
    if (!qrRef.current) return;
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
      ctx.fillText(equipment.equipmentNo, finalCanvas.width / 2, canvas.height + padding + 100);

      const url = finalCanvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `QR-HIGHRES-${equipment.equipmentNo}.png`;
      link.href = url;
      link.click();
    }
  };

  const qrValue = `${window.location.origin}/scan/${equipment.equipmentNo}`;

  return (
    <div className="max-w-7xl mx-auto w-full space-y-12">
      {/* Header & Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-slate-200">
        <div className="space-y-4">
          <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors group">
            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
            Back to Inventory
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-6xl font-bold text-slate-900 tracking-tighter leading-none">{equipment.equipmentNo}</h2>
            <div className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
              equipment.status === 'Good' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
              equipment.status === 'Needs Repair' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-rose-50 text-rose-600 border-rose-100"
            )}>
              {equipment.status}
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-500">{equipment.equipmentName}</p>
        </div>

        <div className="flex items-center gap-12">
          <div className="flex flex-col items-center gap-4">
            <div ref={qrRef} className="p-6 bg-white border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-100 flex flex-col items-center gap-4 group hover:border-slate-300 transition-all">
              <div className="w-[120px] h-[120px] flex items-center justify-center overflow-hidden">
                <QRCodeCanvas 
                  value={qrValue} 
                  size={512} 
                  includeMargin={false} 
                  level="H" 
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              <div className="text-center border-t border-slate-50 pt-3 w-full">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">EHS Equipment Testing</p>
                <p className="text-sm font-bold text-slate-900 uppercase tracking-tighter">{equipment.equipmentNo}</p>
              </div>
            </div>
            <button 
              onClick={downloadQR}
              className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100"
            >
              <Download size={12} /> Download High-Res
            </button>
          </div>
          {!isUpdating && !isPublicMode && (
            <button 
              onClick={() => setIsUpdating(true)}
              className="btn-primary px-8 py-4 rounded-2xl shadow-xl shadow-slate-200"
            >
              <ShieldCheck size={20} />
              Update Status
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Technical Specs */}
        <div className="lg:col-span-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <div className="space-y-10">
              <div className="space-y-1">
                <p className="label-micro text-slate-400">Category</p>
                <p className="text-lg font-bold text-slate-900 uppercase tracking-tight">{equipment.category}</p>
              </div>
              <div className="space-y-1">
                <p className="label-micro text-slate-400">Department</p>
                <p className="text-lg font-bold text-slate-900 uppercase tracking-tight">{equipment.department}</p>
              </div>
              <div className="space-y-1">
                <p className="label-micro text-slate-400">Equipment Type</p>
                <p className="text-lg font-bold text-slate-900 uppercase tracking-tight">{equipment.equipmentType || '-'}</p>
              </div>
            </div>

            <div className="space-y-10">
              <div className="space-y-1">
                <p className="label-micro text-slate-400">Last Inspection</p>
                <p className="text-lg font-bold text-slate-900">
                  {equipment.lastInspectionDate ? new Date(equipment.lastInspectionDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="label-micro text-emerald-600">Next Inspection Due</p>
                <p className="text-3xl font-bold text-emerald-600 tracking-tighter">
                  {equipment.nextInspectionDate ? new Date(equipment.nextInspectionDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
              <h3 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Detailed Specifications</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
              {Object.entries(equipment.specs).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <p className="label-micro text-slate-400">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-2xl font-mono font-bold text-slate-800 tracking-tighter">{value || '-'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Inspection History */}
          <div className="pt-12 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
              <h3 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Riwayat Riksa Uji</h3>
            </div>
            <div className="space-y-4">
              {equipment.inspections && equipment.inspections.length > 0 ? (
                equipment.inspections.map((insp, idx) => (
                  <div key={insp.id} className="flex items-center gap-5 p-6 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-all">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      insp.status === 'Good' ? "bg-emerald-50 text-emerald-600" : 
                      insp.status === 'Needs Repair' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                    )}>
                      <History size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-slate-900">{insp.type}</p>
                        <p className="label-micro text-slate-400">{new Date(insp.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <p className="text-xs font-medium text-slate-500">{insp.notes || 'No notes provided'}</p>
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-2">Performed by {insp.performedBy}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 bg-slate-50 rounded-3xl text-center border border-dashed border-slate-200">
                  <p className="label-micro text-slate-400">Belum ada riwayat riksa uji</p>
                </div>
              )}
            </div>
          </div>

          {/* History */}
          <div className="pt-12 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
              <h3 className="text-xl font-bold text-slate-900 tracking-tight uppercase">System Logs</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-5 p-6 bg-white border border-slate-100 rounded-2xl">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <User size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">Last updated by {equipment.updatedBy || 'System'}</p>
                  <p className="label-micro text-slate-400">{new Date(equipment.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Update Form (Only when active) */}
        <div className="lg:col-span-4">
          <AnimatePresence>
            {isUpdating && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-2xl space-y-8 sticky top-8"
              >
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">Update Peralatan</h3>
                  <p className="text-slate-500 text-xs font-medium">Record current physical condition and department.</p>
                </div>
                
                <div className="space-y-4">
                  <p className="label-micro">Update Departemen</p>
                  <input 
                    type="text"
                    className="input-field"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="Departemen..."
                  />
                </div>

                <div className="space-y-4">
                  <p className="label-micro">Condition Status</p>
                  <div className="grid grid-cols-1 gap-3">
                    {(['Good', 'Needs Repair', 'Critical'] as const).map(s => (
                      <button 
                        key={s}
                        onClick={() => setNewStatus(s)}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all text-sm font-bold text-left flex items-center justify-between",
                          newStatus === s 
                            ? "bg-slate-900 border-slate-900 text-white" 
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        {s}
                        {newStatus === s && <CheckCircle2 size={16} className="text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="label-micro">Inspection Notes</p>
                  <textarea 
                    className="input-field min-h-[100px] resize-none"
                    placeholder="Any observations..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button onClick={handleUpdate} className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200">Save Changes</button>
                  <button onClick={() => setIsUpdating(false)} className="btn-secondary w-full">Cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
