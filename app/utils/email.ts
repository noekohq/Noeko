import { ISafeUser } from "../database/models/user";
import { mailbaby } from "./mailbaby";

const { EMAIL_FROM } = process.env;

if (!EMAIL_FROM) throw Error("EMAIL_FROM is not defined");

export const sendEmail = async (to: string, subject: string, body: string) => {
  try {
    console.log("Sending email with: ", to, EMAIL_FROM, subject, body);

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
