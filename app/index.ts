import Express from "express";
import { config } from "dotenv";
import chalk from "chalk";
import path from "path";
import cors from "cors";
// Assume apiRouter is defined in ./api/index.ts or similar
import apiRouter from "./api";

config(); // Load .env variables

const { PORT, CLIENT_ORIGIN } = process.env;
const isProduction = process.env.NODE_ENV === "production";
const projectRoot = process.cwd(); // Get project root

if (!PORT) throw new Error("PORT is not defined");

const app = Express();
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: CLIENT_ORIGIN,

    credentials: true,
  }),

  (_, res, next) => {
    res.header("Access-Control-Allow-Origin", CLIENT_ORIGIN);

    res.header(
      "Access-Control-Allow-Headers",

      "Origin, X-Requested-With, Content-Type, Accept",
    );

    next();
  },
);

// --- API Routes ---
// All API endpoints should be prefixed, e.g., /api/users, /api/posts
app.use("/api", apiRouter);

// --- Static Assets Handling ---
// Serve your specific 'public/assets' folder at the '/assets' route
const publicAssetsPath = path.join(projectRoot, "public/assets");
console.log(`Serving static assets from ${publicAssetsPath} at /assets`);
app.use("/assets", Express.static(publicAssetsPath));

// --- Production Frontend Serving ---
if (isProduction) {
  // Serve built static files (JS, CSS, images) from Vite's build output ('dist')
  const viteBuildPath = path.join(projectRoot, "dist");
  console.log(`Serving production build from ${viteBuildPath}`);
  app.use(Express.static(viteBuildPath));

  // SPA Fallback: Serve 'index.html' for all non-API, non-static-asset requests
  // This should be the LAST route handler
  app.get("*", (req, res) => {
    // Avoid conflicts with API and explicitly served static assets
    if (req.path.startsWith("/api/") || req.path.startsWith("/assets/")) {
      res.status(404).send("Not Found");
      return;
    }
    const indexPath = path.join(viteBuildPath, "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error("Error sending index.html:", err);
        res.status(500).send("Error serving application");
      }
    });
  });
} else {
  // In development, Vite handles serving the frontend.
  // You might have a root handler for testing the server is up.
  app.get("/", (req, res) => {
    res.send(
      "Express server is running in development mode. Frontend served by Vite.",
    );
  });
}

app.listen(Number(PORT), () => {
  console.info(
    `Express server running on ${chalk.blue(`http://localhost:${chalk.bold(PORT)}`)}`,
  );
  console.info(
    `Mode: ${chalk.yellow(isProduction ? "Production" : "Development")}`,
  );
});
