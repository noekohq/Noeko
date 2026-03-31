# Contributing to Noeko

First off, thank you for considering contributing to Noeko! We welcome any help, from reporting bugs, to working on our design system, to submitting new features. This document provides guidelines to help you get started.

## Getting Started

Before you can work on the code, you'll need to set up the development environment. We offer two primary methods: using Docker (recommended for a consistent, isolated environment) or running directly on your host machine.

Both methods require you to have a `.env` file. You can create one by copying the example:

```sh
cp .env.example .env
```

After copying, be sure to review and fill in the necessary values in your new `.env` file.

### Method 1: Using Docker (Recommended)

This method containerizes all services (database, backend, frontend), ensuring a consistent environment.

**Prerequisites:**
- [Docker](https://www.docker.com/get-started)
- [Bun](https://bun.sh/) (for running the script)

**Setup Command:**
```sh
bun run dev:docker
```

This single command will:
1.  Start the SurrealDB database via Docker Compose.
2.  Start a container for the backend server with hot-reloading.
3.  Start a container for the frontend Vite server with hot-reloading.

You can access the frontend at `http://localhost:5173` and the backend API at the port specified in your `.env` file (e.g., `http://localhost:3400`).

### Method 2: Running on Host

This method runs the backend and frontend servers directly on your machine, while still using Docker for the database.

**Prerequisites:**
- [Docker](https://www.docker.com/get-started) (for the database)
- [Bun](https://bun.sh/)

**Setup Command:**
```sh
bun run dev
```

This command will:
1.  Start the SurrealDB database in Docker.
2.  Start the backend server on your host machine with hot-reloading.
3.  Start the frontend Vite server on your host machine with hot-reloading.

## Codebase Overview

- `app/`: Contains all backend server code (Express).
- `src/`: Contains all frontend client code (React, Vite).
- `shared/`: TypeScript types and code shared between the frontend and backend.
- `docker/`: Holds the `Dockerfile` for building the production image.
- `scripts/`: Contains useful administrative and database management scripts.
- `package.json`: Defines all project scripts, dependencies, and core workflows.

## Available Scripts

The `package.json` file is the central place for all project commands. Here are the most important ones:

- `bun run dev`: Starts the full development environment on your host machine (with a Dockerized DB).
- `bun run dev:docker`: Starts the full development environment completely inside Docker containers.
- `bun run build`: Creates a production-ready build of both the frontend and backend.
- `bun run start`: Runs the pre-built application in production mode.
- `bun run test`: Runs the entire test suite.
- `bun run lint`: Checks the code for style and formatting issues.
- `bun run db:sql`: Opens an interactive SQL shell inside the database container.

## Submitting Changes

> [!note]
> If you plan to use AI coding tools in your PR, that's totally cool! However, please review our [AI Policy](./AI_POLICY.md) to keep things up to standard.

We use the standard GitHub flow for contributions.

1.  **Fork** the repository to your own GitHub account.
2.  **Clone** your fork to your local machine.
3.  Create a **new branch** for your changes (`git checkout -b my-new-feature`).
4.  Make your changes.
5.  **Test** your changes by running `bun run test`.
6.  _(skip for now, linting is currently broken)_ **Lint** your code by running `bun run lint`.
7.  **Commit** your changes with a clear and descriptive commit message following the [conventional commits standard](https://www.conventionalcommits.org/en/v1.0.0/).
8.  **Push** your changes to your fork on GitHub (`git push origin my-new-feature`).
9.  Open a **Pull Request** from your fork to the main Noeko repository.

Thank you again for your contribution!
