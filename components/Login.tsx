"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, User, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { animate, createTimeline, stagger } from 'animejs';

import { useData } from '../lib/DataContext';

export default function Login() {
  const { login, teachers } = useData();
  const [dni, setDni] = useState('');
  const [role, setRole] = useState('teacher'); // 'teacher' | 'admin'
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      // 1. Check for Admin
      if (role === 'admin') {
        if (dni === 'ADMIN123') {
          const adminUser = { user: 'Administrador', role: 'admin', ie: 'UGEL 16' };
          login(adminUser);
          return;
        } else {
          setError('Credenciales de administrador inválidas');
          setIsLoading(false);
          return;
        }
      }

      // 2. Check for Teacher in the context list
      const teacher = teachers.find(t => t.dni === dni);

      if (teacher) {
        const teacherUser = { 
          user: teacher.nombre, 
          dni: teacher.dni,
          role: 'teacher', 
          ie: teacher.ie,
          timestamp: new Date().toISOString()
        };
        login(teacherUser);
      } else {
        setError('DNI no encontrado en el padrón de docentes. Contacte al administrador.');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-panel p-8 space-y-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent" />
        
        <div className="text-center space-y-2">
          <div className="w-48 h-20 bg-brand-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-primary/10 overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain opacity-80" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.innerHTML = '<div class="text-brand-primary font-black text-xl">LOGO</div>'; }} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SISTEMA DE MONITOREO</h1>
          <p className="text-white/40 text-sm">Ingrese sus credenciales para continuar</p>
        </div>

        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
          <button 
            onClick={() => { setRole('teacher'); setError(''); }}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
              role === 'teacher' ? "bg-brand-primary text-white shadow-lg" : "text-white/40 hover:text-white/60"
            )}
          >
            <User size={14} /> Docente
          </button>
          <button 
            onClick={() => { setRole('admin'); setError(''); }}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
              role === 'admin' ? "bg-brand-secondary text-white shadow-lg" : "text-white/40 hover:text-white/60"
            )}
          >
            <ShieldCheck size={14} /> Administrador
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1">
              {role === 'admin' ? 'Código de Acceso' : 'DNI del Docente'}
            </label>
            <div className="relative group">
              <input 
                type={role === 'admin' ? 'password' : 'text'}
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder={role === 'admin' ? '••••••••' : 'Ingrese su DNI'}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white focus:outline-none focus:border-brand-primary transition-all focus:bg-white/10"
                required
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-xs"
              >
                <AlertCircle size={14} /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={isLoading || !dni}
            className="w-full py-4 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 rounded-xl font-bold text-white shadow-xl shadow-brand-primary/20 transition-all flex items-center justify-center gap-2 group"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>Ingresar al Sistema <LogIn size={18} className="group-hover:translate-x-1 transition-transform" /></>
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-[10px] text-white/20">
            Seguimiento Pedagógico v1.2 • © 2026
          </p>
        </div>
      </motion.div>
    </div>
  );
}
