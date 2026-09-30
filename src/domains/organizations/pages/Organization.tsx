import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  DotsThreeIcon,
  EnvelopeIcon,
  LightbulbIcon,
  PlusIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import type {
  IOrganizationInvitationSummary,
  IOrganizationMember,
  IOrganizationMembershipStatus,
  IOrganizationRole,
  IOrganizationSummary,
} from "../../../../shared/types/organization";
import type { ISafeIdea } from "../../../../shared/types/idea";
import PageWrapper from "@core/design/layout/PageWrapper";
import Content from "@core/design/components/Layout/Content";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import PaperCard from "@core/design/components/Paper/PaperCard";
import IdeaCard from "@domains/knowledge/components/Ideas/Interactions/IdeaCard";
import { useApiQuery } from "@/core/hooks/useApiQuery";
import { api } from "@infrastructure/api/client";
import { showNotification } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { useAuth } from "@domains/identity/contexts/AuthContext";

export default function Organization() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const { data: organization, isLoading } = useApiQuery<IOrganizationSummary>({
    url: slug ? `/organizations/${slug}` : null,
    queryKey: ["organizations", slug],
  });
  const {
    data: ideas,
    isLoading: loadingIdeas,
    refetch: refetchIdeas,
  } = useApiQuery<ISafeIdea[]>({
    url: slug ? `/organizations/${slug}/ideas` : null,
    queryKey: ["organizations", slug, "ideas"],
  });
  const { data: members, refetch: refetchMembers } = useApiQuery<IOrganizationMember[]>({
    url: slug ? `/organizations/${slug}/members` : null,
    queryKey: ["organizations", slug, "members"],
  });
  const isOwner = organization?.membership.role === "owner";
  const { data: invitations, refetch: refetchInvitations } = useApiQuery<
    IOrganizationInvitationSummary[]
  >({
    url: slug && isOwner ? `/organizations/${slug}/invitations` : null,
    queryKey: ["organizations", slug, "invitations"],
    options: { enabled: !!slug && isOwner },
  });

  const request = async (callback: () => Promise<unknown>, successMessage: string) => {
    try {
      await callback();
      showNotification({ message: successMessage });
      await Promise.all([refetchMembers(), isOwner ? refetchInvitations() : Promise.resolve()]);
    } catch (error: any) {
      showNotification({
        title: "Organization not updated",
        message: error?.response?.data?.message || "Please try again.",
        color: "red",
      });
    }
  };

  const invite = async () => {
    if (!slug || !inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      const response = await api.post(
        `/organizations/${slug}/invitations`,
        { email: inviteEmail },
        { skipGlobal403Redirect: true }
      );
      showNotification({ message: response.data.message });
      setInviteEmail("");
      setInviteOpen(false);
      await refetchInvitations();
    } catch (error: any) {
      showNotification({
        title: "Invitation not sent",
        message: error?.response?.data?.message || "Please try again.",
        color: "red",
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const updateMember = (
    member: IOrganizationMember,
    changes: { role?: IOrganizationRole; status?: IOrganizationMembershipStatus }
  ) => {
    if (!slug) return;
    request(
      () =>
        api.patch(`/organizations/${slug}/members/${member.user.id.toString()}`, changes, {
          skipGlobal403Redirect: true,
        }),
      "Member updated."
    );
  };

  const removeMember = (member: IOrganizationMember) => {
    if (!slug) return;
    const name = `${member.user.firstName} ${member.user.lastName}`.trim();
    modals.openConfirmModal({
      title: `Remove ${name}?`,
      children: <Text size="sm">They will lose access granted through this organization.</Text>,
      labels: { confirm: "Remove member", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () =>
        request(
          () =>
            api.delete(`/organizations/${slug}/members/${member.user.id.toString()}`, {
              skipGlobal403Redirect: true,
            }),
          `${name} was removed.`
        ),
    });
  };

  const leaveOrganization = () => {
    if (!slug || !organization) return;
    modals.openConfirmModal({
      title: `Leave ${organization.name}?`,
      children: (
        <Text size="sm">
          You’ll lose access granted through this organization. The final active owner cannot leave.
        </Text>
      ),
      labels: { confirm: "Leave organization", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await api.post(`/organizations/${slug}/leave`, {}, { skipGlobal403Redirect: true });
          showNotification({ message: `You left ${organization.name}.` });
          navigate("/organizations");
        } catch (error: any) {
          showNotification({
            title: "Could not leave organization",
            message: error?.response?.data?.message || "Please try again.",
            color: "red",
          });
        }
      },
    });
  };

  const createIdea = async () => {
    if (!slug) return;
    try {
      setCreating(true);
      const response = await api.post(`/organizations/${slug}/ideas`, {
        title: "Untitled Idea",
        content: "",
      });
      const idea = response.data.data as ISafeIdea;
      await refetchIdeas();
      showNotification({ message: `Created for ${organization?.name || "organization"}.` });
      navigate(`/idea/${idea.id.toString()}`);
    } catch (error) {
      console.error("Error creating organization idea:", error);
      showNotification({ title: "Idea not created", message: "Please try again.", color: "red" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageWrapper>
      <Modal opened={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a member">
        <Stack>
          <Text size="sm" c="dimmed">
            We’ll email a single-use invitation that expires in seven days.
          </Text>
          <TextInput
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.currentTarget.value)}
            placeholder="person@example.com"
            autoFocus
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={invite} loading={sendingInvite} disabled={!inviteEmail.trim()}>
              Send invitation
            </Button>
          </Group>
        </Stack>
      </Modal>
      <TopBar />
      <LeftSidebar />
      <Content>
        <Stack gap="xl" py="md">
          {isLoading && <Loader size="sm" />}
          {organization && (
            <>
              <Group justify="space-between" align="flex-start">
                <Stack gap="xs">
                  <Group gap="xs">
                    <Title order={1}>{organization.name}</Title>
                    <Badge variant="light">{organization.membership.role}</Badge>
                  </Group>
                  {organization.description && <Text c="dimmed">{organization.description}</Text>}
                  <Text size="sm" c="dimmed">
                    {members?.length ?? 0} member{members?.length === 1 ? "" : "s"} · Default access{" "}
                    {organization.baseResourceRole}
                  </Text>
                </Stack>
                <Group>
                  <Button variant="subtle" color="red" onClick={leaveOrganization}>
                    Leave
                  </Button>
                  <Button leftSection={<PlusIcon />} loading={creating} onClick={createIdea}>
                    New idea for {organization.name}
                  </Button>
                </Group>
              </Group>

              <PaperCard title="Organization knowledge" icon={LightbulbIcon}>
                {loadingIdeas && <Loader size="sm" />}
                {!loadingIdeas && ideas?.length === 0 && (
                  <Text size="sm" c="dimmed">
                    No organization-owned ideas are visible to you yet.
                  </Text>
                )}
                <Stack gap="sm">
                  {ideas?.map((idea) => (
                    <IdeaCard
                      key={idea.id.toString()}
                      idea={idea}
                      badges={[{ label: organization.name }]}
                    />
                  ))}
                </Stack>
              </PaperCard>

              <PaperCard title="People" icon={UsersIcon}>
                <Stack gap="sm">
                  {isOwner && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Owners manage membership. Members can create organization knowledge.
                      </Text>
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<EnvelopeIcon />}
                        onClick={() => setInviteOpen(true)}
                      >
                        Invite member
                      </Button>
                    </Group>
                  )}
                  {members?.map((member) => (
                    <Card key={member.id.toString()} withBorder padding="sm" radius="md">
                      <Group justify="space-between" wrap="nowrap">
                        <Stack gap={2} style={{ minWidth: 0 }}>
                          <Text fw={600} truncate>
                            {`${member.user.firstName} ${member.user.lastName}`.trim()}
                            {member.user.id.toString() === user?.id.toString() ? " (you)" : ""}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Joined {new Date(member.createdAt).toLocaleDateString()}
                          </Text>
                        </Stack>
                        {isOwner ? (
                          <Group gap="xs" wrap="nowrap">
                            <Select
                              aria-label="Member role"
                              size="xs"
                              w={105}
                              value={member.role}
                              data={[
                                { value: "owner", label: "Owner" },
                                { value: "member", label: "Member" },
                              ]}
                              onChange={(role) =>
                                role && updateMember(member, { role: role as IOrganizationRole })
                              }
                            />
                            <Select
                              aria-label="Member status"
                              size="xs"
                              w={115}
                              value={member.status}
                              data={[
                                { value: "active", label: "Active" },
                                { value: "suspended", label: "Suspended" },
                              ]}
                              onChange={(status) =>
                                status &&
                                updateMember(member, {
                                  status: status as IOrganizationMembershipStatus,
                                })
                              }
                            />
                            <Menu position="bottom-end" withinPortal>
                              <Menu.Target>
                                <ActionIcon variant="subtle" aria-label="Member actions">
                                  <DotsThreeIcon />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item color="red" onClick={() => removeMember(member)}>
                                  Remove member
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        ) : (
                          <Group gap="xs">
                            <Badge variant="light">{member.role}</Badge>
                            {member.status !== "active" && (
                              <Badge color="gray">{member.status}</Badge>
                            )}
                          </Group>
                        )}
                      </Group>
                    </Card>
                  ))}

                  {isOwner && invitations?.some((item) => item.status !== "accepted") && (
                    <Stack gap="xs" mt="sm">
                      <Text fw={600}>Invitations</Text>
                      {invitations
                        .filter((invitation) => invitation.status !== "accepted")
                        .map((invitation) => (
                          <Card key={invitation.id.toString()} withBorder padding="sm" radius="md">
                            <Group justify="space-between">
                              <Stack gap={2}>
                                <Text size="sm" fw={600}>
                                  {invitation.email}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {invitation.status} · expires{" "}
                                  {new Date(invitation.expiresAt).toLocaleDateString()}
                                </Text>
                              </Stack>
                              <Group gap="xs">
                                {(invitation.status === "pending" ||
                                  invitation.status === "expired") && (
                                  <Button
                                    size="xs"
                                    variant="light"
                                    onClick={() =>
                                      request(
                                        () =>
                                          api.post(
                                            `/organizations/${slug}/invitations/${invitation.id.toString()}/resend`,
                                            {},
                                            { skipGlobal403Redirect: true }
                                          ),
                                        "Invitation resent."
                                      )
                                    }
                                  >
                                    Resend
                                  </Button>
                                )}
                                {(invitation.status === "pending" ||
                                  invitation.status === "expired") && (
                                  <Button
                                    size="xs"
                                    variant="subtle"
                                    color="red"
                                    onClick={() =>
                                      request(
                                        () =>
                                          api.delete(
                                            `/organizations/${slug}/invitations/${invitation.id.toString()}`,
                                            { skipGlobal403Redirect: true }
                                          ),
                                        "Invitation revoked."
                                      )
                                    }
                                  >
                                    Revoke
                                  </Button>
                                )}
                              </Group>
                            </Group>
                          </Card>
                        ))}
                    </Stack>
                  )}
                </Stack>
              </PaperCard>
            </>
          )}
        </Stack>
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
