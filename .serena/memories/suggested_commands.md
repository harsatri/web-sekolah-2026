# Suggested Commands

## Root Commands
- `npm install`: Install root dependencies (like `concurrently`).
- `npm run install:all`: Install all dependencies for root, backend, and frontend.
- `npm run dev`: Start both backend and frontend concurrently (locally).
- `docker-compose up -d`: Start the entire stack in production mode using Docker.
- `docker-compose build`: Rebuild the docker images.
- `docker-compose logs -f`: View logs from the docker containers.

## Backend Commands
From `backend/`:
- `npm install`: Install dependencies.
- `npm run dev`: Start the backend server in development mode.
- `npm run db:setup`: Run the database setup script.

## Frontend Commands
From `frontend/`:
- `npm install`: Install dependencies.
- `npm run dev`: Start the frontend development server (Vite).
- `npm run build`: Build for production.
- `npm run preview`: Preview the production build.
