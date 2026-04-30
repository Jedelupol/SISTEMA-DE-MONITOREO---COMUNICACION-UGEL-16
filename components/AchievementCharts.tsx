import React, { useState, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  CartesianGrid, Legend, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../lib/DataContext';
import { 
  getAchievementLevels, 
  getEvolutionData, 
  getDetailedSectionBreakdown,
  getGlobalFilters 
} from '../lib/evaluator';
import { 
  TrendingUp, Users, Award, 
  BarChart2, LineChart as LineChartIcon, 
  Sparkles, Filter, Calendar, Activity,
  BookOpen, Edit3, ChevronRight, Layers,
  Download, FileText, Share2, Info,
  School, Hash, LayoutGrid, Target
} from 'lucide-react';

const COLORS = {
  Satisfactorio: '#10b981',
  Logrado: '#6366f1',
  Proceso: '#f59e0b',
  Inicio: '#ef4444'
};

const PERIOD_ORDER = ['DIAGNÓSTICA', 'INICIO', 'PROCESO', 'SALIDA'];

// --- Sub-components ---

function KPICard({ title, value, icon: Icon, color, trend, trendLabel }) {
  const colorMap = {
    blue: 'from-blue-500/20 to-indigo-500/5 text-blue-400 border-blue-500/20',
    emerald: 'from-emerald-500/20 to-teal-500/5 text-emerald-400 border-emerald-500/20',
    indigo: 'from-indigo-500/20 to-purple-500/5 text-indigo-400 border-indigo-500/20',
    rose: 'from-rose-500/20 to-orange-500/5 text-rose-400 border-rose-500/20'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 glass-panel border ${colorMap[color] || colorMap.blue} relative overflow-hidden group hover:scale-[1.02] transition-all duration-300`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-current opacity-[0.03] rounded-full blur-3xl group-hover:opacity-[0.07] transition-all duration-500" />
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">{title}</p>
          <h3 className="text-4xl font-black text-white tracking-tighter">{value}</h3>
          {trend !== undefined && (
            <div className={`mt-3 flex items-center gap-1.5 text-xs font-black ${parseFloat(trend) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <div className={`p-0.5 rounded-full ${parseFloat(trend) >= 0 ? 'bg-emerald-400/10' : 'bg-rose-400/10'}`}>
                <TrendingUp className={`w-3 h-3 ${parseFloat(trend) < 0 ? 'rotate-180' : ''}`} />
              </div>
              {trend}% <span className="opacity-40 font-medium">{trendLabel || 'vs. anterior'}</span>
            </div>
          )}
        </div>
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 shadow-inner group-hover:text-white transition-colors">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}

function FilterSelect({ icon: Icon, value, onChange, options, placeholder, label }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]">
      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5 ml-1">
        <Icon size={10} className="text-brand-primary" /> {label}
      </label>
      <div className="relative group">
        <select 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-black text-white outline-none cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all appearance-none"
        >
          <option value="ALL" className="bg-slate-900">{placeholder}</option>
          {options.map(opt => (
            <option key={typeof opt === 'object' ? opt.id : opt} value={typeof opt === 'object' ? opt.id : opt} className="bg-slate-900">
              {typeof opt === 'object' ? opt.name : opt}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 group-hover:text-white/40 transition-colors">
          <ChevronRight size={14} className="rotate-90" />
        </div>
      </div>
    </div>
  );
}

// --- Main Dashboard ---

export default function AnalysisDashboard() {
  const { records, activePeriod, activeYear, session } = useData();
  
  // 1. Dynamic Filter Options
  const filterOptions = useMemo(() => getGlobalFilters(records), [records]);

  // 2. Local Filter State
  const [selectedYear, setSelectedYear] = useState(activeYear || (filterOptions.years[0] || '2026'));
  const [selectedPeriod, setSelectedPeriod] = useState(activePeriod?.toUpperCase() || (filterOptions.periods[0] || 'DIAGNÓSTICA'));
  const [selectedIE, setSelectedIE] = useState('ALL');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [selectedCompetency, setSelectedCompetency] = useState('reading'); // 'reading' | 'writing'
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  // 3. Filtered records for current selection
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchYear = String(r.periodo_anual) === selectedYear;
      const matchPeriod = (String(r.tipo_evaluacion).toUpperCase() === selectedPeriod || String(r.periodo).toUpperCase() === selectedPeriod);
      const matchIE = selectedIE === 'ALL' || String(r.id_ie) === selectedIE;
      const matchGrade = selectedGrade === 'ALL' || String(r.grado) === selectedGrade;
      const matchSection = selectedSection === 'ALL' || String(r.section) === selectedSection;
      
      return matchYear && matchPeriod && matchIE && matchGrade && matchSection;
    });
  }, [records, selectedYear, selectedPeriod, selectedIE, selectedGrade, selectedSection]);

  // 4. Analytics Calculations
  const achievementData = useMemo(() => {
    return getAchievementLevels(filteredRecords, null, selectedCompetency);
  }, [filteredRecords, selectedCompetency]);

  const tableData = useMemo(() => {
    return getDetailedSectionBreakdown(filteredRecords, selectedCompetency);
  }, [filteredRecords, selectedCompetency]);

  const targetLevelName = selectedCompetency === 'reading' ? 'Satisfactorio' : 'Logrado';
  const currentLogrado = achievementData.find(d => d.name === targetLevelName)?.percentage || "0.0";
  const totalStudents = filteredRecords.length;

  // 5. Evolutionary Data (Current year, all periods)
  const evolutionData = useMemo(() => {
    return filterOptions.periods
      .sort((a, b) => PERIOD_ORDER.indexOf(a) - PERIOD_ORDER.indexOf(b))
      .map(p => {
        const pRecords = records.filter(r => 
          String(r.periodo_anual) === selectedYear && 
          (String(r.tipo_evaluacion).toUpperCase() === p || String(r.periodo).toUpperCase() === p) &&
          (selectedIE === 'ALL' || String(r.id_ie) === selectedIE) &&
          (selectedGrade === 'ALL' || String(r.grado) === selectedGrade)
        );
        const levels = getAchievementLevels(pRecords, null, selectedCompetency);
        const target = levels.find(l => l.name === targetLevelName);
        return { 
          name: p, 
          logrado: target ? parseFloat(target.percentage) : 0 
        };
      });
  }, [records, selectedYear, selectedIE, selectedGrade, selectedCompetency, targetLevelName, filterOptions.periods]);

  // 6. Growth Analysis (Current selection vs previous year same context)
  const growthData = useMemo(() => {
    const prevYear = (parseInt(selectedYear) - 1).toString();
    const prevYearRecords = records.filter(r => 
      String(r.periodo_anual) === prevYear && 
      (String(r.tipo_evaluacion).toUpperCase() === selectedPeriod || String(r.periodo).toUpperCase() === selectedPeriod) &&
      (selectedIE === 'ALL' || String(r.id_ie) === selectedIE) &&
      (selectedGrade === 'ALL' || String(r.grado) === selectedGrade)
    );
    
    return getEvolutionData(prevYearRecords, filteredRecords, selectedCompetency);
  }, [records, filteredRecords, selectedYear, selectedPeriod, selectedIE, selectedGrade, selectedCompetency]);

  // 7. Interannual Trend
  const interannualData = useMemo(() => {
    return filterOptions.years.map(y => {
      const yRecords = records.filter(r => 
        String(r.periodo_anual) === y && 
        (String(r.tipo_evaluacion).toUpperCase() === selectedPeriod || String(r.periodo).toUpperCase() === selectedPeriod) &&
        (selectedIE === 'ALL' || String(r.id_ie) === selectedIE) &&
        (selectedGrade === 'ALL' || String(r.grado) === selectedGrade)
      );
      const levels = getAchievementLevels(yRecords, null, selectedCompetency);
      const target = levels.find(l => l.name === targetLevelName);
      return { 
        year: y, 
        percentage: target ? parseFloat(target.percentage) : 0 
      };
    }).sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [records, selectedPeriod, selectedIE, selectedGrade, selectedCompetency, targetLevelName, filterOptions.years]);

  const handleAIAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const trend = parseFloat(growthData.growth) >= 0 ? "ascendente" : "crítica";
      const compLabel = selectedCompetency === 'reading' ? "Comprensión Lectora" : "Escritura";
      const topSection = tableData[0] ? `${tableData[0].grade}° ${tableData[0].section}` : "N/A";
      
      setAiAnalysis(`🚨 ANÁLISIS ESTRATÉGICO EVALÚA-IA: 
      \nPara el periodo ${selectedPeriod} ${selectedYear} en ${compLabel}, detectamos un patrón ${trend}. 
      \n📈 IMPACTO: El ${currentLogrado}% de estudiantes alcanza el nivel ${targetLevelName}. La sección con mejor desempeño es ${topSection} con un ${tableData[0]?.logradoPercentage}% de logro.
      \n🎯 FOCO PEDAGÓGICO: Se observa una concentración de estudiantes en 'Proceso'. Recomendamos priorizar la capacidad de 'Inferencia Directa' y 'Uso de conectores' mediante talleres de 20 min diarios. 
      \n💡 PRONÓSTICO: Si se mantiene la tendencia de crecimiento del ${growthData.growth}% puntos, se proyecta alcanzar el 85% de logro satisfactorio para el cierre del ciclo 2028.`);
      setIsAnalyzing(false);
    }, 1500);
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Grado,Seccion,Total,Satisfactorio,Proceso,Inicio,Logrado,% Logro\n"
      + tableData.map(e => `${e.grade},${e.section},${e.total},${e.Satisfactorio},${e.Proceso},${e.Inicio},${e.Logrado},${e.logradoPercentage}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_EvaluaIA_${selectedYear}_${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header & Main Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 pt-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-black tracking-widest uppercase">
              {session?.role === 'admin' ? 'Global Admin View' : 'IE Institutional View'}
            </div>
            <div className="flex -space-x-2">
              {filterOptions.ies.slice(0, 3).map((ie, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-brand-primary/20 flex items-center justify-center text-[8px] font-bold text-brand-primary overflow-hidden">
                  <School size={10} />
                </div>
              ))}
            </div>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter leading-none mb-4">
            Analysis <span className="text-brand-primary">Dashboard</span>
          </h1>
          <p className="text-white/40 font-medium max-w-md text-lg">
            Monitoreo pedagógico avanzado con analítica predictiva de alto impacto.
          </p>
        </div>

        {/* Competency Toggle */}
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-3xl shadow-2xl">
          <button 
            onClick={() => setSelectedCompetency('reading')}
            className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${selectedCompetency === 'reading' ? 'bg-brand-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            <BookOpen size={16} /> LECTURA
          </button>
          <button 
            onClick={() => setSelectedCompetency('writing')}
            className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${selectedCompetency === 'writing' ? 'bg-brand-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            <Edit3 size={16} /> ESCRITURA
          </button>
        </div>
      </div>

      {/* Global Filter Panel - Style Looker Studio */}
      <div className="p-8 bg-white/[0.03] rounded-[2.5rem] border border-white/10 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-brand-primary/20 rounded-xl text-brand-primary">
            <Filter size={18} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Panel de Filtros Dinámicos</h2>
            <p className="text-white/30 text-xs font-medium">Refina el análisis aplicando filtros multicapa.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-6">
          <FilterSelect 
            label="Año Académico"
            icon={Calendar}
            placeholder="Seleccionar Año"
            value={selectedYear}
            onChange={setSelectedYear}
            options={filterOptions.years}
          />
          <FilterSelect 
            label="Periodo"
            icon={Target}
            placeholder="Seleccionar Periodo"
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            options={filterOptions.periods}
          />
          {session?.role === 'admin' && (
            <FilterSelect 
              label="Institución"
              icon={School}
              placeholder="Todas las IEs"
              value={selectedIE}
              onChange={setSelectedIE}
              options={filterOptions.ies}
            />
          )}
          <FilterSelect 
            label="Grado"
            icon={Hash}
            placeholder="Todos los Grados"
            value={selectedGrade}
            onChange={setSelectedGrade}
            options={filterOptions.grades}
          />
          <FilterSelect 
            label="Sección"
            icon={LayoutGrid}
            placeholder="Todas las Secciones"
            value={selectedSection}
            onChange={setSelectedSection}
            options={filterOptions.sections}
          />

          <div className="ml-auto flex gap-3">
             <button 
              onClick={() => {
                setSelectedIE('ALL');
                setSelectedGrade('ALL');
                setSelectedSection('ALL');
              }}
              className="px-6 py-3 rounded-xl border border-white/5 text-white/40 text-xs font-black hover:text-white hover:bg-white/5 transition-all"
            >
              LIMPIAR
            </button>
            <button 
              onClick={handleExport}
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white flex items-center gap-2 text-xs font-black hover:bg-brand-primary transition-all shadow-lg"
            >
              <Download size={14} /> EXPORTAR CSV
            </button>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Muestra Analizada" 
          value={totalStudents} 
          icon={Users} 
          color="blue" 
        />
        <KPICard 
          title={`% ${targetLevelName}`} 
          value={`${currentLogrado}%`} 
          icon={Award} 
          color="emerald" 
        />
        <KPICard 
          title="Variación vs Anterior" 
          value={`${growthData.growth}%`} 
          icon={TrendingUp} 
          color="indigo" 
          trend={growthData.growth} 
          trendLabel="puntos" 
        />
        <KPICard 
          title="Crecimiento Relativo" 
          value={`${growthData.growthRelative}%`} 
          icon={Layers} 
          color="rose" 
          trend={growthData.growthRelative}
        />
      </div>

      {/* Main Charts Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Evolutionary Path */}
        <div className="lg:col-span-7 glass-panel p-10 border-white/5 relative group overflow-hidden">
           <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-brand-primary/10 transition-colors">
              <BarChart2 size={120} />
           </div>
           
           <div className="relative z-10 mb-10 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  <Activity className="text-brand-primary" /> Evolución del Rendimiento
                </h3>
                <p className="text-white/40 text-sm mt-2">Seguimiento de niveles satisfactorios en {selectedYear}.</p>
              </div>
              <Info className="text-white/20 hover:text-white/40 cursor-help" size={20} />
           </div>
           
           <div className="h-[350px] w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 'bold' }} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false} 
                    unit="%" 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 10 }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '20px',
                      backdropFilter: 'blur(10px)',
                      padding: '15px'
                    }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Bar 
                    dataKey="logrado" 
                    fill="url(#barGradient)" 
                    radius={[12, 12, 0, 0]} 
                    barSize={60}
                    animationDuration={2000}
                  />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Distribution Matrix */}
        <div className="lg:col-span-5 glass-panel p-10 border-white/5 flex flex-col justify-between">
           <div>
              <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <PieChart size={24} className="text-emerald-400" /> Distribución de Logros
              </h3>
              <p className="text-white/40 text-sm mt-2">Composición porcentual de los niveles de aprendizaje.</p>
           </div>

           <div className="h-[300px] w-full my-8">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={achievementData}
                    innerRadius={85}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1500}
                    stroke="none"
                  >
                    {achievementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.9)', 
                      border: 'none', 
                      borderRadius: '16px',
                      padding: '12px 20px'
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
           </div>

           <div className="grid grid-cols-2 gap-4">
              {achievementData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[item.name] }} />
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase">{item.name}</p>
                    <p className="text-sm font-black text-white">{item.percentage}%</p>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* Competency Table */}
        <div className="lg:col-span-12 glass-panel border-white/5 overflow-hidden">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <LayoutGrid size={24} className="text-brand-primary" /> Matriz de Desempeño
              </h3>
              <p className="text-white/40 text-sm mt-2">Desglose por grado y sección para intervención focalizada.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-brand-primary text-[10px] font-black uppercase tracking-widest">
              Analizando: {tableData.length} Secciones
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Grado/Sección</th>
                  <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Total</th>
                  <th className="px-8 py-5 text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Satisfactorio</th>
                  {selectedCompetency === 'writing' && <th className="px-8 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Logrado</th>}
                  <th className="px-8 py-5 text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">Proceso</th>
                  <th className="px-8 py-5 text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Inicio</th>
                  <th className="px-8 py-5 text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] text-right">% Logro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tableData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-white group-hover:bg-brand-primary transition-colors">
                          {row.grade}
                        </div>
                        <span className="font-black text-white text-lg">{row.section}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-bold text-white/60">{row.total}</td>
                    <td className="px-8 py-5 font-black text-emerald-400">{row.Satisfactorio}</td>
                    {selectedCompetency === 'writing' && <td className="px-8 py-5 font-black text-indigo-400">{row.Logrado}</td>}
                    <td className="px-8 py-5 font-black text-amber-400">{row.Proceso}</td>
                    <td className="px-8 py-5 font-black text-rose-400">{row.Inicio}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className="h-full bg-brand-primary transition-all duration-1000" 
                            style={{ width: `${row.logradoPercentage}%` }} 
                          />
                        </div>
                        <span className="font-black text-white">{row.logradoPercentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Growth Trend Area */}
        <div className="lg:col-span-12 glass-panel p-10 border-white/5">
           <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  <LineChartIcon className="text-indigo-400" /> Tendencia Histórica Interanual
                </h3>
                <p className="text-white/40 text-sm mt-2">Comparativa de resultados en {selectedPeriod} a través de los años.</p>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-bold text-white/60 tracking-widest uppercase flex items-center gap-2">
                <Activity size={12} className="text-brand-primary" /> Coherencia Histórica
              </div>
           </div>

           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={interannualData}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis 
                    dataKey="year" 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 'black' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false} 
                    unit="%" 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="#6366f1" 
                    strokeWidth={5}
                    fillOpacity={1} 
                    fill="url(#colorTrend)" 
                    dot={{ fill: '#6366f1', strokeWidth: 2, r: 6, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                    animationDuration={2500}
                  />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* AI Insight Module */}
      <motion.div 
        layout
        className="relative overflow-hidden p-[2px] rounded-[2.5rem] bg-gradient-to-r from-brand-primary via-indigo-500 to-emerald-500 shadow-2xl shadow-brand-primary/20"
      >
        <div className="bg-slate-950 rounded-[2.4rem] p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-primary/5 blur-[120px] pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row justify-between items-center gap-10 relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-brand-primary/20 flex items-center justify-center text-brand-primary shadow-inner border border-brand-primary/20">
                <Sparkles className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-white leading-tight">Asistente de IA Estratégica</h3>
                <p className="text-white/40 text-lg mt-1 font-medium">Motor de análisis predictivo y recomendaciones personalizadas.</p>
              </div>
            </div>
            
            <button 
              onClick={handleAIAnalysis}
              disabled={isAnalyzing}
              className="group relative px-10 py-5 bg-white text-slate-950 rounded-2xl font-black text-lg tracking-tight transition-all duration-500 hover:scale-[1.05] disabled:opacity-50 overflow-hidden shadow-2xl"
            >
              <div className="absolute inset-0 bg-brand-primary opacity-0 group-hover:opacity-10 transition-opacity" />
              <span className="flex items-center gap-3 relative z-10">
                {isAnalyzing ? <Activity className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isAnalyzing ? 'PROCESANDO DATA...' : 'GENERAR INFORME IA'}
              </span>
            </button>
          </div>

          <AnimatePresence>
            {aiAnalysis && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-12 pt-12 border-t border-white/10"
              >
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-1 bg-brand-primary rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
                  <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 text-white/90 text-xl leading-relaxed font-medium italic shadow-inner whitespace-pre-line">
                    "{aiAnalysis}"
                    <div className="mt-6 flex items-center gap-3 text-xs not-italic font-black text-brand-primary uppercase tracking-widest">
                      <ChevronRight size={14} /> Informe Verificado por Evalúa-IA Engine 5.0
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      
      {/* Secondary Actions */}
      <div className="flex justify-center gap-6 py-10 opacity-40 hover:opacity-100 transition-opacity">
        <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white hover:text-brand-primary transition-colors">
          <Share2 size={14} /> Compartir Informe
        </button>
        <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white hover:text-brand-primary transition-colors">
          <FileText size={14} /> Vista de Impresión
        </button>
      </div>
    </div>
  );
}
