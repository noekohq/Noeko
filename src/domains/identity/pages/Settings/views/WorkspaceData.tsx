import { Stack, Text, Title, Group, Modal, TextInput } from "@mantine/core";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { Link, useNavigate } from "react-router";
import PaperCard from "@core/design/components/Paper/PaperCard";
import PaperButton from "@core/design/components/Paper/PaperButton";
import PaperThing from "@core/design/components/Paper/Things/PaperThing";
import useFetch from "@core/hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import React, { useState } from "react";
import {
  DatabaseIcon,
  TagIcon,
  UploadIcon,
  DownloadIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";

import classes from "../Settings.module.scss";

export default function WorkspaceData() {
  const { i18n } = useLingui();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { load: deleteStuff, loading: deletingStuff } = useFetch({
    url: "/users/me/stuff",
    method: "DELETE",
    onSuccess: () => {
      showNotification({
        title: i18n._(t`Success`),
        message: i18n._(t`Your data has been deleted`),
        color: "green",
      });
    },
  });

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const confirmationText = user
    ? `DELETE ${user.firstName.toUpperCase()} ${user.lastName.toUpperCase()}`
    : "";
  const confirmed = confirmationInput === confirmationText;

  const handleConfirm = async () => {
    if (!confirmed) {
      showNotification({
        title: i18n._(t`Confirmation required`),
        message: i18n._(t`Please enter the correct confirmation text`),
        color: "red",
      });
      return;
    }
    await deleteStuff();
  };

  return (
    <Stack gap="lg" className={classes.fadeIn}>
      <Stack gap="xs">
        <Title order={2}>
          <Trans>Workspace Data</Trans>
        </Title>
        <Text c="dimmed">
          <Trans>Manage your ideas, tags, and bulk operations.</Trans>
        </Text>
      </Stack>

      <PaperCard title={i18n._(t`Management`)} icon={DatabaseIcon}>
        <PaperThing
          id="tags"
          title={i18n._(t`Tags`)}
          detail={i18n._(t`Manage workspace tags and categories`)}
          icon={TagIcon}
          onClick={() => navigate("/tags")}
        />
        <PaperThing
          id="import"
          title={i18n._(t`Import Ideas`)}
          detail={i18n._(t`Bring your data in from other platforms`)}
          icon={UploadIcon}
          onClick={() => navigate("/import")}
        />
        <PaperThing
          id="export"
          title={i18n._(t`Export Stuff`)}
          detail={i18n._(t`Download your ideas and files`)}
          icon={DownloadIcon}
          onClick={() => navigate("/export")}
        />
      </PaperCard>

      <PaperCard title={i18n._(t`Danger Zone`)} icon={WarningIcon} variant="danger">
        <Stack gap="md">
          <Text size="sm">
            <Trans>
              Deleting your workspace data will remove all ideas, connections, and files, but keep
              your account intact. This action is irreversible.
            </Trans>
          </Text>
          <PaperButton
            variant="danger"
            onClick={() => setConfirmingDelete(true)}
            loading={deletingStuff}
          >
            <Trans>Clear Workspace Data</Trans>
          </PaperButton>
        </Stack>
      </PaperCard>

      <Modal
        opened={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={
          <Text size="sm" fw="bold" c="red">
            <Trans>DELETE STUFF</Trans>
          </Text>
        }
      >
        <Stack gap="md">
          <Text size="sm">
            <Trans>
              Are you <strong>absolutely sure</strong> you want to delete your stuff?
            </Trans>
          </Text>
          <Text size="sm">
            <Trans>
              This action cannot be undone, and all of your data will be deleted,{" "}
              <strong>except for your account.</strong>
            </Trans>
          </Text>
          <Text size="sm">
            <Trans>In order to delete your stuff, type "{confirmationText}"</Trans>
          </Text>
          <TextInput
            placeholder={confirmationText}
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
          />
          <Group justify="flex-end">
            <PaperButton variant="light" onClick={() => setConfirmingDelete(false)}>
              <Trans>No, Cancel</Trans>
            </PaperButton>
            <PaperButton
              variant="danger"
              onClick={handleConfirm}
              disabled={!confirmed || deletingStuff}
            >
              <Trans>Delete Stuff</Trans>
            </PaperButton>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
