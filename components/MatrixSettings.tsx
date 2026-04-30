"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, BookOpen, PenTool, Hash, Info, Save, RotateCcw, Trash2 } from 'lucide-react';
import { MATRICES, PERIODOS } from '../lib/matrices_data';
import { cn } from '../lib/utils';
import { useData } from '../lib/DataContext';
import { animate, createTimeline, stagger } from 'animejs';

export default function MatrixSettings() {
  const { getMatrixOverride, updateMatrixOverride, resetMatrixOverride } = useData();
  const [selectedGrado, setSelectedGrado] = useState('1');
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODOS.DIAGNOSTICA);
  const [currentOverride, setCurrentOverride] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Use a small timeout to ensure DOM is ready for animejs
    const timer = setTimeout(() => {
      // Initial entrance animation
      const tl = createTimeline({
        easing: 'spring(1, 80, 10, 0)',
      });

      // Check if elements exist before animating to avoid "No target found"
      if (document.querySelector('.matrix-header')) {
        tl.add('.matrix-header', {
          translateY: [-30, 0],
          opacity: [0, 1],
          duration: 800
        });
      }

      if (document.querySelectorAll('.stats-card').length > 0) {
        tl.add('.stats-card', {
          translateY: [50, 0],
          opacity: [0, 1],
          delay: stagger(150),
          duration: 1000
        }, '-=600');
      }

      if (document.querySelectorAll('.filter-btn').length > 0) {
        tl.add('.filter-btn', {
          scale: [0.9, 1],
          opacity: [0, 1],
          delay: stagger(50),
          duration: 600
        }, '-=800');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    // Load override from context
    const saved = getMatrixOverride(selectedGrado, selectedPeriod);
    
    if (saved) {
      setCurrentOverride(saved);
    } else {
      setCurrentOverride(null);
    }

    // Table rows animation on data change
    const rows = document.querySelectorAll('.matrix-row');
    if (rows.length > 0) {
      animate('.matrix-row', {
        translateX: [20, 0],
        opacity: [0, 1],
        delay: stagger(30, {start: 100}),
        easing: 'out-elastic(1, .8)',
        duration: 800
      });
    }
  }, [selectedGrado, selectedPeriod, mounted]);

  const currentMatrix = currentOverride || MATRICES[selectedGrado];

  const handleAddQuestion = (type) => {
    const isReading = type === 'reading';
    const currentQuestions = currentMatrix.questions;
    const typeQuestions = currentQuestions.filter(q => q.competency.toLowerCase().includes(isReading ? 'lee' : 'escribe'));
    const nextNum = typeQuestions.length + 1;
    
    const newQuestion = {
      id: isReading ? `C1-P ${nextNum}` : `C1-CA${nextNum}-1`,
      competency: isReading ? "Lee diversos tipos de textos escritos en su lengua materna" : "Escribe diversos tipos de textos en su lengua materna",
      capacity: "Nueva Capacidad",
      indicator: "Nuevo Indicador",
      key: isReading ? "A" : "ADECUADA"
    };

    const newQuestions = [...currentQuestions, newQuestion];
    
    setCurrentOverride({
      ...currentMatrix,
      questions: newQuestions,
      readingCount: isReading ? (currentMatrix.readingCount || readingQuestions.length) + 1 : currentMatrix.readingCount,
      writingCount: !isReading ? (currentMatrix.writingCount || writingQuestions.length) + 1 : currentMatrix.writingCount
    });
  };

  const handleUpdateCount = (type, count) => {
    const num = parseInt(count) || 0;
    const isReading = type === 'reading';
    
    const current = currentMatrix;
    const currentQuestions = current.questions || [];
    const typeKey = isReading ? 'lee' : 'escribe';
    const existingOfType = currentQuestions.filter(q => q.competency.toLowerCase().includes(typeKey));
    
    let newQuestions = [...currentQuestions];
    
    if (num > existingOfType.length) {
      const toAdd = num - existingOfType.length;
      for (let i = 0; i < toAdd; i++) {
        const nextNum = existingOfType.length + i + 1;
        newQuestions.push({
          id: isReading ? `C1-P ${nextNum}` : `C1-CA${nextNum}-1`,
          competency: isReading ? "Lee diversos tipos de textos escritos en su lengua materna" : "Escribe diversos tipos de textos en su lengua materna",
          capacity: "Capacidad por definir",
          indicator: "Indicador por definir",
          key: isReading ? "A" : "ADECUADA"
        });
      }
    }
    
    setCurrentOverride({
      ...current,
      questions: newQuestions,
      readingCount: isReading ? num : (current.readingCount || readingQuestions.length),
      writingCount: !isReading ? num : (current.writingCount || writingQuestions.length)
    });
  };

  const handleUpdateKey = (idx, newKey) => {
    const newQuestions = [...currentMatrix.questions];
    newQuestions[idx] = { ...newQuestions[idx], key: newKey.toUpperCase() };
    updateMatrixQuestions(newQuestions);
  };

  const handleUpdateField = (idx, field, value) => {
    const newQuestions = [...currentMatrix.questions];
    newQuestions[idx] = { ...newQuestions[idx], [field]: value };
    updateMatrixQuestions(newQuestions);
  };

  const updateMatrixQuestions = (newQuestions) => {
    setCurrentOverride({
      ...currentMatrix,
      questions: newQuestions
    });
  };

  const saveOverrides = () => {
    updateMatrixOverride(selectedGrado, selectedPeriod, currentOverride);
    alert(`¡Configuración para ${MATRICES[selectedGrado].name} - ${selectedPeriod} guardada!`);
  };

  const resetToDefault = () => {
    if (confirm(`¿Restablecer valores por defecto para ${MATRICES[selectedGrado].name} en el periodo ${selectedPeriod}?`)) {
      resetMatrixOverride(selectedGrado, selectedPeriod);
      setCurrentOverride(null);
    }
  };

  if (!mounted) return null;

  const readingQuestions = currentMatrix.questions.filter(q => q.competency.toLowerCase().includes('lee'));
  const writingQuestions = currentMatrix.questions.filter(q => q.competency.toLowerCase().includes('escribe'));

  const stats = {
    reading: currentMatrix?.readingCount || readingQuestions.length || 0,
    writing: currentMatrix?.writingCount || writingQuestions.length || 0,
    total: (currentMatrix?.readingCount || readingQuestions.length || 0) + (currentMatrix?.writingCount || writingQuestions.length || 0)
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between matrix-header opacity-0">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Settings className="text-brand-primary" /> Módulo Matriz
          </h1>
          <p className="text-white/40">Configure los parámetros de evaluación y claves de respuesta</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={resetToDefault}
            onMouseEnter={(e) => animate(e.currentTarget, {scale: 0.95, duration: 200})}
            onMouseLeave={(e) => animate(e.currentTarget, {scale: 1, duration: 200})}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 text-sm font-bold flex items-center gap-2 transition-all border border-white/10"
          >
            <RotateCcw size={18} /> Restablecer
          </button>
          <button 
            onClick={saveOverrides}
            onMouseEnter={(e) => animate(e.currentTarget, {scale: 1.05, duration: 200})}
            onMouseLeave={(e) => animate(e.currentTarget, {scale: 1, duration: 200})}
            className="px-6 py-2 bg-brand-primary hover:bg-brand-primary/90 rounded-xl text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-brand-primary/20 transition-all"
          >
            <Save size={18} /> Guardar Cambios
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 space-y-4 border-b-4 border-brand-primary stats-card opacity-0">
          <div className="flex items-center gap-3 text-brand-primary">
            <Hash size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Total Items</span>
          </div>
          <div className="text-4xl font-black">{stats.total}</div>
        </div>
        <div className="glass-panel p-6 space-y-4 border-b-4 border-brand-secondary stats-card opacity-0">
          <div className="flex items-center gap-3 text-brand-secondary">
            <BookOpen size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Lectura (Preguntas)</span>
          </div>
          <input 
            type="number" 
            value={stats.reading}
            onChange={(e) => handleUpdateCount('reading', e.target.value)}
            className="text-4xl font-black bg-transparent border-none outline-none w-full text-white"
          />
        </div>
        <div className="glass-panel p-6 space-y-4 border-b-4 border-brand-accent stats-card opacity-0">
          <div className="flex items-center gap-3 text-brand-accent">
            <PenTool size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Escritura (Indicadores)</span>
          </div>
          <input 
            type="number" 
            value={stats.writing}
            onChange={(e) => handleUpdateCount('writing', e.target.value)}
            className="text-4xl font-black bg-transparent border-none outline-none w-full text-white"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit">
          {Object.keys(MATRICES).map(key => (
            <button
              key={key}
              onClick={() => setSelectedGrado(key)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all filter-btn opacity-0",
                selectedGrado === key 
                  ? "bg-brand-primary text-white shadow-lg" 
                  : "text-white/40 hover:text-white/60"
              )}
            >
              {MATRICES[key].name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit">
          {Object.values(PERIODOS).map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all filter-btn opacity-0",
                selectedPeriod === period 
                  ? "bg-brand-secondary text-white shadow-lg" 
                  : "text-white/40 hover:text-white/60"
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h3 className="font-bold flex items-center gap-2">
              <Info size={18} className="text-brand-primary" /> 
              Claves de Respuesta: {currentMatrix.name}
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={() => handleAddQuestion('reading')}
                className="px-3 py-1 bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary text-[10px] font-bold rounded-lg border border-brand-secondary/20 transition-all uppercase"
              >
                + Añadir Pregunta Lectura
              </button>
              <button 
                onClick={() => handleAddQuestion('writing')}
                className="px-3 py-1 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent text-[10px] font-bold rounded-lg border border-brand-accent/20 transition-all uppercase"
              >
                + Añadir Indicador Escritura
              </button>
            </div>
          </div>
          <span className="text-xs text-white/30 italic">Click en los campos para editar</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-brand-background/80 backdrop-blur-md">
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase">Item</th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase">Competencia</th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase">Capacidad</th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase">Indicador</th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase">Clave / Respuesta</th>
                <th className="px-6 py-4 text-xs font-bold text-white/40 uppercase w-10"></th>
              </tr>
            </thead>
            <tbody>
              {currentMatrix.questions.map((q, idx) => {
                const isReading = q.competency.toLowerCase().includes('lee');
                const isWriting = q.competency.toLowerCase().includes('escribe');
                const rIdx = readingQuestions.indexOf(q);
                const wIdx = writingQuestions.indexOf(q);
                
                const isHidden = (isReading && rIdx >= stats.reading) || (isWriting && wIdx >= stats.writing);

                if (isHidden) return null;

                return (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors matrix-row opacity-0">
                    <td className="px-6 py-4 font-mono text-brand-primary font-bold">{q.id}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                        isReading ? "bg-brand-secondary/20 text-brand-secondary" : "bg-brand-accent/20 text-brand-accent"
                      )}>
                        {isReading ? 'Lectura' : 'Escritura'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <textarea 
                        value={q.capacity}
                        onChange={(e) => handleUpdateField(idx, 'capacity', e.target.value)}
                        className="w-full bg-transparent border-none text-sm text-white/60 focus:text-white transition-colors outline-none resize-none overflow-hidden h-10"
                        rows={2}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <textarea 
                        value={q.indicator}
                        onChange={(e) => handleUpdateField(idx, 'indicator', e.target.value)}
                        className="w-full bg-transparent border-none text-sm text-white/60 focus:text-white transition-colors outline-none resize-none overflow-hidden h-10"
                        rows={2}
                      />
                    </td>
                    <td className="px-6 py-4">
                      {isReading ? (
                        <input 
                          type="text"
                          value={q.key}
                          maxLength={1}
                          onChange={(e) => handleUpdateKey(idx, e.target.value)}
                          className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center font-bold text-brand-primary border border-brand-primary/20 text-center uppercase focus:border-brand-primary focus:bg-brand-primary/10 transition-all outline-none"
                        />
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-white/20 uppercase">Rúbrica:</span>
                          <span className="text-[10px] font-bold text-brand-accent uppercase">Ade/Par/Ina</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => {
                          const newQuestions = currentMatrix.questions.filter((_, i) => i !== idx);
                          updateMatrixQuestions(newQuestions);
                        }}
                        className="p-2 text-white/20 hover:text-red-500 transition-colors"
                        title="Eliminar pregunta"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
