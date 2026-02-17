# Self-Hosting Noeko

This guide provides instructions for deploying and managing a production instance of Noeko on your own server using Docker.

## Prerequisites

- A server or virtual machine with Docker and Docker Compose installed.
- `git` installed on the server to clone the repository.
- A basic understanding of the command line.

## Step 1: Get the Code

First, clone the Noeko repository to your server and navigate into the directory.

```sh
git clone https://github.com/noekohq/Noeko.git
cd Noeko
```

## Step 2: Configuration

Noeko is configured using an `.env` file. You must create one by copying the provided example:

```sh
cp .env.example .env
```

**This is the most important step.** You must open the `.env` file and edit the variables for your environment.

**Crucial variables to change:**
- `PORT`: The port the application will run on.
- `DB_USER`, `DB_PASSWORD`: Set a secure username and password for your database.
- `JWT_SECRET`, `ENCRYPTION_KEY`: Generate long, random, and secure strings for these values.
- `CLIENT_ORIGIN`: The public URL of your application (e.g., `https://noeko.example.com`).

## Step 3: Build and Launch

With your configuration in place, you can build the production Docker image and launch the entire application stack with a single command:

```sh
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Here's what this command does:
- `--build`: Builds the lean, production-ready Docker image based on the `Dockerfile`. This only needs to be done the first time or when you update the application code.
- `-d`: Runs the application in "detached" mode, meaning it runs in the background.

Once the command finishes, your Noeko instance will be running and accessible at the URL and port you specified in your `.env` file.

## Managing Your Instance

Here are the common commands you will use to manage your running application.

- **Stop the application:**
  ```sh
  docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
  ```
- **Start the application:**
  ```sh
  docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
  ```
- **Restart the application server:**
  ```sh
  docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart app
  ```
- **View application logs:**
  ```sh
  docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f app
  ```

## Updating to a New Version

To update your Noeko instance to the latest version:

1.  Pull the latest code from the repository:
    ```sh
    git pull
    ```
2.  Re-run the launch command with the `--build` flag to create a new production image with the updated code:
    ```sh
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
    ```

## Database Management

The database data is persisted in a Docker volume, so it will not be lost when you stop or update the application.

For administrative tasks like backups and migrations, you can use the scripts defined in `package.json`. These commands should be run within the running `app` container.

**Example: Running a database migration**
```sh
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec app bun run db:migrate
```

**Example: Creating a local backup**
```sh
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec app bun run db:export
```
