import {
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Group,
  PasswordInput,
  Text,
  TextInput,
  Title,
  Loader,
  Tooltip,
  Space,
} from "@mantine/core";
import useFetch from "@core/hooks/useFetch";
import { useForm } from "@mantine/form";
import { Link, useNavigate } from "react-router";
import { ISafeUser } from "../../../../../shared/types/user";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { showNotification } from "@mantine/notifications";
import { validateEmail } from "@core/utils/data";
import StageIndicator from "@core/design/components/Utils/StageIndicator";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";

export default function Login() {
  const { i18n } = useLingui();
  const navigate = useNavigate();
  const { login: loadUser } = useAuth();

  const loginForm = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: (value) => {
        if (!value) {
          return i18n._(t`Email is required`);
        }
        if (!validateEmail(value)) {
          return i18n._(t`Invalid email`);
        }
      },
      password: (value) => {
        if (!value) {
          return i18n._(t`Password is required`);
        }
      },
    },
  });

  const { load: login, loading: loadingLogin } = useFetch<
    { email: string; password: string },
    { accessToken: string; refreshToken: string; user: ISafeUser }
  >({
    url: "/users/login",
    method: "POST",
    body: {
      email: loginForm.values.email,
      password: loginForm.values.password,
    },
    dependencies: [loginForm.values],
    onSuccess: (data) => {
      loadUser(data.accessToken).then(() => {
        navigate("/");
      });
    },
    onError: (err: any) => {
      console.error("Error: ", err);
      showNotification({
        title: i18n._(t`Login Failed`),
        message: err?.response?.data?.message || i18n._(t`Something went wrong`),
        color: "red",
      });
    },
  });

  const handleLogin = loginForm.onSubmit(async () => {
    try {
      await login();
    } catch (error) {
      console.error(error);
      showNotification({
        title: i18n._(t`Login Failed`),
        message: i18n._(t`Invalid email or password`),
        color: "red",
      });
    }
  });

  return (
    <Container
      style={{
        width: "100%",
        height: "100vh",
      }}
    >
      <Flex direction="column" justify="center" align="center" h="100%">
        <Card w={{ xs: "90vw", sm: "50vw", lg: "30vw" }} p="lg" radius="lg" shadow="md">
          <form onSubmit={handleLogin}>
            <Grid>
              {loadingLogin && (
                <Grid.Col span={12}>
                  <Loader />
                </Grid.Col>
              )}
              <Grid.Col span={12}>
                <Group>
                  <Title>
                    <Trans>Login to Noeko</Trans>
                  </Title>
                  <StageIndicator />
                </Group>
              </Grid.Col>
              <Grid.Col span={12} />
              <Grid.Col span={{ sm: 12 }}>
                <TextInput
                  label={t`Email`}
                  placeholder={t`Email`}
                  {...loginForm.getInputProps("email")}
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <PasswordInput
                  label={t`Password`}
                  placeholder={t`Password`}
                  {...loginForm.getInputProps("password")}
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }} />
              <Grid.Col span={{ sm: 12 }}>
                <Group justify="right">
                  <Tooltip label={t`Coming soon...`}>
                    <Button variant="default" disabled>
                      <Trans>Create an account</Trans>
                    </Button>
                  </Tooltip>
                  <Button type="submit">
                    <Trans>Login</Trans>
                  </Button>
                </Group>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Group justify="center">
                  <Link
                    to="/forgot-password"
                    style={{
                      textDecoration: "none",
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      <Trans>Forgot password?</Trans>
                    </Text>
                  </Link>
                </Group>
              </Grid.Col>
            </Grid>
          </form>
        </Card>
      </Flex>
    </Container>
  );
}
