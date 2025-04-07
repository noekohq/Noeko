import Express from "express";
import { config } from "dotenv";
import chalk from "chalk";
import path from "path";
import cookieParser from "cookie-parser";
import { initDatabase } from "./database/db";

// Routers
import apiRouter from "./api";
import cors from "cors";

config();

const { PORT, CLIENT_ORIGIN } = process.env;

if (!PORT || !Number(PORT)) {
  throw new Error("PORT is not defined or not a number");
}

if (!CLIENT_ORIGIN) {
  throw new Error("CLIENT_ORIGIN is not defined");
}

await initDatabase();

const app = Express();
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(cookieParser());

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

app.use("/api", apiRouter);

app.use("/", Express.static(path.join(process.cwd(), "public/")));
if (process.env.NODE_ENV === "production") {
  app.get("/*", (_, res) => {
    res.sendFile(path.join(process.cwd(), "dist/index.html"));
  });
}

app.listen(Number(PORT), () => {
  console.info(
    `Twig server is running on ${chalk.blue(`http://localhost:${chalk.bold(PORT)}`)}`,
  );
});
