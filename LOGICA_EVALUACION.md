# Lógica de Evaluación - Lectoexpres@ 3.0

Esta es la lógica implementada actualmente en el sistema, basada en los estándares de evaluación diagnóstica de la DRELP.

## 1. Evaluación de Lectura (Competencia: Lee diversos tipos de textos...)

La evaluación de lectura se basa en el conteo de respuestas correctas (claves) y se expresa en porcentajes.

### Niveles de Logro
| Rango de Porcentaje | Nivel de Logro |
| :--- | :--- |
| **75% a 100%** | **Satisfactorio** |
| **45% a 74%** | **Proceso** |
| **0% a 44%** | **Inicio** |

*Cada pregunta de lectura equivale a 1 punto.*

---

## 2. Evaluación de Escritura (Competencia: Escribe diversos tipos de textos...)

La evaluación de escritura utiliza una **escala vigesimal (0 a 20)** para permitir un análisis más fino de la calidad textual.

### Calificación por Criterio
Cada criterio evaluado (adecuación, coherencia, cohesión, etc.) se califica según la respuesta del docente en el Excel o formulario:

*   **ADECUADA (AD):** Puntaje máximo por criterio (`20 / n° de criterios`).
*   **PARCIALMENTE ADECUADA (PA):** 50% del puntaje máximo del criterio.
*   **INADECUADA / NO RESPONDE:** 0 puntos.

### Clasificación por Puntaje Vigesimal
| Puntaje (0-20) | Nivel de Logro | Estado en el Grado |
| :--- | :--- | :--- |
| **18.0 - 20.0** | **Satisfactorio** | **EN EL GRADO** |
| **14.0 - 17.9** | **Logrado** | **EN EL GRADO** |
| **12.0 - 13.9** | **Proceso** | **EN EL GRADO** |
| **0.0 - 11.9** | **Inicio** | **PREVIO AL GRADO** |

> [!IMPORTANT]
> Un estudiante se considera **"EN EL GRADO"** en escritura si alcanza un puntaje mínimo de **12.0**.

---

## 3. Soporte para Múltiples Periodos

El sistema ahora soporta matrices diferenciadas para:
*   **DIAGNÓSTICA**
*   **INICIO (Primer Hito)**
*   **PROCESO (Segundo Hito)**
*   **SALIDA (Evaluación Final)**

Cada periodo puede tener un número distinto de preguntas (ej. 17 en Inicio, 20 en Salida) y claves diferentes, las cuales se configuran en el módulo de "Ajustes de Matriz".
