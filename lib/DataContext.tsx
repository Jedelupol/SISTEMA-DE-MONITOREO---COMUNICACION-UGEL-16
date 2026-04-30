"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import initialRecords from './data.json';
import { processRecordsIntoGroups, deleteRecordGroup } from './evaluator';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  // Core Records State
  const [records, setRecords] = useState(initialRecords);
  const [session, setSession] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Administrative Settings
  const [activePeriod, setActivePeriod] = useState('DIAGNÓSTICA');
  const [activeYear, setActiveYear] = useState('2026');
  const [institutionInfo, setInstitutionInfo] = useState({
    ieName: '',
    director: '',
    specialist: ''
  });

  // Matrix Overrides (stored as an object keyed by `${grado}_${period}`)
  const [matrixOverrides, setMatrixOverrides] = useState({});

  const groups = useMemo(() => processRecordsIntoGroups(records), [records]);

  // Initialize from localStorage
  useEffect(() => {
    // 1. Records
    const savedRecords = localStorage.getItem('eval_records');
    if (savedRecords) {
      setRecords(JSON.parse(savedRecords));
    } else {
      localStorage.setItem('eval_records', JSON.stringify(initialRecords));
      setRecords(initialRecords);
    }

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
    records: session?.role === 'admin' ? records : records.filter(r => String(r.id_ie) === String(session?.id_ie)),
    groups: session?.role === 'admin' ? groups : groups.filter(g => String(g.id_ie) === String(session?.id_ie)),
    isLoading,
    session,
    teachers: session?.role === 'admin' ? teachers : teachers.filter(t => t.ie === session?.ie),
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
