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

  My name is ${inviter.firstName} from Qwest, an app that helps you think better, not less.

  I'd like to invite you to join! The process is simple, just click the link below, and register!

  <a href="${DEPLOYED_URL}/register?ref=${inviter.referralCode}">Register Now</a>

  We hope to see you soon! Thanks.
  - ${inviter.firstName}
  `.trim();
};

export const passwordResetTemplate = (user: ISafeUser, resetToken: string) => {
  return `
  Hello ${user.firstName}!

  You recently requested to reset your password for your Qwest account. Click the link below to reset your password:

  <a href="${DEPLOYED_URL}/reset-password/${resetToken}">Reset Your Password</a>

  If you did not request a password reset, please ignore this email or contact support if you have questions.

  This link will expire in 1 hour for security reasons.

  Thanks,
  The Qwest Team`.trim();
};
