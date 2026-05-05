"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2, Eye, Download, X, School, ChevronDown, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MATRICES, PERIODOS } from '../lib/matrices_data';
import { cn } from '../lib/utils';
import { useData } from '../lib/DataContext';
import { evaluateResponse, normalizeCompetency, cleanRecordInput } from '../lib/evaluator';
import { db } from '../lib/firebase';
import { collection, writeBatch, doc, getDocs, query, where, Timestamp } from 'firebase/firestore';

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

export default function BulkUpload({ onComplete, session }: any) {
  const { 
    records: allRecords, 
    updateRecords, 
    groups, 
    deleteGroup, 
    activePeriod, 
    activeYear, 
    setActivePeriod, 
    setActiveYear, 
    clearAllData 
  } = useData();

  const [lecturaData, setLecturaData] = useState<any[] | null>(null);
  const [escrituraData, setEscrituraData] = useState<any[] | null>(null);
  const [lecturaFile, setLecturaFile] = useState('');
  const [escrituraFile, setEscrituraFile] = useState('');
  const [mergedRecords, setMergedRecords] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedGrado, setSelectedGrado] = useState('1');
  const [globalYear, setGlobalYear] = useState(activeYear || '2026');
  const [globalEvaluationType, setGlobalEvaluationType] = useState('DIAGNÓSTICA');
  const [globalInstitutionId, setGlobalInstitutionId] = useState(session?.id_ie || '');
  const [sanityWarnings, setSanityWarnings] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(activePeriod || PERIODOS.DIAGNOSTICA);
  
  useEffect(() => {
    const savedPeriod = localStorage.getItem('active_period') || PERIODOS.DIAGNOSTICA;
    setSelectedPeriod(savedPeriod);
    if (session?.id_ie && !globalInstitutionId) {
      setGlobalInstitutionId(session.id_ie);
    }
  }, [session, globalInstitutionId]);
  
  const lecturaRef = useRef<HTMLInputElement>(null);
  const escrituraRef = useRef<HTMLInputElement>(null);

  const parseLectura = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      
      const localRecords: any[] = [];
      const errors: string[] = [];
      rows.forEach((row, idx) => {
        if (!row || row.length < 5) return;
        const ie = String(row[LECTURA_COLS.IE] || '').trim();
        const dni = String(row[LECTURA_COLS.DNI] || '').trim().replace(/\s+/g, '');
        const rawGrado = row[LECTURA_COLS.GRADO];
        const grado = normalizeGrado(rawGrado);
        const seccion = normalizeSection(row[LECTURA_COLS.SECCION]);
        
        // SANITY CHECK
        if (!dni) {
          errors.push(`Fila ${idx + 1}: DNI vacío.`);
          return;
        }
        if (dni.length < 5) {
          errors.push(`Fila ${idx + 1}: DNI "${dni}" demasiado corto.`);
        }
        if (!grado) {
          errors.push(`Fila ${idx + 1}: Grado inválido o vacío ("${rawGrado}").`);
          return;
        }
        if (!MATRICES[grado]) {
          errors.push(`Fila ${idx + 1}: No existe matriz para el grado ${grado}.`);
          return;
        }
        
        const matrix = MATRICES[grado];
        const readingQs = matrix.questions.filter(q => q.competency.toLowerCase().includes('lee'));
        
        const record: any = {
          institution: ie,
          dni: dni,
          grado,
          section: seccion,
          studentName: `Estudiante ${dni}`,
          _source: 'lectura',
          _rowIdx: idx
        };

        // Map columns starting from FIRST_Q
        let answeredCount = 0;
        for (let i = 0; i < 20; i++) {
          const colIdx = LECTURA_COLS.FIRST_Q + i;
          const val = row[colIdx] !== undefined ? String(row[colIdx]).trim().toUpperCase() : '';
          if (i < readingQs.length) {
            const finalVal = val === 'SIN RESPUESTA' ? '' : val;
            record[readingQs[i].id] = finalVal;
            if (finalVal) answeredCount++;
          }
        }

        if (answeredCount === 0) {
          errors.push(`Fila ${idx + 1}: Estudiante ${dni} no tiene respuestas de lectura.`);
        }

        localRecords.push(record);
      });

      setSanityWarnings(prev => [...prev, ...errors]);
      setLecturaData(localRecords);
      setLecturaFile(file.name);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const parseEscritura = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      
      const localRecords: any[] = [];
      const errors: string[] = [];
      rows.forEach((row, idx) => {
        if (!row || row.length < 5) return;
        const ie = String(row[ESCRITURA_COLS.IE] || '').trim();
        const dni = String(row[ESCRITURA_COLS.DNI] || '').trim().replace(/\s+/g, '');
        const rawGrado = row[ESCRITURA_COLS.GRADO];
        const grado = normalizeGrado(rawGrado);
        const seccion = normalizeSection(row[ESCRITURA_COLS.SECCION]);
        
        // SANITY CHECK
        if (!dni) {
          errors.push(`Fila ${idx + 1}: DNI vacío (Escritura).`);
          return;
        }
        if (!grado) {
          errors.push(`Fila ${idx + 1}: Grado inválido en Escritura ("${rawGrado}").`);
          return;
        }
        if (!MATRICES[grado]) {
          errors.push(`Fila ${idx + 1}: No existe matriz para el grado ${grado}.`);
          return;
        }

        const matrix = MATRICES[grado];
        const writingQs = matrix.questions.filter(q => {
          const cat = normalizeCompetency(q.competency);
          return cat === 'writing';
        });

        const record: any = {
          institution: ie,
          dni,
          grado,
          section: seccion,
          studentName: `Estudiante ${dni}`,
          _source: 'escritura',
          _rowIdx: idx
        };

        // Map C1, C2, C3... from FIRST_Q column onwards
        let answeredCount = 0;
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
            } else if (val.includes('NO RESPOND')) {
              normalized = 'NO RESPONDIDA';
            }
            record[writingQs[i].id] = normalized;
            answeredCount++;
          }
        }

        if (answeredCount === 0) {
          errors.push(`Fila ${idx + 1}: Estudiante ${dni} no tiene respuestas de escritura.`);
        }

        localRecords.push(record);
      });

      setSanityWarnings(prev => [...prev, ...errors]);
      setEscrituraData(localRecords);
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
        const cleanRec = cleanRecordInput(rec);
        const key = `${cleanRec.dni}|${cleanRec.grado}|${cleanRec.section}`;
        recordMap.set(key, cleanRec);
      });
    }

    // Merge escritura on top
    if (escrituraData) {
      escrituraData.forEach(rec => {
        const cleanRec = cleanRecordInput(rec);
        const key = `${cleanRec.dni}|${cleanRec.grado}|${cleanRec.section}`;
        if (recordMap.has(key)) {
          // Merge writing fields into existing reading record
          const existing = recordMap.get(key);
          Object.keys(cleanRec).forEach(k => {
            if (!k.startsWith('_') && k !== 'institution' && k !== 'dni' && k !== 'grado' && k !== 'section' && k !== 'studentName') {
              existing[k] = cleanRec[k];
            }
          });
          // Keep institution from escritura if missing
          if (!existing.institution && cleanRec.institution) {
            existing.institution = cleanRec.institution;
          }
        } else {
          recordMap.set(key, cleanRec);
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
        // 1. Evaluate achievement levels (evaluateResponse already calls cleanRecordInput internally, 
        // but it's safe to pass the already cleaned record)
        const evalResult = evaluateResponse(r.grado, r);
        
        // 2. Clean up internal fields and enrich with metadata
        const { _source, _rowIdx, ...clean } = r;
        
        // Final normalization pass with global context
        const finalRecord = cleanRecordInput({
          ...clean,
          ugel: 'UGEL 16: Barranca',
          periodo: selectedPeriod,
          periodo_anual: globalYear,
          tipo_evaluacion: globalEvaluationType,
          id_ie: globalInstitutionId || session?.id_ie || r.id_ie || r.institution || '',
          teacherDni: session?.dni || 'ADMIN',
          teacherName: session?.user || 'Administrador',
          timestamp: new Date().toISOString()
        });

        return {
          ...finalRecord,
          readingLevel: evalResult?.reading?.level || 'Inicio',
          writingLevel: evalResult?.writing?.level || 'Inicio',
          nivel_logro: evalResult?.reading?.level || evalResult?.writing?.level || 'Inicio'
        };
      });

    setMergedRecords(merged);
    setPreviewOpen(true);
    setIsProcessing(false);
    console.log("Merging data with:", { selectedPeriod, globalYear, globalEvaluationType, globalInstitutionId });
  }, [lecturaData, escrituraData, selectedPeriod, session, globalYear, globalEvaluationType, globalInstitutionId]);

  const [overwriteMode, setOverwriteMode] = useState(false);

  const handleConfirmUpload = useCallback(async () => {
    if (mergedRecords.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatusText('Iniciando subida...');
    
    console.log("Starting upload of", mergedRecords.length, "records");
    try {
      const recordsCol = collection(db, "registros_ugel16");
      const total = mergedRecords.length;
      const chunkSize = 500;
      let processed = 0;
      let added = 0;
      let updated = 0;

      // 1. If overwrite mode is ON, we might need to pre-fetch or handle it per batch
      // For simplicity and performance, we'll process in chunks
      for (let i = 0; i < total; i += chunkSize) {
        const chunk = mergedRecords.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        setUploadStatusText(`Procesando lote ${Math.floor(i / chunkSize) + 1}...`);

        for (const record of chunk) {
          // Determine if it exists? If we have a deterministic ID, it's easier.
          // For now, let's use a composite ID: DNI_PERIOD_YEAR_IE
          const customId = `${record.dni}_${record.periodo}_${record.periodo_anual}_${record.id_ie}`.replace(/\s+/g, '_');
          const docRef = doc(recordsCol, customId);
          
          console.log(`Setting document: ${customId}`);
          batch.set(docRef, {
            ...record,
            serverTimestamp: Timestamp.now()
          }, { merge: overwriteMode });
          
          if (overwriteMode) updated++; else added++;
        }

        await batch.commit();
        console.log("Batch commit successful");
        processed += chunk.length;
        setUploadProgress(Math.round((processed / total) * 100));
      }

      setUploadResult({
        total,
        added: overwriteMode ? 0 : added,
        updated: overwriteMode ? updated : 0,
        skipped: 0,
        totalAfter: allRecords.length + (overwriteMode ? 0 : added)
      });
      
      setPreviewOpen(false);
    } catch (error) {
      console.error("Error en la carga masiva:", error);
      alert("Error al subir los datos. Revise la consola.");
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
    }
  }, [mergedRecords, overwriteMode, allRecords, db]);


  const handleReset = () => {
    setLecturaData(null);
    setEscrituraData(null);
    setLecturaFile('');
    setEscrituraFile('');
    setMergedRecords([]);
    setPreviewOpen(false);
    setUploadResult(null);
    setSanityWarnings([]);
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

          {/* Sanity Warnings */}
          {sanityWarnings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 max-h-32 overflow-auto">
              <p className="text-xs font-bold text-amber-400 flex items-center gap-2 mb-2">
                <AlertCircle size={14} /> Advertencias de Consistencia ({sanityWarnings.length})
              </p>
              <ul className="space-y-1">
                {sanityWarnings.slice(0, 20).map((err, i) => (
                  <li key={i} className="text-[10px] text-amber-200/60">• {err}</li>
                ))}
                {sanityWarnings.length > 20 && <li className="text-[10px] text-amber-200/40">...y {sanityWarnings.length - 20} más</li>}
              </ul>
            </div>
          )}

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

          {isUploading && (
            <div className="space-y-2 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex justify-between text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest">
                <span>{uploadStatusText}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                />
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setPreviewOpen(false)}
              disabled={isUploading}
              className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white transition-all hover:bg-white/10 disabled:opacity-30"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmUpload}
              disabled={isUploading}
              className="flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 disabled:opacity-50 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Database size={20} />
                </motion.div>
              ) : (
                <Download size={20} />
              )}
              {isUploading ? 'Subiendo...' : `Confirmar Carga (${mergedRecords.length} registros)`}
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
          allRecords={allRecords}
          updateRecords={updateRecords}
          deleteGroup={deleteGroup}
          clearAllData={clearAllData}
        />
      )}
    </div>
  );
}

// Optimización: Memoizamos la sección completa para evitar re-renders innecesarios con 3000+ registros
const DataManagementSection = ({ groups, allRecords, updateRecords, deleteGroup, clearAllData }: any) => {
  const [expandedIEs, setExpandedIEs] = useState<string[]>([]);
  const [expandedGrades, setExpandedGrades] = useState<string[]>([]);
  const [purgeConfirmLevel, setPurgeConfirmLevel] = useState(0);

  // Memoize hierarchy calculation
  const hierarchy = useMemo(() => {
    const tree = {};
    groups.forEach(g => {
      const ie = g.ie || 'Sin IE';
      const grade = g.grado;
      
      if (!tree[ie]) tree[ie] = { grades: {}, total: 0, id_ie: g.id_ie };
      if (!tree[ie].grades[grade]) tree[ie].grades[grade] = { sections: [], count: 0 };
      
      tree[ie].grades[grade].sections.push(g);
      tree[ie].grades[grade].count += g.count;
      tree[ie].total += g.count;
    });
    return tree;
  }, [groups]);

  const toggleIE = (ie: string) => {
    setExpandedIEs(prev => prev.includes(ie) ? prev.filter(i => i !== ie) : [...prev, ie]);
  };

  const toggleGrade = (ie: string, grade: string) => {
    const key = `${ie}-${grade}`;
    setExpandedGrades(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleDeleteIE = (ieName, totalCount) => {
    if (confirm(`¿Está seguro de eliminar TODOS los registros de la institución "${ieName}"? (${totalCount} estudiantes)`)) {
      const filtered = allRecords.filter(r => (r.institution || 'Sin IE') !== ieName);
      updateRecords(filtered);
    }
  };

  const handleDeleteGrade = (ieName, grade, gradeCount) => {
    if (confirm(`¿Eliminar todos los registros de ${grade}° Grado en "${ieName}"? (${gradeCount} estudiantes)`)) {
      const filtered = allRecords.filter(r => 
        !((r.institution || 'Sin IE') === ieName && String(r.grado) === String(grade))
      );
      updateRecords(filtered);
    }
  };

  const handleDeleteSection = (group) => {
    if (confirm(`¿Eliminar la sección "${group.section}" del ${group.grado}° grado?`)) {
      deleteGroup(group);
    }
  };

  const handlePurgeAll = () => {
    if (purgeConfirmLevel === 0) {
      setPurgeConfirmLevel(1);
    } else if (purgeConfirmLevel === 1) {
      setPurgeConfirmLevel(2);
    } else {
      clearAllData('EVAL');
      setPurgeConfirmLevel(0);
      alert('Base de datos de evaluaciones purgada completamente.');
    }
  };

  if (groups.length === 0) {
    return (
      <div className="text-center py-20 glass-panel border-dashed border-white/10">
        <Database size={48} className="mx-auto text-white/10 mb-4" />
        <p className="text-white/40 text-sm">No hay datos cargados en el sistema</p>
      </div>
    );
  }

  const ies = Object.keys(hierarchy).sort();

  return (
    <div className="space-y-6">
      {/* Botón Maestro de Limpieza */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handlePurgeAll}
          className={cn(
            "px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-3 shadow-xl",
            purgeConfirmLevel === 0 ? "bg-white/5 text-red-400 border border-red-500/20 hover:bg-red-500/10" :
            purgeConfirmLevel === 1 ? "bg-orange-500 text-white animate-pulse" :
            "bg-red-600 text-white scale-105 shadow-red-500/40"
          )}
        >
          <Trash2 size={16} />
          {purgeConfirmLevel === 0 ? "LIMPIAR TODA LA BASE DE DATOS" :
           purgeConfirmLevel === 1 ? "¿ESTÁ SEGURO DE ELIMINAR TODO?" :
           "¡CONFIRMAR ELIMINACIÓN TOTAL!"}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 px-2 mb-2">
          <Database size={14} className="text-brand-primary" />
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Instituciones Registradas</h3>
        </div>

      <div className="space-y-4">
        {ies.map(ieName => {
          const ieData = hierarchy[ieName];
          const isIEExpanded = expandedIEs.includes(ieName);
          const grades = Object.keys(ieData.grades).sort();

          return (
            <div key={ieName} className="glass-panel overflow-hidden border-white/5 bg-white/[0.02]">
              {/* Institution Header */}
              <div 
                className={cn(
                  "px-6 py-4 flex items-center justify-between cursor-pointer transition-colors",
                  isIEExpanded ? "bg-brand-primary/5 border-b border-white/5" : "hover:bg-white/[0.04]"
                )}
                onClick={() => toggleIE(ieName)}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2 rounded-xl transition-colors",
                    isIEExpanded ? "bg-brand-primary text-white" : "bg-white/5 text-white/40"
                  )}>
                    <School size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{ieName}</h4>
                    <p className="text-[10px] text-white/30 font-medium">
                      {grades.length} Grados • {ieData.total} Estudiantes Totales
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-transform",
                    isIEExpanded ? "rotate-180 text-brand-primary" : "text-white/20"
                  )}>
                    <ChevronDown size={20} />
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteIE(ieName, ieData.total); }}
                    className="p-2 text-white/10 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all"
                    title="Eliminar toda la Institución"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Grades Accordion */}
              <AnimatePresence>
                {isIEExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5"
                  >
                    <div className="p-2 space-y-2 bg-black/20">
                      {grades.map(grade => {
                        const gradeData = ieData.grades[grade];
                        const gradeKey = `${ieName}-${grade}`;
                        const isGradeExpanded = expandedGrades.includes(gradeKey);

                        return (
                          <div key={grade} className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
                            {/* Grade Header */}
                            <div 
                              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]"
                              onClick={() => toggleGrade(ieName, grade)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black border transition-colors",
                                  isGradeExpanded ? "bg-brand-primary/20 border-brand-primary text-brand-primary" : "bg-white/5 border-white/10 text-white/40"
                                )}>
                                  {grade}°
                                </div>
                                <span className="text-xs font-bold text-white/80">{grade}° Grado</span>
                                <span className="text-[10px] text-white/20">•</span>
                                <span className="text-[10px] text-white/40 font-medium">{gradeData.count} Estudiantes</span>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteGrade(ieName, grade, gradeData.count); }}
                                className="p-1.5 text-white/10 hover:text-red-400 hover:bg-red-400/5 rounded-md transition-all"
                                title="Eliminar Grado completo"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {/* Sections List */}
                            <AnimatePresence>
                              {isGradeExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="bg-black/40 border-t border-white/5"
                                >
                                  <div className="divide-y divide-white/5">
                                    {gradeData.sections.map((sectionGroup, sIdx) => (
                                      <div key={sIdx} className="px-6 py-2.5 flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                          <div className="w-1 h-4 bg-emerald-500/30 rounded-full" />
                                          <div>
                                            <p className="text-[11px] font-bold text-white/70">
                                              Sección <span className="text-emerald-400">"{sectionGroup.section}"</span>
                                            </p>
                                            <p className="text-[9px] text-white/30">
                                              {sectionGroup.periodo} • {sectionGroup.count} registros
                                            </p>
                                          </div>
                                        </div>
                                        <button 
                                          onClick={() => handleDeleteSection(sectionGroup)}
                                          className="p-1.5 text-white/10 group-hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                          title="Eliminar Sección"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
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
