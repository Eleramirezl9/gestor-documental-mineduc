# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Document management system for Guatemala's Ministry of Education (MINEDUC). Full-stack application with React frontend, Node.js/Express backend, and Supabase PostgreSQL database with AI-powered document classification and OCR capabilities.

## Development Commands

### Root Level (Workspace Commands)
```bash
npm run dev          # Start both frontend and backend concurrently
npm run dev:frontend # Start only frontend dev server
npm run dev:backend  # Start only backend dev server
npm run build        # Build frontend for production
npm run test         # Run tests for both frontend and backend
npm run lint         # Run ESLint on frontend
npm run install:all  # Install dependencies for all workspaces
npm run clean        # Remove all node_modules directories
```

### Backend (`backend/`)
```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:auth    # Test authentication flow (native)
npm run test:auth-full # Test full authentication flow
npm run test:basic   # Test basic functionality
npm run build        # No build step required (outputs message)
```

### Frontend (`frontend/`)
```bash
npm run dev          # Start Vite dev server with --host
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build with --host
npm start            # Alias for npm run preview
```

## Architecture

### Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, shadcn/ui, React Router v7
- **Backend**: Node.js/Express with security middleware (helmet, rate limiting)
- **Database**: PostgreSQL via Supabase with Row Level Security
- **Auth**: Supabase Auth + JWT middleware
- **AI**: OpenAI API for classification, Tesseract.js for OCR
- **Deployment**: Vercel (frontend), Render (backend)
- **Package Manager**: pnpm (frontend), npm (backend)
- **Testing**: Jest (backend), ESLint (frontend)
- **Documentation**: Swagger/OpenAPI for API documentation

### Key Patterns

**Authentication Flow**: Supabase Auth with custom JWT middleware. Protected routes use `ProtectedRoute` component. User roles: admin/editor/viewer with RLS policies.

**Backend Structure**: Express with modular routes under `routes/`, business logic in `services/`, auth middleware. Complete API with Swagger documentation at `/api-docs`. Health check endpoint at `/health`.

**Frontend Structure**: Component-based with shadcn/ui, custom auth hook (`hooks/useAuth.jsx`), API layer (`lib/api.js`, `lib/supabase.js`), toast notifications. Uses path aliases (`@` → `./src`). Located in `frontend/` directory.

**Database**: UUID primary keys, comprehensive audit logging, document workflows, full-text search capabilities. Complete schema in `database/schema.sql`. Additional employee management schemas available in `database/employee_management_schema.sql`.

## Environment Configuration

### Backend (`.env`)
```
SUPABASE_URL=
SUPABASE_ANON_KEY=  
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
OPENAI_API_KEY=
```

### Frontend (`.env`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://localhost:5000
```

## Database Setup

1. Execute `database/schema.sql` in Supabase SQL editor
2. Run `database/seed.sql` for test data (after creating users in Supabase Auth)
3. Configure Storage bucket named `documents`
4. Apply user management migrations: `database/apply_user_management_migrations.sql`
5. For employee management: `database/employee_management_schema.sql` and `database/employee_seed_data.sql`

Test users: admin@mineduc.gob.gt, editor@mineduc.gob.gt, viewer@mineduc.gob.gt

## Key Configuration Files

- `package.json` - Root workspace configuration with npm workspaces for frontend/backend
- `frontend/package.json` - Frontend dependencies (React 19, Vite, Tailwind CSS v4, shadcn/ui)
- `backend/package.json` - Backend dependencies (Express, Supabase, OpenAI, Tesseract.js)
- `frontend/vite.config.js` - Vite config with path aliases (`@` → `./src`), React + Tailwind CSS plugins, optimized build chunks
- `frontend/eslint.config.js` - ESLint config with React hooks rules and unused vars handling
- `vercel.json` - Frontend deployment configuration with CORS headers and rewrites
- `backend/render.yaml` - Backend deployment configuration with environment variables
- `backend/server.js` - Express server with Swagger API documentation setup and comprehensive middleware
- Health check available at `/health` endpoint with database and storage status

## Development Notes

- **Workspace Structure**: Root package.json manages npm workspaces for frontend/backend
- Frontend uses **pnpm** as package manager (see `packageManager` field in frontend/package.json)
- Backend uses **npm** as package manager
- Backend has comprehensive Swagger API documentation setup with JWT auth at `/api-docs`
- ESLint configured to ignore unused variables starting with capital letters or underscores
- Both dev servers run with `--host` flag for network access
- Frontend build optimized with manual chunks for vendor libraries (React, UI, charts, forms, API, styling, utils)
- Backend includes multiple test scripts for different scenarios (auth, basic functionality)
- CORS configured for both development (localhost:5173, localhost:3000) and production URLs
- Rate limiting implemented: 100 req/15min general, 30 req/15min auth routes

## Authentication & Security

**JWT Authentication**: Supabase Auth integration with custom middleware. All protected routes require `Authorization: Bearer <token>` header.

**CORS Configuration**: Dynamic CORS setup supporting both development (`localhost:5173`, `localhost:3000`) and production URLs with proper credentials handling.

**API Testing**: 
- Swagger UI available at `/api-docs` with built-in JWT authentication
- Test script: `node backend/test_auth_flow.js` to verify auth flow
- Complete authentication guide in `backend/docs/JWT_AUTHENTICATION_GUIDE.md`

**Rate Limiting**: Different limits for auth routes (5 req/15min) vs general routes (100 req/15min).