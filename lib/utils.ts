import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import JSZip from "jszip"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import { getIEReportData, getGlobalFilters, getAchievementLevels, aggregateResults, normalizeString } from "./evaluator"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a DOM element to a base64 image
 */
export async function chartToImage(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return null;
  
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0f172a', // Match dashboard theme
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true,
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error(`Error capturing chart ${elementId}:`, err);
    return null;
  }
}

/**
 * Draws a professional header on a jsPDF instance
 */
function drawPDFHeader(doc, title, subtitle, infoLines = []) {
  const primaryColor = [30, 27, 75]; // #1e1b4b
  const accentColor = [79, 70, 229]; // #4f46e5 (Indigo 600)
  const margin = 20;

  // Background Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 45, 'F');
  
  // Decorative line (Bottom border of header)
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(2);
  doc.line(0, 45, 210, 45);

  // Logo / Branding Circle
  doc.setFillColor(255, 255, 255, 0.1); // Subtle white overlay
  doc.circle(25, 22, 10, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.8);
  doc.circle(25, 22, 10, 'S');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text("UGEL", 25, 20, { align: 'center' });
  doc.setFontSize(11);
  doc.text("16", 25, 25, { align: 'center' });
  
  // Title Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 42, 18);
  
  // Subtitle Section
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text(subtitle, 42, 24);

  // Institution / Info Bar
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2], 0.2);
  doc.rect(42, 28, 150, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  // Dynamic Info Lines in Header (Right aligned)
  let xOffset = 188;
  let yOffset = 33;
  
  // We reverse them to show important ones first if needed, or just print
  infoLines.forEach((line, idx) => {
    if (idx === 0) {
      // First line (usually IE Name) is special
      doc.text(line, 45, 33);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(line, xOffset, yOffset, { align: 'right' });
      yOffset += 4;
    }
  });
}

/**
 * Draws a footer on all pages of a jsPDF instance
 */
function drawPDFFooter(doc, footerText) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${footerText} - Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
  }
}

/**
 * Exports a single institutional report as PDF
 */
export async function exportToPDF(metadata, charts = {}) {
  const { institution, grade, period, year, totalStudents, competency } = metadata;
  const doc = new jsPDF();
  
  const title = "INFORME TÉCNICO PEDAGÓGICO";
  const subtitle = `UGEL 16 BARRANCA - SISTEMA DE MONITOREO v5.0`;
  const infoLines = [
    `Institución: ${institution}`,
    `Competencia: ${competency === 'reading' ? 'COMPRENSIÓN LECTORA' : 'ESCRITURA'}`,
    `Periodo: ${period} ${year} | Estudiantes: ${totalStudents} | Grado: ${grade === 'ALL' ? 'Todos' : grade + '°'}`
  ];

  drawPDFHeader(doc, title, subtitle, infoLines);

  // Body Sections
  let yPos = 60;
  doc.setTextColor(30, 27, 75);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("ANÁLISIS DE RESULTADOS", 20, yPos);
  
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.5);
  doc.line(20, yPos + 2, 190, yPos + 2);
  
  yPos += 12;

  // Charts
  if (charts.evolution) {
    doc.setFontSize(11);
    doc.text("Evolución del Rendimiento", 20, yPos);
    try {
      doc.addImage(charts.evolution, 'PNG', 20, yPos + 5, 170, 75);
      yPos += 90;
    } catch (e) {
      console.error("Error adding evolution image to PDF", e);
      yPos += 10;
    }
  }
  
  if (charts.distribution) {
    if (yPos > 200) { doc.addPage(); yPos = 20; if(yPos === 20) { /* If page added, redraw small header or just continue */ } }
    doc.setFontSize(11);
    doc.text("Distribución por Niveles de Logro", 20, yPos);
    try {
      doc.addImage(charts.distribution, 'PNG', 20, yPos + 5, 100, 75);
      
      // Legend
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text("Leyenda de Niveles:", 130, yPos + 20);
      doc.setFillColor(16, 185, 129); doc.rect(130, yPos + 25, 4, 4, 'F'); doc.text("Satisfactorio", 136, yPos + 28);
      doc.setFillColor(99, 102, 241); doc.rect(130, yPos + 32, 4, 4, 'F'); doc.text("Logrado", 136, yPos + 35);
      doc.setFillColor(245, 158, 11); doc.rect(130, yPos + 39, 4, 4, 'F'); doc.text("Proceso", 136, yPos + 42);
      doc.setFillColor(239, 68, 68); doc.rect(130, yPos + 46, 4, 4, 'F'); doc.text("Inicio", 136, yPos + 49);
      
      yPos += 90;
    } catch (e) {
      console.error("Error adding distribution image to PDF", e);
    }
  }

  drawPDFFooter(doc, `Generado el ${new Date().toLocaleDateString()} - Evalúa-IA`);
  
  const fileName = `Informe_${institution.replace(/\s+/g, '_')}_${period}_${year}.pdf`;
  doc.save(fileName);
  return doc;
}

/**
 * Generates a ZIP with individual reports for all IEs
 */
export const generateZipOfReports = async (
  institutions: any[],
  allRecords: any[],
  activePeriod: string,
  activeYear: string,
  matrixOverrides: any,
  onProgress: (progress: number) => void
) => {
  const zip = new JSZip();

  for (let i = 0; i < institutions.length; i++) {
    const ie = institutions[i];
    onProgress(Math.round(((i + 1) / institutions.length) * 100));
    
    const reportData = getIEReportData(allRecords, ie.id || ie.nombre, activePeriod, matrixOverrides);
    if (!reportData) continue;

    const doc = new jsPDF();
    const margin = 20;
    
    const title = "INFORME TÉCNICO INSTITUCIONAL";
    const subtitle = `UGEL 16 BARRANCA - MONITOREO PEDAGÓGICO ESTRATÉGICO`;
    const infoLines = [
      `Periodo: ${activePeriod} ${activeYear}`,
      `Estudiantes: ${reportData.totalStudents}`
    ];

    drawPDFHeader(doc, title, subtitle, infoLines);

    // Header Content
    doc.setTextColor(30, 27, 75);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(reportData.ieName, margin, 65);
    
    let y = 75;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Este informe consolida los resultados de desempeño en las competencias de Lectura y Escritura.`, margin, y);
    
    y += 15;

    // Visual Summary (Drawn Chart)
    doc.setFont('helvetica', 'bold');
    doc.text("RESUMEN DE DESEMPEÑO POR NIVELES", margin, y);
    y += 8;

    // We'll draw a horizontal bar for the whole IE
    const overallReading = getAchievementLevels(allRecords.filter(r => String(r.id_ie) === String(ie.id) || r.institution === ie.name), null, 'reading', activePeriod);
    
    let barX = margin;
    const barWidth = 170;
    const barHeight = 10;
    
    overallReading.forEach(level => {
      const p = parseFloat(level.percentage);
      if (p === 0) return;
      
      const segmentWidth = (p / 100) * barWidth;
      let color = [200, 200, 200];
      if (level.name === 'Satisfactorio') color = [16, 185, 129];
      else if (level.name === 'Proceso') color = [245, 158, 11];
      else if (level.name === 'Inicio') color = [239, 68, 68];
      
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(barX, y, segmentWidth, barHeight, 'F');
      
      // Legend text
      doc.setFontSize(7);
      doc.setTextColor(50, 50, 50);
      if (segmentWidth > 15) {
        doc.text(`${p}%`, barX + segmentWidth / 2, y + barHeight + 4, { align: 'center' });
      }
      
      barX += segmentWidth;
    });

    y += 25;

    // Table
    doc.setTextColor(30, 27, 75);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("DETALLE POR GRADO Y SECCIÓN", margin, y);
    
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 2, 190, y + 2);
    
    y += 10;

    // Table Header
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, 170, 8, 'F');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text("GRADO / SECCIÓN", margin + 2, y + 5.5);
    doc.text("CANT.", margin + 55, y + 5.5);
    doc.text("LECTURA (SAT.)", margin + 75, y + 5.5);
    doc.text("ESCRITURA (LOG.)", margin + 115, y + 5.5);
    doc.text("SEMAFORO", margin + 145, y + 5.5);
    y += 12;

    reportData.grades.forEach(g => {
      if (y > 250) { doc.addPage(); y = 30; }
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 27, 75);
      doc.setFontSize(9);
      doc.text(`GRADO: ${g.grado}`, margin, y);
      y += 6;

      g.sections.forEach(s => {
        if (y > 270) { doc.addPage(); y = 30; }
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        
        doc.text(`Sección "${s.section}"`, margin + 2, y);
        doc.text(`${s.count}`, margin + 57, y);
        
        const readSat = s.reading.find(l => l.name === 'Satisfactorio')?.percentage || 0;
        const writLog = s.writing.find(l => l.name === 'Logrado' || l.name === 'Satisfactorio')?.percentage || 0;
        
        doc.text(`${readSat}%`, margin + 85, y);
        doc.text(`${writLog}%`, margin + 125, y);
        
        // Simple colored circle for semaphore
        let semColor = [16, 185, 129]; // Green
        if (readSat < 40) semColor = [239, 68, 68]; // Red
        else if (readSat < 70) semColor = [245, 158, 11]; // Yellow
        
        doc.setFillColor(semColor[0], semColor[1], semColor[2]);
        doc.circle(margin + 155, y - 1, 2, 'F');
        
        y += 6;
      });
      y += 4;
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, y - 2, 190, y - 2);
    });

    drawPDFFooter(doc, `Reporte Institucional - UGEL 16 - ${activeYear}`);

    const pdfBlob = doc.output('blob');
    const safeName = reportData.ieName.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    zip.file(`REPORTE_${safeName}.pdf`, pdfBlob);
  }

  const zipContent = await zip.generateAsync({ type: "blob" });
  
  // Custom saveAs implementation since file-saver is missing
  const url = URL.createObjectURL(zipContent);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Reportes_Institucionales_${activeYear}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
/**
 * Genera un PDF institucional con una página por grado
 */
export const generateInstitutionalPDF = async (ieName: string, records: any[]) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  // Extract unique grades from records or use a more complete default set
  const grades = [...new Set(records.map(r => r.grado))].sort();
  
  if (grades.length === 0) {
    console.error("No records found for IE", ieName);
    return;
  }

  const normIEName = normalizeString(ieName);

  for (let i = 0; i < grades.length; i++) {
    const grade = grades[i];
    const normGrade = String(grade).replace(/ero|do|er|to|vo|grado/g, '').trim();
    
    // Filtro flexible y normalizado para evitar reportes vacíos
    const gradeRecords = records.filter(r => {
      const r_grado = String(r.grado || '').replace(/ero|do|er|to|vo|grado/g, '').trim();
      if (r_grado !== normGrade) return false;

      const r_ie = normalizeString(r.id_ie || r.ie || r.institution || '');
      return r_ie === normIEName || r_ie.includes(normIEName);
    });
    
    if (gradeRecords.length === 0) continue; // Skip grades with no data for this specific IE
    
    if (i > 0 && doc.getNumberOfPages() > 0) doc.addPage();
    
    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`REPORTE INSTITUCIONAL - ${grade}`, 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`I.E. ${ieName}`, 105, 25, { align: 'center' });

    // Bloque Lectura
    renderCompetencyBlock(doc, 'LECTURA', gradeRecords, 45);
    
    // Bloque Escritura
    renderCompetencyBlock(doc, 'ESCRITURA', gradeRecords, 150);
  }
  
  doc.save(`Reporte_Institucional_${ieName.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Genera un PDF detallado de un grado desglosando por secciones
 */
export const generateDetailedGradePDF = async (ieName: string, grade: string, records: any[]) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const sections = [...new Set(records.map(r => r.section || r.seccion || 'Única'))].sort();
  
  sections.forEach((section, idx) => {
    if (idx > 0) doc.addPage();
    const sectionRecords = records.filter(r => (r.section || r.seccion || 'Única') === section);
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`${grade} Sección "${section}"`, 105, 20, { align: 'center' });
    
    renderCompetencyBlock(doc, 'LECTURA', sectionRecords, 40);
    renderCompetencyBlock(doc, 'ESCRITURA', sectionRecords, 140);
  });
  
  doc.save(`Reporte_Grado_${grade}_${ieName.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Genera un reporte de aula específico
 */
export const generateSectionPDF = async (ieName: string, grade: string, section: string, records: any[]) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`REPORTE DE AULA: ${grade} "${section}"`, 105, 20, { align: 'center' });
  
  renderCompetencyBlock(doc, 'LECTURA', records, 40);
  renderCompetencyBlock(doc, 'ESCRITURA', records, 140);
  
  doc.save(`Reporte_Aula_${grade}_${section}.pdf`);
};

import { normalizeCompetency } from './evaluator';

const renderCompetencyBlock = (doc: jsPDF, title: string, data: any[], yPos: number) => {
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`COMPETENCIA: ${title}`, 20, yPos);
  
  const compType = normalizeCompetency(title);

  const stats = aggregateResults(data, 'SECCION'); // aggregateResults already uses getAchievementLevels internally

  if (!stats || !stats[compType] || stats[compType].length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("No se registraron datos para esta competencia en este grupo.", 25, yPos + 10);
    return;
  }

  const compStats = stats[compType];
  
  compStats.forEach((lvl, i) => {
    const val = parseFloat(lvl.percentage);
    const label = lvl.name;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`${label}: ${val}%`, 30 + (i * 50), yPos + 10);
    
    // Progress bar
    let color = [200, 200, 200];
    if (label === 'Satisfactorio' || label === 'Logrado') color = [16, 185, 129];
    else if (label === 'Proceso') color = [245, 158, 11];
    else if (label === 'Inicio') color = [239, 68, 68];
    
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(30 + (i * 50), yPos + 12, Math.max(val * 0.4, 1), 4, 'F');
  });
};

