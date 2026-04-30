import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Simulates a PDF export of the technical sheet
 */
export async function exportToPDF(metadata) {
  const { grade, period, year, institution, studentsCount } = metadata;
  
  // In a real implementation, we would use jspdf and html2canvas here
  const content = `
    INFORME TÉCNICO PEDAGÓGICO - UGEL 16
    ------------------------------------
    Institución: ${institution}
    Grado: ${grade}°
    Periodo: ${period}
    Año: ${year}
    Estudiantes Evaluados: ${studentsCount}
    
    Este documento contiene el análisis detallado de niveles de logro
    y capacidades críticas identificadas para la intervención pedagógica.
    Generado automáticamente por Lectoexpres@ 3.0.
  `;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Informe_Tecnico_${grade}_${period}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
