"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

import { processRecordsIntoGroups, deleteRecordGroup, cleanRecordInput } from './evaluator';
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  writeBatch,
  orderBy,
  onSnapshot
} from 'firebase/firestore';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  // Core Records State
  const [records, setRecords] = useState([]);
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

  // Load Initial Session & Settings from Firestore
  useEffect(() => {
    // 1. Session (Session stays in localStorage for auth persistence)
    const savedSession = localStorage.getItem('edu_session');
    if (savedSession) setSession(JSON.parse(savedSession));

    // 2. Config Listener (Consolidated into registros_ugel16 as requested)
    const configRef = doc(db, "registros_ugel16", "__config__");
    const unsubConfig = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.activePeriod) setActivePeriod(data.activePeriod);
        if (data.activeYear) setActiveYear(data.activeYear);
        if (data.institutionInfo) setInstitutionInfo(data.institutionInfo);
        if (data.matrixOverrides) setMatrixOverrides(data.matrixOverrides);
        if (data.teachers) setTeachers(data.teachers);
      }
    });

    return () => {
      unsubConfig();
    };
  }, []);

  /**
   * Fetches records from Firestore, filtered by Institution ID (id_ie)
   */
  const fetchRecords = useCallback(async (id_ie?: string) => {
    if (!id_ie && session?.role !== 'admin') {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const recordsCol = collection(db, "registros_ugel16");
      let q;
      
      if (session?.role === 'admin' && !id_ie) {
         q = query(recordsCol);
      } else {
         q = query(recordsCol, where("id_ie", "==", String(id_ie)));
      }

      const fetchedRecords = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return cleanRecordInput({
          firebaseId: doc.id,
          ...data
        });
      });

      // Client-side sorting: newest first (descending)
      fetchedRecords.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      setRecords(fetchedRecords);
      console.log(`Fetched ${fetchedRecords.length} records for IE: ${id_ie}`);
    } catch (error) {
      console.error("Error fetching records from Firebase:", error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.role]);

  // Real-time Records Listener from Firestore
  useEffect(() => {
    if (!session) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const recordsCol = collection(db, "registros_ugel16");
    let q;
    
    if (session.role === 'admin') {
      q = query(recordsCol);
    } else if (session.id_ie) {
      q = query(recordsCol, where("id_ie", "==", String(session.id_ie)));
    } else {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedRecords = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return cleanRecordInput({
          firebaseId: doc.id,
          ...data
        });
      });

      // Client-side sorting: newest first (descending)
      fetchedRecords.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      setRecords(fetchedRecords);
      setIsLoading(false);
      console.log(`Real-time update: ${fetchedRecords.length} records loaded.`);
    }, (error) => {
      console.error("Error with Firestore snapshot:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [session]);

  // Persistence Helper for Settings
  const saveGlobalSetting = useCallback(async (updates: any) => {
    try {
      const configRef = doc(db, "registros_ugel16", "__config__");
      await setDoc(configRef, updates, { merge: true });
    } catch (error) {
      console.error("Error saving global setting:", error);
    }
  }, []);

  // Actions
  const login = useCallback((user) => {
    setSession(user);
    localStorage.setItem('edu_session', JSON.stringify(user));
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    localStorage.removeItem('edu_session');
  }, []);

  const addRecords = useCallback(async (newRecords) => {
    // Note: Massive uploads should use the BulkUpload component's batch logic
    // This is for smaller individual additions
    try {
      const recordsCol = collection(db, "registros_ugel16");
      const timestamp = new Date().toISOString();
      
      const cleanedRecords = newRecords.map(rec => cleanRecordInput(rec));
      
      const additions = cleanedRecords.map(rec => {
        return addDoc(recordsCol, {
          ...rec,
          timestamp
        });
      });
      
      await Promise.all(additions);
      
      // Refresh local state with cleaned records
      setRecords(prev => [...prev, ...cleanedRecords]);
    } catch (error) {
      console.error("Error adding records to Firebase:", error);
    }
  }, []);

  const updateRecords = useCallback(async (updatedRecords) => {
    // This is expensive for massive updates, use with caution
    setRecords(updatedRecords);
    // Ideally we should update individual docs in Firestore here
  }, []);

  const deleteGroup = useCallback(async (group) => {
    try {
      const recordsCol = collection(db, "registros_ugel16");
      const q = query(
        recordsCol, 
        where("id_ie", "==", String(group.id_ie)),
        where("grado", "==", String(group.grado)),
        where("section", "==", String(group.section)),
        where("periodo", "==", String(group.periodo))
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      setRecords(prev => deleteRecordGroup(prev, group));
    } catch (error) {
      console.error("Error deleting group from Firebase:", error);
    }
  }, []);

  const clearAllData = useCallback(async (mode) => {
    if (mode === 'EVAL') {
      setRecords([]);
    } else if (mode === 'ELIMINAR') {
      setRecords([]);
      setTeachers([]);
      setSession(null);
      setActivePeriod('DIAGNÓSTICA');
      setActiveYear('2026');
      setInstitutionInfo({ ieName: '', director: '', specialist: '' });
      setMatrixOverrides({});
      localStorage.removeItem('edu_session');
      // Full reset would involve deleting Firestore docs, but we keep them for safety here
    }
  }, []);

  const updateMatrixOverride = useCallback((grado, period, override) => {
    const newOverrides = {
      ...matrixOverrides,
      [`${grado}_${period}`]: override
    };
    setMatrixOverrides(newOverrides);
    saveGlobalSetting({ matrixOverrides: newOverrides });
  }, [matrixOverrides, saveGlobalSetting]);

  const resetMatrixOverride = useCallback((grado, period) => {
    const newOverrides = { ...matrixOverrides };
    delete newOverrides[`${grado}_${period}`];
    setMatrixOverrides(newOverrides);
    saveGlobalSetting({ matrixOverrides: newOverrides });
  }, [matrixOverrides, saveGlobalSetting]);

  const getMatrixOverride = useCallback((grado, period) => {
    return matrixOverrides[`${grado}_${period}`] || null;
  }, [matrixOverrides]);

  const value = {
    records, // Already filtered in useEffect
    groups,
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
    fetchRecords,
    updateRecords,
    deleteGroup,
    clearAllData,
    updateMatrixOverride,
    resetMatrixOverride,
    getMatrixOverride,
    // Add specific setters that push to Firestore
    setTeachers: async (val) => {
      // For massive teacher updates, this is just local state
      // In a real app, we'd iterate and setDocs
      setTeachers(val);
    },
    setActivePeriod: (val) => {
      setActivePeriod(val);
      saveGlobalSetting({ activePeriod: val });
    },
    setActiveYear: (val) => {
      setActiveYear(val);
      saveGlobalSetting({ activeYear: val });
    },
    setInstitutionInfo: (val) => {
      setInstitutionInfo(val);
      saveGlobalSetting({ institutionInfo: val });
    }
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

