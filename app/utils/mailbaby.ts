import axios from "axios";
import { config } from "dotenv";

config();

const { MAILBABY_API_KEY, MAILBABY_API_URL } = process.env;

if (!MAILBABY_API_KEY) throw Error("MAILBABY_API_KEY not defined.");
if (!MAILBABY_API_URL) throw Error("MAILBABY_API_URL not defined.");

export const mailbaby = axios.create({
  baseURL: MAILBABY_API_URL,
  headers: {
    "X-API-KEY": MAILBABY_API_KEY,
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});
