import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { motion } from 'framer-motion';
import { getCapacityAverages } from '../lib/evaluator';
import { Target, AlertCircle } from 'lucide-react';

interface CompetencyBreakdownProps {
  records: any[];
  grado: string;
  competencyType: 'reading' | 'writing';
  periodo?: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function CompetencyBreakdown({ records, grado, competencyType, periodo }: CompetencyBreakdownProps) {
  const data = useMemo(() => {
    if (!records.length) return [];
    return getCapacityAverages(records, grado, competencyType, periodo);
  }, [records, grado, competencyType, periodo]);

  if (!data.length) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/5 rounded-3xl">
        <AlertCircle size={32} className="mb-2 opacity-20" />
        <p className="text-xs font-bold uppercase tracking-widest">Sin datos de capacidades</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis 
            type="number" 
            domain={[0, 100]} 
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 'black' }}
            width={120}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ 
              backgroundColor: '#1e1b4b', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#fff'
            }}
          />
          <Bar 
            dataKey="percentage" 
            radius={[0, 4, 4, 0]}
            barSize={24}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
