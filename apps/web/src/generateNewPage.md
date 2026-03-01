
# 🏦 PROMPT MAESTRO — SISTEMA DE DISEÑO BANCARIO

## 📌 CONTEXTO OBLIGATORIO

Estás desarrollando una aplicación **bancaria institucional tradicional dominicana**.
El diseño **NO debe parecer**:

* SaaS moderno
* Fintech experimental
* App startup
* Dashboard con animaciones excesivas

El diseño **SÍ debe parecer**:

* Banca tradicional
* Corporativo institucional
* Conservador
* Sobrio
* Confiable
* Estable
* Formal

---

## 🧱 1. ARQUITECTURA DE LAYOUT (INNEGOCIABLE)

### 1.1 Layouts disponibles

Solo existen **dos layouts permitidos**:

```txt
Layout.jsx     → Usuarios autenticados
AuthLayout.jsx → Login, recuperación, OTP
```

❌ Prohibido crear layouts adicionales
❌ Prohibido modificar su estructura base

---

### 1.2 Uso obligatorio del Layout

Toda página **DEBE** envolver su contenido así:

```jsx
<Layout>
  {children}
</Layout>
```

o, para autenticación:

```jsx
<AuthLayout>
  {children}
</AuthLayout>
```

---

### 1.3 Contenedor principal

Todas las páginas **DEBEN** usar:

```txt
max-w-6xl mx-auto px-6
```

❌ Prohibido `w-full` sin contención
❌ Prohibido layouts fluidos tipo SaaS

---

## 🎨 2. SISTEMA VISUAL GLOBAL

### 2.1 Colores oficiales (ÚNICOS)

| Uso              | Color             |
| ---------------- | ----------------- |
| Azul principal   | `#002D72`         |
| Hover principal  | `#001F4D`         |
| Fondo general    | `bg-gray-100`     |
| Texto principal  | `text-gray-800`   |
| Texto secundario | `text-gray-600`   |
| Bordes           | `border-gray-200` |

❌ Prohibido introducir nuevos colores
❌ Prohibido gradientes

---

### 2.2 Fondo general

```txt
bg-gray-100
```

Siempre visible detrás del contenido.

---

## 🧩 3. TARJETAS (COMPONENTE CLAVE)

Las **tarjetas** son el núcleo visual del sistema.

### 3.1 Estilo obligatorio de tarjeta

```txt
bg-white
border border-gray-200
rounded-sm
shadow-none
```

❌ Prohibido `rounded-lg`, `rounded-xl`
❌ Prohibido `shadow-md`, `shadow-lg`

---

### 3.2 Espaciado interno

```txt
p-6 | p-8 | p-10
```

Nunca menor.

---

## ✍️ 4. TIPOGRAFÍA (JERARQUÍA FIJA)

### 4.1 Títulos principales (H1/H2)

```txt
text-2xl font-semibold text-gray-800
```

---

### 4.2 Subtítulos / descripciones

```txt
text-sm text-gray-600
```

---

### 4.3 Texto auxiliar / legal

```txt
text-xs text-gray-500
```

---

❌ Prohibido tipografía decorativa
❌ Prohibido pesos extremos (`font-black`, `font-light`)

---

## 📏 5. ESPACIADO Y RITMO VISUAL

### 5.1 Espaciado vertical mínimo

```txt
py-10
mb-6
gap-6
```

❌ Prohibido diseño compacto tipo admin panel

---

### 5.2 Separación entre secciones

Siempre usar tarjetas o márgenes claros.

---

## 🔘 6. BOTONES (ESTRUCTURA FIJA)

### 6.1 Botón primario

```txt
bg-[#002D72]
text-white
px-5 py-2
text-sm
rounded-sm
hover:bg-[#001F4D]
```

---

### 6.2 Botones secundarios

* Fondo blanco
* Borde gris
* Texto gris oscuro

---

❌ Prohibido botones grandes
❌ Prohibido animaciones llamativas

---

## 📋 7. FORMULARIOS

### 7.1 Inputs

```txt
border border-gray-300
px-3 py-2
text-sm
focus:border-[#002D72]
```

---

### 7.2 Labels

```txt
text-sm text-gray-700
```

---

❌ Prohibido inputs con sombra
❌ Prohibido estilos flotantes modernos

---

## 🧭 8. NAVEGACIÓN

### 8.1 Menús

* Texto simple
* Sin íconos decorativos
* Hover solo cambia color
* Activo con subrayado o borde inferior

---

## 🔐 9. AUTENTICACIÓN

### 9.1 Login / Auth

* Usar **AuthLayout**
* Contenido centrado
* Sin menú
* Sin información del usuario
* Enfoque en seguridad y confianza

---

## 🚫 10. PROHIBICIONES ABSOLUTAS

❌ Gradientes
❌ Glassmorphism
❌ Neumorphism
❌ Animaciones complejas
❌ Ilustraciones llamativas
❌ Estilo fintech moderno
❌ Diseño experimental

---

## 🎯 11. OBJETIVO FINAL

El resultado debe parecer:

* Una banca dominicana real
* Un sistema estable
* Un portal corporativo formal
* Un producto que inspira **confianza y seguridad**

No debe parecer:

* Startup
* App experimental
* Dashboard SaaS
