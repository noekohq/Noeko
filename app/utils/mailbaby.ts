import axios from "axios";
import { config } from "dotenv";

config();

const { MAILBABY_API_KEY, MAILBABY_API_URL } = process.env;

export const mailbaby = axios.create({
  baseURL: MAILBABY_API_URL,
  headers: {
    "X-API-KEY": MAILBABY_API_KEY,
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});
