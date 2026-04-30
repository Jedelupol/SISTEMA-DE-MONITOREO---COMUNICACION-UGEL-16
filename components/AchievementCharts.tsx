"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = {
  Satisfactorio: '#10b981',
  Proceso: '#f59e0b',
  Inicio: '#ef4444'
};

export function AchievementPieChart({ data }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            animationBegin={0}
            animationDuration={1500}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name]} stroke="none" />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
            itemStyle={{ color: '#fff' }}
          />
          <Legend iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CapacityBarChart({ data }) {
  // data format: [{ name: 'Capacity X', percentage: 75 }, ...]
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
          <XAxis type="number" domain={[0, 100]} unit="%" />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={150} 
            tick={{ fontSize: 10 }}
          />
          <Tooltip 
             cursor={{ fill: 'rgba(255,255,255,0.05)' }}
             contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
             itemStyle={{ color: '#fff' }}
          />
          <Bar 
            dataKey="percentage" 
            fill="#6366f1" 
            radius={[0, 4, 4, 0]}
            animationDuration={2000}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
