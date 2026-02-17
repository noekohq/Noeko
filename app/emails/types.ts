import { render } from "@react-email/render";
import { ISafeUser } from "../../shared/types/user";
import { InvitationEmail } from "./templates/Invitation";
import { PasswordResetEmail } from "./templates/PasswordReset";
import React from "react";

const { DEPLOYED_URL, NOEKO_LANDING_PAGE_URL } = process.env;

if (!DEPLOYED_URL) throw Error("DEPLOYED_URL not defined.");
// if (!NOEKO_LANDING_PAGE_URL) throw Error("NOEKO_LANDING_PAGE_URL not defined.");

export const invitationTemplate = async (
  invitee: { email: string; firstName: string; lastName: string },
  inviter: ISafeUser
) => {
  const html = await render(
    React.createElement(InvitationEmail, {
      invitee,
      inviter,
      deployedUrl: DEPLOYED_URL,
    })
  );

  return {
    subject: `Join Noeko - Invited by ${inviter.firstName}`,
    html,
  };
};

export const passwordResetTemplate = async (user: ISafeUser, resetToken: string) => {
  const html = await render(
    React.createElement(PasswordResetEmail, {
      user,
      resetToken,
      deployedUrl: DEPLOYED_URL,
      landingUrl: NOEKO_LANDING_PAGE_URL || "",
    })
  );

  return {
    subject: "Reset your Noeko password",
    html,
  };
};
