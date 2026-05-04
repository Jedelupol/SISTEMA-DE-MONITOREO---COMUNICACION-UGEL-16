import { evaluateResponse, normalizeCompetency, normalizeString } from '../lib/evaluator';
import { MATRICES } from '../lib/matrices_data';

async function test() {
  console.log("--- Testing Normalization ---");
  console.log("normalizeString('Lectura '):", normalizeString('Lectura '));
  console.log("normalizeCompetency(' Comprensión Lectora '):", normalizeCompetency(' Comprensión Lectora '));
  console.log("normalizeCompetency('Producción de Textos'):", normalizeCompetency('Producción de Textos'));

  const grado = '1';
  const responses = {
    periodo: 'DIAGNÓSTICA',
    dni: '12345678',
    'C1-P1': 'A',
    'C1-P2': 'B',
    'CA1': 'ADECUADA',
    'CA2': 'PARCIALMENTE ADECUADA'
  };

  console.log("\n--- Testing Evaluation ---");
  const result = evaluateResponse(grado, responses);
  if (result) {
    console.log("Reading Level:", result.reading.level);
    console.log("Writing Level:", result.writing.level);
    console.log("Writing Vigesimal:", result.writing.vigesimal);
    console.log("Reading Count:", result.reading.count);
    console.log("Writing Count:", result.writing.count);
  } else {
    console.log("Evaluation failed (null result)");
  }
}

test();
