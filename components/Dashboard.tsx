"use client";

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart as ReChartsBar, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  LabelList
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  PenTool, 
  AlertCircle, 
  ChevronDown,
  LayoutDashboard,
  Table as TableIcon,
  CheckCircle2,
  XCircle,
  Trash2
} from 'lucide-react';
import { MATRICES, PERIODOS } from '../lib/matrices_data';
import { getAchievementLevels, getCapacityAverages, getStudentPerformanceList, getGradeStatusSummary, processRecordsIntoGroups, deleteRecordGroup } from '../lib/evaluator';
import { cn } from '../lib/utils';
import EarlyWarningTable from './EarlyWarningTable';
import { useData } from '../lib/DataContext';

export default function Dashboard({ data = [] }) {
  const { records, matrixOverrides, updateRecords, groups, deleteGroup, activeYear, activePeriod: globalActivePeriod } = useData();
  const [selectedGrado, setSelectedGrado] = useState('1');
  const [selectedPeriod, setSelectedPeriod] = useState(globalActivePeriod || PERIODOS.DIAGNOSTICA);
  const [activeTab, setActiveTab] = useState('general');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [mgmtSearch, setMgmtSearch] = useState('');

  const filteredData = useMemo(() => 
    records.filter(d => d.grado === selectedGrado && (d.periodo === selectedPeriod || (!d.periodo && selectedPeriod === PERIODOS.DIAGNOSTICA))),
    [records, selectedGrado, selectedPeriod]
  );

  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const readingLevels = getAchievementLevels(filteredData, selectedGrado, 'reading', selectedPeriod, matrixOverrides);
    const writingLevels = getAchievementLevels(filteredData, selectedGrado, 'writing', selectedPeriod, matrixOverrides);
    const readingCaps = getCapacityAverages(filteredData, selectedGrado, 'reading', selectedPeriod, matrixOverrides);
    const writingCaps = getCapacityAverages(filteredData, selectedGrado, 'writing', selectedPeriod, matrixOverrides);
    const studentList = getStudentPerformanceList(filteredData, selectedGrado, matrixOverrides);
    const gradeStatus = getGradeStatusSummary(filteredData, selectedGrado, selectedPeriod, matrixOverrides);

    return {
      readingLevels,
      writingLevels,
      readingCaps,
      writingCaps,
      studentList,
      gradeStatus,
      totalStudents: filteredData.length,
      readingSatisfactory: readingLevels.find(l => l.name === 'Satisfactorio')?.percentage || 0,
      writingSatisfactory: writingLevels.find(l => l.name === 'Satisfactorio')?.percentage || 0
    };
  }, [filteredData, selectedGrado, selectedPeriod, matrixOverrides]);

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/20 mb-6">
          <LayoutDashboard size={40} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Sin Datos Disponibles</h2>
        <p className="text-white/40 max-w-sm mb-8">
          Seleccione un grado con registros o ingrese nuevos datos en el módulo de registro.
        </p>
        <div className="flex gap-4">
           <select 
            value={selectedGrado}
            onChange={(e) => setSelectedGrado(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
          >
            {Object.keys(MATRICES).map(key => (
              <option key={key} value={key} className="bg-[#1e1b4b] text-slate-300">{MATRICES[key].name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  const enElGradoPct = stats.gradeStatus.total > 0 
    ? ((stats.gradeStatus.enElGrado / stats.gradeStatus.total) * 100).toFixed(1) 
    : '0.0';
  const previoAlGradoPct = stats.gradeStatus.total > 0 
    ? ((stats.gradeStatus.previoAlGrado / stats.gradeStatus.total) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="space-y-8">
      {/* Header with Selector */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <LayoutDashboard className="text-brand-primary" /> Panel de Control
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-white/40">LECTOEXPRES@ 3.0 - Estrategia Regional DRELP</p>
            <span className="h-4 w-[1px] bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-brand-primary/10 border border-brand-primary/20 text-[10px] font-bold text-brand-primary uppercase">Año {activeYear}</span>
              <span className="px-2 py-0.5 rounded-md bg-brand-secondary/10 border border-brand-secondary/20 text-[10px] font-bold text-brand-secondary uppercase">{selectedPeriod}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            {Object.values(PERIODOS).map(p => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                  selectedPeriod === p 
                    ? "bg-brand-primary text-white shadow-md" 
                    : "text-white/40 hover:text-white/60"
                )}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="h-8 w-[1px] bg-white/10 hidden md:block" />

          {/* Grade Selector */}
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            {Object.keys(MATRICES).map(key => (
              <button
                key={key}
                onClick={() => setSelectedGrado(key)}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all",
                  selectedGrado === key 
                    ? "bg-brand-secondary text-white shadow-md" 
                    : "text-white/40 hover:text-white/60"
                )}
              >
                {key}
              </button>
            ))}
          </div>
          
          {/* Clear Data Button (Admin only simulation) */}
          <button 
            onClick={() => setShowClearConfirm(true)}
            className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
            title="Borrar datos de este grado y periodo"
          >
            <XCircle size={20} />
          </button>

          {/* Advanced Management Button */}
          <button 
            onClick={() => setShowManageModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-xl text-xs font-bold text-brand-primary hover:bg-brand-primary/20 transition-all"
          >
            <TableIcon size={16} /> Gestionar Datos
          </button>
        </div>

      {/* Clear Confirmation Modal (Simple) */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel p-8 max-w-sm w-full text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500">
                <AlertCircle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">¿Borrar Registros Rápidos?</h3>
                <p className="text-sm text-white/40 mt-2">
                  Se eliminarán todos los registros de <span className="text-white font-bold">{selectedGrado}° Grado</span> para el periodo <span className="text-white font-bold">{selectedPeriod}</span>.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    const updated = records.filter(r => !(r.grado === selectedGrado && r.periodo === selectedPeriod));
                    updateRecords(updated);
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 py-3 bg-red-500 rounded-xl font-bold text-white shadow-lg shadow-red-500/20"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Advanced Management Modal */}
      <AnimatePresence>
        {showManageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel p-8 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <TableIcon className="text-brand-primary" /> Gestión Avanzada de Datos
                  </h2>
                  <p className="text-white/40 text-sm">Elimine lotes específicos de información (IE, Grado, Sección, Periodo)</p>
                </div>
                <button onClick={() => setShowManageModal(false)} className="p-2 text-white/20 hover:text-white">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="mb-6">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-white/20" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por Institución Educativa..."
                    value={mgmtSearch}
                    onChange={(e) => setMgmtSearch(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto rounded-xl border border-white/10">
                 <DataGroupsList 
                   searchTerm={mgmtSearch} 
                 />
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                <button 
                  onClick={() => setShowManageModal(false)}
                  className="px-8 py-3 bg-white/10 rounded-xl font-bold text-white hover:bg-white/20 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KPI Grid - 5 cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPICard 
          icon={<Users />} 
          label="Estudiantes Evaluados" 
          value={stats.totalStudents} 
          color="brand-primary" 
        />
        <KPICard 
          icon={<BookOpen />} 
          label="% Satisfactorio Lectura" 
          value={`${stats.readingSatisfactory}%`} 
          color="brand-secondary" 
        />
        <KPICard 
          icon={<PenTool />} 
          label="% Satisfactorio Escritura" 
          value={`${stats.writingSatisfactory}%`} 
          color="brand-accent" 
        />
        <KPICard 
          icon={<CheckCircle2 />} 
          label="En el Grado (Escritura)" 
          value={`${stats.gradeStatus.enElGrado}`}
          subtitle={`${enElGradoPct}%`}
          color="emerald-500" 
        />
        <KPICard 
          icon={<XCircle />} 
          label="Previo al Grado (Escritura)" 
          value={`${stats.gradeStatus.previoAlGrado}`}
          subtitle={`${previoAlGradoPct}%`}
          color="red-500" 
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 overflow-x-auto scrollbar-hide">
        <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')}>General</TabButton>
        <TabButton active={activeTab === 'lectura'} onClick={() => setActiveTab('lectura')}>Lectura</TabButton>
        <TabButton active={activeTab === 'escritura'} onClick={() => setActiveTab('escritura')}>Escritura</TabButton>
        <TabButton active={activeTab === 'alerta'} onClick={() => setActiveTab('alerta')}>Alerta Temprana</TabButton>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'general' && (
            <div className="grid md:grid-cols-2 gap-8">
              <ChartPanel title="Niveles de Logro - Lectura">
                <LevelChart data={stats.readingLevels} />
              </ChartPanel>
              <ChartPanel title="Niveles de Logro - Escritura">
                <LevelChart data={stats.writingLevels} />
              </ChartPanel>
            </div>
          )}

          {activeTab === 'lectura' && (
            <div className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                 <ChartPanel title="Promedio por Capacidad - Lectura">
                    <CapacityChart data={stats.readingCaps} color="#10b981" />
                 </ChartPanel>
                 <div className="glass-panel p-6 space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <TrendingUp className="text-brand-primary" /> Análisis Pedagógico
                    </h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      {stats.readingCaps.length > 0 ? (
                        <>
                          El desempeño general en lectura muestra que la capacidad más crítica es 
                          <span className="text-brand-primary font-bold"> "{[...stats.readingCaps].sort((a,b) => parseFloat(a.percentage) - parseFloat(b.percentage))[0]?.name}"</span> con un {[...stats.readingCaps].sort((a,b) => parseFloat(a.percentage) - parseFloat(b.percentage))[0]?.percentage}%. 
                          Se requiere fortalecer las estrategias de inferencia y reflexión crítica.
                        </>
                      ) : (
                        "No hay suficientes datos para realizar un análisis por capacidad."
                      )}
                    </p>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'escritura' && (
            <div className="space-y-8">
               <div className="grid md:grid-cols-2 gap-8">
                 <ChartPanel title="Promedio por Capacidad - Escritura">
                    <CapacityChart data={stats.writingCaps} color="#ec4899" />
                 </ChartPanel>
                 <div className="glass-panel p-6 space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <TrendingUp className="text-brand-secondary" /> Análisis Pedagógico
                    </h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      {stats.writingCaps.length > 0 ? (
                        <>
                          En escritura, los estudiantes destacan en 
                          <span className="text-brand-secondary font-bold"> "{[...stats.writingCaps].sort((a,b) => parseFloat(b.percentage) - parseFloat(a.percentage))[0]?.name}"</span>. 
                          Sin embargo, se observa una brecha significativa en el uso de convenciones del lenguaje.
                        </>
                      ) : (
                        "No hay suficientes datos para realizar un análisis por capacidad."
                      )}
                    </p>
                    
                    {/* Grade Status Summary */}
                    <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                      <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Ubicación en el Grado</h4>
                      <div className="flex gap-4">
                        <div className="flex-1 text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-2xl font-black text-emerald-400">{stats.gradeStatus.enElGrado}</p>
                          <p className="text-[10px] text-emerald-300/60 font-bold">EN EL GRADO</p>
                        </div>
                        <div className="flex-1 text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-2xl font-black text-red-400">{stats.gradeStatus.previoAlGrado}</p>
                          <p className="text-[10px] text-red-300/60 font-bold">PREVIO AL GRADO</p>
                        </div>
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'alerta' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <AlertCircle className="text-red-500" /> Semaforización de Estudiantes
                </h2>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:bg-white/10 transition-all">
                  <TrendingUp size={14} /> Exportar Reporte
                </button>
              </div>
              <EarlyWarningTable performanceData={stats.studentList} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function KPICard({ icon, label, value, subtitle, color }) {
  return (
    <div className="glass-panel p-5 relative overflow-hidden group">
      <div className={cn("absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500", `text-${color}`)}>
        {icon && <div className="w-20 h-20">{icon}</div>}
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", `bg-${color}/20 text-${color}`)}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-tight">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <div className="text-3xl font-black text-white">{value}</div>
        {subtitle && <span className="text-sm font-bold text-white/30 mb-1">{subtitle}</span>}
      </div>
    </div>
  );
}

function TabButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
        active ? "text-brand-primary border-brand-primary" : "text-white/40 border-transparent hover:text-white/60"
      )}
    >
      {children}
    </button>
  );
}

function ChartPanel({ title, children }) {
  return (
    <div className="glass-panel p-6 space-y-6">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <div className="h-[300px] w-full">
        {children}
      </div>
    </div>
  );
}

function LevelChart({ data }) {
  const COLORS = {
    'Satisfactorio': '#10b981',
    'Logrado': '#3b82f6',
    'Proceso': '#f59e0b',
    'Inicio': '#ef4444'
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ReChartsBar data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 'bold' }} 
        />
        <YAxis hide domain={[0, 100]} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
          itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
        />
        <Bar dataKey="percentage" radius={[8, 8, 0, 0]} barSize={50}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#ccc'} fillOpacity={0.8} />
          ))}
          <LabelList 
            dataKey="percentage" 
            position="top" 
            formatter={(val) => `${val}%`} 
            style={{ fill: '#ffffff60', fontSize: 12, fontWeight: 'bold' }} 
          />
        </Bar>
      </ReChartsBar>
    </ResponsiveContainer>
  );
}

function CapacityChart({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ReChartsBar 
        data={data} 
        layout="vertical" 
        margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff05" />
        <XAxis type="number" hide domain={[0, 100]} />
        <YAxis 
          type="category" 
          dataKey="name" 
          width={100}
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#ffffff40', fontSize: 9, fontWeight: 'bold' }}
        />
        <Tooltip 
          cursor={{ fill: 'transparent' }}
          contentStyle={{ backgroundColor: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
        />
        <Bar dataKey="percentage" fill={color} radius={[0, 8, 8, 0]} barSize={25}>
           <LabelList 
            dataKey="percentage" 
            position="right" 
            formatter={(val) => `${val}%`} 
            style={{ fill: '#ffffff60', fontSize: 10, fontWeight: 'bold' }} 
          />
        </Bar>
      </ReChartsBar>
    </ResponsiveContainer>
  );
}

function DataGroupsList({ searchTerm }) {
  const { groups, deleteGroup } = useData();

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groups;
    return groups.filter(g => g.ie.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [groups, searchTerm]);

  const handleDeleteGroup = (group) => {
    if (!confirm(`¿Está seguro de eliminar ${group.count} registros de ${group.ie} - ${group.grado}° ${group.section} (${group.periodo})?`)) return;
    deleteGroup(group);
  };

  if (filteredGroups.length === 0) {
    return (
      <div className="p-12 text-center text-white/20">
        No se encontraron lotes de datos que coincidan con la búsqueda.
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {filteredGroups.map((group, idx) => (
        <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40">
              <span className="text-sm font-bold">{group.grado}°</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">{group.ie}</p>
              <div className="flex gap-2 mt-0.5">
                <span className="text-[10px] text-brand-primary font-bold uppercase">{group.section}</span>
                <span className="text-[10px] text-white/20">•</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">{group.periodo}</span>
                <span className="text-[10px] text-white/20">•</span>
                <span className="text-[10px] text-white/40">{group.count} estudiantes</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => handleDeleteGroup(group)}
            className="p-3 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
            title="Eliminar lote de datos"
          >
            <Trash2 size={20} />
          </button>
        </div>
      ))}
    </div>
  );
}

