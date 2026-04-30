# Fix: Error de Import en animejs v4.x

## Problema

Al intentar construir el proyecto Next.js, se producía el error:

```
Export timeline doesn't exist in target module
Export default doesn't exist in target module
```

El código fuente intentaba importar animejs así:
```jsx
import { animate, stagger, timeline } from 'animejs';
```

## Análisis

### Causa raíz

El proyecto estaba escrito para **animejs v3.x**, pero está instalado **animejs v4.3.6**.

En v3.x existía un export default que incluía todas las funciones (`anime.timeline()`, `anime.stagger()`, etc.), pero en v4.x no existe tal re-export.

### Exports reales en animejs v4.x

Verificado en `node_modules/animejs/dist/modules/`:

| Módulo | Export real | Path de import correcto |
|--------|------------|----------------------|
| `animejs/animation` | `animate` (función) | `import { animate } from 'animejs/animation'` |
| `animejs/timeline` | `Timeline` (clase) | `import { Timeline } from 'animejs/timeline'` |
| `animejs/utils` | `stagger` (función) | `import { stagger } from 'animejs/utils'` |

## Solución Implementada

### 1. MatrixSettings.tsx

**Antes (error):**
```jsx
import { animate, stagger, timeline } from 'animejs';
```

**Después (corregido):**
```jsx
import { animate } from 'animejs/animation';
import { Timeline } from 'animejs/timeline';
import { stagger } from 'animejs/utils';
```

Además, cambiar el uso de `timeline()` al constructor:
```jsx
// Antes
const tl = timeline({ easing: 'spring(1, 80, 10, 0)' });

// Después
const tl = new Timeline({ easing: 'spring(1, 80, 10, 0)' });
```

### 2. Login.tsx

**Antes (error):**
```jsx
import { animate } from 'animejs';
```

**Después (corregido):**
```jsx
import { animate } from 'animejs/animation';
```

### 3. AdminManagement.tsx

**Antes (error):**
```jsx
import { animate, stagger } from 'animejs';
```

**Después (corregido):**
```jsx
import { animate } from 'animejs/animation';
import { stagger } from 'animejs/utils';
```

## Fecha de fix

28 de Abril 2026