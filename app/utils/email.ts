import { ResendService } from "./resend";

const { EMAIL_FROM } = process.env;

if (!EMAIL_FROM) throw Error("EMAIL_FROM is not defined");

export const sendEmailService = new ResendService();

export const sendEmail = async (
  to: string,
  subject: string,
  body: string,
  options?: {
    from?: string;
  }
) => {
  try {
    const verified = await sendEmailService.verifyConnection();
    if (!verified) {
      throw new Error("Mail service is not connected");
    }

    await sendEmailService.sendEmail(to, subject, body, options);

    return true;
  } catch (err) {
    console.error("Error sending email: ", err);
    return false;
  }
};

/**
 * Legacy API wrapper for sending emails.
 * Now integrated with Resend for consistency across the app.
 */
export const sendEmailAPI = async (to: string, subject: string, body: string) => {
  return sendEmail(to, subject, body);
};
