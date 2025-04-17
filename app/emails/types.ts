import { ISafeUser } from "../database/models/user";

const { DEPLOYED_URL } = process.env;

if (!DEPLOYED_URL) throw Error("DEPLOYED_URL not defined.");

export const invitationTemplate = (
  invitee: ISafeUser,
  inviter: ISafeUser,
  invitePassword: string,
) => {
  return `
  Hello ${invitee.firstName}!

  My name is ${inviter.firstName} with Qwest, a knowledge management application. I'd like to invite you to join.

  Simply go to <a href="${DEPLOYED_URL}/login">this page</a>, and use the following information to log in:

  - Email: ${invitee.email}
  - Password: ${invitePassword}

  It's recommmended that you go to <a href="${DEPLOYED_URL}/profile">your profile page</a> shortly after to change you password.

  We hope to see you soon! Thanks.`.trim();
};
