import {
  Button,
  Container,
  Grid,
  Group,
  PasswordInput,
  TextInput,
  Title,
  Loader,
} from "@mantine/core";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { useForm } from "@mantine/form";
import { validateEmail } from "@core/utils/data";
import useFetch from "@core/hooks/useFetch";
import { IUser, IUserForm } from "../../../../../app/database/models/user";
import { showNotification } from "@mantine/notifications";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import PageWrapper from "@core/design/layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import Content from "@core/design/components/Layout/Content";
import StatusBar from "@core/design/components/Layout/Bottom";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";

export default function Profile() {
  const { i18n } = useLingui();
  const { user, reload: reloadUser } = useAuth();

  const profileForm = useForm({
    initialValues: {
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      password: "",
      newPassword: "",
      newPasswordConfirmation: "",
    },
    validate: {
      email: (value) => {
        if (!value) return i18n._(t`Email is required`);
        if (!validateEmail(value)) return i18n._(t`Invalid email`);
      },
      password: (value) => {
        if (!value) return i18n._(t`Password is required`);
        if (value.length < 8) return i18n._(t`Password must be at least 8 characters`);
      },
      newPassword: (value) => {
        if (!value) return i18n._(t`New password is required`);
        if (value.length < 8) return i18n._(t`New password must be at least 8 characters`);
      },
      newPasswordConfirmation: (value, values) => {
        if (!value) return i18n._(t`New password confirmation is required`);
        if (value !== values.password) return i18n._(t`Passwords do not match`);
      },
      firstName: (value) => {
        if (!value) return i18n._(t`First name is required`);
      },
      lastName: (value) => {
        if (!value) return i18n._(t`Last name is required`);
      },
    },
  });

  const { load: updateUser, loading: loadingProfile } = useFetch<Partial<IUserForm>, IUser>({
    url: `/users/me`,
    method: "PUT",
    body: profileForm.getTransformedValues(),
    dependencies: [profileForm.getTransformedValues()],
    onSuccess: (data, message) => {
      showNotification({
        title: i18n._(t`Success`),
        message: message || i18n._(t`Profile updated successfully`),
      });
      reloadUser();
    },
    onError: (error: any) => {
      showNotification({
        title: i18n._(t`Error`),
        message: error?.response?.data?.message || i18n._(t`Something went wrong`),
        color: "red",
      });
    },
  });

  const handleSave = async () => {
    await updateUser();
  };

  return (
    <PageWrapper>
      <TopBar />
      <LeftSidebar />
      <Content>
        <Grid>
          <Grid.Col span={12}>
            <Title order={1}>
              <Trans>Profile</Trans>
            </Title>
          </Grid.Col>
          <Grid.Col span={12}>
            <Title order={3}>
              <Trans>Your name is...</Trans>
            </Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <TextInput
              label={i18n._(t`First name`)}
              placeholder={i18n._(t`First name`)}
              {...profileForm.getInputProps("firstName")}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <TextInput
              label={i18n._(t`Last name`)}
              placeholder={i18n._(t`Last name`)}
              {...profileForm.getInputProps("lastName")}
            />
          </Grid.Col>
          <Grid.Col span={12} />
          <Grid.Col span={12}>
            <Title order={3}>
              <Trans>Your email is...</Trans>
            </Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <TextInput
              label={i18n._(t`Email`)}
              placeholder={i18n._(t`Email`)}
              {...profileForm.getInputProps("email")}
            />
          </Grid.Col>
          <Grid.Col span={12} />
          <Grid.Col span={12}>
            <Title order={3}>
              <Trans>Update Password</Trans>
            </Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <PasswordInput
              label={i18n._(t`New password`)}
              placeholder={i18n._(t`New password`)}
              {...profileForm.getInputProps("newPassword")}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <PasswordInput
              label={i18n._(t`Confirm password`)}
              placeholder={i18n._(t`Confirm password`)}
              {...profileForm.getInputProps("newPasswordConfirmation")}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <PasswordInput
              name="password"
              label={i18n._(t`Current Password`)}
              placeholder={i18n._(t`Current Password`)}
              {...profileForm.getInputProps("password")}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Group justify="right">
              <Button
                leftSection={loadingProfile ? <Loader size="sm" /> : null}
                onClick={handleSave}
              >
                <Trans>Save</Trans>
              </Button>
            </Group>
          </Grid.Col>
        </Grid>
      </Content>
      <Nav />
      <RightSidebar />
    </PageWrapper>
  );
}
