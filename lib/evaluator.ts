import { MATRICES } from './matrices_data';

export function evaluateResponse(gradoKey, responses, matrixOverrides = {}) {
  if (!responses) return null;
  
  const periodo = responses.periodo || 'DIAGNÓSTICA';
  
  // Start with default matrix
  let matrix = { ...MATRICES[gradoKey] };
  if (!matrix) return null;

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
  
  const finalReading = readingCountLimit !== undefined ? readingQuestions.slice(0, readingCountLimit) : readingQuestions;
  const finalWriting = writingCountLimit !== undefined ? writingQuestions.slice(0, writingCountLimit) : writingQuestions;

  const activeQuestions = [...finalReading, ...finalWriting];

  // Calculate points per writing criterion based on active count
  const writingCount = finalWriting.length;
  const pointsPerCriterion = writingCount > 0 ? 20 / writingCount : 0;

  activeQuestions.forEach((q) => {
    const userResponse = responses[q.id];
    
    const isReading = q.competency.toLowerCase().includes('lee');
    const isWriting = q.competency.toLowerCase().includes('escribe');

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

    // Level classification
    if (results.writing.vigesimal >= 18) results.writing.level = 'Satisfactorio';
    else if (results.writing.vigesimal >= 14) results.writing.level = 'Logrado';
    else if (results.writing.vigesimal >= 12) results.writing.level = 'Proceso';
    else results.writing.level = 'Inicio';
  }

  return results;
}

export function getAchievementLevels(allRecords, gradoKey, competencyType = 'reading', periodoFilter = null, matrixOverrides = {}) {
  const summary = {
    Satisfactorio: 0,
    Proceso: 0,
    Inicio: 0,
    total: 0
  };

  // For writing, include Logrado level
  if (competencyType === 'writing') {
    summary['Logrado'] = 0;
  }

  allRecords.forEach(rec => {
    if (periodoFilter && rec.periodo && rec.periodo !== periodoFilter) return;

    const evalResult = evaluateResponse(gradoKey, rec, matrixOverrides);
    if (evalResult) {
      const level = evalResult[competencyType].level;
      if (summary[level] !== undefined) {
        summary[level]++;
      }
      summary.total++;
    }
  });

  if (summary.total === 0) return [];

  return Object.keys(summary)
    .filter(k => k !== 'total')
    .map(name => ({
      name,
      value: summary[name],
      percentage: summary.total > 0 ? ((summary[name] / summary.total) * 100).toFixed(1) : "0.0"
    }));
}

export function getCapacityAverages(allRecords, gradoKey, competencyType = 'reading', periodoFilter = null, matrixOverrides = {}) {
  const totals = {};

  allRecords.forEach(rec => {
    if (periodoFilter && rec.periodo && rec.periodo !== periodoFilter) return;

    const evalResult = evaluateResponse(gradoKey, rec, matrixOverrides);
    if (evalResult) {
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
  }));
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
    if (periodoFilter && rec.periodo && rec.periodo !== periodoFilter) return;

    const evalResult = evaluateResponse(gradoKey, rec, matrixOverrides);
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
 * Groups records by institution, grade, section, and period
 */
export function processRecordsIntoGroups(records) {
  if (!records || !Array.isArray(records)) return [];
  
  const groupMap = {};

  records.forEach(r => {
    const key = `${r.institution || 'Sin IE'}|${r.grado}|${r.section}|${r.periodo}`;
    if (!groupMap[key]) {
      groupMap[key] = {
        ie: r.institution || 'Sin IE',
        grado: r.grado,
        section: r.section,
        periodo: r.periodo,
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
       String(r.periodo) === String(group.periodo) )
  );
}
