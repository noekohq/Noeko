import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link, // Added Link import
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { ISafeUser } from "../../../shared/types/user";

interface PasswordResetEmailProps {
  user: ISafeUser;
  resetToken: string;
  deployedUrl: string;
  landingUrl: string;
}

export const PasswordResetEmail = ({
  user,
  resetToken,
  deployedUrl,
  landingUrl,
}: PasswordResetEmailProps) => {
  const previewText = "Reset your Noeko password";
  const resetLink = `${deployedUrl}/reset-password/${resetToken}`;

  // Replace with your actual hosted logo URL
  const logoUrl = `${landingUrl}/assets/logo.png`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo Placeholder */}
          <Img src={logoUrl} width="40" height="40" alt="Noeko Logo" style={logo} />

          <Heading style={h1}>Hello {user.firstName}!</Heading>
          <Text style={text}>
            You recently requested to reset your password for your Noeko account. Click the button
            below to reset your password:
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={resetLink}>
              Reset Your Password
            </Button>
          </Section>

          <Text style={text}>
            If you did not request a password reset, please ignore this email or contact{" "}
            <Link href="mailto:support@noeko.app" style={link}>
              support
            </Link>{" "}
            if you have questions.
          </Text>
          <Text style={text}>This link will expire in 1 hour for security reasons.</Text>

          <Hr style={hr} />

          <Text style={footer}>
            Thanks,
            <br />
            The Noeko Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PasswordResetEmail;

// --- Dark Mode Styles ---

const main = {
  backgroundColor: "#1d2021", // Gruvbox dark[9] background
  fontFamily:
    '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
  padding: "40px 0",
};

const container = {
  backgroundColor: "#282828", // Gruvbox dark[8] card background
  border: "1px solid #504945", // Subtle border using dark[7]
  borderRadius: "8px",
  margin: "0 auto",
  padding: "40px",
  width: "580px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)", // Deeper shadow for dark mode
};

const logo = {
  margin: "0 0 20px 0",
  borderRadius: "4px",
};

const h1 = {
  color: "#fbf1c7", // Gruvbox dark[0] (lightest text)
  fontFamily: '"Bricolage Grotesque", -apple-system, sans-serif',
  fontSize: "24px",
  fontWeight: "600",
  padding: "0",
  margin: "0 0 16px 0",
};

const text = {
  color: "#ebdbb2", // Gruvbox dark[1] for standard body text
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 16px 0",
};

// Added the link style
const link = {
  color: "#88c8cb", // Gruvbox dark blue[3] for strong contrast
  textDecoration: "underline",
  fontWeight: "500",
};

const buttonContainer = {
  padding: "16px 0 32px",
};

const button = {
  backgroundColor: "#504945", // Elevated button color (dark[7]) to stand out from the card
  borderRadius: "12px",
  color: "#fbf1c7", // Brightest text for contrast
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  border: "1px solid #7c6f64", // Subtle lighter border (dark[5])
};

const hr = {
  borderColor: "#504945", // Matches container border
  margin: "24px 0",
};

const footer = {
  color: "#a89984", // Muted text for footer (dark[4])
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};
