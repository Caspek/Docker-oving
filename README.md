# Docker-oving

A Docker-based Node.js application with Express server and PostgreSQL database integration.

## Features

- Express.js web server
- PostgreSQL database integration
- Docker containerization with docker-compose
- CORS support for API requests
- Dockerode support for Docker API integration

## Project Structure

```
├── docker-compose.yml     # Docker Compose configuration
├── package.json          # Node.js dependencies
├── server/               # Server application
│   ├── db.js            # Database configuration
│   ├── Dockerfile       # Docker image definition
│   ├── runner.js        # Docker runner/executor
│   └── server.js        # Express server
└── web/                 # Web frontend
    └── index.html       # HTML entry point
```

## Prerequisites

- Node.js (for local development)
- Docker and Docker Compose
- PostgreSQL (handled by Docker Compose)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd docker-oving
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application with Docker Compose**
   ```bash
   docker compose up -d
   ```

4. **Build without cache** (if needed)
   ```bash
   docker compose build --no-cache
   ```

## Environment Variables

Create a `.env` file in the root directory (not tracked by git):

```
DATABASE_URL=postgresql://user:password@db:5432/docker_oving
```

## Development

- **Start development server**: `docker compose up`
- **View logs**: `docker compose logs -f`
- **Stop services**: `docker compose down`
- **Rebuild images**: `docker compose build --no-cache`

## Technologies

- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Docker** - Containerization
- **Dockerode** - Docker API client
- **CORS** - Cross-Origin Resource Sharing

## License

MIT
