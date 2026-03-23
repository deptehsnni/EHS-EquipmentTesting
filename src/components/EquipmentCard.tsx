import React from 'react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { History, ChevronRight } from 'lucide-react';
import { Equipment } from '../types';
import { cn } from '../utils/cn';

interface EquipmentCardProps {
  equipment: Equipment;
  onClick: () => void;
}

export const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment, onClick }) => {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="glass-card p-6 rounded-[2rem] cursor-pointer group relative overflow-hidden flex flex-col h-full"
    >
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 group-hover:bg-emerald-50 transition-colors duration-500" />
      
      <div className="relative flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all duration-300 border border-slate-100">
            <QRCodeSVG value={equipment.equipmentNo} size={40} />
          </div>
          <div className={cn(
            "badge",
            equipment.status === 'Good' ? "badge-good" : 
            equipment.status === 'Needs Repair' ? "badge-warning" : "badge-danger"
          )}>
            {equipment.status}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="label-micro">
              {equipment.category}
            </span>
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            <span className="label-micro">
              {equipment.department}
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors tracking-tight">
            {equipment.equipmentNo}
          </h3>
          <p className="text-xs font-semibold text-slate-500 line-clamp-1">{equipment.equipmentName}</p>
        </div>

        <div className="mt-auto pt-6 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <History size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {new Date(equipment.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
            <ChevronRight size={16} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
