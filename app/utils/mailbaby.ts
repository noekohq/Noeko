import axios from "axios";
import { config } from "dotenv";
import nodemailer from "nodemailer";

config();

const {
  MAILBABY_API_KEY,
  MAILBABY_API_URL,
  MAILBABY_USERNAME,
  MAILBABY_PASSWORD,
} = process.env;

if (!MAILBABY_API_KEY) throw Error("MAILBABY_API_KEY not defined.");
if (!MAILBABY_API_URL) throw Error("MAILBABY_API_URL not defined.");
if (!MAILBABY_USERNAME) throw Error("MAILBABY_USERNAME not defined.");
if (!MAILBABY_PASSWORD) throw Error("MAILBABY_PASSWORD not defined.");

export const mailbaby = axios.create({
  baseURL: MAILBABY_API_URL,
  headers: {
    "X-API-KEY": MAILBABY_API_KEY,
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export class MailBabyService {
  private _transporter: nodemailer.Transporter;

  constructor() {
    this._transporter = nodemailer.createTransport({
      host: "relay.mailbaby.net",
      port: 587,
      secure: false, // true for 465, false for 587
      auth: {
        user: MAILBABY_USERNAME,
        pass: MAILBABY_PASSWORD,
      },
      pool: true, // use pooled connections
      maxConnections: 5, // limit concurrent connections
      maxMessages: 100, // limit messages per connection
    });

    // Verify connection configuration
    this.verifyConnection();
  }

  get transporter() {
    return this._transporter;
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.info("✅ SMTP connection verified successfully");
      return true;
    } catch (error) {
      console.error("❌ SMTP connection failed:", error);
      return false;
    }
  }
}
