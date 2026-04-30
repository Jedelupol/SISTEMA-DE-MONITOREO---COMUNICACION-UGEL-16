"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Users, Calendar, Trash2, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Search, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PERIODOS } from '../lib/matrices_data';
import { cn } from '../lib/utils';
import { animate, stagger } from 'animejs';

import { useData } from '../lib/DataContext';

export default function AdminManagement() {
  const { 
    teachers, setTeachers, 
    activePeriod, setActivePeriod, 
    activeYear, setActiveYear,
    institutionInfo, setInstitutionInfo,
    clearAllData: contextClearAllData,
    isLoading
  } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    
    // Entrance animation
    setTimeout(() => {
      const cards = document.querySelectorAll('.admin-card');
      cards.forEach((card, i) => {
        (card as HTMLElement).style.opacity = '1';
        (card as HTMLElement).style.transform = 'translateY(0)';
      });
    }, 100);

    try {
      animate('.admin-card', {
        translateY: [20, 0],
        opacity: [0, 1],
        delay: stagger(100),
        duration: 800,
        easing: 'out-quart'
      });
    } catch (e) {
      console.warn('Anime.js animation failed', e);
    }
  }, []);

  const YEARS = ['2026', '2027', '2028'];

  const handleTeacherUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        // Expected format: Col A: DNI, Col B: NOMBRE, Col C: IE
        const newTeachers = [];
        rows.forEach((row, idx) => {
          if (!row || row.length < 2) return;
          const dni = String(row[0]).trim();
          const nombre = String(row[1]).trim();
          const ie = String(row[2] || '').trim();
          
          if (dni && nombre) {
            newTeachers.push({ dni, nombre, ie, active: true });
          }
        });

        const updated = [...teachers];
        
        newTeachers.forEach(nt => {
          const idx = updated.findIndex(t => t.dni === nt.dni);
          if (idx >= 0) updated[idx] = nt;
          else updated.push(nt);
        });

        setTeachers(updated);
        alert(`¡Se han cargado/actualizado ${newTeachers.length} docentes!`);
      } catch (err) {
        console.error(err);
        alert('Error al procesar el archivo Excel. Verifique el formato (DNI, NOMBRE, IE).');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSetPeriod = (p) => {
    setActivePeriod(p);
  };

  const handleSetYear = (y) => {
    setActiveYear(y);
  };

  const toggleTeacherStatus = (dni) => {
    const updated = teachers.map(t => 
      t.dni === dni ? { ...t, active: t.active === false ? true : false } : t
    );
    setTeachers(updated);
  };

  const handleEditTeacher = (dni, field, value) => {
    const updated = teachers.map(t => 
      t.dni === dni ? { ...t, [field]: value } : t
    );
    setTeachers(updated);
  };

  const handleClearAllData = () => {
    if (!confirm('¿Está SEGURO de que desea proceder con la limpieza? Esta acción es irreversible.')) return;
    
    const mode = prompt('Para confirmar la eliminación TOTAL escriba "ELIMINAR". Para borrar solo EVALUACIONES escriba "EVAL":');
    
    if (mode === 'EVAL' || mode === 'ELIMINAR') {
      contextClearAllData(mode);
      alert(mode === 'EVAL' ? 'Registros de evaluación eliminados.' : 'Toda la base de datos ha sido reseteada.');
    }
  };

  const handleUpdateInstitution = (field, value) => {
    setInstitutionInfo({ ...institutionInfo, [field]: value });
  };

  if (!mounted) return null;

  const filteredTeachers = teachers.filter(t => 
    t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.dni.includes(searchTerm) ||
    (t.ie && t.ie.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-brand-secondary" /> Gestión Administrativa
          </h1>
          <p className="text-white/40">Control de padrones, periodos y depuración del sistema</p>
        </div>
        <button 
          onClick={handleClearAllData}
          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 group"
        >
          <Trash2 size={16} className="group-hover:rotate-12 transition-transform" /> Limpiar Base de Datos
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="glass-panel p-6 space-y-8 admin-card opacity-0">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-brand-secondary">
              <Calendar size={20} />
              <h3 className="font-bold uppercase tracking-widest text-xs">Año Académico</h3>
            </div>
            <div className="flex gap-2">
              {YEARS.map(y => (
                <button
                  key={y}
                  onClick={() => handleSetYear(y)}
                  className={cn(
                    "flex-1 py-3 rounded-xl border text-sm font-bold transition-all",
                    activeYear === y 
                      ? "bg-brand-secondary/20 border-brand-secondary text-white shadow-lg" 
                      : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-brand-secondary">
              <Calendar size={20} />
              <h3 className="font-bold uppercase tracking-widest text-xs">Periodo Activo del Sistema</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {Object.values(PERIODOS).map(p => (
                <button
                  key={p}
                  onClick={() => handleSetPeriod(p)}
                  className={cn(
                    "p-4 rounded-xl border text-sm font-bold transition-all text-left relative overflow-hidden group",
                    activePeriod === p 
                      ? "bg-brand-secondary/20 border-brand-secondary text-white shadow-lg" 
                      : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                  )}
                >
                  {activePeriod === p && (
                    <motion.div layoutId="period-active" className="absolute right-3 top-3">
                      <CheckCircle2 size={16} className="text-brand-secondary" />
                    </motion.div>
                  )}
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg flex items-start gap-2 border border-white/10">
            <Info size={14} className="text-white/40 mt-0.5" />
            <p className="text-[10px] text-white/40">
              El periodo seleccionado será el predeterminado para todos los registros y consultas del sistema.
            </p>
          </div>
        </div>

        {/* Teacher Upload */}
        <div className="glass-panel p-6 space-y-6 admin-card opacity-0">
          <div className="flex items-center gap-3 text-brand-primary">
            <Users size={20} />
            <h3 className="font-bold uppercase tracking-widest text-xs">Padrón de Docentes</h3>
          </div>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-brand-primary hover:bg-brand-primary/5 transition-all cursor-pointer group"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx,.xls" 
              onChange={handleTeacherUpload}
            />
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-brand-primary group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <p className="text-sm font-bold text-white">Cargar Excel de Docentes</p>
            <p className="text-xs text-white/30 mt-1">DNI (Col A), NOMBRE (Col B), IE (Col C)</p>
          </div>

          <div className="flex items-center justify-between pt-4">
            <span className="text-xs font-bold text-white/40">{teachers.length} docentes registrados</span>
            {teachers.length > 0 && (
              <button 
                onClick={() => { if(confirm('¿Eliminar padrón?')) { setTeachers([]); } }}
                className="text-[10px] text-red-400/60 hover:text-red-400 font-bold uppercase"
              >
                Eliminar Padrón
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Institution Info */}
      <div className="glass-panel p-6 admin-card opacity-0">
        <div className="flex items-center gap-3 text-brand-secondary mb-6">
          <ShieldCheck size={20} />
          <h3 className="font-bold uppercase tracking-widest text-xs">Información de la Institución</h3>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Nombre de la IE</label>
            <input 
              type="text" 
              value={institutionInfo.ieName || ''} 
              onChange={(e) => handleUpdateInstitution('ieName', e.target.value)}
              placeholder="Ej. 20532 STMA. VIRGEN DEL CARMEN"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-secondary transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Director(a)</label>
            <input 
              type="text" 
              value={institutionInfo.director || ''} 
              onChange={(e) => handleUpdateInstitution('director', e.target.value)}
              placeholder="Nombre del director(a)"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-secondary transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase ml-1">Especialista / Coordinador</label>
            <input 
              type="text" 
              value={institutionInfo.specialist || ''} 
              onChange={(e) => handleUpdateInstitution('specialist', e.target.value)}
              placeholder="Nombre del responsable"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-brand-secondary transition-all"
            />
          </div>
        </div>
      </div>

      {/* Teachers List */}
      <div className="glass-panel overflow-hidden admin-card opacity-0">
        <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Users size={18} className="text-brand-primary" /> Lista de Docentes Autorizados
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o DNI..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-brand-primary w-64"
            />
          </div>
        </div>
        <div className="max-h-[400px] overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#1e1b4b] z-10">
              <tr className="border-b border-white/5 text-[10px] font-bold text-white/40 uppercase">
                <th className="px-6 py-4">DNI</th>
                <th className="px-6 py-4">Nombre del Docente</th>
                <th className="px-6 py-4">Institución Educativa</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTeachers.map((t, i) => (
                <tr key={i} className={cn(
                  "hover:bg-white/5 transition-colors group",
                  t.active === false && "opacity-50 grayscale"
                )}>
                  <td className="px-6 py-4 font-mono text-brand-primary text-xs font-bold">{t.dni}</td>
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      value={t.nombre} 
                      onChange={(e) => handleEditTeacher(t.dni, 'nombre', e.target.value)}
                      className="bg-transparent border-none text-sm text-white/80 focus:text-white outline-none w-full"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      value={t.ie || ''} 
                      placeholder="No asignada"
                      onChange={(e) => handleEditTeacher(t.dni, 'ie', e.target.value)}
                      className="bg-transparent border-none text-sm text-white/40 italic focus:text-white outline-none w-full"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleTeacherStatus(t.dni)}
                      className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold uppercase transition-all",
                        t.active !== false ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      )}
                    >
                      {t.active !== false ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => {
                        if(confirm(`¿Eliminar a ${t.nombre}?`)) {
                          const updated = teachers.filter(doc => doc.dni !== t.dni);
                          setTeachers(updated);
                        }
                      }}
                      className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-white/20 text-sm">
                    {searchTerm ? 'No se encontraron resultados' : 'No hay docentes registrados'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
