import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { ISafeUser } from "../../../shared/types/user";

interface InvitationEmailProps {
  invitee: { email: string; firstName: string; lastName: string };
  inviter: ISafeUser;
  deployedUrl: string;
}

export const InvitationEmail = ({ invitee, inviter, deployedUrl }: InvitationEmailProps) => {
  const previewText = `Join Noeko - Invited by ${inviter.firstName}`;

  // Replace with your actual hosted logo URL
  const logoUrl = `${deployedUrl}/static/noeko-logo.png`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo Placeholder */}
          <Img src={logoUrl} width="40" height="40" alt="Noeko Logo" style={logo} />

          <Heading style={h1}>Hello {invitee.firstName}!</Heading>
          <Text style={text}>
            My name is {inviter.firstName} w/ Noeko, inviting you to join the app!
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={`${deployedUrl}/register?ref=${inviter.referralCode}`}>
              Create my account!
            </Button>
          </Section>

          <Text style={text}>Once you're in, here's some stuff you can expect:</Text>

          <ul style={list}>
            <li style={listItem}>
              The first page you'll see is the dashboard view, which will guide you to the other
              features.
            </li>
            <li style={listItem}>
              You can import files or folders from Settings. For the purposes of the early testing
              phases, you can currently have up to 500 notes. This restriction will be lifted in
              future phases.
            </li>
          </ul>

          <Text style={text}>
            We are looking for as much quality feedback as possible in the early stages. In the top
            left of the app, you’ll see a Megaphone Icon. If you click that, you can send us
            feedback instantly! Don't hold back, we're making this app better together!
          </Text>

          <Text style={text}>
            If you have any questions or concerns, please don't hesitate to contact me at{" "}
            <Link href={`mailto:${inviter.email}`} style={link}>
              {inviter.email}
            </Link>
            .
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Thank you for your interest and for your time, and we hope you enjoy Noeko!
            <br />- {inviter.firstName}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default InvitationEmail;

// --- Dark Mode Styles ---

const main = {
  backgroundColor: "#1d2021", // Gruvbox dark[9]
  fontFamily:
    '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
  padding: "40px 0",
};

const container = {
  backgroundColor: "#282828", // Gruvbox dark[8]
  border: "1px solid #504945", // Gruvbox dark[7]
  borderRadius: "8px",
  margin: "0 auto",
  padding: "40px",
  width: "580px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
};

const logo = {
  margin: "0 0 20px 0",
  borderRadius: "4px",
};

const h1 = {
  color: "#fbf1c7", // Gruvbox dark[0]
  fontFamily: '"Bricolage Grotesque", -apple-system, sans-serif',
  fontSize: "24px",
  fontWeight: "600",
  padding: "0",
  margin: "0 0 16px 0",
};

const text = {
  color: "#ebdbb2", // Gruvbox dark[1]
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 16px 0",
};

const list = {
  margin: "0 0 16px 0",
  padding: "0 0 0 24px", // Standard left padding for bullets
};

const listItem = {
  color: "#ebdbb2", // Gruvbox dark[1]
  fontSize: "16px",
  lineHeight: "26px",
  marginBottom: "8px",
};

const buttonContainer = {
  padding: "16px 0 32px",
};

const button = {
  backgroundColor: "#504945", // Gruvbox dark[7]
  borderRadius: "12px",
  color: "#fbf1c7",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  border: "1px solid #7c6f64", // Gruvbox dark[5]
};

const link = {
  color: "#88c8cb", // Gruvbox dark blue[3] for strong contrast
  textDecoration: "underline",
  fontWeight: "500",
};

const hr = {
  borderColor: "#504945", // Matches container border
  margin: "24px 0",
};

const footer = {
  color: "#a89984", // Gruvbox dark[4]
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};
