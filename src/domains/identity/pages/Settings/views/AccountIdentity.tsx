import { Stack, Text, Title, Group, Modal, TextInput } from "@mantine/core";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { Link, useNavigate } from "react-router";
import PaperCard from "@core/design/components/Paper/PaperCard";
import PaperButton from "@core/design/components/Paper/PaperButton";
import PaperThing from "@core/design/components/Paper/Things/PaperThing";
import useFetch from "@core/hooks/useFetch";
import { showNotification } from "@mantine/notifications";
import React, { useState } from "react";
import { UserCircleIcon, SignOutIcon, WarningIcon } from "@phosphor-icons/react";
import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";

import classes from "../Settings.module.scss";

export default function AccountIdentity() {
  const { i18n } = useLingui();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { load: deleteAccount, loading: loadingDeletion } = useFetch({
    url: "/users/me",
    method: "DELETE",
    onSuccess: () => {
      showNotification({
        title: i18n._(t`Account deleted`),
        message: i18n._(t`Your account has been deleted`),
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
    await deleteAccount();
    logout();
  };

  return (
    <Stack gap="lg" className={classes.fadeIn}>
      <Stack gap="xs">
        <Title order={2}>
          <Trans>Account & Identity</Trans>
        </Title>
        <Text c="dimmed">
          <Trans>Manage your profile and authentication settings.</Trans>
        </Text>
      </Stack>

      <PaperCard title={i18n._(t`Profile`)} icon={UserCircleIcon}>
        <PaperThing
          id="profile"
          title={i18n._(t`Edit Profile`)}
          detail={i18n._(t`Update your name, email, and password`)}
          icon={UserCircleIcon}
          onClick={() => navigate("/settings/profile")}
        />
        <PaperThing
          id="logout"
          title={i18n._(t`Log out`)}
          detail={i18n._(t`Sign out of this device`)}
          icon={SignOutIcon}
          onClick={logout}
        />
      </PaperCard>

      <PaperCard title={i18n._(t`Danger Zone`)} icon={WarningIcon} variant="danger">
        <Stack gap="md">
          <Text size="sm">
            <Trans>
              Deleting your account is permanent. All associated data will be lost and cannot be
              recovered.
            </Trans>
          </Text>
          <PaperButton
            variant="danger"
            onClick={() => setConfirmingDelete(true)}
            loading={loadingDeletion}
          >
            <Trans>Delete Account</Trans>
          </PaperButton>
        </Stack>
      </PaperCard>

      <Modal
        opened={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={
          <Text size="sm" fw="bold" c="red">
            <Trans>DELETE ACCOUNT</Trans>
          </Text>
        }
      >
        <Stack gap="md">
          <Text size="sm">
            <Trans>
              Are you <strong>absolutely sure</strong> you want to delete your account?
            </Trans>
          </Text>
          <Text size="sm">
            <Trans>
              This action cannot be undone, and all of your associated account data will be deleted.
            </Trans>
          </Text>
          <Text size="sm">
            <Trans>In order to delete your account, type "{confirmationText}"</Trans>
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
              disabled={!confirmed || loadingDeletion}
            >
              <Trans>Delete Forever</Trans>
            </PaperButton>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
