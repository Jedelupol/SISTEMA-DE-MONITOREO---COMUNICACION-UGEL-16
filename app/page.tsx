"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Save, GraduationCap, Settings, Bell, Search, Upload, ShieldCheck, User } from 'lucide-react';
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';
import DataEntry from '../components/DataEntry';
import BulkUpload from '../components/BulkUpload';
import AdminManagement from '../components/AdminManagement';
import MatrixSettings from '../components/MatrixSettings';
import { cn } from '../lib/utils';
import { useData } from '../lib/DataContext';


export default function Home() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const { records, isLoading, session, activePeriod, activeYear, logout } = useData();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = session?.role === 'admin';

  const handleLogout = () => {
    logout();
    setActiveModule('dashboard');
  };

  if (!mounted || isLoading) return null;

  if (!session) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-brand-background text-white flex">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 bg-black/20 backdrop-blur-xl flex flex-col fixed inset-y-0 z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
              <GraduationCap size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter leading-tight">SISTEMA DE<br />MONITOREO</h1>
              <span className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em]">UGEL 16 - {activeYear}</span>
            </div>
          </div>

          <nav className="space-y-2">
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Panel de Control" 
              active={activeModule === 'dashboard'} 
              onClick={() => setActiveModule('dashboard')} 
            />
             <NavItem 
              icon={<Save size={20} />} 
              label="Registro Individual" 
              active={activeModule === 'entry'} 
              onClick={() => {
                setActiveModule('entry');
              }} 
            />
            
            {isAdmin ? (
              <>
                <NavItem 
                  icon={<Upload size={20} />} 
                  label="Carga Masiva" 
                  active={activeModule === 'bulk'} 
                  onClick={() => setActiveModule('bulk')} 
                />
                <NavItem 
                  icon={<ShieldCheck size={20} />} 
                  label="Administración" 
                  active={activeModule === 'admin'} 
                  onClick={() => setActiveModule('admin')} 
                />
                <div className="pt-8 pb-4">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-4">Configuración</span>
                </div>
                <NavItem 
                  icon={<Settings size={20} />} 
                  label="Ajustes de Matriz" 
                  active={activeModule === 'matrix'} 
                  onClick={() => setActiveModule('matrix')} 
                />
              </>
            ) : null}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/5">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                <User size={16} />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black truncate">{session.user}</p>
                <p className="text-[10px] text-white/30 truncate">{isAdmin ? 'Administrador' : (session.ie || 'Docente')}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-[10px] font-bold text-red-400 uppercase tracking-widest border border-red-500/20 transition-all"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72">
        {/* Top Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-black/10 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-96 group focus-within:border-brand-primary transition-all">
            <Search size={18} className="text-white/20 group-focus-within:text-brand-primary" />
            <input 
              type="text" 
              placeholder="Buscar estudiante o reporte..." 
              className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-white/20"
            />
          </div>
          <div className="flex items-center gap-6">
            <button className="relative text-white/40 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-brand-primary rounded-full border-2 border-brand-background" />
            </button>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-white">{activePeriod || 'Diagnóstica'} - {activeYear}</p>
                <p className="text-[10px] text-brand-accent font-bold uppercase">Estado: Activo</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-10 pb-24">
          <AnimatePresence mode="wait">
            {activeModule === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Dashboard data={records} />
              </motion.div>
            )}
            {activeModule === 'entry' && (
              <motion.div
                key="entry"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <DataEntry 
                  session={session}
                  onComplete={() => {
                    setActiveModule('dashboard');
                  }} 
                />
              </motion.div>
            )}
            {activeModule === 'bulk' && isAdmin && (
              <motion.div
                key="bulk"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <BulkUpload 
                  session={session}
                  onComplete={() => {
                    setActiveModule('dashboard');
                  }} 
                />
              </motion.div>
            )}
            {activeModule === 'admin' && isAdmin && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <AdminManagement />
              </motion.div>
            )}
            {activeModule === 'matrix' && isAdmin && (
              <motion.div
                key="matrix"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <MatrixSettings />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group",
        active 
          ? "bg-brand-primary text-white shadow-xl shadow-brand-primary/20" 
          : "text-white/40 hover:bg-white/5 hover:text-white"
      )}
    >
      <span className={cn(
        "transition-transform group-hover:scale-110",
        active ? "text-white" : "text-brand-primary/60"
      )}>
        {icon}
      </span>
      {label}
      {active && (
        <motion.div 
          layoutId="activeIndicator"
          className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]" 
        />
      )}
    </button>
  );
}
