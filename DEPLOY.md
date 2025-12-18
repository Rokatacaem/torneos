# Guía de Despliegue - Sistema FECHILLAR

Esta guía detalla los pasos para poner en producción el sistema de gestión de torneos en la web.

## Requisitos Previos

1. **Cuenta en Vercel**: Para el hosting de la aplicación (Front/Back).
2. **Base de Datos PostgreSQL**: Se recomienda **Neon** o **Supabase** (usando conexión pooling).
3. **Repositorio Git**: El código debe estar en GitHub o GitLab.

## 1. Configuración de Base de Datos (Producción)

Si usas una base de datos local para desarrollo, necesitarás una en la nube para producción.
Recomendamos **Neon Console (neon.tech)** por ser gratuita y rápida.

1. Crea un proyecto en Neon.
2. Obtén la **Connection String** (asegúrate de usar la opción "Pooled" si está disponible, puerto 5432 o 6543).
    * Formato: `postgres://usuario:password@host-name.neon.tech:5432/neondb?sslmode=require`
3. Ejecuta los scripts de creación de tablas en esta nueva base de datos.
    * Puedes usar herramientas como **pgAdmin** o **DBeaver** conectándote con la string de producción.
    * Tablas principales: `players`, `clubs`, `tournaments`, `tournament_players`, `tournament_matches`, `tournament_groups`, `tournament_phases`, `users` (admin).

## 2. Despliegue en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard) -> **Add New Project**.
2. Importa tu repositorio de GitHub `Torneos`.
3. En **Configure Project**:
    * **Framework Preset**: Next.js (se detecta automático).
    * **Root Directory**: `./` (la raíz del repo).
4. **Environment Variables**:
    * Abre la sección y agrega:
        * `DATABASE_URL`: `[Tu String de Conexión de Neon/Supabase]`
        * `SESSION_SECRET`: `[Genera una clave larga y segura]`
5. Haz clic en **Deploy**.

## 3. Post-Despliegue

1. **Crear Usuario Admin**:
    * Como no tienes acceso a consola local en Vercel, deberás insertar el usuario admin directamente en la Base de Datos (SQL) o crear una ruta temporal (solo dev) para crearlo.

    ```sql
        -- La contraseña debe estar hasheada con bcrypt.
        INSERT INTO users (name, email, password, role) 
        VALUES ('Admin', 'admin@fechillar.cl', '$2bfs...', 'admin'); 
        ```

2. **Carga de Datos Iniciales (CLAVE)**:
    * Debes poblar la base de datos de producción con los Clubes y el Ranking actual.
    * Desde tu entorno local, cambia temporalmente la `DATABASE_URL` en `.env.local` para que apunte a la **BD de Producción**, o ejecuta los scripts pasando la URL:
    * **Clubes**:
      `DATABASE_URL="postgres://..." node scripts/seed-clubs.js`
    * **Ranking y Jugadores**:
      `DATABASE_URL="postgres://..." node scripts/import-full-rankings.js`

    *Esto asegurará que el sistema inicie con toda la información real.*

2. **DNS (Dominio)**:
    * Ve a Vercel -> Settings -> Domains.
    * Agrega `www.fechillar.cl`.
    * Sigue las instrucciones para configurar los registros A o CNAME en tu proveedor de dominio.

## Solución de Problemas Comunes

* **Error de conexión BD**: Verifica que `DATABASE_URL` incluya `?sslmode=require`.
* **Imágenes no cargan**: Vercel usa Blob Store o necesitas un servicio externo (S3/Cloudinary) para subidas persistentes.
  * *Nota*: El sistema actual guarda en disco local (`public/uploads`). **En Vercel esto NO funciona permanentemente** (los archivos se borran en cada deploy).
  * **Solución Urgente**: Habilitar Vercel Blob o Cloudinary para las imágenes.
