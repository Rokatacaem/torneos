# Plan Estratégico e Integración Institucional FECHILLAR

Este documento sirve como guía maestra para la evolución del sistema de torneos hacia la plataforma institucional de la Federación Chilena de Billar (**fechillar.cl**).

## 1. Visión General

El objetivo es unificar la gestión deportiva (torneos, rankings, jueces) con la cara visible de la federación (noticias, institucional), utilizando una única plataforma tecnológica robusta y moderna.

---

## 2. Esquema de Roles y Accesos

### 🟢 Nivel 1: Público General (Sin Login)

*Acceso libre para visitantes, prensa y aficionados.*

* **Home (`/`)**: Portada institucional, noticias destacadas, accesos rápidos.
* **Rankings (`/ranking`)**:
  * **Ranking Nacional**: Clasificación oficial móvil (últimos 12 meses). Define categorías A/B/C.
  * **Ranking Anual**: "Carrera del año". Puntos acumulados desde enero. Define clasificados a la Qualy.
* **Calendario (`/torneos`)**: Lista de eventos pasados y futuros.
* **Torneo en Vivo (`/torneos/[id]`)**:
  * Resultados en tiempo real (Livescore).
  * Brackets y programación de partidos.
* **Clubes (`/clubes`)**: Mapa y directorio de clubes federados, con fichas de detalle y jugadores asociados.

### 🔵 Nivel 2: Jugadores Federados (Login Requerido)

*Autogestión para atletas (Fase 2).*

* **Perfil (`/mi-perfil`)**: Edición de datos, foto, club actual.
* **Inscripciones**: Postular a torneos abiertos con un clic.
* **Pagos**: Historial de licencias y pagos de inscripción.
* **Estadísticas**: Historial personal de rendimiento y evolución de handicap.

### 🔴 Nivel 3: Administración y Control (Login Admin/Juez)

*Gestión interna.*

* **Admin Central (`/admin`)**: Gestión global de jugadores, clubes, noticias y validaciones.
* **Gestión de Torneos**: Creación de eventos, sorteos (Snake Seeding), configuración de fases y Playoff.
* **Mesa de Control**: Interfaz especializada para árbitros con control de shot-clock, innings y transmisión de resultados en vivo.

---

## 3. Arquitectura Técnica

**Estrategia: Monolito Moderno (Next.js)**
En lugar de separar "Web Institucional" (Wordpress) y "App de Torneos", usaremos este mismo proyecto para todo.

* **Ventajas**:
  * Información siempre sincronizada (El ranking en la home es el dato real de la DB).
  * Menor costo de mantenimiento (Un solo servidor, un solo dominio).
  * Experiencia de usuario fluida (SPA).

**Estructura de Sitios y Rutas:**

```text
/ (Raíz Pública)
├── componentes/home/ (Hero, Noticias, Features)
├── ranking/page.js   (Vista pública del Ranking)
├── torneos/page.js   (Vista pública de lista)
├── clubs/[id]/page.js (Ficha de detalle de Club)
└── ...

/admin (Raíz Privada)
├── players/          (Gestión de BD Jugadores)
├── ranking/          (Herramientas de cálculo y exportación)
├── tournaments/      (Gestión completa de torneos)
└── ...
```

---

## 4. Hoja de Ruta de Implementación

### Fase 1: Visibilidad (Q1) - *En Cierre*

*Meta: Que el público vea la actividad y la gestión sea operativa.*

* [x] **Motor de Torneos**:
  * [x] Creación de Grupos y Snake Seeding.
  * [x] Generación de Brackets y lógica de Playoffs (incluyendo ajustes/repechaje).
* [x] **Gestión de Clubes**:
  * [x] Directorio y fichas de detalle.
  * [x] Asociación de jugadores y conteo de mesas.
* [x] **Sistema de Ranking**:
  * [x] Implementación Ranking Dual (Nacional/Anual).
  * [x] Categorización automática (A/B/C).
* [x] **Mesa de Control (Árbitros)**:
  * [x] Interfaz con Shot-Clock y conteo de entradas.
  * [x] Adaptabilidad móvil.
* [ ] **Diseño Home**: Transformar la página de inicio en una landing institucional atractiva.
* [ ] **Despliegue**: Poner en producción en `www.fechillar.cl`.

### Fase 2: Interacción (Q2)

*Meta: Que el jugador se autogestione.*

* [ ] Sistema de Usuarios para Jugadores (Login).
* [ ] Vinculación "Usuario Web" -> "Ficha de Jugador".
* [ ] Formulario de Inscripción Online.

### Fase 3: Automatización (Q3)

*Meta: Eficiencia comercial.*

* [ ] Pasarela de Pagos (Webpay/MercadoPago).
* [ ] Generación automática de licencias/carnet digital.
* [ ] Gestión de Deudas y Límites (Iniciado).

---

## 5. Notas de Infraestructura

* **Dominio**: Comprar `fechillar.cl`.
* **Hosting Recomendado**: Vercel (por la arquitectura Next.js) o VPS Linux.
* **Base de Datos**: PostgreSQL (Gestionada).

---
*Documento actualizado el 21/12/2025*
