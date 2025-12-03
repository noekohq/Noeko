import { ISafeUser } from "../database/models/user";
import { mailbaby, MailBabyService } from "./mailbaby";

const { EMAIL_FROM } = process.env;

if (!EMAIL_FROM) throw Error("EMAIL_FROM is not defined");

export const sendEmailAPI = async (
  to: string,
  subject: string,
  body: string,
) => {
  try {
    const response = await mailbaby.post("/mail/send", {
      to,
      from: EMAIL_FROM,
      subject,
      body,
    });

    const { data } = response;

    return true;
  } catch (err) {
    console.error("Error sending email: ", err);
    return false;
  }
};

export const sendEmailService = new MailBabyService();

export const sendEmail = async (
  to: string,
  subject: string,
  body: string,
  options?: {
    from?: string;
  },
) => {
  try {
    const verified = await sendEmailService.verifyConnection();
    if (!verified) {
      throw new Error("Mail service is not connected");
    }

    const response = await sendEmailService.transporter.sendMail({
      to,
      from: options?.from || EMAIL_FROM,
      subject,
      html: body,
    });

    console.log("Response from mail service: ", response);

    const { data } = response;

    return true;
  } catch (err) {
    console.error("Error sending email: ", err);
    return false;
  }
};
