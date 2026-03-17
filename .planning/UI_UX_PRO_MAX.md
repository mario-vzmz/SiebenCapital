# UI/UX Pro Max - Reglas de Diseño y Contrato

## Contrato de Diseño (Design Contract)
Como Agente/Coder en este proyecto, me comprometo bajo este contrato estricto a que **NINGÚN componente o vista generada podrá carecer de los estándares Pro-Max de Calidad**. Todo código de interfaz (React 19 + Tailwind) debe cumplir obligatoriamente los tres pilares:

1. **Accesibilidad (A11y)**: Elementos interactivos navegables por teclado, con estados `focus-visible` apropiados (el HTML base ya confiesa `outline: 1px solid #7C5CFF`), y atributos `aria-*` siempre que falte semántica nativa.
2. **Consistencia Visual**: Empleo estricto de la paleta definida en el proyecto (`sieben`, `operator-bg`, `operator-card`, etc.) y alineación geométrica coherente (uso de flex/grid gaps). Prohibida la invención arbitraria de colores raw si hay variables o temas pre-existentes de Tailwind.
3. **Performance y Estabilidad (Zero Layout Shift)**: Absolutamente ninguna animación o estado (EJ. _hover_ con `scale` exagerado o bordes crudos añadidos dinámicamente) debe causar re-layout a los elementos vecinos ("tirones"). 

---

## Mejores Prácticas Accionables (React 19 + Tailwind v4)

### 1. Elementos Iconográficos y Gráficos
* ❌ **Cero Emojis para UI**: Estrictamente prohibido usar emojis (ej. 🎨, 🚀, ⚙️) como iconos o representaciones de acciones en la interfaz del usuario.
* ✅ **Estándar SVG**: Utilizar incondicionalmente `<LucideIcon />` importados de `lucide-react` para cualquier iconografía, o en su defecto SVG crudo.
* ✅ **Geometría Fija**: Los iconos llevarán proporciones estandarizadas (por ejemplo, `w-5 h-5` o `w-6 h-6`). No se tolerarán variaciones de tamaño erráticas sin justificación de jerarquía de UI.

### 2. Micro-Interacciones (Interactive Feedback)
* ✅ **Cursor Apropiado**: Añadir `cursor-pointer` (o derivados nativos) a cualquier tarjeta interactiva o bloque clickeable, prohibido forzar al usuario a adivinar si algo es un enlace.
* ✅ **Hover Feedback Claro**: Otorgar feedback visual visible al hacer "hover" en los elementos (ejemplo: iluminar ligeramente el fondo `hover:bg-white/5` o destacar el borde con el color brand `hover:border-sieben-light`).
* ✅ **Transiciones Suaves (Smoothness)**: Aplicar incondicionalmente la familia `transition-all duration-200 ease-in-out` (o `transition-colors`) a todos los botones e inputs. Cambios de estado inmediatos (cero milisegundos) están prohibidos.

### 3. Modo Oscuro (Brutalism & Deep UI) y Contraste
* El proyecto está forzado por ambiente en Modo Oscuro (`class="dark"` estático local).
* ✅ **Profundidad de Backgrounds (Z-space)**: Destacar las áreas de foco elevando los colores "base":
   1. Main Fondo: `bg-operator-bg` (#0A0A0A)
   2. Cards/Superficies: `bg-operator-card` (#121212)
   3. Separadores/Bordes: `border-operator-border` (#2A2A2A)
* ✅ **Contraste de Legibilidad**: El cuerpo base usará `text-operator-text` (#E5E5E5). Metadatos, marcas de tiempo o información irrelevante se atenuarán intencionalmente pero legible con `text-operator-muted` (aprox tailwind `text-neutral-400`). 
* ✅ **Efecto Glass Minimalista (Opcional pero recomendado)**: En componentes superpuestos (Modales, Navbars) emplear `bg-operator-card/80 backdrop-blur-md` en vez de opacidad sólida aburrida.

### 4. Arquitectura de Layout y Espacios
* ✅ **Desplazamiento Horizontal Prohibido**: Probar/garantizar el diseño usando utilidades como `flex-wrap`, `min-w-0`, y `truncate` en componentes anidados y textos muy largos para asegurar que el `body` jamás haga scroll lateral en mobile/tablets.
* ✅ **Cajas Flotantes vs Adheridas**: Cuando se implementan cabeceras interactivas, emplear espaciado marginal (`top-4 left-4 right-4`) si se desea un panel "flotante" atractivo en lugar de colapsarlo aplastado contra los filos (ej. `top-0`).
* ✅ **Altos Coherentes**: Todo `<button>` o `<input>` dentro de una misma fila debe usar `h-10` o flexbox normalizado para ser de altura exacta y estar centrados al milímetro con `items-center`.
