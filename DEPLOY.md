# Guía de Despliegue y Configuración

## 1. Requisitos Previos

- **Cuenta en GitHub**: Para guardar el código.
- **Cuenta en Vercel**: Para el despliegue de la web.
- **Cuenta en Neon.tech** (Recomendado): Para la base de datos PostgreSQL en la nube.
- **Node.js** instalado.

## 2. Base de Datos (Producción)

### Configuración en Vercel

1. Ve a **Settings > Environment Variables**.
2. Agrega la variable `DATABASE_URL`.
3. Pega tu conexión de `postgres://...` (asegúrate de que termine en `sslmode=require`).
4. **IMPORTANTE**: Marca las casillas "Production", "Preview" y "Development".

### Cargar Datos Iniciales (Seeding)

Una vez configurada la variable en Vercel, ejecuta estos comandos en tu terminal local para llenar la base de datos:

```powershell
# 1. Crear Tablas
$env:DATABASE_URL="tu_url_aqui"; node scripts/init-prod.js

# 2. Cargar Clubes
$env:DATABASE_URL="tu_url_aqui"; node scripts/seed-clubs.js

# 3. Importar Ranking
$env:DATABASE_URL="tu_url_aqui"; node scripts/import-full-rankings.js
```

## 3. Despliegue

Cada vez que hagas un cambio y lo subas a GitHub (`git push`), Vercel actualizará tu sitio automáticamente.

Si necesitas forzar una actualización (por ejemplo, tras cambiar variables de entorno):

- Opción A: Botón "Redeploy" en el Dashboard de Vercel.
- Opción B: Hacer un pequeño cambio en el código y `git push`.

---

## 4. Configuración de Dominio (<www.fechillar.cl>)

Para que tu página se vea en `www.fechillar.cl` en lugar de `vercel.app`:

### En Vercel

1. Ve a tu proyecto en Vercel.
2. Clic en **Settings** > **Domains**.
3. Escribe `www.fechillar.cl` en el campo de entrada y haz clic en **Add**.
4. Vercel te mostrará un error (Invalid Configuration) y te dará unos valores DNS:
   - **Type**: `CNAME`
   - **Name**: `www`
   - **Value**: `cname.vercel-dns.com`

### En tu Proveedor de Dominio (NIC Chile / Hosting)

Tienes que configurar los registros DNS donde compraste el dominio:

1. Busca la zona de "Registros DNS" (DNS Records).
2. Agrega un registro **CNAME**:
   - Host/Nombre: `www`
   - Valor/Destino: `cname.vercel-dns.com`
3. (Opcional) Si quieres que funcione `fechillar.cl` (sin www), agrega un registro **A**:
   - Host/Nombre: `@` (o déjalo vacío)
   - Valor: `76.76.21.21` (IP de Vercel)

*Nota: Los cambios DNS pueden tardar hasta 24 horas en propagarse, aunque suelen ser rápidos.*
