import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface OrganizationInvitationEmailProps {
  organizationName: string;
  inviterName: string;
  invitationUrl: string;
  expiresAt: Date;
}

export const OrganizationInvitationEmail = ({
  organizationName,
  inviterName,
  invitationUrl,
  expiresAt,
}: OrganizationInvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>
      {inviterName} invited you to {organizationName} on Noeko
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Join {organizationName}</Heading>
        <Text style={text}>
          {inviterName} invited you to collaborate in the {organizationName} organization on Noeko.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={invitationUrl}>
            View invitation
          </Button>
        </Section>
        <Text style={muted}>
          This invitation is single-use and expires{" "}
          {expiresAt.toLocaleDateString("en-US", {
            dateStyle: "long",
          })}
          . If you were not expecting it, you can ignore this email.
        </Text>
        <Hr style={hr} />
        <Text style={muted}>Noeko · Shared knowledge with a durable owner</Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#1d2021",
  fontFamily: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  padding: "40px 0",
};

const container = {
  backgroundColor: "#282828",
  border: "1px solid #504945",
  borderRadius: "12px",
  margin: "0 auto",
  padding: "40px",
  width: "580px",
};

const heading = { color: "#fbf1c7", fontSize: "26px", margin: "0 0 16px" };
const text = { color: "#ebdbb2", fontSize: "16px", lineHeight: "26px" };
const muted = { color: "#a89984", fontSize: "14px", lineHeight: "22px" };
const buttonContainer = { padding: "16px 0 28px" };
const button = {
  backgroundColor: "#504945",
  border: "1px solid #7c6f64",
  borderRadius: "12px",
  color: "#fbf1c7",
  fontSize: "16px",
  fontWeight: "600",
  padding: "12px 24px",
  textDecoration: "none",
};
const hr = { borderColor: "#504945", margin: "24px 0" };

export default OrganizationInvitationEmail;
