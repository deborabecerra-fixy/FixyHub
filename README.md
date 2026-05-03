# Fixy Hub · Marketing

Panel interno del equipo de Marketing de Fixy Logística.

## Estructura

```
Marketing-html/
├── index.html              — Dashboard principal
├── admin.html              — Panel de administración
├── chat.html               — Chat completo con Flux
├── css/
│   ├── styles.css          — Estilos base y compartidos (login, loading, app shell)
│   ├── dashboard.css       — Estilos del dashboard
│   ├── admin.css           — Estilos del admin
│   └── chat.css            — Estilos del chat
├── js/
│   ├── config.js           — Configuración centralizada (FIXY_CONFIG)
│   ├── firebaseConfig.js   — Config Firebase Auth (completar con tus credenciales)
│   ├── storage.js          — Acceso a localStorage/sessionStorage
│   ├── auth.js             — Login, logout, Firebase Auth + fallback
│   ├── permissions.js      — Roles y permisos
│   ├── app.js              — Init del dashboard
│   ├── dashboard.js        — Renderizado de métricas y consolidación de reportes
│   ├── admin.js            — Lógica del panel admin
│   ├── wall.js             — Muro de publicaciones
│   ├── reactions.js        — Reacciones a posts
│   ├── comments.js         — Comentarios en posts
│   ├── socialPreview.js    — Cards de redes sociales
│   ├── metaParser.js       — Parser Meta Ads CSV
│   ├── googleAdsParser.js  — Parser Google Ads CSV
│   ├── kommoParser.js      — Parser Kommo CRM CSV
│   ├── analytics.js        — Análisis cruzado
│   ├── chat.js             — Asistente Flux
│   └── giphy.js            — Integración Giphy (requiere API key)
├── data/
│   ├── mockData.js         — Datos por defecto (logos, reacciones)
│   └── fluxKnowledge.js    — Base de conocimiento de Flux (motivación, ventas, emocional)
└── assets/
    ├── logo-fixy.svg
    └── icons/
```

---

## Cómo correr localmente

No requiere servidor ni build. Abrí `index.html` directamente en el navegador.

> Para que los scripts y SVGs carguen correctamente, es recomendable un servidor local:
> ```bash
> # Python
> python -m http.server 8080
> # Node
> npx serve .
> ```

---

## Autenticación

### Modo desarrollo (sin Firebase)

Abrí `index.html` directamente. `FIREBASE_CONFIGURED = false` en `js/firebaseConfig.js` activa el modo fallback:
- El login acepta cualquier email `@fixy.com.ar` con cualquier contraseña
- La sesión se guarda en `localStorage`
- La recuperación de contraseña no funciona en este modo

### Firebase Auth (producción)

#### 1. Crear proyecto Firebase

1. Ir a [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Crear nuevo proyecto (o usar uno existente)
3. Habilitar **Authentication → Sign-in method → Email/Password**

#### 2. Registrar la app web

1. Ir a **Project Settings → Your apps → Add web app**
2. Copiar el objeto de configuración

#### 3. Completar `js/firebaseConfig.js`

```js
const FIREBASE_CONFIGURED = true; // ← cambiar a true

const FIREBASE_CONFIG = {
  apiKey:            "tu-api-key",
  authDomain:        "tu-proyecto.firebaseapp.com",
  projectId:         "tu-proyecto",
  storageBucket:     "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
};
```

#### 4. Agregar usuarios

Firebase no tiene registro público. Los usuarios se crean manualmente:

1. Firebase Console → **Authentication → Users → Add user**
2. Ingresar email `@fixy.com.ar` y una contraseña temporal
3. El usuario puede cambiar la contraseña con "Olvidé mi contraseña" en el login

#### 5. Dominio autorizado (GitHub Pages u otro hosting)

1. Firebase Console → **Authentication → Settings → Authorized domains**
2. Agregar tu dominio (ej: `tuusuario.github.io`)

> **Nota**: `localhost` y `127.0.0.1` ya están autorizados por defecto.

---

## Usuarios y roles

| Rol    | Acceso |
|--------|--------|
| admin  | Todo: panel Admin, subir reportes, gestionar muro y usuarios |
| editor | Publicar en muro, comentar, reaccionar |
| viewer | Ver dashboard, comentar, reaccionar, usar Flux |

### Admin fija
- **debora.becerra@fixy.com.ar** — admin permanente, no puede modificarse ni eliminarse.
- Cualquier otro `@fixy.com.ar` ingresa como **viewer** por defecto.
- La admin puede promover a `editor` desde **Admin → Usuarios**.

---

## Cómo cargar reportes

1. Iniciar sesión como admin (`debora.becerra@fixy.com.ar`)
2. Hacer clic en **Admin** en el header
3. Ir a **Reportes**
4. Subir los CSV de cada plataforma

### Meta Ads — múltiples archivos soportados

Se pueden subir **varios CSV de Meta** (ej: uno por Business Manager). Se consolidan automáticamente en el dashboard.

- Exportar desde Ads Manager → Reportes → Exportar CSV
- Columnas esperadas: Nombre de la campaña, Entrega, Importe gastado (ARS), Resultados, Impresiones, Alcance, Costo por resultados

### Google Ads

- Exportar desde Google Ads → Informes → CSV
- Columnas esperadas: Campaña, Estado, Coste, Clics, Impresiones, CTR, CPC medio, Conversiones

> **Alternativa vía Apps Script**: si las columnas difieren mucho, se puede crear un Google Apps Script que exporte directamente desde Google Ads API al formato esperado.

### Kommo CRM

- Exportar desde Kommo → Leads → Exportar CSV
- Columnas esperadas: ID, Nombre del lead, Estatus del lead, UTMs (utm_source, fbclid, gclid), Teléfono, etc.

---

## Filtros automáticos (Kommo)

Los filtros se definen en `js/config.js` y se aplican al procesar el CSV:

- **Excluidos por búsqueda laboral**: keywords como "trabajo", "cv", "repartidor"…
- **Excluidos por envío personal**: "envío particular", "mandar paquete"…
- **Fuentes válidas**: facebook, instagram, google, ads, whatsapp (vía UTMs, fbclid, gclid)
- **Estados ganados**: "logrado con éxito", "ganado"
- **Estados activos**: "incoming leads", "contactado", "seguimiento"

La conversión se calcula **sobre leads gestionables**, no sobre el total importado.

---

## Flux (asistente)

Flux responde preguntas sobre los datos cargados. No inventa datos: si no hay reportes, avisa.

### Intents que entiende

**Datos:**
- Estado de campañas y cuáles están activas
- Mejor campaña y campañas a revisar
- Análisis de Meta Ads (inversión, resultados, CPR)
- Análisis de Google Ads (gasto, clics, conversiones)
- Análisis de leads de Kommo (gestionables, conversión, descartados)
- Recomendaciones cruzadas

**Emocional / contextual:**
- Cansancio: "estoy cansada", "no doy más", "qué semana"
- Frustración: "me tiene harta", "no funciona", "frustrada"
- Estrés: "estresada", "urgente", "me ahogo"
- Celebración: "funcionó", "cerramos", "buena semana"
- Motivación: "necesito motivación", "cómo sigo"

Para el chat completo, hacer clic en **"Preguntale a Flux 👀"** o ir a `chat.html`.

---

## "Ver como usuario" (admin)

Desde **Admin → Usuarios**, la admin puede activar el modo vista de usuario para ver el Hub sin permisos de admin.

- El estado se guarda en `sessionStorage` (se resetea al cerrar la pestaña)
- El banner "Estás viendo el Hub como usuario" aparece en la parte superior
- "Volver a vista Admin" restaura la vista normal **sin cerrar la sesión**

---

## Limitaciones de localStorage

- Capacidad ~5MB por dominio
- Los datos **no persisten entre dispositivos ni navegadores**
- Limpiar caché del navegador elimina todos los datos
- Para un entorno real de equipo se requiere backend (Supabase, Firebase Firestore, etc.)

---

## Próximos pasos (backend real)

- [ ] Reemplazar `localStorage` con Supabase o Firebase Firestore
- [ ] Base de datos para posts, comentarios y reacciones (ya con Firebase Auth en su lugar)
- [ ] Upload de archivos al storage (Supabase Storage / Firebase Storage)
- [ ] Conectar API de Kommo directamente (con CORS proxy o función serverless)
- [ ] Notificaciones push para nuevas publicaciones
- [ ] Historial de reportes con comparativa de períodos

---

## QA rápido

- [ ] Login con email válido y contraseña (Firebase) / cualquier contraseña (dev)
- [ ] Login con email inválido → muestra error correcto
- [ ] "Olvidé mi contraseña" → envía email (requiere Firebase)
- [ ] Admin ve botón Admin en header; viewer no lo ve
- [ ] Admin puede acceder a admin.html; viewer es redirigido a index.html
- [ ] "Ver como usuario" en Admin → banner visible en index.html → "Volver" no cierra sesión
- [ ] Cerrar y reabrir el navegador → sesión persiste (Firebase o localStorage)
- [ ] Subir CSV de Meta, Google, Kommo → datos aparecen en dashboard
- [ ] Subir segundo CSV de Meta → se consolida automáticamente
- [ ] Flux responde con datos cuando hay reportes
- [ ] Flux responde con calidez a "estoy cansada"
- [ ] Botón "Preguntale a Flux" solo visible cuando estás logueado
- [ ] Post creado en admin.html aparece en index.html sin recargar página
- [ ] Reacciones se guardan correctamente por usuario
