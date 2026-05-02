import { MATRICES } from './matrices_data';

export function evaluateResponse(gradoKey, responses, matrixOverrides = {}) {
  if (!responses) return null;
  
  const periodo = responses.periodo || 'DIAGNÓSTICA';
  
  // Start with default matrix
  const matrixData = MATRICES[gradoKey];
  if (!matrixData) return null;
  
  let matrix = { ...matrixData };

  let readingCountLimit = undefined;
  let writingCountLimit = undefined;

  // Use provided overrides
  const override = matrixOverrides[`${gradoKey}_${periodo}`];

  if (override) {
    // Merge questions if they were overridden
    if (override.questions) {
      matrix.questions = override.questions;
    }
    readingCountLimit = override.readingCount;
    writingCountLimit = override.writingCount;
  }

  const results = {
    studentName: responses.studentName || responses.student || 'Estudiante',
    dni: responses.dni || responses.DNI_Estudiante || '',
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

  const readingQuestions = matrix.questions.filter(q => q.competency.toLowerCase().includes('lee'));
  const writingQuestions = matrix.questions.filter(q => q.competency.toLowerCase().includes('escribe'));
  
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
    const userResponse = responses[q.id];
    
    const competencyCategory = normalizeCompetency(q.competency);
    const isReading = competencyCategory === 'reading';
    const isWriting = competencyCategory === 'writing';

    let score = 0;
    let isCorrect = false;

    if (isReading) {
      results.reading.count++;
      results.reading.maxScore += 1;
      isCorrect = userResponse === q.key;
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
      
      const resp = String(userResponse || '').toUpperCase().trim();
      
      // Scoring: Only ADECUADA gets full points, PARCIALMENTE ADECUADA gets half
      // INADECUADA and NO RESPONDIDA get 0 but still display their content
      if (resp === 'ADECUADA' || resp === 'AD' || resp === 'ADECUADO') {
        score = pointsPerCriterion;
      } else if (resp === 'PARCIALMENTE ADECUADA' || resp === 'PARCIAL' || resp === 'PA' || resp === 'PARCIALMENTE ADECUADO') {
        score = pointsPerCriterion / 2;
      } else {
        // INADECUADA, NO RESPONDIDA, etc. = 0 points
        score = 0;
      }
      
      results.writing.score += score;

      // Store writing criterion detail with its text response
      results.writing.details.push({
        id: q.id,
        response: userResponse || '',
        normalizedResponse: resp,
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
      competency: q.competency,
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
    if (periodoFilter && rec.periodo && rec.periodo !== periodoFilter) return;
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
    const normalizedPeriod = String(periodoFilter || '').toUpperCase();
    const recPeriod = String(rec.tipo_evaluacion || rec.periodo || '').toUpperCase();
    if (periodoFilter && recPeriod !== normalizedPeriod) return;

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
    const normalizedPeriod = String(periodoFilter || '').toUpperCase();
    const recPeriod = String(rec.periodo || rec.tipo_evaluacion || '').toUpperCase();
    if (periodoFilter && recPeriod !== normalizedPeriod) return;

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
    const normalizedPeriod = String(periodoFilter || '').toUpperCase();
    const recPeriod = String(rec.periodo || rec.tipo_evaluacion || '').toUpperCase();
    if (periodoFilter && recPeriod !== normalizedPeriod) return;

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
    const key = `${r.institution || 'Sin IE'}|${r.grado}|${r.section}|${r.periodo}|${r.periodo_anual || ''}|${r.tipo_evaluacion || ''}`;
    if (!groupMap[key]) {
      groupMap[key] = {
        ie: r.institution || 'Sin IE',
        id_ie: r.id_ie || '',
        grado: r.grado,
        section: r.section,
        periodo: r.periodo,
        periodo_anual: r.periodo_anual || '',
        tipo_evaluacion: r.tipo_evaluacion || '',
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
    const search_id = String(id_ie);
    
    const matchIE = r_id_ie === search_id || r_institution === search_id;
    const matchPeriod = periodoFilter ? (
      String(r.periodo || '').toUpperCase() === String(periodoFilter).toUpperCase() || 
      String(r.tipo_evaluacion || '').toUpperCase() === String(periodoFilter).toUpperCase()
    ) : true;
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
      
      // Determine field names by checking first record
      const firstRec = sectionData.records[0];
      // Normalización robusta para evitar reportes en blanco
      const readingField = Object.keys(firstRec).find(k => normalizeCompetency(k) === 'reading') || 'readingLevel';
      const writingField = Object.keys(firstRec).find(k => normalizeCompetency(k) === 'writing') || 'writingLevel';

      // Si no hay niveles precalculados, evaluamos en tiempo real para asegurar que el reporte no salga en blanco
      const processedRecords = sectionData.records.map(r => {
        if (!r[readingField] || !r[writingField]) {
          const evalRes = evaluateResponse(gKey, r, matrixOverrides);
          return {
            ...r,
            readingLevel: r[readingField] || evalRes?.reading?.level || 'Inicio',
            writingLevel: r[writingField] || evalRes?.writing?.level || 'Inicio'
          };
        }
        return r;
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
 * Normalizes competency names for filtering and logic
 * Supports variations like "Lectura", "Comprensión Lectora", "Escritura", "Producción de Textos", etc.
 */
export function normalizeCompetency(name: string): 'reading' | 'writing' | null {
  if (!name) return null;
  // Normalización exhaustiva: minúsculas, sin acentos, sin espacios extra
  const n = name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  
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

