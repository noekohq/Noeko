import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { BuildingsIcon, PlusIcon } from "@phosphor-icons/react";
import type { IOrganizationSummary } from "../../../../shared/types/organization";
import PageWrapper from "@core/design/layout/PageWrapper";
import Content from "@core/design/components/Layout/Content";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";
import PaperCard from "@core/design/components/Paper/PaperCard";
import PaperThing from "@core/design/components/Paper/Things/PaperThing";
import { useApiQuery } from "@/core/hooks/useApiQuery";
import { api } from "@infrastructure/api/client";
import { showNotification } from "@mantine/notifications";

export default function Organizations() {
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const {
    data: organizations,
    isLoading,
    refetch,
  } = useApiQuery<IOrganizationSummary[]>({
    url: "/organizations",
    queryKey: ["organizations"],
  });

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug((current) =>
      current && current !== name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        ? current
        : value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
    );
  };

  const createOrganization = async () => {
    if (!name.trim() || !slug.trim()) return;
    try {
      setCreating(true);
      const response = await api.post("/organizations", { name, slug, description });
      const organization = response.data.data as IOrganizationSummary;
      await refetch();
      setOpened(false);
      setName("");
      setSlug("");
      setDescription("");
      navigate(`/organizations/${organization.slug}`);
    } catch (error) {
      console.error("Error creating organization:", error);
      showNotification({
        title: "Organization not created",
        message: "Check the name and slug, then try again.",
        color: "red",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar />
      <Content>
        <Stack gap="lg" py="md">
          <Group justify="space-between" align="center">
            <Stack gap={2}>
              <Title order={1}>Organizations</Title>
              <Text c="dimmed">Shared owners for knowledge your teams build together.</Text>
            </Stack>
            <Button leftSection={<PlusIcon />} onClick={() => setOpened(true)}>
              New organization
            </Button>
          </Group>

          {isLoading && <Loader size="sm" />}
          {!isLoading && organizations?.length === 0 && (
            <PaperCard title="No organizations yet" icon={BuildingsIcon}>
              <Text size="sm" c="dimmed">
                Create one when you are ready to give shared knowledge a durable owner.
              </Text>
            </PaperCard>
          )}
          <Stack gap="sm">
            {organizations?.map((organization) => (
              <PaperThing
                key={organization.id.toString()}
                id={organization.id.toString()}
                title={organization.name}
                detail={`${organization.membership.role === "owner" ? "Owner" : "Member"}${organization.description ? ` · ${organization.description}` : ""}`}
                icon={BuildingsIcon}
                link={`/organizations/${organization.slug}`}
              />
            ))}
          </Stack>
        </Stack>
      </Content>
      <Nav />
      <RightSidebar />

      <Modal opened={opened} onClose={() => setOpened(false)} title="Create organization" centered>
        <Stack>
          <TextInput
            label="Name"
            value={name}
            onChange={(event) => handleNameChange(event.currentTarget.value)}
            required
          />
          <TextInput
            label="Slug"
            description="Used in organization URLs"
            value={slug}
            onChange={(event) => setSlug(event.currentTarget.value.toLowerCase())}
            required
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setOpened(false)}>
              Cancel
            </Button>
            <Button
              loading={creating}
              disabled={!name.trim() || !slug.trim()}
              onClick={createOrganization}
            >
              Create organization
            </Button>
          </Group>
        </Stack>
      </Modal>
    </PageWrapper>
  );
}
