// ─── Enums & Unions ──────────────────────────────────────────────────────────

export type EquipmentCategory =
  | 'Fire Equipment'
  | 'Heavy Equipment'
  | 'Bejana Tekan'
  | 'Tangki Timbun'
  | 'Lain-lain';

export type ValidityPeriod = '6 Bulan' | '1 Tahun' | '2 Tahun' | '3 Tahun';

export type EquipmentStatus = 'Good' | 'Needs Repair' | 'Critical';

export type InspectionStatus = 'Good' | 'Needs Repair' | 'Critical';

export type UserStatus = 'pending' | 'approved' | 'rejected';

export type UserRole = 'user' | 'superadmin';

// ─── Riksa Uji Status (berdasarkan tanggal) ──────────────────────────────────

export type RiksaUjiStatus = 'active' | 'warning' | 'expired' | 'unknown';

export const getRiksaUjiStatus = (nextInspectionDate?: string): RiksaUjiStatus => {
  if (!nextInspectionDate) return 'unknown';
  const now = new Date();
  const next = new Date(nextInspectionDate);
  const diffMs = next.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'expired';
  if (diffDays <= 90) return 'warning';
  return 'active';
};

export const riksaUjiStatusLabel: Record<RiksaUjiStatus, string> = {
  active: 'Aktif',
  warning: 'Segera Habis',
  expired: 'Expired',
  unknown: 'Belum Diisi',
};

// ─── Specs (dinamis per kategori) ────────────────────────────────────────────

export interface EquipmentSpecs {
  capacity?: string;
  volume?: string;
  designPressure?: string;
  workingPressure?: string;
  customCategoryName?: string;
  [key: string]: string | undefined;
}

// ─── Inspection ───────────────────────────────────────────────────────────────

export interface Inspection {
  id: string;
  date: string;
  status: InspectionStatus;
  notes: string;
  performedBy: string;
  type: string;
}

// ─── Equipment ────────────────────────────────────────────────────────────────

export interface Equipment {
  id: string;
  equipmentNo: string;
  equipmentName: string;
  equipmentType: string;
  brand: string;
  manufactureYear: string;
  category: EquipmentCategory;
  department: string;
  specs: EquipmentSpecs;
  qrUrl: string;
  status: EquipmentStatus;
  lastInspectionDate?: string;
  validityPeriod?: ValidityPeriod;
  nextInspectionDate?: string;
  inspections: Inspection[];
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  employeeId: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

// ─── DB Row mapper ────────────────────────────────────────────────────────────

export const mapDbToEquipment = (row: any): Equipment => ({
  id: row.id,
  equipmentNo: row.equipment_no,
  equipmentName: row.equipment_name || row.specs?.equipment_name || '',
  equipmentType: row.equipment_type || row.specs?.equipment_type || '',
  brand: row.brand || row.specs?.brand || '',
  manufactureYear: row.manufacture_year?.toString() || row.specs?.manufacture_year || '',
  category: row.category,
  department: row.department || row.specs?.department || '',
  specs: row.specs || {},
  status: row.status || 'Good',
  qrUrl: row.qr_url || `${window.location.origin}/scan/${row.equipment_no}`,
  lastInspectionDate: row.last_inspection_date || row.specs?.last_inspection_date,
  validityPeriod: row.validity_period || row.specs?.validity_period,
  nextInspectionDate: row.next_inspection_date || row.specs?.next_inspection_date,
  inspections: row.inspections || [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  updatedBy: row.updated_by,
});

export const mapEquipmentToDb = (e: Equipment, updatedBy: string) => ({
  equipment_no: e.equipmentNo,
  equipment_name: e.equipmentName,
  equipment_type: e.equipmentType,
  brand: e.brand,
  manufacture_year: e.manufactureYear ? parseInt(e.manufactureYear) : null,
  category: e.category,
  department: e.department,
  specs: e.specs,
  status: e.status,
  qr_url: e.qrUrl,
  last_inspection_date: e.lastInspectionDate || null,
  validity_period: e.validityPeriod || null,
  next_inspection_date: e.nextInspectionDate || null,
  inspections: e.inspections || [],
  updated_at: new Date().toISOString(),
  updated_by: updatedBy,
});

// ─── Utilities ────────────────────────────────────────────────────────────────

export const calculateNextInspectionDate = (
  lastDate: string,
  period: ValidityPeriod
): string => {
  const date = new Date(lastDate);
  switch (period) {
    case '6 Bulan': date.setMonth(date.getMonth() + 6); break;
    case '1 Tahun': date.setFullYear(date.getFullYear() + 1); break;
    case '2 Tahun': date.setFullYear(date.getFullYear() + 2); break;
    case '3 Tahun': date.setFullYear(date.getFullYear() + 3); break;
  }
  return date.toISOString().split('T')[0];
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
};

export const formatDateShort = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

export const getRiksaUjiColor = (status: RiksaUjiStatus) => {
  switch (status) {
    case 'active': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
    case 'warning': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
    case 'expired': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
    default: return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' };
  }
};
