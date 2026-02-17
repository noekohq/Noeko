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
import useFetch from "../../hooks/useFetch";
import { useForm } from "@mantine/form";
import { Link, useNavigate, useParams } from "react-router";
import { showNotification } from "@mantine/notifications";
import StageIndicator from "../../components/Utils/Info/StageIndicator";
import { useEffect, useState } from "react";

export default function ResetPassword() {
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
          return "Password is required";
        }
        if (value.length < 8) {
          return "Password must be at least 8 characters long";
        }
      },
      passwordConfirmation: (value, values) => {
        if (!value) {
          return "Password confirmation is required";
        }
        if (value !== values.password) {
          return "Passwords do not match";
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
        title: "Password Reset Successful",
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
        title: "Invalid Reset Link",
        message: "The reset token is missing or invalid",
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
        title: "Invalid Reset Link",
        message: "The reset token is missing or invalid",
        color: "red",
      });
    }
  }, [token]);

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
                <Title>Set New Password</Title>
              </Group>
            </Grid.Col>
            <Grid.Col span={12}>
              {!resetSuccess ? (
                <Text size="sm" c="dimmed">
                  Enter your new password below. Make sure it's at least 8 characters long.
                </Text>
              ) : (
                <Text size="sm" c="dimmed">
                  Your password has been reset successfully! You will be redirected to the login
                  page in a few seconds.
                </Text>
              )}
            </Grid.Col>
            <Space h="md" />
            {!resetSuccess && token && (
              <>
                <Grid.Col span={{ sm: 12 }}>
                  <PasswordInput
                    label="New Password"
                    placeholder="Enter your new password"
                    {...resetPasswordForm.getInputProps("password")}
                    withAsterisk
                  />
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }}>
                  <PasswordInput
                    label="Confirm New Password"
                    placeholder="Confirm your new password"
                    {...resetPasswordForm.getInputProps("passwordConfirmation")}
                    withAsterisk
                  />
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }} />
                <Grid.Col span={{ sm: 12 }}>
                  <Group justify="space-between">
                    <Button component={Link} to="/login" variant="default">
                      Back to Login
                    </Button>
                    <Button onClick={handleResetPassword} disabled={loadingReset}>
                      Reset Password
                    </Button>
                  </Group>
                </Grid.Col>
              </>
            )}
            {(resetSuccess || !token) && (
              <Grid.Col span={{ sm: 12 }}>
                <Group justify="center">
                  <Button component={Link} to="/login" variant="default">
                    Go to Login
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
