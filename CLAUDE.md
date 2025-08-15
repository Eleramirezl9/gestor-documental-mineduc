# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Document management system for Guatemala's Ministry of Education (MINEDUC). Full-stack application with React frontend, Node.js/Express backend, and Supabase PostgreSQL database with AI-powered document classification and OCR capabilities.

## Development Commands

### Backend (`backend/`)
```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server  
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
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

### Key Patterns

**Authentication Flow**: Supabase Auth with custom JWT middleware. Protected routes use `ProtectedRoute` component. User roles: admin/editor/viewer with RLS policies.

**Backend Structure**: Express with modular routes under `routes/`, business logic in `services/`, auth middleware. Most routes currently commented out in `server.js` (development in progress).

**Frontend Structure**: Component-based with shadcn/ui, custom auth hook (`hooks/useAuth.jsx`), API layer (`lib/api.js`, `lib/supabase.js`), toast notifications.

**Database**: UUID primary keys, comprehensive audit logging, document workflows, full-text search capabilities.

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
2. Run `database/seed.sql` for test data
3. Configure Storage bucket named `documents`

Test users: admin@mineduc.gob.gt, editor@mineduc.gob.gt, viewer@mineduc.gob.gt

## Key Configuration Files

- `frontend/vite.config.js` - Vite config with path aliases (`@` → `./src`), React + Tailwind CSS plugins
- `frontend/eslint.config.js` - ESLint config with React hooks rules and unused vars handling
- `vercel.json` - Frontend deployment configuration
- `backend/render.yaml` - Backend deployment configuration  
- `backend/server.js` - Express server with Swagger API documentation setup
- Health check available at `/health` endpoint

## Development Notes

- Frontend uses **pnpm** as package manager (see `packageManager` field)
- Backend has comprehensive Swagger API documentation setup with JWT auth
- ESLint configured to ignore unused variables starting with capital letters or underscores
- Both dev servers run with `--host` flag for network access

## Authentication & Security

**JWT Authentication**: Supabase Auth integration with custom middleware. All protected routes require `Authorization: Bearer <token>` header.

**CORS Configuration**: Dynamic CORS setup supporting both development (`localhost:5173`, `localhost:3000`) and production URLs with proper credentials handling.

**API Testing**: 
- Swagger UI available at `/api-docs` with built-in JWT authentication
- Test script: `node backend/test_auth_flow.js` to verify auth flow
- Complete authentication guide in `backend/docs/JWT_AUTHENTICATION_GUIDE.md`

**Rate Limiting**: Different limits for auth routes (5 req/15min) vs general routes (100 req/15min).