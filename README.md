# 🏦 GMG Cobranzas — Sistema de Gestión de Cobranza

Sistema profesional de cobranzas para gestionar clientes morosos, registrar gestiones, promesas de pago, recuperación y dashboards financieros.

## ⚡ Quick Start

```bash
# 1. Clonar / navegar al proyecto
cd gmg-cobranzas

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 4. Ejecutar SQL en Supabase
# Ve a tu proyecto en https://app.supabase.com
# SQL Editor → ejecutar en orden:
#   supabase/migrations/001_schema.sql
#   supabase/migrations/002_rls.sql
#   supabase/migrations/003_functions.sql
#   supabase/migrations/004_views.sql
#   supabase/seeds/001_seed.sql

# 5. Crear usuario admin en Supabase Auth
# Dashboard → Authentication → Users → Add User
# Email: admin@gmg.com, Password: (tu contraseña)
# En el SQL Editor: UPDATE profiles SET role = 'ADMIN' WHERE email = 'admin@gmg.com';

# 6. Iniciar desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## 🏗️ Stack Tecnológico

| Categoría | Tecnología |
|-----------|------------|
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| UI | Shadcn/ui components, Framer Motion |
| State | Zustand, React Query (TanStack) |
| Tables | TanStack Table |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Backend | Supabase (Auth + PostgreSQL + RLS) |
| Import | SheetJS (xlsx) |
| Export | jsPDF, xlsx |
| Deploy | Vercel, Docker |

## 📁 Estructura del Proyecto

```
gmg-cobranzas/
├── app/
│   ├── (auth)/login/          # Página de login
│   ├── (dashboard)/
│   │   ├── dashboard/         # Dashboard principal
│   │   ├── clientes/          # Gestión de clientes
│   │   ├── gestiones/         # Historial de gestiones
│   │   ├── calendario/        # Calendario de promesas
│   │   ├── campanas/          # Campañas mensuales
│   │   ├── importar/          # Importación Excel
│   │   ├── reportes/          # Exportes PDF/Excel
│   │   └── admin/             # Panel de administración
│   ├── api/                   # API Routes
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── dashboard/             # KPIs, Buckets, Charts, Ranking
│   ├── clientes/              # Tabla, Modal, Timeline, WhatsApp
│   ├── gestiones/             # Form, Timeline
│   └── shared/                # Sidebar, Header, Theme
├── hooks/                     # React Query hooks
├── stores/                    # Zustand stores
├── lib/
│   ├── supabase/              # Cliente Supabase
│   ├── utils/                 # Helpers, bucket, whatsapp, excel, pdf
│   └── validations/           # Schemas Zod
├── types/                     # TypeScript types
├── supabase/
│   ├── migrations/            # SQL schema, RLS, functions, views
│   └── seeds/                 # Datos iniciales
├── middleware.ts              # Auth middleware
├── Dockerfile
├── docker-compose.yml
└── vercel.json
```

## 🔐 Roles y Permisos

| Acción | ADMIN | SUPERVISOR | AGENTE |
|--------|:-----:|:----------:|:------:|
| Ver todos los clientes | ✅ | ✅ | Solo asignados |
| Importar Excel | ✅ | ✅ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Ver dashboard completo | ✅ | ✅ | Parcial |
| Exportar reportes | ✅ | ✅ | ❌ |
| Registrar gestiones | ✅ | ✅ | ✅ |

## 📊 Reglas de Negocio

### Buckets
- **Bucket 5**: Clientes con 121–150 días de mora
- **Bucket 6**: Clientes con 151–180 días de mora

### Fórmulas
- **Proyección** = Recuperado actual + Promesas activas
- **Falta** = Meta - Recuperado actual
- **Cumplimiento %** = (Recuperado actual / Meta) × 100

## 🚀 Deploy

### Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variables de entorno en Vercel Dashboard
```

### Docker
```bash
# Build
docker-compose build

# Run
docker-compose up -d
```

## 📝 Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📄 License

Privado — GMG Servicios © 2025
