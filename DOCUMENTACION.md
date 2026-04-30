# Documentacin Tcnica - SISTEMA DE MONITOREO

## Visin General
SISTEMA DE MONITOREO es una plataforma de gestin y anǭlisis de mtricas educativas diseada para la UGEL 16 - Barranca. Permite a los docentes ingresar resultados de evaluaciones de lectura y escritura, y a los administradores analizar el progreso institucional.

## Stack Tecnolgico
- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS + Custom Design System
- **Animaciones**: Anime.js v4 + Framer Motion
- **Iconos**: Lucide React
- **Procesamiento de Datos**: XLSX (Hoja de cǭlculo)
- **Persistencia**: LocalStorage (Prototipo)

## Estructura de Datos
Los datos se almacenan en `eval_records` dentro de LocalStorage con la siguiente estructura:
```json
{
  "studentName": "Nombre",
  "dni": "12345678",
  "grado": "1",
  "section": "A",
  "periodo": "DIAGNOSTICA",
  "institution": "Nombre IE",
  "P1": "A",
  "P2": "B",
  "timestamp": "ISO-Date"
}
```

## Sistema de Animaciones
Se utiliza **Anime.js v4** para orquestar entradas coreografiadas y efectos visuales de alta fidelidad.
- **Timelines**: Sincronizacin de mltiples elementos.
- **Staggering**: Revelado progresivo de listas y cuadrculas.
- **Spring Physics**: Movimientos naturales basados en fsica.

## Roles de Usuario
- **ADMIN**: Acceso total, carga de datos masiva via Excel, ajustes de matriz.
- **TEACHER**: Ingreso de datos manual y visualizacin de resultados de su seccin.
