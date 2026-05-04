"use client";

import { useMemo } from 'react';
import { 
  XCircle, 
  FileText, 
  Printer, 
  School, 
  BookOpen, 
  PenTool 
} from 'lucide-react';
import { getIEReportData } from '../lib/evaluator';
import { cn } from '../lib/utils';
import { useData } from '../lib/DataContext';

export default function FullInstitutionalReport({ id_ie, records, periodoFilter, onClose }) {
  const { matrixOverrides } = useData();
  
  const reportData = useMemo(() => {
    if (!records || !id_ie) return null;
    return getIEReportData(records, id_ie, periodoFilter, matrixOverrides);
  }, [records, id_ie, periodoFilter, matrixOverrides]);

  const handlePrint = () => {
    window.print();
  };

  if (!reportData) return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
       <div className="text-white text-center">
          <p className="text-lg font-bold">No hay datos suficientes para generar este reporte.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-white/10 rounded-lg">Cerrar</button>
       </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex flex-col p-4 md:p-8 animate-in fade-in zoom-in duration-300">
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between mb-6 no-print">
        <div className="flex items-center gap-4 text-white">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <FileText size={24} className="text-brand-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Reporte Consolidado Institucional</h2>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{reportData.ieName} • {periodoFilter}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button 
            onClick={handlePrint}
            className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm shadow-xl shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Printer size={18} /> Imprimir Reporte
          </button>
          <button 
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <XCircle size={32} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto flex-1 bg-white rounded-3xl shadow-2xl overflow-y-auto print:shadow-none print:rounded-none print:overflow-visible print:static">
        {/* Header de la Hoja */}
        <div className="p-8 md:p-12 border-b-8 border-brand-primary">
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-slate-900 leading-tight uppercase">{reportData.ieName}</h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{reportData.ugel}</p>
            </div>
            <div className="text-right">
              <div className="inline-block bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-black uppercase">
                {reportData.periodo}
              </div>
              <p className="mt-2 text-[10px] font-bold text-slate-400">TOTAL ESTUDIANTES: {reportData.totalStudents}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 py-8 border-y border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <BookOpen size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Competencia</h4>
                <p className="text-sm font-black text-slate-900">LECTURA</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-brand-secondary/10 rounded-xl flex items-center justify-center text-brand-secondary">
                <PenTool size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Competencia</h4>
                <p className="text-sm font-black text-slate-900">ESCRITURA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido por Grados */}
        <div className="p-8 md:p-12 space-y-12">
          {reportData.grades.map((grade) => (
            <div key={grade.grado} className="space-y-8 break-after-page">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                 <span className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xl">
                   {grade.grado}°
                 </span>
                 <h3 className="text-xl font-black uppercase text-slate-900">Resultados de {grade.grado}° Grado de Primaria</h3>
              </div>

              {grade.sections.map((section) => (
                <div key={section.section} className="border border-slate-100 rounded-2xl overflow-hidden break-inside-avoid mb-8">
                  <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
                    <span className="font-black uppercase text-xs">Sección: {section.section}</span>
                    <span className="text-[10px] font-bold opacity-60">{section.count} Estudiantes</span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-0 divide-x divide-slate-100">
                    {/* COMPETENCIA: LECTURA */}
                    <div className="p-6 space-y-6">
                      <div className="border-l-4 border-emerald-500 pl-4 py-1">
                        <h4 className="text-sm font-black uppercase text-emerald-600">Competencia: Lectura</h4>
                        <p className="text-[10px] text-slate-400 font-bold">Lee diversos tipos de textos en su lengua materna</p>
                      </div>

                      {/* Small Summary Table for Lectura */}
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="border border-slate-200 p-2 text-left">Nivel de Logro</th>
                            <th className="border border-slate-200 p-2 text-center">Cant.</th>
                            <th className="border border-slate-200 p-2 text-center">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.reading.map((level) => (
                            <tr key={level.name}>
                              <td className="border border-slate-200 p-2 font-bold">{level.name}</td>
                              <td className="border border-slate-200 p-2 text-center">{level.value}</td>
                              <td className="border border-slate-200 p-2 text-center font-bold">
                                <span className={cn(
                                  "px-2 py-0.5 rounded",
                                  level.name === 'Satisfactorio' ? "bg-emerald-100 text-emerald-700" :
                                  level.name === 'Proceso' ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                                )}>
                                  {level.percentage}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Capacity Breakdown Lectura */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Rendimiento por Capacidad (Lectura)</p>
                        {section.readingCaps.map(cap => (
                          <div key={cap.name} className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-bold uppercase truncate max-w-[180px]">{cap.name}</span>
                                <span className="text-[9px] font-black">{cap.percentage}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${cap.percentage}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* COMPETENCIA: ESCRITURA */}
                    <div className="p-6 space-y-6">
                      <div className="border-l-4 border-brand-secondary pl-4 py-1">
                        <h4 className="text-sm font-black uppercase text-brand-secondary">Competencia: Escritura</h4>
                        <p className="text-[10px] text-slate-400 font-bold">Escribe diversos tipos de textos en su lengua materna</p>
                      </div>

                      {/* Small Summary Table for Escritura */}
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="border border-slate-200 p-2 text-left">Nivel de Logro</th>
                            <th className="border border-slate-200 p-2 text-center">Cant.</th>
                            <th className="border border-slate-200 p-2 text-center">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.writing.map((level) => (
                            <tr key={level.name}>
                              <td className="border border-slate-200 p-2 font-bold">{level.name}</td>
                              <td className="border border-slate-200 p-2 text-center">{level.value}</td>
                              <td className="border border-slate-200 p-2 text-center font-bold">
                                <span className={cn(
                                  "px-2 py-0.5 rounded",
                                  level.name === 'Satisfactorio' || level.name === 'Logrado' ? "bg-blue-100 text-blue-700" :
                                  level.name === 'Proceso' ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                                )}>
                                  {level.percentage}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                       {/* Capacity Breakdown Escritura */}
                       <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Rendimiento por Capacidad (Escritura)</p>
                        {section.writingCaps.map(cap => (
                          <div key={cap.name} className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-bold uppercase truncate max-w-[180px]">{cap.name}</span>
                                <span className="text-[9px] font-black">{cap.percentage}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-secondary" style={{ width: `${cap.percentage}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer for each page - simulated */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between items-end opacity-40">
          <div className="text-[8px] font-bold">
            PROYECTO UGEL 16 - PLATAFORMA DE MONITOREO LECTOEXPRES@ 3.0
          </div>
          <div className="text-[8px] font-bold">
            FECHA DE EMISIÓN: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\:static, .print\:static * {
            visibility: visible;
          }
          .print\:static {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .break-after-page {
            break-after: page;
          }
          .break-inside-avoid {
            break-inside: avoid;
          }
          .grid {
            display: block !important;
          }
          .grid > div {
            margin-bottom: 2rem;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
