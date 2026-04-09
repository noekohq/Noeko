import {
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Group,
  PasswordInput,
  Text,
  Title,
  Loader,
  Space,
} from "@mantine/core";
import useFetch from "@core/hooks/useFetch";
import { useForm } from "@mantine/form";
import { Link, useNavigate, useParams } from "react-router";
import { showNotification } from "@mantine/notifications";
import StageIndicator from "@core/design/components/Utils/StageIndicator";
import { useEffect, useState } from "react";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";

export default function ResetPassword() {
  const { i18n } = useLingui();
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [resetSuccess, setResetSuccess] = useState(false);

  const resetPasswordForm = useForm({
    initialValues: {
      password: "",
      passwordConfirmation: "",
    },
    validate: {
      password: (value) => {
        if (!value) {
          return i18n._(t`Password is required`);
        }
        if (value.length < 8) {
          return i18n._(t`Password must be at least 8 characters long`);
        }
      },
      passwordConfirmation: (value, values) => {
        if (!value) {
          return i18n._(t`Password confirmation is required`);
        }
        if (value !== values.password) {
          return i18n._(t`Passwords do not match`);
        }
      },
    },
  });

  const { load: resetPassword, loading: loadingReset } = useFetch<
    { token: string; password: string; passwordConfirmation: string },
    { message: string }
  >({
    url: "/users/reset-password",
    method: "POST",
    body: {
      token: token || "",
      password: resetPasswordForm.values.password,
      passwordConfirmation: resetPasswordForm.values.passwordConfirmation,
    },
    dependencies: [resetPasswordForm.values, token],
    onSuccess: (data) => {
      setResetSuccess(true);
      showNotification({
        title: i18n._(t`Password Reset Successful`),
        message: data.message,
      });
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    },
    onError: (err: any) => {
      console.error("Error: ", err);
    },
  });

  const handleResetPassword = async () => {
    if (resetPasswordForm.validate().hasErrors) {
      return;
    }

    if (!token) {
      showNotification({
        title: i18n._(t`Invalid Reset Link`),
        message: i18n._(t`The reset token is missing or invalid`),
        color: "red",
      });
      return;
    }

    try {
      await resetPassword();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!token) {
      showNotification({
        title: i18n._(t`Invalid Reset Link`),
        message: i18n._(t`The reset token is missing or invalid`),
        color: "red",
      });
    }
  }, [token, i18n]);

  return (
    <Container
      style={{
        width: "100%",
        height: "100vh",
      }}
    >
      <Flex direction="column" justify="center" align="center" h="100%">
        <Card w={{ xs: "90vw", sm: "50vw", lg: "30vw" }} p="lg" radius="lg">
          <Grid>
            {loadingReset && (
              <Grid.Col span={12}>
                <Loader />
              </Grid.Col>
            )}
            <Grid.Col span={12}>
              <Group>
                <Title>
                  <Trans>Set New Password</Trans>
                </Title>
              </Group>
            </Grid.Col>
            <Grid.Col span={12}>
              {!resetSuccess ? (
                <Text size="sm" c="dimmed">
                  <Trans>
                    Enter your new password below. Make sure it's at least 8 characters long.
                  </Trans>
                </Text>
              ) : (
                <Text size="sm" c="dimmed">
                  <Trans>
                    Your password has been reset successfully! You will be redirected to the login
                    page in a few seconds.
                  </Trans>
                </Text>
              )}
            </Grid.Col>
            <Space h="md" />
            {!resetSuccess && token && (
              <>
                <Grid.Col span={{ sm: 12 }}>
                  <PasswordInput
                    label={t`New Password`}
                    placeholder={t`Enter your new password`}
                    {...resetPasswordForm.getInputProps("password")}
                    withAsterisk
                  />
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }}>
                  <PasswordInput
                    label={t`Confirm New Password`}
                    placeholder={t`Confirm your new password`}
                    {...resetPasswordForm.getInputProps("passwordConfirmation")}
                    withAsterisk
                  />
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }} />
                <Grid.Col span={{ sm: 12 }}>
                  <Group justify="space-between">
                    <Button component={Link} to="/login" variant="default">
                      <Trans>Back to Login</Trans>
                    </Button>
                    <Button onClick={handleResetPassword} disabled={loadingReset}>
                      <Trans>Reset Password</Trans>
                    </Button>
                  </Group>
                </Grid.Col>
              </>
            )}
            {(resetSuccess || !token) && (
              <Grid.Col span={{ sm: 12 }}>
                <Group justify="center">
                  <Button component={Link} to="/login" variant="default">
                    <Trans>Go to Login</Trans>
                  </Button>
                </Group>
              </Grid.Col>
            )}
          </Grid>
        </Card>
      </Flex>
    </Container>
  );
}
