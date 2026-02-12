import {
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Group,
  Text,
  TextInput,
  Title,
  Loader,
  Space,
} from "@mantine/core";
import useFetch from "../../hooks/useFetch";
import { useForm } from "@mantine/form";
import { Link } from "react-router";
import { showNotification } from "@mantine/notifications";
import { validateEmail } from "../../utils/data";
import StageIndicator from "../../components/Utils/Info/StageIndicator";
import { useState } from "react";

export default function ForgotPassword() {
  const [emailSent, setEmailSent] = useState(false);

  const forgotPasswordForm = useForm({
    initialValues: {
      email: "",
    },
    validate: {
      email: (value) => {
        if (!value) {
          return "Email is required";
        }
        if (!validateEmail(value)) {
          return "Invalid email";
        }
      },
    },
  });

  const { load: sendResetEmail, loading: loadingSendReset } = useFetch<
    { email: string },
    { message: string }
  >({
    url: "/users/forgot-password",
    method: "POST",
    body: {
      email: forgotPasswordForm.values.email,
    },
    dependencies: [forgotPasswordForm.values],
    onSuccess: (data) => {
      setEmailSent(true);
      showNotification({
        title: "Reset Email Sent",
        message: data.message,
      });
    },
    onError: (err: any) => {
      console.error("Error: ", err);
    },
  });

  const handleSendReset = async () => {
    if (forgotPasswordForm.validate().hasErrors) {
      return;
    }

    try {
      await sendResetEmail();
    } catch (error) {
      console.error(error);
    }
  };

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
            {loadingSendReset && (
              <Grid.Col span={12}>
                <Loader />
              </Grid.Col>
            )}
            <Grid.Col span={12}>
              <Group>
                <Title>Reset Password</Title>
              </Group>
            </Grid.Col>
            <Grid.Col span={12}>
              {!emailSent ? (
                <Text size="sm" c="dimmed">
                  Enter your email address and we'll send you a link to reset your password.
                </Text>
              ) : (
                <Text size="sm" c="dimmed">
                  If an account with that email exists, we've sent you a password reset link. Check
                  your email and follow the instructions to reset your password.
                </Text>
              )}
            </Grid.Col>
            <Space h="md" />
            {!emailSent && (
              <>
                <Grid.Col span={{ sm: 12 }}>
                  <TextInput
                    label="Email"
                    placeholder="Enter your email address"
                    {...forgotPasswordForm.getInputProps("email")}
                    withAsterisk
                  />
                </Grid.Col>
                <Grid.Col span={{ sm: 12 }} />
                <Grid.Col span={{ sm: 12 }}>
                  <Group justify="space-between">
                    <Button component={Link} to="/login" variant="default">
                      Back to Login
                    </Button>
                    <Button onClick={handleSendReset} disabled={loadingSendReset}>
                      Send Reset Link
                    </Button>
                  </Group>
                </Grid.Col>
              </>
            )}
            {emailSent && (
              <Grid.Col span={{ sm: 12 }}>
                <Group justify="center">
                  <Button component={Link} to="/login" variant="default">
                    Back to Login
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
