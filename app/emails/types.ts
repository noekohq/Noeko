import { ISafeUser } from "../database/models/user";

const { DEPLOYED_URL } = process.env;

if (!DEPLOYED_URL) throw Error("DEPLOYED_URL not defined.");

export const invitationTemplate = (
  invitee: { email: string; firstName: string; lastName: string },
  inviter: ISafeUser,
) => {
  return `
  Hello ${invitee.firstName}!
  <br />
  <br />

  My name is ${inviter.firstName} w/ Qwest, inviting you to join the app!
  <br />
  <br />

  The process is simple, just click the link below, and register your new account.
  <br />
  <br />

  <a href="${DEPLOYED_URL}/register?ref=${inviter.referralCode}">Create my account!</a>
  <br />
  <br />

  Once you're in, here's some stuff you can expect:
  <ul>
    <li>The first page you'll see is the dashboard view, which will guide you to the other features</li>
    <li>You can import files or folders from Settings. For the purposes of the early testing phases, you can currently have up to 500 notes. This restriction will be lifted in future phases.</li>
  </ul>
  <br />
  <br />

  We are looking for as much quality feedback as possible in the early stages. In the top left of the app, you’ll see a Megaphone Icon, if you click that, you can send us feedback instantly! Don't hold back, we're making this app better together!
  <br />
  <br />

  If you have any questions or concerns, please don't hesitate to contact me at <a href="mailto:${inviter.email}">${inviter.email}</a>.
  <br />
  <br />

  Thank you for your interest and for your time, and we hope you enjoy Qwest!
  - ${inviter.firstName}
  `;
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
