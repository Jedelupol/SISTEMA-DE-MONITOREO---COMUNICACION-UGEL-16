"use client";

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function EarlyWarningTable({ performanceData }) {
  if (!performanceData || performanceData.length === 0) {
    return (
      <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
        <p className="text-white/40 italic">No hay datos de estudiantes registrados para este grado.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            <th className="py-5 px-6 text-xs font-bold uppercase tracking-widest text-white/40">Estudiante</th>
            <th className="py-5 px-6 text-xs font-bold uppercase tracking-widest text-white/40 text-center">Nivel Lectura</th>
            <th className="py-5 px-6 text-xs font-bold uppercase tracking-widest text-white/40 text-center">Nivel Escritura</th>
            <th className="py-5 px-6 text-xs font-bold uppercase tracking-widest text-white/40 text-center">Acción Sugerida</th>
          </tr>
        </thead>
        <tbody>
          {performanceData.map((student, idx) => (
            <motion.tr
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={student.name}
              className="border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors"
            >
              <td className="py-5 px-6">
                <div className="font-semibold text-white">{student.name}</div>
                <div className="text-[10px] text-white/20 uppercase tracking-wider">DNI: {student.dni || 'N/A'}</div>
              </td>
              <td className="py-5 px-6 text-center">
                <LevelBadge level={student.readingLevel} percentage={student.readingPercentage} />
              </td>
              <td className="py-5 px-6 text-center">
                <LevelBadge level={student.writingLevel} percentage={student.writingPercentage} />
              </td>
              <td className="py-5 px-6 text-center">
                <ActionBadge level={student.readingLevel} />
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LevelBadge({ level, percentage }) {
  const isSatisfactory = level?.toLowerCase() === 'satisfactorio';
  const isProcess = level?.toLowerCase() === 'proceso';
  
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        "px-3 py-1 rounded-full text-[10px] font-black tracking-tighter uppercase",
        isSatisfactory ? "bg-brand-accent/20 text-brand-accent" : 
        isProcess ? "bg-yellow-500/20 text-yellow-500" : 
        "bg-red-500/20 text-red-500"
      )}>
        {level}
      </div>
      <span className="text-[10px] text-white/30 font-medium">{percentage}%</span>
    </div>
  );
}

function ActionBadge({ level }) {
  const lowerLevel = level?.toLowerCase();
  if (lowerLevel === 'satisfactorio') {
    return (
      <div className="flex items-center justify-center gap-2 text-brand-accent">
        <CheckCircle2 size={14} />
        <span className="text-[10px] font-bold">Consolidación</span>
      </div>
    );
  }
  if (lowerLevel === 'proceso') {
    return (
      <div className="flex items-center justify-center gap-2 text-yellow-500">
        <AlertTriangle size={14} />
        <span className="text-[10px] font-bold">Refuerzo Focalizado</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2 text-red-500">
      <XCircle size={14} />
      <span className="text-[10px] font-bold">Intervención Urgente</span>
    </div>
  );
}
