# Self-hosting Noeko

This guide deploys a production instance of Noeko with Docker Compose. The
standard stack includes the application and SurrealDB `v3.2.3`, with database
data persisted in a named Docker volume.

## Prerequisites

- A server or virtual machine with Docker and Docker Compose installed.
- `git` and Bun installed on the server to clone the repository and run its
  deployment commands.
- A basic understanding of the command line.

## Step 1: Get the code

Clone Noeko and enter the project directory:

```sh
git clone https://github.com/noekohq/Noeko.git
cd Noeko
```

## Step 2: Configure the environment

Create your deployment environment file from the example:

```sh
cp .env.example .env
```

Open `.env` and replace all example values before starting the stack.

### Required application and database settings

- `PORT`: The port the application listens on.
- `DB_USER`, `DB_PASSWORD`: Strong, unique SurrealDB root credentials.
- `JWT_SECRET`, `ENCRYPTION_KEY`: Long, random secret values.
- `CLIENT_ORIGIN`: The public application URL, such as
  `https://noeko.example.com`.

### AI configuration

Choose providers and supply their credentials before starting the app. For the
current OpenAI deployment profile, set:

```dotenv
LM_PROVIDER="openai"
EMBEDDINGS_PROVIDER="openai"
EMBEDDINGS_MODEL="text-embedding-3-small"
EMBEDDINGS_DIMENSION=768
OPENAI_API_KEY="replace-with-your-key"
```

`EMBEDDINGS_DIMENSION` must remain `768` unless a database migration recreates
the SurrealDB vector indexes at the new dimension. Google and deterministic
providers remain supported; see the
[embedding-provider guide](./guides/EMBEDDING_PROVIDERS.md) for their
configuration and safe provider/model changeovers.

If this is an existing SurrealDB 2 deployment, do **not** start SurrealDB 3
against the old RocksDB volume. Follow the
[SurrealDB v3 upgrade runbook](../docs/operations/surrealdb-v3-upgrade.md)
instead.

## Step 3: Build and launch

Build the production Docker image and start the stack in the background:

```sh
bun run prod -d
```

Without `-d`, `bun run prod` keeps Compose attached to the terminal. The
detached command maps to:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

`--build` creates the production image from the current application source.
Use it for the first launch and after application-code updates.

Verify the initial deployment before opening it to users:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
curl --fail http://127.0.0.1:"$PORT"/api/healthcheck
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 app surrealdb
```

The application runs database migrations during startup. Confirm that its log
reports migrations are up to date and that Search, Analysis, Insights, and
Graph services initialized successfully.

## Managing the standard Docker stack

- **Build and start in the background**

  ```sh
  bun run prod -d
  ```

- **Stop the stack**

  ```sh
  bun run prod:stop
  ```

- **Start existing containers**

  ```sh
  bun run prod:start -d
  ```

- **Restart services**

  ```sh
  bun run prod:restart
  ```

- **Follow logs**

  ```sh
  bun run prod:logs
  ```

Do not run `docker compose down -v` on production. The `-v` flag deletes named
volumes, including the SurrealDB data volume.

## Updating to a new version

1. Pull the intended release:

   ```sh
   git pull --ff-only
   ```

2. Rebuild and recreate the application:

   ```sh
   bun run prod -d
   ```

3. Recheck the health endpoint and logs from Step 3.

If the update changes the embedding provider, model, or dimensions, follow the
[embedding changeover runbook](./guides/EMBEDDING_PROVIDERS.md) rather than
simply restarting the stack.

## Database management

The database is persisted in a named Docker volume, so normal stop/start and
application updates preserve data. For administrative tasks, run repository
scripts from the host at the project root. The production app image contains
only runtime files and does not include the repository's `scripts/` directory.

The app applies normal database migrations automatically during startup. Useful
host-side commands include:

```sh
# Inspect migration status
bun run db:migration:status

# Create a logical export
bun run db:export
```

Keep a stopped-volume archive as well as logical exports. A volume archive is
the recovery artifact for database-engine upgrades, while logical exports are
useful for validation and migration. See the
[database migration guide](./guides/DATABASE_MIGRATIONS.md) before authoring
schema changes.

## Standard Docker deployment vs. custom process managers

This guide assumes the Compose `app` service owns the backend lifecycle. Some
installations run the backend outside Compose (for example, with Supervisor)
while Compose owns only SurrealDB. In that topology, stop application writes
through the process manager before database maintenance, deploy and build the
backend with that process manager's release procedure, and use Compose only for
the `surrealdb` service. The v3 upgrade runbook includes the Supervisor-aware
sequence used for the current production deployment.
