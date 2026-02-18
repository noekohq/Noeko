import { Resend } from "resend";
import { config } from "dotenv";

config();

const { RESEND_API_KEY, EMAIL_FROM } = process.env;

if (!RESEND_API_KEY) {
  console.warn("RESEND_API_KEY is not defined. Email functionality will be disabled.");
}

export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export class ResendService {
  private client: Resend | null;

  constructor() {
    this.client = resend;
  }

  /**
   * Resend doesn't have a direct 'verify' like nodemailer,
   * so we just check if the client was initialized.
   */
  async verifyConnection() {
    return !!this.client;
  }

  async sendEmail(to: string, subject: string, body: string, options?: { from?: string }) {
    if (!this.client) {
      throw new Error("Resend client is not initialized. Check RESEND_API_KEY.");
    }

    const { data, error } = await this.client.emails.send({
      from: options?.from || EMAIL_FROM || "onboarding@resend.dev",
      to,
      subject,
      html: body,
    });

    if (error) {
      throw error;
    }

    return data;
  }
}
