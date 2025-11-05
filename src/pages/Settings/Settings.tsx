import {
  Button,
  Card,
  Container,
  CopyButton,
  Divider,
  Grid,
  Group,
  List,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import { useSettings } from "../../contexts/SettingsContext";
import { IThemeSpec } from "../../declarations/themes";
import { Link, useNavigate } from "react-router";
import Content from "../../components/UI/Layout/Content";
import StatusBar from "../../components/UI/Layout/Bottom";
import {
  CheckIcon,
  CopyIcon,
  DiscordLogoIcon,
  DownloadIcon,
  KeyReturnIcon,
  LightbulbIcon,
  RedditLogoIcon,
  Tag,
  TagIcon,
  TrashIcon,
  UploadIcon,
} from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";
import React, { useState } from "react";
import ContentWide from "../../components/UI/Layout/ContentWide";
import useFetch from "../../hooks/useFetch";
import { handleLogout } from "../../server/auth";
import { showNotification } from "@mantine/notifications";
import Nav from "../../components/UI/Layout/Nav";

const AppearanceSettings = () => {
  const {
    ui: {
      theme: {
        bodyFont: { get: bodyFont, set: setBodyFont },
        scheme: { get: scheme, set: setScheme },
        override: { get: override, set: setOverride },
      },
    },
  } = useSettings();

  const themeData = [
    {
      label: "Default",
      value: "noeko" as const,
      disabled: override === "noeko",
    },
    {
      label: "Nord",
      value: "nord" as const,
      disabled: override === "nord",
    },
    {
      label: "Pink Lady",
      value: "pinkLady" as const,
      disabled: override === "pinkLady",
    },
  ];

  const schemeData = [
    { label: "Dark", value: "dark" as const },
    { label: "Light", value: "light" as const },
    { label: "Auto", value: "auto" as const },
  ];

  const fontData = [
    { label: "Sans-Serif", value: "sans-serif" as const },
    { label: "Serif", value: "serif" as const },
  ];

  return (
    <Card withBorder radius="lg">
      <Stack>
        <Title order={3}>Appearance</Title>
        <Text size="sm" c="dimmed">
          Customize the look and feel of the application.
        </Text>
        <Select
          label="Theme"
          description="Select a theme for the application."
          value={override}
          data={themeData}
          onChange={(v) => setOverride(v as IThemeSpec["override"])}
        />
        <Select
          label="Color Scheme"
          description="Choose between dark, light, or system default."
          value={scheme}
          data={schemeData}
          onChange={(v) => setScheme(v as IThemeSpec["scheme"])}
        />
        <Select
          label="Body Font"
          description="Select the primary font for reading."
          value={bodyFont}
          data={fontData}
          onChange={(v) => setBodyFont(v as IThemeSpec["bodyFont"])}
        />
      </Stack>
    </Card>
  );
};

const AccountSettings = () => {
  const { load: deleteAccount, loading: loadingDeletion } = useFetch({
    url: "/users/me",
    method: "DELETE",
    onSuccess: () => {
      showNotification({
        title: "Account deleted",
        message: "Your account has been deleted",
        color: "green",
      });
    },
  });

  const { user, logout } = useAuth();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const confirmationText = user
    ? `DELETE ${user.firstName.toUpperCase()} ${user.lastName.toUpperCase()}`
    : "";
  const confirmed = confirmationInput === confirmationText;

  const handleConfirm = async () => {
    if (!confirmed) {
      showNotification({
        title: "Confirmation required",
        message: "Please enter the correct confirmation text",
        color: "red",
      });
      return;
    }
    await deleteAccount();
    logout();
  };

  return (
    <Card withBorder radius="lg">
      <Stack>
        <Title order={3}>Account</Title>
        <Text size="sm" c="dimmed">
          Manage your profile and account settings.
        </Text>
        <Group>
          <Button
            variant="light"
            color="gray"
            onClick={() => {
              logout();
            }}
          >
            Logout
          </Button>
          <Link to="profile">
            <Button variant="light" color="gray">
              Profile
            </Button>
          </Link>
          <Button
            variant="filled"
            color="red"
            onClick={() => setConfirmingDelete(true)}
            loading={loadingDeletion}
          >
            Delete Account
          </Button>
        </Group>
      </Stack>
      <Modal
        opened={confirmingDelete}
        onClose={() => {
          setConfirmingDelete(false);
        }}
        title={<Text size="sm">DELETE ACCOUNT</Text>}
      >
        <Stack>
          <Text size="sm">
            Are you <strong>absolutely sure</strong> you want to delete your
            account?
          </Text>
          <Text size="sm">
            This action cannot be undone, and all of your associated account
            data will be deleted.
          </Text>
          <Text size="sm">
            In order to delete your account, type "{confirmationText}"
          </Text>
          <TextInput
            placeholder={confirmationText}
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
          />
          <Group justify="flex-end">
            <Button
              onClick={() => {
                setConfirmingDelete(false);
              }}
              variant="light"
              color="gray"
            >
              No, Cancel
            </Button>
            <Button
              onClick={() => {
                handleConfirm();
              }}
              variant="filled"
              color="red"
              disabled={confirmationInput !== confirmationText}
            >
              <Text size="sm">
                Yes, <strong>Delete Forever</strong>
              </Text>
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
};

const DataSettings = () => {
  const { load: deleteStuff, loading: deletingStuff } = useFetch({
    url: "/users/me/stuff",
    method: "DELETE",
    onSuccess: () => {
      showNotification({
        title: "Success",
        message: "Your data has been deleted",
        color: "green",
      });
    },
  });

  const { user, logout } = useAuth();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const confirmationText = user
    ? `DELETE ${user.firstName.toUpperCase()} ${user.lastName.toUpperCase()}`
    : "";
  const confirmed = confirmationInput === confirmationText;

  const handleConfirm = async () => {
    if (!confirmed) {
      showNotification({
        title: "Confirmation required",
        message: "Please enter the correct confirmation text",
        color: "red",
      });
      return;
    }
    await deleteStuff();
  };

  return (
    <Card withBorder radius="lg">
      <Stack>
        <Title order={3}>Data Management</Title>
        <Text size="sm" c="dimmed">
          Manage your data. Your data is always yours :)
        </Text>
        <Group>
          <Link to="/tags">
            <Button
              variant="light"
              color="gray"
              leftSection={<TagIcon weight="bold" />}
            >
              Tags
            </Button>
          </Link>
          <Link to="/import">
            <Button
              variant="light"
              color="gray"
              leftSection={<UploadIcon weight="bold" />}
            >
              Import Ideas
            </Button>
          </Link>
          <Link to="/export">
            <Button
              variant="light"
              color="gray"
              leftSection={<DownloadIcon weight="bold" />}
            >
              Export Stuff
            </Button>
          </Link>
          <Button
            variant="light"
            color="red"
            onClick={() => {
              setConfirmingDelete(true);
            }}
            leftSection={<TrashIcon weight="bold" />}
          >
            Delete Stuff
          </Button>
        </Group>
      </Stack>
      <Modal
        opened={confirmingDelete}
        onClose={() => {
          setConfirmingDelete(false);
        }}
        title={<Text size="sm">DELETE STUFF</Text>}
      >
        <Stack>
          <Text size="sm">
            Are you <strong>absolutely sure</strong> you want to delete your
            stuff?
          </Text>
          <Text size="sm">
            This action cannot be undone, and all of your data will be deleted,{" "}
            <strong>except for your account.</strong>
          </Text>
          <Text size="sm">
            In order to delete your stuff, type "{confirmationText}"
          </Text>
          <TextInput
            placeholder={confirmationText}
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
          />
          <Group justify="flex-end">
            <Button
              onClick={() => {
                setConfirmingDelete(false);
              }}
              variant="light"
              color="gray"
            >
              No, Cancel
            </Button>
            <Button
              onClick={() => {
                handleConfirm();
              }}
              variant="filled"
              color="red"
              disabled={confirmationInput !== confirmationText}
            >
              <Text size="sm">
                Yes, <strong>Delete Stuff</strong>
              </Text>
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
};

const ActivitySettings = () => (
  <Card withBorder radius="lg">
    <Stack>
      <Title order={3}>Your Activity</Title>
      <Text size="sm" c="dimmed">
        Review your activity across the application.
      </Text>
      <Group>
        <Link to="/spyglass/history">
          <Button variant="default">Spyglass History</Button>
        </Link>
      </Group>
    </Stack>
  </Card>
);

const SharingSettings = () => {
  const { referralLink } = useAuth();
  return (
    <Card withBorder radius="lg">
      <Stack>
        <Title order={3}>Sharing</Title>
        <Text size="sm" c="dimmed">
          Share ideas with others and get rewarded.
        </Text>
        <Group>
          {referralLink && (
            <CopyButton value={referralLink}>
              {({ copied, copy }) => (
                <Button
                  onClick={copy}
                  variant="default"
                  leftSection={
                    copied ? (
                      <CheckIcon weight="bold" />
                    ) : (
                      <CopyIcon weight="bold" />
                    )
                  }
                >
                  Copy Referral Link
                </Button>
              )}
            </CopyButton>
          )}
          <Link to="/ideas/shared">
            <Button variant="default" leftSection={<LightbulbIcon />}>
              Shared Ideas
            </Button>
          </Link>
        </Group>
      </Stack>
    </Card>
  );
};

const InteractionSettings = () => {
  return (
    <Card withBorder radius="lg">
      <Stack>
        <Title order={3}>Interactions</Title>
        <Text size="sm" c="dimmed">
          Use Noeko to its full potential!
        </Text>
        <Group>
          <Link to="/keymap">
            <Button variant="default" leftSection={<KeyReturnIcon />}>
              Keymap
            </Button>
          </Link>
        </Group>
      </Stack>
    </Card>
  );
};

const CommunitySettings = () => (
  <Card withBorder radius="lg">
    <Stack>
      <Title order={3}>Community</Title>
      <Text size="sm" c="dimmed">
        Join the conversation and get help.
      </Text>
      <Group>
        <a
          href="https://discord.gg/TY9sna9ZbT"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            variant="default"
            leftSection={<DiscordLogoIcon weight="fill" />}
          >
            Join the Discord
          </Button>
        </a>
        <a
          href="https://reddit.com/r/noeko"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            variant="default"
            leftSection={<RedditLogoIcon weight="fill" />}
          >
            Check out the Subreddit
          </Button>
        </a>
      </Group>
    </Stack>
  </Card>
);

export default function Settings() {
  return (
    <PageWrapper>
      <LeftSidebar />
      <ContentWide>
        <Container fluid p="md">
          <Stack gap="lg">
            <Title>Settings</Title>
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack>
                  <AppearanceSettings />
                  <DataSettings />
                  <CommunitySettings />
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack>
                  <AccountSettings />
                  <ActivitySettings />
                  <SharingSettings />
                  <InteractionSettings />
                </Stack>
              </Grid.Col>
            </Grid>
          </Stack>
        </Container>
      </ContentWide>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
