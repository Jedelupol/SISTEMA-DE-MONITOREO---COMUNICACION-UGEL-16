"use client";

import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Eye, Download, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MATRICES, PERIODOS } from '../lib/matrices_data';
import { cn } from '../lib/utils';
import { useData } from '../lib/DataContext';
import { evaluateResponse } from '../lib/evaluator';

// Column mappings (0-indexed) - NO HEADERS in the files
const LECTURA_COLS = {
  IE: 0,        // Col A
  DNI: 1,       // Col B
  GRADO: 2,     // Col C
  SECCION: 3,   // Col D
  FIRST_Q: 4    // Col E onwards = P1, P2, P3...
};

const ESCRITURA_COLS = {
  IE: 0,        // Col A
  DNI: 1,       // Col B
  GRADO: 2,     // Col C
  SECCION: 3,   // Col D
  FIRST_Q: 4    // Col E onwards = C1, C2, C3...
};

function normalizeGrado(raw) {
  if (raw === undefined || raw === null) return '';
  const s = String(raw).trim().replace(/[°ºª]/g, '');
  // Match first sequence of digits
  const match = s.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num >= 1 && num <= 6) return String(num);
  }
  return ''; // Return empty for invalid grades
}

function normalizeSection(raw) {
  if (!raw) return '';
  const s = String(raw).trim().toUpperCase();
  if (s === 'UNICA' || s === 'ÚNICA') return 'UNICA';
  return s;
}

export default function BulkUpload({ onComplete, session }) {
  const [lecturaData, setLecturaData] = useState(null);
  const [escrituraData, setEscrituraData] = useState(null);
  const [lecturaFile, setLecturaFile] = useState('');
  const [escrituraFile, setEscrituraFile] = useState('');
  const [mergedRecords, setMergedRecords] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedGrado, setSelectedGrado] = useState('1');
  const [globalYear, setGlobalYear] = useState(new Date().getFullYear().toString());
  const [globalEvaluationType, setGlobalEvaluationType] = useState('DIAGNÓSTICA');
  const [globalInstitutionId, setGlobalInstitutionId] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODOS.DIAGNOSTICA);
  
  const { records, updateRecords, groups, deleteGroup } = useData();
  
  useEffect(() => {
    const savedPeriod = localStorage.getItem('active_period') || PERIODOS.DIAGNOSTICA;
    setSelectedPeriod(savedPeriod);
  }, []);
  
  const lecturaRef = useRef(null);
  const escrituraRef = useRef(null);

  const parseLectura = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      
      const records = [];
      rows.forEach((row, idx) => {
        if (!row || row.length < 5) return;
        const ie = String(row[LECTURA_COLS.IE] || '').trim();
        const dni = String(row[LECTURA_COLS.DNI] || '').trim();
        const rawGrado = row[LECTURA_COLS.GRADO];
        const grado = normalizeGrado(rawGrado);
        const seccion = normalizeSection(row[LECTURA_COLS.SECCION]);
        
        // Clean DNI and validate grade
        if (!dni || !grado || !MATRICES[grado]) return;
        
        const matrix = MATRICES[grado];
        const readingQs = matrix.questions.filter(q => q.competency.toLowerCase().includes('lee'));
        
        const record = {
          institution: ie,
          dni: dni.replace(/\s+/g, ''), // Remove all spaces from DNI
          grado,
          section: seccion,
          studentName: `Estudiante ${dni}`,
          _source: 'lectura',
          _rowIdx: idx
        };

        // Map columns starting from FIRST_Q
        for (let i = 0; i < 20; i++) {
          const colIdx = LECTURA_COLS.FIRST_Q + i;
          const val = row[colIdx] !== undefined ? String(row[colIdx]).trim().toUpperCase() : '';
          if (i < readingQs.length) {
            record[readingQs[i].id] = val === 'SIN RESPUESTA' ? '' : val;
          }
        }

        records.push(record);
      });

      setLecturaData(records);
      setLecturaFile(file.name);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const parseEscritura = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      
      const records = [];
      rows.forEach((row, idx) => {
        if (!row || row.length < 5) return;
        const ie = String(row[ESCRITURA_COLS.IE] || '').trim();
        const dni = String(row[ESCRITURA_COLS.DNI] || '').trim();
        const rawGrado = row[ESCRITURA_COLS.GRADO];
        const grado = normalizeGrado(rawGrado);
        const seccion = normalizeSection(row[ESCRITURA_COLS.SECCION]);
        
        // Clean DNI and validate grade
        if (!dni || !grado || !MATRICES[grado]) return;

        const matrix = MATRICES[grado];
        const writingQs = matrix.questions.filter(q => q.competency.toLowerCase().includes('escribe'));

        const record = {
          institution: ie,
          dni: dni.replace(/\s+/g, ''), // Remove all spaces from DNI
          grado,
          section: seccion,
          studentName: `Estudiante ${dni}`,
          _source: 'escritura',
          _rowIdx: idx
        };

        // Map C1, C2, C3... from FIRST_Q column onwards
        for (let i = 0; i < 10; i++) {
          const colIdx = ESCRITURA_COLS.FIRST_Q + i;
          const val = row[colIdx] !== undefined ? String(row[colIdx]).trim().toUpperCase() : '';
          if (i < writingQs.length && val) {
            // Normalize writing responses
            let normalized = val;
            if (val.includes('ADECUADA') && !val.includes('PARCIAL') && !val.includes('INADECUADA')) {
              normalized = 'ADECUADA';
            } else if (val.includes('PARCIAL')) {
              normalized = 'PARCIALMENTE ADECUADA';
            } else if (val.includes('INADECUADA')) {
              normalized = 'INADECUADA';
            } else if (val.includes('NO RESPOND') || val.includes('NO RESPOND')) {
              normalized = 'NO RESPONDIDA';
            }
            record[writingQs[i].id] = normalized;
          }
        }

        records.push(record);
      });

      setEscrituraData(records);
      setEscrituraFile(file.name);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((type, e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (!file) return;
    if (type === 'lectura') parseLectura(file);
    else parseEscritura(file);
  }, [parseLectura, parseEscritura]);

  const handleMergeAndPreview = useCallback(() => {
    setIsProcessing(true);
    
    // Index by DNI+GRADO+SECCION for merging
    const recordMap = new Map();

    // Process lectura first
    if (lecturaData) {
      lecturaData.forEach(rec => {
        const key = `${rec.dni}|${rec.grado}|${rec.section}`;
        recordMap.set(key, { ...rec });
      });
    }

    // Merge escritura on top
    if (escrituraData) {
      escrituraData.forEach(rec => {
        const key = `${rec.dni}|${rec.grado}|${rec.section}`;
        if (recordMap.has(key)) {
          // Merge writing fields into existing reading record
          const existing = recordMap.get(key);
          Object.keys(rec).forEach(k => {
            if (!k.startsWith('_') && k !== 'institution' && k !== 'dni' && k !== 'grado' && k !== 'section' && k !== 'studentName') {
              existing[k] = rec[k];
            }
          });
          // Keep institution from escritura if missing
          if (!existing.institution && rec.institution) {
            existing.institution = rec.institution;
          }
        } else {
          recordMap.set(key, { ...rec });
        }
      });
    }

    const excelFields = [
      { key: 'dni', labels: ['DNI', 'DNI_Estudiante', 'DOCUMENTO', 'DNI Estudiante', 'DNI_ESTUDIANTE'] },
      { key: 'studentName', labels: ['Estudiante', 'Apellidos y Nombres', 'NOMBRE', 'Estudiantes', 'ESTUDIANTE', 'APELLIDOS Y NOMBRES'] },
      { key: 'institution', labels: ['Institución Educativa', 'IE', 'I.E.', 'INSTITUCION EDUCATIVA', 'COLEGIO'] },
      { key: 'id_ie', labels: ['Código Modular', 'Modular_IE', 'ID_IE', 'CODIGO MODULAR', 'MODULAR_IE'] },
      { key: 'ugel', labels: ['UGEL', 'Ugel', 'DRE/UGEL'] },
      { key: 'grado', labels: ['Grado', 'GRADO', 'Año'] },
      { key: 'section', labels: ['Sección', 'Seccion', 'SECCION', 'SECCIÓN'] },
      { key: 'periodo', labels: ['Periodo', 'PERIODO', 'Momento'] },
      { key: 'periodo_anual', labels: ['Año Escolar', 'Anio', 'AÑO', 'ANIO', 'AÑO ESCOLAR'] },
      { key: 'tipo_evaluacion', labels: ['Tipo Evaluación', 'Tipo_Evaluacion', 'TIPO_EVALUACION', 'EVALUACION'] },
    ];

    const merged = Array.from(recordMap.values())
      .filter(r => r.grado && MATRICES[r.grado]) // STRICT FILTER for valid grades
      .map(r => {
        // 1. Evaluate achievement levels
        const evalResult = evaluateResponse(r.grado, r);
        
        // 2. Clean up internal fields and enrich with metadata
        const { _source, _rowIdx, ...clean } = r;
        return {
          ...clean,
          readingLevel: evalResult?.reading?.level || 'Inicio',
          writingLevel: evalResult?.writing?.level || 'Inicio',
          nivel_logro: evalResult?.reading?.level || evalResult?.writing?.level || 'Inicio',
          ugel: 'UGEL 16: Barranca',
          periodo: selectedPeriod,
          periodo_anual: globalYear,
          tipo_evaluacion: globalEvaluationType,
          id_ie: globalInstitutionId || r.id_ie || '',
          teacherDni: session?.dni || 'ADMIN',
          teacherName: session?.user || 'Administrador',
          timestamp: new Date().toISOString()
        };
      });

    setMergedRecords(merged);
    setPreviewOpen(true);
    setIsProcessing(false);
  }, [lecturaData, escrituraData, selectedPeriod, session]);

  const [overwriteMode, setOverwriteMode] = useState(false);

  const handleConfirmUpload = useCallback(() => {
    setIsProcessing(true);
    
    // Index existing by key for easy lookup/overwrite
    const existingMap = new Map();
    records.forEach(r => {
      const key = `${r.dni || ''}|${r.grado || ''}|${r.periodo || ''}`;
      existingMap.set(key, r);
    });

    let added = 0;
    let updatedCount = 0;
    let skipped = 0;

    mergedRecords.forEach(record => {
      // Key for duplicate detection in this period/year
      const key = `${record.dni}|${record.grado}|${record.periodo}|${record.periodo_anual}|${record.tipo_evaluacion}|${record.id_ie}`;
      if (existingMap.has(key)) {
        if (overwriteMode) {
          // Merge/Overwrite: update the existing one with new data
          const current = existingMap.get(key);
          existingMap.set(key, { ...current, ...record });
          updatedCount++;
        } else {
          skipped++;
        }
      } else {
        existingMap.set(key, record);
        added++;
      }
    });
    
    const finalRecords = Array.from(existingMap.values());
    updateRecords(finalRecords);

    setUploadResult({
      total: mergedRecords.length,
      added,
      updated: updatedCount,
      skipped,
      existingBefore: records.length,
      totalAfter: finalRecords.length
    });

    setPreviewOpen(false);
    setIsProcessing(false);
  }, [mergedRecords, overwriteMode, records, updateRecords]);

  const handleReset = () => {
    setLecturaData(null);
    setEscrituraData(null);
    setLecturaFile('');
    setEscrituraFile('');
    setMergedRecords([]);
    setPreviewOpen(false);
    setUploadResult(null);
  };

  // Summary of records by grado
  const previewSummary = mergedRecords.reduce((acc, r) => {
    const g = r.grado || '?';
    if (!acc[g]) acc[g] = { count: 0, ies: new Set() };
    acc[g].count++;
    if (r.institution) acc[g].ies.add(r.institution);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
          <Upload size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Upload size={24} className="text-emerald-400" /> Carga Masiva
          </h1>
          <p className="text-white/40">Suba archivos Excel con datos de Lectura y/o Escritura</p>
        </div>
      </div>

      {/* Period Selection */}
      {/* Active Period Info */}
      {/* Metadata Inputs */}
      {!uploadResult && !previewOpen && (
        <div className="grid md:grid-cols-3 gap-4 mb-6 p-6 glass-panel border-white/10">
          <div>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 block">Año Escolar</label>
            <select 
              value={globalYear} 
              onChange={(e) => setGlobalYear(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-brand-primary outline-none"
            >
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 block">Tipo de Evaluación</label>
            <select 
              value={globalEvaluationType} 
              onChange={(e) => setGlobalEvaluationType(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-brand-primary outline-none"
            >
              <option value="DIAGNÓSTICA">Diagnóstica</option>
              <option value="INICIO">Inicio</option>
              <option value="PROCESO">Proceso</option>
              <option value="SALIDA">Salida</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1 block">Código Modular IE</label>
            <input 
              type="text" 
              placeholder="Ej: 1234567"
              value={globalInstitutionId}
              onChange={(e) => setGlobalInstitutionId(e.target.value.trim())}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:border-brand-primary outline-none"
            />
          </div>
        </div>
      )}

      {/* Active Period Info */}
      {!uploadResult && !previewOpen && (
        <div className="mb-8 p-6 glass-panel border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">
                Momento de Evaluación Activo
              </p>
              <h3 className="text-xl font-black text-white">{selectedPeriod}</h3>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
              CONFIGURADO POR ADMIN
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {uploadResult && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-8 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white">¡Carga Exitosa!</h2>
          <div className="grid grid-cols-4 gap-4 max-w-xl mx-auto">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-black text-emerald-400">{uploadResult.added}</p>
              <p className="text-[10px] text-white/40 font-bold uppercase">Nuevos</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-black text-blue-400">{uploadResult.updated}</p>
              <p className="text-[10px] text-white/40 font-bold uppercase">Actualizados</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-black text-yellow-400">{uploadResult.skipped}</p>
              <p className="text-[10px] text-white/40 font-bold uppercase">Omitidos</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-black text-brand-primary">{uploadResult.totalAfter}</p>
              <p className="text-[10px] text-white/40 font-bold uppercase">Total BD</p>
            </div>
          </div>
          <div className="flex gap-4 justify-center pt-4">
            <button onClick={handleReset} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl font-bold text-white transition-all hover:bg-white/10">
              Cargar más archivos
            </button>
            <button onClick={onComplete} className="px-6 py-3 bg-brand-primary rounded-2xl font-bold text-white shadow-lg shadow-brand-primary/20 transition-all">
              Ver en Panel de Control
            </button>
          </div>
        </motion.div>
      )}

      {/* Upload Zone */}
      {!uploadResult && !previewOpen && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* LECTURA Upload */}
            <UploadZone
              title="LECTURA"
              subtitle="IE, DNI, Grado, Sección, P1...P20"
              fileName={lecturaFile}
              recordCount={lecturaData?.length}
              color="brand-primary"
              inputRef={lecturaRef}
              onDrop={(e) => handleDrop('lectura', e)}
              onFileSelect={(e) => { const f = e.target.files?.[0]; if (f) parseLectura(f); }}
              onClear={() => { setLecturaData(null); setLecturaFile(''); }}
            />
            
            {/* ESCRITURA Upload */}
            <UploadZone
              title="ESCRITURA"
              subtitle="IE, DNI, Grado, Sección, C1, C2, C3"
              fileName={escrituraFile}
              recordCount={escrituraData?.length}
              color="brand-secondary"
              inputRef={escrituraRef}
              onDrop={(e) => handleDrop('escritura', e)}
              onFileSelect={(e) => { const f = e.target.files?.[0]; if (f) parseEscritura(f); }}
              onClear={() => { setEscrituraData(null); setEscrituraFile(''); }}
            />
          </div>

          {/* Format info */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-300 flex items-start gap-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                <strong>Formato requerido:</strong> Archivos Excel (.xlsx) <strong>sin encabezados</strong>. 
                La primera fila debe ser datos. Columnas: A=IE, B=DNI, C=Grado, D=Sección. 
                Los registros con el mismo DNI y grado se fusionan automáticamente.
              </span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleMergeAndPreview}
              disabled={!lecturaData && !escrituraData}
              className="flex-1 py-4 bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <AlertCircle size={20} />
                </motion.div>
              ) : (
                <><Eye size={20} /> Vista Previa ({(lecturaData?.length || 0) + (escrituraData?.length || 0)} filas)</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Eye className="text-brand-primary" /> Vista Previa
            </h2>
            <button onClick={() => setPreviewOpen(false)} className="text-white/40 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Summary by grade */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Object.keys(previewSummary).sort().map(g => (
              <div key={g} className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-lg font-black text-brand-primary">{previewSummary[g].count}</p>
                <p className="text-[10px] text-white/40 font-bold">{g}° SEC</p>
                <p className="text-[8px] text-white/20">{previewSummary[g].ies.size} IE</p>
              </div>
            ))}
          </div>

          {/* Overwrite Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", overwriteMode ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-white/20")}>
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Modo de Sobrescritura</p>
                <p className="text-[10px] text-white/40">Si el estudiante ya existe en este periodo, ¿desea actualizar sus datos?</p>
              </div>
            </div>
            <button 
              onClick={() => setOverwriteMode(!overwriteMode)}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                overwriteMode ? "bg-blue-500" : "bg-white/10"
              )}
            >
              <motion.div 
                animate={{ x: overwriteMode ? 24 : 4 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>

          {/* Records table */}
          <div className="max-h-[400px] overflow-auto rounded-xl border border-white/10">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-brand-primary/20 backdrop-blur-md">
                <tr>
                  <th className="py-2 px-3 text-left text-white/60 font-bold">#</th>
                  <th className="py-2 px-3 text-left text-white/60 font-bold">IE</th>
                  <th className="py-2 px-3 text-left text-white/60 font-bold">DNI</th>
                  <th className="py-2 px-3 text-left text-white/60 font-bold">Grado</th>
                  <th className="py-2 px-3 text-left text-white/60 font-bold">Sección</th>
                  <th className="py-2 px-3 text-left text-white/60 font-bold">Datos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mergedRecords.slice(0, 50).map((rec, idx) => {
                  const hasReading = Object.keys(rec).some(k => k.startsWith('C1-P') || k.startsWith('C2-P') || k.startsWith('C3-P') || k.startsWith('C4-P') || k.startsWith('C5-P') || k.startsWith('C6-P'));
                  const hasWriting = Object.keys(rec).some(k => k.includes('CA'));
                  return (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="py-2 px-3 text-white/30">{idx + 1}</td>
                      <td className="py-2 px-3 text-white/70 max-w-[120px] truncate">{rec.institution}</td>
                      <td className="py-2 px-3 text-white/70 font-mono">{rec.dni}</td>
                      <td className="py-2 px-3 text-white/70">{rec.grado}°</td>
                      <td className="py-2 px-3 text-white/70">{rec.section}</td>
                      <td className="py-2 px-3 flex gap-1">
                        {hasReading && <span className="px-2 py-0.5 rounded bg-brand-primary/20 text-brand-primary text-[10px] font-bold">LEE</span>}
                        {hasWriting && <span className="px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 text-[10px] font-bold">ESCRIBE</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {mergedRecords.length > 50 && (
              <div className="p-3 text-center text-white/30 text-xs bg-white/5">
                ...y {mergedRecords.length - 50} registros más
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setPreviewOpen(false)}
              className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white transition-all hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmUpload}
              disabled={isProcessing}
              className="flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 disabled:opacity-50 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Download size={20} /> Confirmar Carga ({mergedRecords.length} registros)
            </button>
          </div>
        </motion.div>
      )}

      {/* Data Management Section */}
      {!uploadResult && !previewOpen && (
        <DataManagementSection 
          key="data-mgmt" 
          onUpdate={() => onComplete()} 
          groups={groups}
          deleteGroup={deleteGroup}
        />
      )}
    </div>
  );
}

function DataManagementSection({ onUpdate, groups, deleteGroup }) {
  const handleDeleteGroup = (group) => {
    if (!confirm(`¿Está seguro de eliminar ${group.count} registros de ${group.ie} - ${group.grado}° ${group.section} (${group.periodo})?`)) return;
    deleteGroup(group);
    if (onUpdate) onUpdate();
  };

  if (groups.length === 0) return null;

  return (
    <div className="mt-12 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
          <Trash2 size={14} /> Gestión de Datos Existentes
        </h2>
      </div>

      <div className="grid gap-3">
        {groups.map((group, idx) => (
          <div key={idx} className="glass-panel p-4 flex items-center justify-between group hover:border-red-500/30 transition-all">
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
              className="p-2 text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
              title="Eliminar grupo"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadZone({ title, subtitle, fileName, recordCount, color, inputRef, onDrop, onFileSelect, onClear }) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { setIsDragging(false); onDrop(e); }}
      className={cn(
        "relative glass-panel p-6 transition-all cursor-pointer group",
        isDragging && "border-brand-primary bg-brand-primary/10 scale-[1.02]",
        fileName && "border-emerald-500/30 bg-emerald-500/5"
      )}
      onClick={() => !fileName && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={onFileSelect}
        className="hidden"
      />

      {fileName ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="text-[10px] text-emerald-400 font-bold">{fileName}</p>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="text-white/20 hover:text-red-400 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-xs text-emerald-400 font-bold">{recordCount} registros detectados</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 space-y-3">
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110", `bg-${color}/20 text-${color}`)}>
            <Upload size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{title}</p>
            <p className="text-[10px] text-white/30">{subtitle}</p>
          </div>
          <p className="text-[10px] text-white/20">
            Arrastre un archivo .xlsx o haga clic para seleccionar
          </p>
        </div>
      )}
    </div>
  );
}
