import { mailbaby } from "./mailbaby";

const { EMAIL_FROM } = process.env;

export const sendEmail = async (to: string, subject: string, body: string) => {
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
