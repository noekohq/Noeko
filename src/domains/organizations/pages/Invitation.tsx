import { useState } from "react";
import { Button, Card, Center, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { Link, useNavigate, useParams } from "react-router";
import type { IOrganizationInvitationPreview } from "../../../../shared/types/organization";
import { useApiQuery } from "@/core/hooks/useApiQuery";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { api } from "@infrastructure/api/client";

export default function Invitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { loggedIn, user } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const {
    data: invitation,
    isLoading,
    error,
  } = useApiQuery<IOrganizationInvitationPreview>({
    url: token ? `/organizations/invitations/${encodeURIComponent(token)}` : null,
    queryKey: ["organization-invitation", token],
    options: { retry: false },
  });

  const accept = async () => {
    if (!token || !invitation) return;
    try {
      setAccepting(true);
      await api.post(
        `/organizations/invitations/${encodeURIComponent(token)}/accept`,
        {},
        { skipGlobal403Redirect: true }
      );
      showNotification({ message: `You joined ${invitation.organization.name}.` });
      navigate(`/organizations/${invitation.organization.slug}`);
    } catch (acceptError: any) {
      showNotification({
        title: "Invitation not accepted",
        message: acceptError?.response?.data?.message || "Please try again.",
        color: "red",
      });
    } finally {
      setAccepting(false);
    }
  };

  const invitationPath = `/invitations/${encodeURIComponent(token || "")}`;
  const emailMismatch =
    loggedIn && user && invitation && user.email.toLowerCase() !== invitation.email.toLowerCase();

  return (
    <Center mih="100vh" p="md" w="100%">
      <Card w={{ base: "100%", sm: 520 }} p="xl" radius="lg" shadow="md">
        {isLoading && <Loader size="sm" />}
        {!isLoading && (error || !invitation) && (
          <Stack>
            <Title order={2}>This invitation is no longer available</Title>
            <Text c="dimmed">It may have expired, been revoked, or already been accepted.</Text>
            <Button component={Link} to="/" variant="light">
              Go to Noeko
            </Button>
          </Stack>
        )}
        {invitation && (
          <Stack gap="lg">
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Organization invitation
              </Text>
              <Title order={2}>Join {invitation.organization.name}</Title>
              <Text>
                {invitation.inviter.firstName} {invitation.inviter.lastName} invited{" "}
                {invitation.email} to join as a member.
              </Text>
              {invitation.organization.description && (
                <Text c="dimmed">{invitation.organization.description}</Text>
              )}
            </Stack>

            {emailMismatch && (
              <Text c="red" size="sm">
                You are signed in as {user.email}. Sign in with {invitation.email} to accept this
                invitation.
              </Text>
            )}

            {loggedIn ? (
              <Group justify="flex-end">
                <Button onClick={accept} loading={accepting} disabled={!!emailMismatch}>
                  Join organization
                </Button>
              </Group>
            ) : (
              <Group justify="flex-end">
                <Button
                  component={Link}
                  to={`/login?redirect=${encodeURIComponent(invitationPath)}`}
                  variant="light"
                >
                  Sign in
                </Button>
                <Button component={Link} to={`/register?invite=${encodeURIComponent(token || "")}`}>
                  Create account
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </Card>
    </Center>
  );
}
