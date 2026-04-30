"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Send, User, ChevronRight, AlertCircle, Save, Hash } from 'lucide-react';
import { MATRICES, PERIODOS } from '../lib/matrices_data';
import { UGELS, INSTITUTIONS, SECTIONS } from '../lib/constants';
import { cn } from '../lib/utils';
import { useData } from '../lib/DataContext';

export default function DataEntry({ onComplete, session }) {
  const { addRecords, activePeriod, getMatrixOverride } = useData();
  const [grado, setGrado] = useState('1');
  const [section, setSection] = useState('A');
  const [periodo, setPeriodo] = useState('DIAGNOSTICA');
  const [ugel, setUgel] = useState(UGELS[0]);
  const [institution, setInstitution] = useState(session?.ie || INSTITUTIONS[0]);
  const [studentName, setStudentName] = useState('');
  const [dni, setDni] = useState('');
  const [responses, setResponses] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [activeMatrix, setActiveMatrix] = useState(MATRICES[grado]);
  
  useEffect(() => {
    // Get active period from Admin settings
    setPeriodo(activePeriod);

    if (session?.role === 'teacher') {
      if (session.ie) setInstitution(session.ie);
    } else {
      // Load last used settings for admin
      const savedTeacher = localStorage.getItem('teacher_settings');
      if (savedTeacher) {
        const { ugel: sUgel, institution: sInstitution, grado: sGrado, section: sSection } = JSON.parse(savedTeacher);
        if (sUgel) setUgel(sUgel);
        if (sInstitution) setInstitution(sInstitution);
        if (sGrado) setGrado(sGrado);
        if (sSection) setSection(sSection);
      }
    }
  }, [session]);

  useEffect(() => {
    const override = getMatrixOverride(grado, periodo);
    const baseMatrix = MATRICES[grado] || MATRICES['1'];
    
    if (override) {
      setActiveMatrix(override);
    } else {
      setActiveMatrix(baseMatrix);
    }
  }, [grado, periodo, getMatrixOverride]);

  const matrix = activeMatrix;
  const questions = matrix?.questions || [];
  
  const rawReadingQuestions = questions.filter(q => q.competency.toLowerCase().includes('lee'));
  const rawWritingQuestions = questions.filter(q => q.competency.toLowerCase().includes('escribe'));

  const readingLimit = activeMatrix.readingCount || rawReadingQuestions.length;
  const writingLimit = activeMatrix.writingCount || rawWritingQuestions.length;

  const finalReadingQuestions = rawReadingQuestions.slice(0, readingLimit);
  const finalWritingQuestions = rawWritingQuestions.slice(0, writingLimit);
  
  const totalQuestions = finalReadingQuestions.length + finalWritingQuestions.length;

  const handleResponseChange = (id, val) => {
    setResponses(prev => ({ ...prev, [id]: val }));
  };

  const handleSubmit = () => {
    if (!studentName) return alert('Por favor, ingrese el nombre del estudiante');
    if (!dni || dni.length < 8) return alert('Por favor, ingrese un DNI válido (mínimo 8 dígitos)');
    setIsSubmitting(true);
    
    // Save teacher settings for next time
    localStorage.setItem('teacher_settings', JSON.stringify({ ugel, institution, grado, section, periodo }));
    
    // In a real app, this would save to a database
    const newRecord = {
      studentName,
      dni,
      grado,
      section,
      ugel,
      institution,
      periodo,
      ...responses,
      teacherDni: session?.dni || 'ADMIN',
      teacherName: session?.user || 'Administrador',
      timestamp: new Date().toISOString()
    };

    addRecords([newRecord]);

    setTimeout(() => {
      setIsSubmitting(false);
      setStep(3); // Success step
    }, 1500);
  };


  const resetForm = () => {
    setStudentName('');
    setDni('');
    setResponses({});
    setStep(1);
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-brand-primary/20 rounded-2xl flex items-center justify-center text-brand-primary">
          <Save size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Registro de Evaluación</h1>
          <p className="text-white/40">Ingrese los datos del seguimiento pedagógico 2026</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        <StepIndicator num={1} label="Configuración" active={step >= 1} current={step === 1} />
        <div className="w-8 h-[1px] bg-white/10" />
        <StepIndicator num={2} label="Respuestas" active={step >= 2} current={step === 2} />
        <div className="w-8 h-[1px] bg-white/10" />
        <StepIndicator num={3} label="Finalizado" active={step >= 3} current={step === 3} />
      </div>

      <motion.div
        layout
        className="glass-panel p-8"
      >
        {step === 1 && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/60">UGEL</label>
                <div className="relative">
                  <select
                    value={ugel}
                    onChange={(e) => setUgel(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:outline-none focus:border-brand-primary transition-all appearance-none"
                  >
                    {UGELS.map(u => <option key={u} value={u} className="bg-[#1e1b4b] text-slate-300">{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/60">Institución</label>
                <div className="relative">
                  <select
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    disabled={session?.role === 'teacher'}
                    className={cn(
                      "w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:outline-none focus:border-brand-primary transition-all appearance-none",
                      session?.role === 'teacher' && "opacity-60 cursor-not-allowed bg-white/0"
                    )}
                  >
                    {INSTITUTIONS.map(i => <option key={i} value={i} className="bg-[#1e1b4b] text-slate-300">{i}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/60">Periodo de Evaluación</label>
                <div className={cn(
                  "p-3.5 rounded-xl font-bold text-center text-sm border",
                  session?.role === 'teacher' 
                    ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary" 
                    : "bg-brand-secondary/10 border-brand-secondary/20 text-brand-secondary"
                )}>
                  {periodo}
                </div>
                <p className="text-[10px] text-white/20 text-center">
                  {session?.role === 'teacher' ? 'Configurado por el administrador' : 'Periodo activo actual'}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/60">Grado</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(MATRICES).map(key => (
                    <button
                      key={key}
                      onClick={() => setGrado(key)}
                      className={cn(
                        "py-3 px-4 rounded-xl border transition-all text-sm font-medium",
                        grado === key 
                          ? "bg-brand-primary/10 border-brand-primary text-brand-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                          : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                      )}
                    >
                      {MATRICES[key].name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/60">Sección</label>
                <div className="grid grid-cols-6 gap-2">
                  {SECTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setSection(s)}
                      className={cn(
                        "py-2 px-2 rounded-xl border transition-all text-xs font-medium",
                        section === s 
                          ? "bg-brand-primary/10 border-brand-primary text-brand-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                          : "bg-white/5 border-white/10 text-white/40 hover:border-white/20",
                        s === 'UNICA' ? 'col-span-2' : ''
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/60 flex items-center gap-2">
                  Nombre del Estudiante <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-brand-primary transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-white/60 flex items-center gap-2">
                  DNI / ID Estudiante <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
                  <input
                    type="text"
                    value={dni}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setDni(val.slice(0, 12));
                    }}
                    placeholder="Solo números (máx. 12)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-brand-primary transition-all font-mono"
                    required
                  />
                </div>
                <p className="text-[10px] text-white/20 italic">El DNI es necesario para el seguimiento individual.</p>
              </div>
            </div>

            <div className="pt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-300 flex items-center gap-2">
                <AlertCircle size={14} /> Los datos se guardan localmente en este navegador. Asegúrese de exportar el reporte al finalizar.
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!studentName || dni.length < 8 || !ugel || !institution || !grado || !section}
              className="w-full py-4 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-white shadow-lg shadow-brand-primary/20 transition-all flex items-center justify-center gap-2"
            >
              Comenzar Registro <ChevronRight size={20} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{studentName}</h3>
                <p className="text-sm text-white/40">{MATRICES[grado].name}</p>
              </div>
              <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-xs font-medium text-white/60">
                {Object.keys(responses).length} de {totalQuestions} completadas
              </div>
            </div>

            <div className="space-y-12">
              {/* Lectura Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-brand-primary rounded-full" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-brand-primary">Competencia: Lectura</h4>
                </div>
                
                <div className="grid gap-6">
                  {finalReadingQuestions.map((q, idx) => (
                    <QuestionRow 
                      key={q.id}
                      idx={idx + 1}
                      question={q}
                      value={responses[q.id]}
                      onChange={(val) => handleResponseChange(q.id, val)}
                    />
                  ))}
                </div>
              </div>

              {/* Escritura Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-brand-secondary rounded-full" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-brand-secondary">Competencia: Escritura</h4>
                </div>
                
                <div className="grid gap-6">
                  {finalWritingQuestions.map((q, idx) => (
                    <WritingQuestionRow 
                      key={q.id}
                      idx={idx + 1}
                      question={q}
                      value={responses[q.id]}
                      onChange={(val) => handleResponseChange(q.id, val)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-white transition-all"
              >
                Volver
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-[2] py-4 bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 disabled:opacity-50 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <AlertCircle size={20} />
                  </motion.div>
                ) : (
                  <>Finalizar Registro <Send size={20} /></>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-12 space-y-6">
            <div className="w-20 h-20 bg-brand-accent/20 rounded-full flex items-center justify-center mx-auto text-brand-accent mb-4">
              <Check size={40} />
            </div>
            <h2 className="text-3xl font-bold text-white">¡Registro Exitoso!</h2>
            <p className="text-white/40 max-w-sm mx-auto">
              Los datos de {studentName} han sido procesados y sincronizados con el panel de control.
            </p>
            <div className="flex flex-col gap-3 pt-6">
              <button
                onClick={resetForm}
                className="py-4 bg-brand-primary rounded-2xl font-bold text-white transition-all"
              >
                Registrar otro Estudiante
              </button>
              <button
                onClick={onComplete}
                className="py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-white transition-all"
              >
                Ver en Panel de Control
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function StepIndicator({ num, label, active, current }) {
  return (
    <div className={cn(
      "flex items-center gap-3 transition-opacity",
      !active && "opacity-30"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2",
        current ? "bg-brand-primary border-brand-primary text-white" : active ? "border-brand-primary text-brand-primary" : "border-white/20 text-white/20"
      )}>
        {num}
      </div>
      <span className={cn(
        "text-xs font-bold whitespace-nowrap",
        active ? "text-white" : "text-white/20"
      )}>{label}</span>
    </div>
  );
}

function QuestionRow({ idx, question, value, onChange }) {
  const options = ['A', 'B', 'C', 'D'];
  return (
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
      <div className="flex items-start gap-4">
        <span className="flex-shrink-0 w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-xs font-bold text-white/40">
          P{idx}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-white/80 line-clamp-2 mb-1">{question.indicator}</p>
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{question.capacity}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all",
              value === opt 
                ? "bg-brand-primary/20 border-brand-primary text-brand-primary" 
                : "bg-white/5 border-white/10 text-white/30 hover:border-white/20"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function WritingQuestionRow({ idx, question, value, onChange }) {
  const options = [
    { id: 'ADECUADA', label: 'Adecuada', color: 'bg-emerald-500' },
    { id: 'PARCIALMENTE ADECUADA', label: 'Parcial', color: 'bg-yellow-500' },
    { id: 'INADECUADA', label: 'Inadecuada', color: 'bg-red-500' },
    { id: 'NO RESPONDIDA', label: 'No respondió', color: 'bg-gray-500' }
  ];
  return (
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
      <div className="flex items-start gap-4">
        <span className="flex-shrink-0 w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-xs font-bold text-white/40">
          P{idx}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-white/80 line-clamp-2 mb-1">{question.indicator}</p>
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{question.capacity}</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "py-2.5 rounded-xl border text-xs font-bold transition-all",
              value === opt.id 
                ? `${opt.color}/20 border-transparent text-white` 
                : "bg-white/5 border-white/10 text-white/30 hover:border-white/20"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
