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
import useFetch from "../../hooks/useFetch";
import { useForm } from "@mantine/form";
import { Link, useNavigate } from "react-router";
import { ISafeUser } from "../../../shared/types/user";
import { useAuth } from "../../contexts/AuthContext";
import { showNotification } from "@mantine/notifications";
import { validateEmail } from "../../utils/data";
import StageIndicator from "../../components/Utils/Info/StageIndicator";

export default function Login() {
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
          return "Email is required";
        }
        if (!validateEmail(value)) {
          return "Invalid email";
        }
      },
      password: (value) => {
        if (!value) {
          return "Password is required";
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
        title: "Login Failed",
        message: err?.response?.data?.message || "Something went wrong",
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
        title: "Login Failed",
        message: "Invalid email or password",
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
                  <Title>Login to Noeko</Title>
                  <StageIndicator />
                </Group>
              </Grid.Col>
              <Grid.Col span={12} />
              <Grid.Col span={{ sm: 12 }}>
                <TextInput
                  label="Email"
                  placeholder="Email"
                  {...loginForm.getInputProps("email")}
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <PasswordInput
                  label="Password"
                  placeholder="Password"
                  {...loginForm.getInputProps("password")}
                  withAsterisk
                />
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }} />
              <Grid.Col span={{ sm: 12 }}>
                <Group justify="right">
                  <Tooltip label="Coming soon...">
                    <Button variant="default" disabled>
                      Create an account
                    </Button>
                  </Tooltip>
                  <Button type="submit">Login</Button>
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
                      Forgot password?
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
