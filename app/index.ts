import Express from "express";
import { config } from "dotenv";
import chalk from "chalk";
import path from "path";
import cors from "cors";
import apiRouter from "./api";
import { initDatabase } from "./database/db";
import cookieParser from "cookie-parser";
import { max_idea_size } from "./settings";
import collaborationServer from "./collaboration";

config();

const { PORT, CLIENT_ORIGIN, NODE_ENV } = process.env;
const isProduction = process.env.NODE_ENV === "production";
const projectRoot = process.cwd();

if (!PORT) throw new Error("PORT is not defined");

await initDatabase();
// await initServices();

export const app = Express();
app.use(Express.json({ limit: max_idea_size }));
app.use(Express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  }),
  (_, res, next) => {
    res.header("Access-Control-Allow-Origin", CLIENT_ORIGIN);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  }
);

app.use("/api", apiRouter);

const publicAssetsPath = path.join(projectRoot, "public/assets");
app.use("/assets", Express.static(publicAssetsPath));

if (isProduction) {
  const viteBuildPath = path.join(projectRoot, "dist");
  console.info(`Serving production build from ${viteBuildPath}`);
  app.use(Express.static(viteBuildPath));

  app.get("/*app", (req, res) => {
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
  app.get("/", (req, res) => {
    res.send("Express server is running in development mode. Frontend served by Vite.");
  });
}

if (!(NODE_ENV === "test")) {
  const server = app.listen(Number(PORT), () => {
    console.info(`Express server running on ${chalk.blue(`http://localhost:${chalk.bold(PORT)}`)}`);
    console.info(`Mode: ${chalk.yellow(isProduction ? "Production" : "Development")}`);
  });

  server.on("upgrade", (request, socket, head) => {
    collaborationServer.webSocketServer.handleUpgrade(request, socket, head, (ws) => {
      collaborationServer.hocuspocus.handleConnection(ws, request);
    });
  });
}
