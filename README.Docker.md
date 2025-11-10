# Docker Setup Guide

This guide explains how to set up and run the Warehouse application using Docker.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd Warehouses
   ```

2. **Create environment file**:
   ```bash
   cp env.example .env
   ```

3. **Edit `.env` file** with your configuration:
   - Set a strong `JWT_SECRET` for production
   - Update `POSTGRES_PASSWORD` with a secure password
   - Configure `CORS_ORIGINS` with your frontend URLs
   - Set `VITE_API_URL` to point to your backend URL

4. **Build and start all services**:
   ```bash
   docker-compose up -d
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000

## Services

The Docker setup includes three services:

- **PostgreSQL**: Database server (port 5432)
- **Backend**: Node.js/Express API server (port 4000)
- **Frontend**: React application served via Nginx (port 3000)

## Development Mode

For development with hot-reload:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

This will:
- Enable hot-reload for both frontend and backend
- Mount source code as volumes
- Use development configurations

## Makefile Commands

For convenience, a `Makefile` is provided with common commands:

```bash
make build          # Build all Docker images
make up             # Start all services
make down           # Stop all services
make logs           # View logs from all services
make dev            # Start services in development mode
make clean          # Stop services and remove volumes
make migrate        # Run database migrations
make seed           # Seed the database
```

Run `make help` to see all available commands.

## Useful Commands

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Stop services
```bash
docker-compose down
```

### Stop and remove volumes (⚠️ deletes database data)
```bash
docker-compose down -v
```

### Rebuild images
```bash
docker-compose build --no-cache
```

### Execute commands in containers
```bash
# Backend
docker-compose exec backend sh

# Frontend
docker-compose exec frontend sh

# Database
docker-compose exec postgres psql -U warehouse_user -d warehouse_db
```

### Run database migrations
Migrations run automatically on container start, but you can also run them manually:
```bash
docker-compose exec backend npx prisma migrate deploy
```

### Seed the database
```bash
docker-compose exec backend npm run seed
```

## Environment Variables

Key environment variables:

- `POSTGRES_USER`: PostgreSQL username (default: warehouse_user)
- `POSTGRES_PASSWORD`: PostgreSQL password (default: warehouse_password)
- `POSTGRES_DB`: Database name (default: warehouse_db)
- `JWT_SECRET`: Secret key for JWT tokens (⚠️ change in production!)
- `CORS_ORIGINS`: Comma-separated list of allowed CORS origins
- `VITE_API_URL`: Backend API URL for frontend
- `NODE_ENV`: Environment (development/production)

## Troubleshooting

### Port already in use
If ports 3000, 4000, or 5432 are already in use, modify the port mappings in `docker-compose.yml`:
```yaml
ports:
  - "3001:80"  # Change external port
```

### Database connection issues
- Ensure PostgreSQL container is healthy: `docker-compose ps`
- Check database logs: `docker-compose logs postgres`
- Verify `DATABASE_URL` in backend environment

### Frontend can't connect to backend
- Check `VITE_API_URL` environment variable
- Ensure backend is running and healthy
- Verify CORS configuration in backend

### Rebuild after dependency changes
```bash
docker-compose build --no-cache backend
docker-compose up -d backend
```

## Production Deployment

For production deployment:

1. **Use strong secrets**: Update all passwords and secrets in `.env`
2. **Use production images**: Build images with `docker-compose build`
3. **Configure reverse proxy**: Use Nginx or Traefik in front of services
4. **Enable HTTPS**: Use SSL/TLS certificates
5. **Set up backups**: Configure database backups
6. **Monitor logs**: Set up log aggregation
7. **Resource limits**: Add resource limits in `docker-compose.yml`

Example production `docker-compose.yml` additions:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## CI/CD Integration

The project includes GitHub Actions workflows for automated testing and deployment:

### CI Pipeline (`.github/workflows/ci.yml`)
Runs on every push and pull request to `main` or `develop` branches:
- ✅ Linting and code quality checks
- ✅ Building Docker images
- ✅ Testing docker-compose setup
- ✅ Running database migrations
- ✅ Health checks for all services

### Deploy Pipeline (`.github/workflows/deploy.yml`)
Runs on pushes to `main` branch or version tags:
- 🚀 Builds and pushes production images to GitHub Container Registry
- 📦 Images are tagged with branch names, SHA, and semantic versions
- 🔄 Ready for integration with your deployment infrastructure

### Setting up CI/CD

1. **Push your code to GitHub** - The workflows will run automatically
2. **Configure secrets** (if needed):
   - Go to Repository Settings → Secrets and variables → Actions
   - Add any required secrets for your deployment target
3. **Monitor workflows**: Check the Actions tab in your GitHub repository

### Customizing Deployment

The deploy workflow can be extended to:
- Deploy to cloud platforms (AWS ECS, Azure Container Instances, Google Cloud Run)
- Update Kubernetes manifests
- Trigger webhooks for external deployment systems
- Run database migrations in production

## Support

For issues or questions, please open an issue on the repository.

