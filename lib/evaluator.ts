import { MATRICES } from './matrices_data';

/**
 * Normalizes a string: lowercase, no accents, trimmed, and single spaces.
 */
export function normalizeString(str: string): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/i\.?\s?e\.?\s/gi, "") // Remove variations of "I.E. "
    .replace(/[^a-z0-9\s]/g, "") // Remove non-alphanumeric except spaces
    .replace(/\s+/g, " ") // Collapse multiple spaces to one
    .trim();
}

/**
 * Normalizes competency names for filtering and logic
 * Supports variations like "Lectura", "Comprensin Lectora", "Escritura", "Produccin de Textos", etc.
 */
export function normalizeCompetency(name: string): 'reading' | 'writing' | null {
  const n = normalizeString(name);
  if (!n) return null;

  const readingKeywords = ['lee', 'lectura', 'reading', 'comprension', 'literal', 'inferencial', 'critico'];
  const writingKeywords = ['escribe', 'escritura', 'writing', 'produccion', 'textos'];

  if (readingKeywords.some(key => n.includes(key))) {
    return 'reading';
  }
  
  if (writingKeywords.some(key => n.includes(key))) {
    return 'writing';
  }
  
  return null;
}

/**
 * Normalizes a record's fields to ensure consistency.
 * This is the "Limpieza de Entrada" layer.
 */
export function cleanRecordInput(record: any): any {
  if (!record) return null;
  
  // Clone to avoid mutating original
  const clean = { ...record };

  // Helper to find value by flexible key match
  const getVal = (possibleKeys: string[]) => {
    const foundKey = Object.keys(record).find(k => {
      const normalizedK = normalizeString(k).replace(/\s/g, '');
      return possibleKeys.some(pk => normalizeString(pk).replace(/\s/g, '') === normalizedK);
    });
    return foundKey ? record[foundKey] : undefined;
  };
  
  // 1. Competencia normalization
  const rawComp = getVal(['competencia', 'competency', 'comp']);
  if (rawComp) {
    const comp = normalizeCompetency(String(rawComp));
    if (comp) clean.competencia = comp;
  }
  
  // 2. Grado normalization
  const rawGrado = getVal(['grado', 'grade', 'year']);
  if (rawGrado) {
    const g = String(rawGrado).toLowerCase();
    const match = g.match(/\d+/);
    clean.grado = match ? match[0] : g.replace(/ero|do|er|to|vo|grado/g, '').trim();
  }

  // 3. ID_IE / Institution normalization
  const rawIE = getVal(['id_ie', 'ie', 'institution', 'colegio', 'escuela']);
  if (rawIE) {
    const ieName = String(rawIE).trim().toUpperCase();
    clean.institution = ieName;
    clean.ie = ieName;
    clean.id_ie = ieName;
  }

  // 4. Section normalization
  const rawSection = getVal(['section', 'seccion', 'aula']);
  if (rawSection) {
    clean.section = String(rawSection).toUpperCase().trim();
  }

  // 5. Periodo normalization
  const rawPeriod = getVal(['periodo', 'periodo_evaluacion', 'tipo_evaluacion', 'evaluacion']);
  if (rawPeriod) {
     clean.periodo = String(rawPeriod).toUpperCase().trim();
     clean.tipo_evaluacion = clean.periodo;
  }

  // 6. UGEL normalization
  const rawUGEL = getVal(['ugel', 'ugel_name']);
  if (rawUGEL) {
    clean.ugel = String(rawUGEL).trim().toUpperCase();
  }

  // 7. Student Name normalization
  const rawName = getVal(['studentName', 'student', 'estudiante', 'alumno', 'nombres']);
  if (rawName) {
    clean.studentName = String(rawName).trim().toUpperCase();
  }

  // 8. DNI normalization
  const rawDNI = getVal(['dni', 'DNI_Estudiante', 'documento']);
  if (rawDNI) {
    clean.dni = String(rawDNI).trim().replace(/\s+/g, '');
  }

  return clean;
}


export function evaluateResponse(gradoKey, responses, matrixOverrides = {}) {
  if (!responses) return null;
  
  // Apply Input Cleaning Layer
  const cleanedResponse = cleanRecordInput(responses);
  const activeGradoKey = cleanedResponse.grado || gradoKey;
  
  const periodo = cleanedResponse.periodo || 'DIAGNÓSTICA';
  
  // Start with default matrix
  const matrixData = MATRICES[activeGradoKey];
  if (!matrixData) {
     console.warn(`No matrix found for grade: ${activeGradoKey}`);
     return null;
  }
  
  let matrix = { ...matrixData };

  let readingCountLimit = undefined;
  let writingCountLimit = undefined;

  // Use provided overrides
  const override = matrixOverrides[`${activeGradoKey}_${periodo}`];

  if (override) {
    // Merge questions if they were overridden
    if (override.questions) {
      matrix.questions = override.questions;
    }
    readingCountLimit = override.readingCount;
    writingCountLimit = override.writingCount;
  }

  const results = {
    studentName: cleanedResponse.studentName || cleanedResponse.student || 'Estudiante',
    dni: cleanedResponse.dni || cleanedResponse.DNI_Estudiante || '',
    reading: {
      count: 0,
      correct: 0,
      maxScore: 0,
      score: 0,
      percentage: 0,
      level: 'Inicio',
      capacities: {}
    },
    writing: {
      count: 0,
      score: 0,
      maxScore: 20, // Always vigesimal scale
      vigesimal: 0,  // Note out of 20
      percentage: 0,
      level: 'Inicio',
      gradeStatus: 'PREVIO AL GRADO', // EN EL GRADO or PREVIO AL GRADO
      capacities: {},
      details: [] // Store individual criterion responses
    },
    details: []
  };

  const readingQuestions = matrix.questions.filter(q => normalizeCompetency(q.competency) === 'reading');
  const writingQuestions = matrix.questions.filter(q => normalizeCompetency(q.competency) === 'writing');
  
  const finalReading = readingCountLimit !== undefined 
    ? readingQuestions.slice(0, readingCountLimit) 
    : readingQuestions;
    
  const finalWriting = writingCountLimit !== undefined 
    ? writingQuestions.slice(0, writingCountLimit) 
    : writingQuestions;

  const activeQuestions = [...finalReading, ...finalWriting];

  // Calculate points per writing criterion based on active count
  const writingCount = finalWriting.length;
  const pointsPerCriterion = writingCount > 0 ? 20 / writingCount : 0;

  activeQuestions.forEach((q) => {
    const userResponse = cleanedResponse[q.id];

    
    const competencyCategory = normalizeCompetency(q.competency);
    const isReading = competencyCategory === 'reading';
    const isWriting = competencyCategory === 'writing';

    let score = 0;

    if (isReading) {
      results.reading.count++;
      results.reading.maxScore += 1;
      
      // Robust comparison for reading keys
      const cleanUserResponse = normalizeString(String(userResponse || ''));
      const cleanKey = normalizeString(String(q.key || ''));
      
      const isCorrect = cleanUserResponse === cleanKey || userResponse === q.key;
      
      if (isCorrect) {
        results.reading.correct++;
        results.reading.score += 1;
        score = 1;
      }
      
      const capName = q.capacity || "Capacidad General";
      if (!results.reading.capacities[capName]) {
        results.reading.capacities[capName] = { score: 0, maxScore: 0 };
      }
      results.reading.capacities[capName].maxScore += 1;
      results.reading.capacities[capName].score += score;
    } else if (isWriting) {
      results.writing.count++;
      
      const resp = normalizeString(String(userResponse || ''));
      
      // Scoring: Only ADECUADA gets full points, PARCIALMENTE ADECUADA gets half
      if (resp.includes('adecuada') && !resp.includes('parcial') && !resp.includes('inadecuada')) {
        score = pointsPerCriterion;
      } else if (resp.includes('parcial')) {
        score = pointsPerCriterion / 2;
      } else {
        score = 0;
      }
      
      results.writing.score += score;

      results.writing.details.push({
        id: q.id,
        response: userResponse || '',
        normalizedResponse: resp.toUpperCase(),
        score: score,
        capacity: q.capacity
      });

      const capName = q.capacity || "Capacidad General";
      if (!results.writing.capacities[capName]) {
        results.writing.capacities[capName] = { score: 0, maxScore: 0 };
      }
      results.writing.capacities[capName].maxScore += pointsPerCriterion;
      results.writing.capacities[capName].score += score;
    }

    results.details.push({
      id: q.id,
      userResponse,
      key: q.key,
      score,
      capacity: q.capacity,
      competency: competencyCategory,
      isReading
    });
  });

  // Calculate reading percentages and levels
  if (results.reading.maxScore > 0) {
    results.reading.percentage = Math.round((results.reading.score / results.reading.maxScore) * 100);
    if (results.reading.percentage >= 75) results.reading.level = 'Satisfactorio';
    else if (results.reading.percentage >= 45) results.reading.level = 'Proceso';
    else results.reading.level = 'Inicio';
  }

  // Calculate writing vigesimal score and grade status
  if (writingCount > 0) {
    results.writing.vigesimal = Math.round(results.writing.score * 10) / 10; // Round to 1 decimal
    results.writing.percentage = Math.round((results.writing.vigesimal / 20) * 100);
    
    // Grade status: >= 12 = EN EL GRADO, < 12 = PREVIO AL GRADO
    if (results.writing.vigesimal >= 12) {
      results.writing.gradeStatus = 'EN EL GRADO';
    } else {
      results.writing.gradeStatus = 'PREVIO AL GRADO';
    }

    // Level classification (High Fidelity Looker Colors/Names)
    if (results.writing.vigesimal >= 18) results.writing.level = 'Satisfactorio';
    else if (results.writing.vigesimal >= 14) results.writing.level = 'Logrado';
    else if (results.writing.vigesimal >= 12) results.writing.level = 'Proceso';
    else results.writing.level = 'Inicio';
  }

  return results;
}

/**
 * Gets the distribution of writing criteria (Adecuada, Parcial, Inadecuada)
 */
export function getWritingCriteriaDistribution(records, gradoKey, periodoFilter = null, matrixOverrides = {}) {
  const distribution = {}; // { capacityName: { ADECUADA: 0, PARCIAL: 0, INADECUADA: 0, NR: 0, total: 0 } }

  records.forEach(rec => {
    if (periodoFilter && rec.periodo && rec.periodo !== periodoFilter) return;
    const evalResult = evaluateResponse(gradoKey || rec.grado, rec, matrixOverrides);
    if (evalResult && evalResult.writing.details.length > 0) {
      evalResult.writing.details.forEach(det => {
        const cap = det.capacity || "Otros";
        if (!distribution[cap]) {
          distribution[cap] = { ADECUADA: 0, PARCIAL: 0, INADECUADA: 0, NR: 0, total: 0 };
        }
        
        const resp = det.normalizedResponse;
        if (resp === 'ADECUADA') distribution[cap].ADECUADA++;
        else if (resp === 'PARCIALMENTE ADECUADA') distribution[cap].PARCIAL++;
        else if (resp === 'INADECUADA') distribution[cap].INADECUADA++;
        else distribution[cap].NR++;
        
        distribution[cap].total++;
      });
    }
  });

  return Object.keys(distribution).map(name => {
    const d = distribution[name];
    return {
      name,
      Adecuada: d.total > 0 ? (d.ADECUADA / d.total * 100).toFixed(1) : 0,
      Parcial: d.total > 0 ? (d.PARCIAL / d.total * 100).toFixed(1) : 0,
      Inadecuada: d.total > 0 ? (d.INADECUADA / d.total * 100).toFixed(1) : 0,
      NR: d.total > 0 ? (d.NR / d.total * 100).toFixed(1) : 0
    };
  });
}

/**
 * Gets Ranking of Institutions
 */
export function getIERanking(records, periodoFilter = null) {
  const ranking = {};

  records.forEach(rec => {
    const normalizedPeriod = normalizeString(periodoFilter);
    const recPeriod = normalizeString(rec.tipo_evaluacion || rec.periodo || '');
    if (periodoFilter && normalizedPeriod !== 'todos' && recPeriod !== normalizedPeriod) return;
    
    const ie = rec.institution || 'Sin IE';
    if (!ranking[ie]) {
      ranking[ie] = { name: ie, total: 0, logrados: 0, sumVigesimal: 0, countVigesimal: 0 };
    }
    
    ranking[ie].total++;
    
    // Evaluation Logic
    const evalResult = evaluateResponse(rec.grado, rec);
    if (evalResult) {
      if (evalResult.reading.level === 'Satisfactorio' || evalResult.writing.level === 'Logrado' || evalResult.writing.level === 'Satisfactorio') {
        ranking[ie].logrados++;
      }
      if (evalResult.writing.count > 0) {
        ranking[ie].sumVigesimal += evalResult.writing.vigesimal;
        ranking[ie].countVigesimal++;
      }
    }
  });

  return Object.values(ranking)
    .map((r: any) => ({
      ...r,
      percentage: r.total > 0 ? (r.logrados / r.total * 100).toFixed(1) : "0.0",
      average: r.countVigesimal > 0 ? (r.sumVigesimal / r.countVigesimal).toFixed(1) : "0.0"
    }))
    .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
}


/**
 * Get summary counts for achievement levels (Satisfactorio, Proceso, Inicio, etc.)
 * Optimized to use pre-calculated level if available.
 */
export function getAchievementLevels(allRecords, gradoKey = null, competencyType = 'reading', periodoFilter = null, matrixOverrides = {}) {
  const summary = {
    Satisfactorio: 0,
    Logrado: 0,
    Proceso: 0,
    Inicio: 0,
    total: 0
  };

  if (!allRecords || !Array.isArray(allRecords)) return [];

  allRecords.forEach(rec => {
    // 1. Period Filter (if applicable)
    const normalizedPeriod = normalizeString(periodoFilter);
    const recPeriod = normalizeString(rec.tipo_evaluacion || rec.periodo || '');
    if (periodoFilter && normalizedPeriod !== 'todos' && recPeriod !== normalizedPeriod) return;

    // 2. Determine Level
    let level = null;
    
    // Priority 1: Field specific to competency (from Bulk Upload or previous evaluation)
    const levelField = competencyType === 'reading' ? 'readingLevel' : 'writingLevel';
    level = rec[levelField];

    // Priority 2: Generic level field
    if (!level) level = rec.nivel_logro;

    // Priority 3: Re-evaluate if we have the necessary context
    if (!level) {
      const activeGrado = gradoKey || rec.grado;
      if (activeGrado) {
        const evalResult = evaluateResponse(activeGrado, rec, matrixOverrides);
        if (evalResult && evalResult[competencyType]) {
          level = evalResult[competencyType].level;
        }
      }
    }

    // 3. Increment Summary
    if (level && summary[level] !== undefined) {
      summary[level]++;
      summary.total++;
    } else if (level) {
      // Handle cases where level name might vary slightly
      const upperLevel = level.toUpperCase();
      if (upperLevel === 'SATISFACTORIO') { summary.Satisfactorio++; summary.total++; }
      else if (upperLevel === 'LOGRADO') { summary.Logrado++; summary.total++; }
      else if (upperLevel === 'PROCESO') { summary.Proceso++; summary.total++; }
      else if (upperLevel === 'INICIO') { summary.Inicio++; summary.total++; }
    }
  });

  const order = competencyType === 'writing' 
    ? ['Satisfactorio', 'Logrado', 'Proceso', 'Inicio'] 
    : ['Satisfactorio', 'Proceso', 'Inicio'];

  return order.map(name => ({
    name,
    value: summary[name] || 0,
    percentage: summary.total > 0 ? (((summary[name] || 0) / summary.total) * 100).toFixed(1) : "0.0"
  }));
}

/**
 * Calculates evolution data between two sets of records (e.g. Year 1 vs Year 2)
 */
export function getEvolutionData(recordsP1, recordsP2, competencyType = 'reading') {
  const targetLevel = competencyType === 'reading' ? 'Satisfactorio' : 'Logrado';
  const levelField = competencyType === 'reading' ? 'readingLevel' : 'writingLevel';
  
  const getSatisfactorioPercentage = (records) => {
    if (!records || records.length === 0) return 0;
    const satisfactorioCount = records.filter(r => 
      (r[levelField] === targetLevel) || 
      (r.nivel_logro === targetLevel) ||
      (String(r[levelField]).toUpperCase() === targetLevel.toUpperCase())
    ).length;
    return (satisfactorioCount / records.length) * 100;
  };

  const p1Value = getSatisfactorioPercentage(recordsP1);
  const p2Value = getSatisfactorioPercentage(recordsP2);
  
  // Growth is the points difference (e.g. 10% -> 15% = +5 points)
  const growthAbsolute = p2Value - p1Value;
  
  // Growth relative is the percentage change of the percentage
  const growthRelative = p1Value > 0 ? ((p2Value - p1Value) / p1Value) * 100 : (p2Value > 0 ? 100 : 0);

  return {
    p1Percentage: p1Value.toFixed(1),
    p2Percentage: p2Value.toFixed(1),
    growth: growthAbsolute.toFixed(1), // We'll show points as growth usually in education
    growthRelative: growthRelative.toFixed(1),
    isPositive: growthAbsolute >= 0
  };
}

export function getCapacityAverages(allRecords, gradoKey, competencyType = 'reading', periodoFilter = null, matrixOverrides = {}) {
  const totals = {};

  allRecords.forEach(rec => {
    // 1. Period Filter
    const normalizedPeriod = normalizeString(periodoFilter);
    const recPeriod = normalizeString(rec.tipo_evaluacion || rec.periodo || '');
    if (periodoFilter && normalizedPeriod !== 'todos' && recPeriod !== normalizedPeriod) return;

    // 2. Use specific grade if "ALL" is passed
    const activeGradoKey = (gradoKey === 'ALL' || !gradoKey) ? rec.grado : gradoKey;
    if (!activeGradoKey) return;

    const evalResult = evaluateResponse(activeGradoKey, rec, matrixOverrides);
    if (evalResult && evalResult[competencyType]) {
      const capacities = evalResult[competencyType].capacities;
      Object.keys(capacities).forEach(cap => {
        if (!totals[cap]) totals[cap] = { score: 0, maxScore: 0 };
        totals[cap].score += capacities[cap].score;
        totals[cap].maxScore += capacities[cap].maxScore;
      });
    }
  });

  return Object.keys(totals).map(cap => ({
    name: cap,
    percentage: totals[cap].maxScore > 0 ? ((totals[cap].score / totals[cap].maxScore) * 100).toFixed(1) : "0.0"
  })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
}

export function getStudentPerformanceList(allRecords, gradoKey, matrixOverrides = {}) {
  if (!allRecords || !Array.isArray(allRecords)) return [];
  
  return allRecords
    .filter(rec => rec && (rec.studentName || rec.student)) // Handle different field names
    .map(rec => {
      try {
        const evalResult = evaluateResponse(gradoKey, rec, matrixOverrides);
        if (!evalResult) return null;
        return {
          name: evalResult.studentName || 'Estudiante',
          dni: rec.dni || rec.DNI_Estudiante || '',
          institution: rec.institution || rec.IE || '',
          ugel: rec.ugel || rec.UGEL || '',
          section: rec.section || rec.Seccion || '',
          periodo: rec.periodo || 'DIAGNÓSTICA',
          id_ie: rec.id_ie || '',
          periodo_anual: rec.periodo_anual || '',
          tipo_evaluacion: rec.tipo_evaluacion || '',
          readingLevel: evalResult.reading.level,
          writingLevel: evalResult.writing.level,
          readingScore: `${evalResult.reading.score}/${evalResult.reading.maxScore}`,
          writingScore: `${evalResult.writing.vigesimal}/20`,
          writingGradeStatus: evalResult.writing.gradeStatus,
          readingPercentage: evalResult.reading.percentage,
          writingPercentage: evalResult.writing.percentage
        };
      } catch (e) {
        console.error('Error evaluating record', rec, e);
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Get summary of "En el Grado" vs "Previo al Grado" for writing evaluation
 */
export function getGradeStatusSummary(allRecords, gradoKey, periodoFilter = null, matrixOverrides = {}) {
  const summary = {
    enElGrado: 0,
    previoAlGrado: 0,
    total: 0
  };

  allRecords.forEach(rec => {
    const normalizedPeriod = normalizeString(periodoFilter);
    const recPeriod = normalizeString(rec.tipo_evaluacion || rec.periodo || '');
    if (periodoFilter && normalizedPeriod !== 'todos' && recPeriod !== normalizedPeriod) return;

    const activeGrado = (gradoKey === 'TODOS' || !gradoKey) ? rec.grado : gradoKey;
    const evalResult = evaluateResponse(activeGrado, rec, matrixOverrides);
    if (evalResult && evalResult.writing.count > 0) {
      if (evalResult.writing.gradeStatus === 'EN EL GRADO') {
        summary.enElGrado++;
      } else {
        summary.previoAlGrado++;
      }
      summary.total++;
    }
  });

  return summary;
}

/**
 * Gets performance semaphore status based on records
 * Red: >30% in 'Inicio'
 * Yellow: Interannual growth < 5% or Process > 40%
 * Green: >70% in 'Satisfactorio' or 'Logrado'
 */
export function getPerformanceSemaphore(records, competencyType = 'reading') {
  if (!records || records.length === 0) return 'gray';

  const levels = getAchievementLevels(records, null, competencyType);
  const total = records.length;
  
  const inicio = levels.find(l => l.name === 'Inicio')?.value || 0;
  const proceso = levels.find(l => l.name === 'Proceso')?.value || 0;
  const logrado = (levels.find(l => l.name === 'Satisfactorio')?.value || 0) + 
                  (levels.find(l => l.name === 'Logrado')?.value || 0);

  const inicioPct = (inicio / total) * 100;
  const procesoPct = (proceso / total) * 100;
  const logradoPct = (logrado / total) * 100;

  if (inicioPct > 30) return 'red';
  if (logradoPct > 70) return 'green';
  if (procesoPct > 40) return 'yellow';
  
  return 'blue'; // Normal/Default
}

/**
 * Identifies the capacities with lowest performance for AI feedback
 */
export function getCriticalCapacities(records, gradoKey, competencyType = 'reading', matrixOverrides = {}) {
  const capacities = getCapacityAverages(records, gradoKey, competencyType, null, matrixOverrides);
  return capacities
    .sort((a, b) => parseFloat(a.percentage) - parseFloat(b.percentage))
    .slice(0, 2);
}

/**
 * Groups records by institution, grade, section, and period
 */
export function processRecordsIntoGroups(records) {
  if (!records || !Array.isArray(records)) return [];
  
  const groupMap = {};

  records.forEach(r => {
    const clean = cleanRecordInput(r);
    const key = `${clean.institution || 'Sin IE'}|${clean.grado}|${clean.section}|${clean.periodo}|${clean.periodo_anual || ''}|${clean.tipo_evaluacion || ''}`;
    if (!groupMap[key]) {
      groupMap[key] = {
        ie: clean.institution || 'Sin IE',
        id_ie: clean.id_ie || '',
        grado: clean.grado,
        section: clean.section,
        periodo: clean.periodo,
        periodo_anual: clean.periodo_anual || '',
        tipo_evaluacion: clean.tipo_evaluacion || '',
        count: 0
      };
    }
    groupMap[key].count++;
  });

  return Object.values(groupMap);
}

/**
 * Filters out records belonging to a specific group
 */
export function deleteRecordGroup(records, group) {
  if (!records || !Array.isArray(records)) return [];
  
  return records.filter(r => 
    !( (r.institution === group.ie || (!r.institution && group.ie === 'Sin IE')) && 
       String(r.grado) === String(group.grado) && 
       String(r.section) === String(group.section) && 
       String(r.periodo) === String(group.periodo) &&
       String(r.periodo_anual || '') === String(group.periodo_anual || '') &&
       String(r.tipo_evaluacion || '') === String(group.tipo_evaluacion || '') )
  );
}

/**
 * Gets detailed breakdown by grade and section for the dashboard table
 */
export function getDetailedSectionBreakdown(records, competencyType = 'reading') {
  if (!records || records.length === 0) return [];

  const groups = {};
  const levelField = competencyType === 'reading' ? 'readingLevel' : 'writingLevel';
  const targetLevel = competencyType === 'reading' ? 'Satisfactorio' : 'Logrado';

  records.forEach(r => {
    const key = `${r.grado}-${r.section}`;
    if (!groups[key]) {
      groups[key] = {
        grade: r.grado,
        section: r.section,
        total: 0,
        Satisfactorio: 0,
        Logrado: 0,
        Proceso: 0,
        Inicio: 0
      };
    }
    
    groups[key].total++;
    const level = r[levelField] || r.nivel_logro || evaluateResponse(r.grado, r)[competencyType]?.level || 'Inicio';
    if (groups[key][level] !== undefined) {
      groups[key][level]++;
    }
  });

  return Object.values(groups).map((g: any) => ({
    ...g,
    logradoPercentage: g.total > 0 ? ((g[targetLevel] / g.total) * 100).toFixed(1) : "0.0"
  })).sort((a, b) => {
    if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
    return a.section.localeCompare(b.section);
  });
}

/**
 * Extracts unique filter options from the records
 */
export function getGlobalFilters(records) {
  if (!records || !Array.isArray(records)) {
    return { ies: [], years: [], periods: [], grades: [], sections: [] };
  }

  const ies = new Set();
  const years = new Set();
  const periods = new Set();
  const grades = new Set();
  const sections = new Set();

  records.forEach(r => {
    if (r.institution || r.id_ie) ies.add(JSON.stringify({ id: r.id_ie || '', name: r.institution || 'Sin IE' }));
    if (r.periodo_anual) years.add(String(r.periodo_anual));
    if (r.tipo_evaluacion || r.periodo) periods.add(String(r.tipo_evaluacion || r.periodo).toUpperCase());
    if (r.grado) grades.add(String(r.grado));
    if (r.section) sections.add(String(r.section));
  });

  return {
    ies: Array.from(ies).map((s: string) => JSON.parse(s)).sort((a, b) => a.name.localeCompare(b.name)),
    years: Array.from(years).sort().reverse(),
    periods: Array.from(periods).sort(),
    grades: Array.from(grades).sort(),
    sections: Array.from(sections).sort()
  };
}
/**
 * Generates structured data for a full institutional report
 * Groups data by IE -> Grade -> Section and calculates levels per competency
 */
export function getIEReportData(records, id_ie, periodoFilter = null, matrixOverrides = {}) {
  // Filter records for the specific IE and period
  const institutionRecords = records.filter(r => {
    const r_id_ie = String(r.id_ie || '');
    const r_institution = String(r.institution || r.IE || '');
    const search_id = normalizeString(String(id_ie));
    
    // Use normalized comparison for IE matching
    const matchIE = normalizeString(r_id_ie) === search_id || 
                  normalizeString(r_institution) === search_id ||
                  normalizeString(r_id_ie).includes(search_id) ||
                  normalizeString(r_institution).includes(search_id);

    const normalizedPeriod = normalizeString(periodoFilter);
    const recPeriod = normalizeString(r.tipo_evaluacion || r.periodo || '');
    const matchPeriod = (periodoFilter && normalizedPeriod !== 'todos') ? (recPeriod === normalizedPeriod) : true;
    
    return matchIE && matchPeriod;
  });
  
  if (institutionRecords.length === 0) return null;

  const report = {
    ieName: institutionRecords[0]?.institution || institutionRecords[0]?.IE || 'Institución Educativa',
    ugel: institutionRecords[0]?.ugel || institutionRecords[0]?.UGEL || 'UGEL 16',
    periodo: periodoFilter || 'Consolidado Anual',
    totalStudents: institutionRecords.length,
    grades: []
  };

  // Group by grade
  const gradeMap = {};
  institutionRecords.forEach(r => {
    const gKey = r.grado;
    if (!gradeMap[gKey]) {
      gradeMap[gKey] = {
        grado: gKey,
        sections: {}
      };
    }
    
    const sKey = r.section || r.Seccion || 'Única';
    if (!gradeMap[gKey].sections[sKey]) {
      gradeMap[gKey].sections[sKey] = {
        section: sKey,
        records: []
      };
    }
    
    gradeMap[gKey].sections[sKey].records.push(r);
  });

  // Process and sort grades
  report.grades = Object.keys(gradeMap).sort().map(gKey => {
    const gradeData = gradeMap[gKey];
    
    // Process and sort sections
    const sections = Object.keys(gradeData.sections).sort().map(sKey => {
      const sectionData = gradeData.sections[sKey];
      
      // Si no hay niveles precalculados, evaluamos en tiempo real para asegurar que el reporte no salga en blanco
      const processedRecords = sectionData.records.map(r => {
        const evalRes = evaluateResponse(gKey, r, matrixOverrides);
        return {
          ...r,
          readingLevel: evalRes?.reading?.level || 'Inicio',
          writingLevel: evalRes?.writing?.level || 'Inicio'
        };
      });

      return {
        section: sectionData.section,
        count: sectionData.records.length,
        reading: getAchievementLevels(processedRecords, gKey, 'reading', periodoFilter, matrixOverrides),
        writing: getAchievementLevels(processedRecords, gKey, 'writing', periodoFilter, matrixOverrides),
        readingCaps: getCapacityAverages(processedRecords, gKey, 'reading', periodoFilter, matrixOverrides),
        writingCaps: getCapacityAverages(processedRecords, gKey, 'writing', periodoFilter, matrixOverrides)
      };
    });

    return {
      grado: gKey,
      sections
    };
  });

  return report;
}

/**
 * Aggregates results for a set of records, calculating levels for both competencies.
 */
export function aggregateResults(records, level = 'UGEL') {
  if (!records || records.length === 0) return null;
  
  const reading = getAchievementLevels(records, null, 'reading');
  const writing = getAchievementLevels(records, null, 'writing');
  
  const percentages = {
    Satisfactorio: reading.find(l => l.name === 'Satisfactorio')?.percentage || "0.0",
    Logrado: writing.find(l => l.name === 'Logrado')?.percentage || "0.0",
    Proceso: reading.find(l => l.name === 'Proceso')?.percentage || "0.0",
    Inicio: reading.find(l => l.name === 'Inicio')?.percentage || "0.0",
  };
  
  return {
    reading,
    writing,
    percentages,
    total: records.length,
    level
  };
}

/**
 * Identifies students at risk (those with 'Inicio' level in reading or writing)
 */
export function getStudentsAtRisk(allRecords, matrixOverrides = {}) {
  if (!allRecords || !Array.isArray(allRecords)) return [];
  
  return allRecords
    .map(rec => {
      try {
        const evalResult = evaluateResponse(rec.grado, rec, matrixOverrides);
        if (!evalResult) return null;
        
        // At risk if either reading or writing is in 'Inicio'
        // Also consider 'Proceso' if it's a very low score
        const isReadingInicio = evalResult.reading.level === 'Inicio';
        const isWritingInicio = evalResult.writing.level === 'Inicio';
        
        const atRisk = isReadingInicio || isWritingInicio;
        
        if (!atRisk) return null;

        return {
          name: evalResult.studentName || 'Estudiante',
          dni: rec.dni || rec.DNI_Estudiante || '',
          grado: rec.grado,
          section: rec.section || rec.Seccion || rec.seccion || '',
          institution: rec.institution || rec.IE || 'Sin IE',
          readingScore: `${evalResult.reading.score}/${evalResult.reading.maxScore}`,
          writingScore: `${evalResult.writing.vigesimal}/20`,
          readingLevel: evalResult.reading.level,
          writingLevel: evalResult.writing.level,
          readingPercentage: evalResult.reading.percentage,
          writingPercentage: evalResult.writing.percentage,
          riskLevel: (isReadingInicio && isWritingInicio) ? 'Crítico' : 'Alto'
        };
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Gets high level KPIs for the dashboard
 */
export function getDashboardKPIs(records, competencyType = 'reading') {
  let totalEvaluated = records.length;
  let totalCorrect = 0;
  let totalMax = 0;
  let sumPercentage = 0;

  records.forEach(r => {
    const evalResult = evaluateResponse(r.grado, r);
    if (evalResult) {
      if (competencyType === 'reading') {
        totalCorrect += evalResult.reading.score;
        totalMax += evalResult.reading.maxScore;
        sumPercentage += evalResult.reading.percentage;
      } else {
        totalCorrect += evalResult.writing.vigesimal;
        totalMax += 20;
        sumPercentage += evalResult.writing.percentage;
      }
    }
  });

  return {
    totalEvaluated,
    totalCorrect: Math.round(totalCorrect * 10) / 10,
    totalMax,
    averageAcierto: totalMax > 0 ? ((totalCorrect / totalMax) * 100).toFixed(1) : "0.0"
  };
}

/**
 * Gets detailed capacity stats for comparison charts
 */
export function getDetailedCapacityStats(records, gradoKey, competencyType = 'reading', matrixOverrides = {}) {
  const totals = {}; // { capacityName: { score: 0, maxScore: 0, count: 0 } }

  records.forEach(rec => {
    const activeGradoKey = (gradoKey === 'TODOS' || !gradoKey) ? rec.grado : gradoKey;
    const evalResult = evaluateResponse(activeGradoKey, rec, matrixOverrides);
    
    if (evalResult && evalResult[competencyType]) {
      const capacities = evalResult[competencyType].capacities;
      Object.keys(capacities).forEach(cap => {
        if (!totals[cap]) totals[cap] = { score: 0, maxScore: 0, count: 0 };
        totals[cap].score += capacities[cap].score;
        totals[cap].maxScore += capacities[cap].maxScore;
        totals[cap].count++;
      });
    }
  });

  return Object.keys(totals).map(name => ({
    name,
    percentage: totals[name].maxScore > 0 ? (totals[name].score / totals[name].maxScore * 100).toFixed(1) : 0,
    score: totals[name].score.toFixed(1),
    maxScore: totals[name].maxScore.toFixed(1)
  })).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
}


/**
 * Processes all statistics in a single pass over the records.
 * Highly optimized for large datasets.
 */
export function processAllStats(records, gradoKey = 'TODOS', matrixOverrides = {}) {
  if (!records || records.length === 0) return {
    readingLevels: [],
    writingLevels: [],
    readingCaps: [],
    writingCaps: [],
    riskStudents: [],
    kpis: { reading: { averageAcierto: "0.0" }, writing: { averageAcierto: "0.0" } },
    total: 0
  };

  const total = records.length;
  const readingCounts = { Satisfactorio: 0, Proceso: 0, Inicio: 0 };
  const writingCounts = { Logrado: 0, Proceso: 0, Inicio: 0 };
  const readingCapTotals = {};
  const writingCapTotals = {};
  const riskStudents = [];
  const gradeStatus = { enElGrado: 0, previoAlGrado: 0, total: 0 };
  
  let r_totalCorrect = 0, r_totalMax = 0;
  let w_totalCorrect = 0, w_totalMax = 0;

  records.forEach(rec => {
    const activeGradoKey = (gradoKey === 'TODOS' || !gradoKey) ? rec.grado : gradoKey;
    const evalResult = evaluateResponse(activeGradoKey, rec, matrixOverrides);
    
    if (evalResult) {
      // Reading Stats
      const rLevel = evalResult.reading.level;
      if (readingCounts.hasOwnProperty(rLevel)) readingCounts[rLevel]++;
      r_totalCorrect += evalResult.reading.score;
      r_totalMax += evalResult.reading.maxScore;
      
      Object.keys(evalResult.reading.capacities).forEach(cap => {
        if (!readingCapTotals[cap]) readingCapTotals[cap] = { score: 0, maxScore: 0 };
        readingCapTotals[cap].score += evalResult.reading.capacities[cap].score;
        readingCapTotals[cap].maxScore += evalResult.reading.capacities[cap].maxScore;
      });

      // Writing Stats
      const wLevel = evalResult.writing.level;
      if (writingCounts.hasOwnProperty(wLevel)) writingCounts[wLevel]++;
      w_totalCorrect += evalResult.writing.vigesimal;
      w_totalMax += 20;

      Object.keys(evalResult.writing.capacities).forEach(cap => {
        if (!writingCapTotals[cap]) writingCapTotals[cap] = { score: 0, maxScore: 0 };
        writingCapTotals[cap].score += evalResult.writing.capacities[cap].score;
        writingCapTotals[cap].maxScore += evalResult.writing.capacities[cap].maxScore;
      });

      // Grade Status (Writing specific)
      if (evalResult.writing.count > 0) {
        gradeStatus.total++;
        if (evalResult.writing.gradeStatus === 'EN EL GRADO') {
          gradeStatus.enElGrado++;
        } else {
          gradeStatus.previoAlGrado++;
        }
      }

      // Risk Assessment
      const isReadingInicio = rLevel === 'Inicio';
      const isWritingInicio = wLevel === 'Inicio';
      if (isReadingInicio || isWritingInicio) {
        riskStudents.push({
          name: evalResult.studentName || 'Estudiante',
          dni: rec.dni || rec.DNI_Estudiante || '',
          grado: rec.grado,
          section: rec.section || rec.Seccion || rec.seccion || '',
          institution: rec.institution || rec.IE || 'Sin IE',
          readingLevel: rLevel,
          writingLevel: wLevel,
          riskLevel: (isReadingInicio && isWritingInicio) ? 'Crítico' : 'Alto'
        });
      }
    }
  });

  const COLORS = {
    Satisfactorio: '#10b981', // green-500
    Logrado: '#10b981',       // green-500
    Proceso: '#f59e0b',       // amber-500
    Inicio: '#ef4444',        // red-500
    Default: '#6b7280'        // gray-500
  };

  return {
    total,
    readingLevels: [
      { name: 'Satisfactorio', value: readingCounts.Satisfactorio, color: COLORS.Satisfactorio, percentage: (readingCounts.Satisfactorio/total*100).toFixed(1) },
      { name: 'Proceso', value: readingCounts.Proceso, color: COLORS.Proceso, percentage: (readingCounts.Proceso/total*100).toFixed(1) },
      { name: 'Inicio', value: readingCounts.Inicio, color: COLORS.Inicio, percentage: (readingCounts.Inicio/total*100).toFixed(1) }
    ],
    writingLevels: [
      { name: 'Logrado', value: writingCounts.Logrado, color: COLORS.Logrado, percentage: (writingCounts.Logrado/total*100).toFixed(1) },
      { name: 'Proceso', value: writingCounts.Proceso, color: COLORS.Proceso, percentage: (writingCounts.Proceso/total*100).toFixed(1) },
      { name: 'Inicio', value: writingCounts.Inicio, color: COLORS.Inicio, percentage: (writingCounts.Inicio/total*100).toFixed(1) }
    ],
    readingCaps: Object.keys(readingCapTotals).map(name => ({
      name,
      percentage: readingCapTotals[name].maxScore > 0 ? (readingCapTotals[name].score / readingCapTotals[name].maxScore * 100).toFixed(1) : 0
    })).sort((a, b) => b.percentage - a.percentage),
    writingCaps: Object.keys(writingCapTotals).map(name => ({
      name,
      percentage: writingCapTotals[name].maxScore > 0 ? (writingCapTotals[name].score / writingCapTotals[name].maxScore * 100).toFixed(1) : 0
    })).sort((a, b) => b.percentage - a.percentage),
    riskStudents,
    gradeStatus,
    kpis: {
      reading: { averageAcierto: r_totalMax > 0 ? ((r_totalCorrect / r_totalMax) * 100).toFixed(1) : "0.0" },
      writing: { averageAcierto: w_totalMax > 0 ? ((w_totalCorrect / w_totalMax) * 100).toFixed(1) : "0.0" }
    }
  };
}
