"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { processRecordsIntoGroups, deleteRecordGroup } from './evaluator';

const DataContext = createContext(null);

function generateSeedData() {
  const names = [
    "ALVARADO RUIZ, Maria Jose",
    "CASTILLO VEGA, Luis Angel",
    "DIAZ MORALES, Fatima",
    "ESTRADA QUISPE, Jorge",
    "FLORES CAMPOS, Sofia",
    "GARCIA LOPEZ, Ricardo",
    "HUAMAN SOTO, Andrea",
    "LEON ROJAS, Carlos",
    "MENDOZA PAZ, Camila",
    "ORTIZ VILLA, Sebastian"
  ];
  
  const options = ['A', 'B', 'C', 'D'];
  const writingOptions = ['ADECUADA', 'PARCIAL', 'INADECUADA'];
  
  return names.map((name, idx) => {
    const responses: any = {
      studentName: name,
      grado: '2',
      section: 'A',
      ugel: 'UGEL 16: Barranca',
      institution: '20532 STMA. VIRGEN DEL CARMEN',
      timestamp: new Date().toISOString()
    };
    
    // Lectura (approx 20 questions for grade 2)
    for (let i = 1; i <= 20; i++) {
      responses[`C${i}`] = options[Math.floor(Math.random() * 4)];
    }
    
    // Escritura (7 indicators)
    responses['C2-CA1-1'] = writingOptions[Math.floor(Math.random() * 2)];
    responses['C2-CA1-2'] = writingOptions[Math.floor(Math.random() * 2)];
    responses['C2-CA1-3'] = writingOptions[Math.floor(Math.random() * 2)];
    responses['C2-CA2-1'] = writingOptions[Math.floor(Math.random() * 3)];
    responses['C2-CA2-2'] = writingOptions[Math.floor(Math.random() * 3)];
    responses['C2-CA3-1'] = writingOptions[Math.floor(Math.random() * 3)];
    responses['C2-CA3-2'] = writingOptions[Math.floor(Math.random() * 3)];
    
    return responses;
  });
}

export function DataProvider({ children }) {
  // Core Records State
  const [records, setRecords] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Session & Auth State
  const [session, setSession] = useState(null);
  const [teachers, setTeachers] = useState([]);

  // Administrative Settings
  const [activePeriod, setActivePeriod] = useState('Diagnóstica');
  const [activeYear, setActiveYear] = useState('2026');
  const [institutionInfo, setInstitutionInfo] = useState({
    ieName: '',
    director: '',
    specialist: ''
  });

  // Matrix Overrides (stored as an object keyed by `${grado}_${period}`)
  const [matrixOverrides, setMatrixOverrides] = useState({});

  // Initialize from localStorage
  useEffect(() => {
    // 1. Records
    const savedRecords = localStorage.getItem('eval_records');
    let initialRecords = [];
    if (savedRecords) {
      try {
        initialRecords = JSON.parse(savedRecords);
      } catch (e) {
        console.error("Failed to parse eval_records", e);
        initialRecords = generateSeedData();
      }
    } else {
      initialRecords = generateSeedData();
      localStorage.setItem('eval_records', JSON.stringify(initialRecords));
    }
    setRecords(initialRecords);
    setGroups(processRecordsIntoGroups(initialRecords));

    // 2. Session
    const savedSession = localStorage.getItem('edu_session');
    if (savedSession) setSession(JSON.parse(savedSession));

    // 3. Teachers
    const savedTeachers = localStorage.getItem('edu_teachers');
    if (savedTeachers) setTeachers(JSON.parse(savedTeachers));

    // 4. Settings
    const savedPeriod = localStorage.getItem('active_period');
    if (savedPeriod) setActivePeriod(savedPeriod);

    const savedYear = localStorage.getItem('active_year');
    if (savedYear) setActiveYear(savedYear);

    const savedInfo = localStorage.getItem('edu_institution_info');
    if (savedInfo) setInstitutionInfo(JSON.parse(savedInfo));

    // 5. Matrix Overrides (migrate from individual keys or load unified object)
    const savedOverrides = localStorage.getItem('edu_matrix_overrides');
    if (savedOverrides) {
      setMatrixOverrides(JSON.parse(savedOverrides));
    } else {
      // Basic migration: look for common keys if we want to be nice
      // For now, just start empty or load on demand if needed.
      // We'll use a unified object from now on.
    }

    setIsLoading(false);
  }, []);

  // Persistence Effects
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('eval_records', JSON.stringify(records));
      setGroups(processRecordsIntoGroups(records));
    }
  }, [records, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('edu_teachers', JSON.stringify(teachers));
  }, [teachers, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('active_period', activePeriod);
  }, [activePeriod, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('active_year', activeYear);
  }, [activeYear, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('edu_institution_info', JSON.stringify(institutionInfo));
  }, [institutionInfo, isLoading]);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('edu_matrix_overrides', JSON.stringify(matrixOverrides));
  }, [matrixOverrides, isLoading]);

  // Actions
  const login = useCallback((user) => {
    setSession(user);
    localStorage.setItem('edu_session', JSON.stringify(user));
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    localStorage.removeItem('edu_session');
  }, []);

  const addRecords = useCallback((newRecords) => {
    setRecords(prev => [...prev, ...newRecords]);
  }, []);

  const updateRecords = useCallback((updatedRecords) => {
    setRecords(updatedRecords);
  }, []);

  const deleteGroup = useCallback((group) => {
    setRecords(prev => deleteRecordGroup(prev, group));
  }, []);

  const clearAllData = useCallback((mode) => {
    if (mode === 'EVAL') {
      setRecords([]);
      localStorage.setItem('eval_records', JSON.stringify([]));
    } else if (mode === 'ELIMINAR') {
      // 1. Reset all states immediately
      setRecords([]);
      setTeachers([]);
      setSession(null);
      setActivePeriod('Diagnóstica');
      setActiveYear('2026');
      setInstitutionInfo({ ieName: '', director: '', specialist: '' });
      setMatrixOverrides({});
      
      // 2. Clear localStorage
      localStorage.clear();
      
      // 3. Re-initialize essential session storage keys to empty to avoid null issues
      localStorage.setItem('eval_records', JSON.stringify([]));
      localStorage.setItem('edu_teachers', JSON.stringify([]));
      localStorage.setItem('edu_institution_info', JSON.stringify({ ieName: '', director: '', specialist: '' }));
    }
  }, []);

  const updateMatrixOverride = useCallback((grado, period, override) => {
    setMatrixOverrides(prev => ({
      ...prev,
      [`${grado}_${period}`]: override
    }));
  }, []);

  const resetMatrixOverride = useCallback((grado, period) => {
    setMatrixOverrides(prev => {
      const newOverrides = { ...prev };
      delete newOverrides[`${grado}_${period}`];
      return newOverrides;
    });
  }, []);

  const getMatrixOverride = useCallback((grado, period) => {
    return matrixOverrides[`${grado}_${period}`] || null;
  }, [matrixOverrides]);

  const value = {
    records,
    groups,
    isLoading,
    session,
    teachers,
    activePeriod,
    activeYear,
    institutionInfo,
    matrixOverrides,
    login,
    logout,
    addRecords,
    updateRecords,
    deleteGroup,
    clearAllData,
    setTeachers,
    setActivePeriod,
    setActiveYear,
    setInstitutionInfo,
    updateMatrixOverride,
    resetMatrixOverride,
    getMatrixOverride
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
