# Fixy Hub · Marketing

Panel interno del equipo de Marketing de Fixy Logística.

## Estructura

```
Marketing-html/
├── index.html          — Dashboard principal
├── admin.html          — Panel de administración
├── chat.html           — Chat completo con Flux
├── css/
│   ├── styles.css      — Estilos base y compartidos
│   ├── dashboard.css   — Estilos del dashboard
│   ├── admin.css       — Estilos del admin
│   └── chat.css        — Estilos del chat
├── js/
│   ├── config.js       — Configuración centralizada (FIXY_CONFIG)
│   ├── storage.js      — Acceso a localStorage
│   ├── auth.js         — Login / logout / sesión
│   ├── permissions.js  — Roles y permisos
│   ├── app.js          — Init del dashboard
│   ├── dashboard.js    — Renderizado de métricas
│   ├── admin.js        — Lógica del panel admin
│   ├── wall.js         — Muro de publicaciones
│   ├── reactions.js    — Reacciones a posts
│   ├── comments.js     — Comentarios en posts
│   ├── socialPreview.js— Cards de redes sociales
│   ├── metaParser.js   — Parser Meta Ads CSV
│   ├── googleAdsParser.js — Parser Google Ads CSV
│   ├── kommoParser.js  — Parser Kommo CRM CSV
│   ├── analytics.js    — Análisis cruzado
│   ├── chat.js         — Asistente Flux
│   └── giphy.js        — Integración Giphy (requiere API key)
├── data/
│   └── mockData.js     — Datos por defecto (logos, reacciones)
└── assets/
    ├── logo-fixy.svg
    └── icons/
```

## Cómo correr localmente

No requiere servidor ni build. Abrí `index.html` directamente en el navegador.

> Para que las imágenes SVG y los scripts carguen correctamente desde subdirectorios, usar un servidor local es recomendable:
> ```bash
> # Python
> python -m http.server 8080
> # Node
> npx serve .
> ```

## Usuarios y roles

| Rol    | Acceso |
|--------|--------|
| admin  | Todo: Admin panel, subir reportes, gestionar muro y usuarios |
| editor | Publicar en muro, comentar, reaccionar |
| viewer | Ver dashboard, comentar, reaccionar, usar Flux |

### Admin fijo
- **debora.becerra@fixy.com.ar** — admin permanente, no puede modificarse ni eliminarse.
- Cualquier otro `@fixy.com.ar` ingresa como **viewer** por defecto.
- La admin puede promover a `editor` desde el panel Admin → Usuarios.

## Login

Solo requiere email corporativo `@fixy.com.ar`. Sin contraseña.

La sesión se guarda en `localStorage` y persiste al cerrar y reabrir el navegador.

## Cómo cargar reportes

1. Iniciá sesión como admin (`debora.becerra@fixy.com.ar`).
2. Hacé clic en **Admin** en el header.
3. Ir a **Reportes**.
4. Subir los CSV de cada plataforma.

### Meta Ads
- Exportar desde Ads Manager → Reportes → Exportar CSV.
- Columnas esperadas: Nombre de la campaña, Entrega, Importe gastado (ARS), Resultados, Impresiones, Alcance, Costo por resultados.

### Google Ads
- Exportar desde Google Ads → Informes → CSV.
- Columnas esperadas: Campaña, Estado, Coste, Clics, Impresiones, CTR, CPC medio, Conversiones.

### Kommo CRM
- Exportar desde Kommo → Leads → Exportar CSV.
- Columnas esperadas: ID, Nombre del lead, Estatus del lead, UTMs (utm_source, fbclid, gclid), Teléfono, etc.

## Filtros automáticos (Kommo)

Los filtros se definen en `js/config.js` y se aplican automáticamente al procesar el CSV:

- **Excluidos por búsqueda laboral**: keywords como "trabajo", "cv", "repartidor"…
- **Excluidos por envío personal**: "envío particular", "mandar paquete"…
- **Fuentes válidas**: facebook, instagram, google, ads, whatsapp (vía UTMs, fbclid, gclid)
- **Estados ganados**: "logrado con éxito", "ganado"
- **Estados activos**: "incoming leads", "contactado", "seguimiento"

La conversión se calcula **sobre leads gestionables**, no sobre el total importado.

## Flux (asistente)

Flux responde preguntas sobre los datos cargados usando los reportes procesados.
No inventa datos: si no hay reportes cargados, avisa.

Intenciones que entiende:
- Estado de campañas
- Mejor campaña / campañas a revisar
- Análisis de Meta Ads
- Análisis de Google Ads
- Análisis de leads de Kommo
- Recomendaciones cruzadas
- Ayuda

Para acceder al chat completo, clic en el botón flotante **"Preguntale a Flux 👀"** o ir directamente a `chat.html`.

## Limitaciones de localStorage

- Capacidad ~5MB por dominio.
- Los datos **no persisten entre dispositivos ni navegadores**.
- Limpiar caché del navegador elimina todos los datos.
- Para un entorno real de equipo se requiere backend (Supabase, Firebase, etc.).

## Próximos pasos (backend real)

- [ ] Reemplazar `localStorage` con Supabase o Firebase
- [ ] Auth real con Supabase Auth (mantener restricción @fixy.com.ar)
- [ ] Base de datos para posts, comentarios y reacciones
- [ ] Upload de archivos al storage (Supabase Storage)
- [ ] Conectar API de Kommo directamente (con CORS proxy o función serverless)
- [ ] Notificaciones push para nuevas publicaciones
- [ ] Historial de reportes con comparativa de períodos
