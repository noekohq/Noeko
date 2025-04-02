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
} from "@mantine/core";
import useFetch from "../../hooks/useFetch";
import { useForm } from "@mantine/form";
import { Link, useNavigate } from "react-router";
import { ISafeUser } from "../../../app/database/models/user";
import { useAuth } from "../../contexts/AuthContext";
import { showNotification } from "@mantine/notifications";

export default function Login() {
  const navigate = useNavigate();
  const { setTokens, loadUser } = useAuth();

  const loginForm = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) =>
        value.length >= 6 ? null : "Password must be at least 6 characters",
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
      setTokens(data.accessToken, data.refreshToken);
      showNotification({
        title: "Login Successful",
        message: "Welcome back!",
      });
      loadUser().then(() => {
        navigate("/");
      });
    },
  });

  const handleLogin = async () => {
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
  };

  return (
    <Container
      style={{
        width: "100%",
        height: "100vh",
      }}
    >
      <Flex justify="center" align="center" h="100%">
        <Card w={{ sm: "190vw", md: "50vw", lg: "30vw" }} p="lg">
          <Grid>
            {loadingLogin && (
              <Grid.Col span={12}>
                <Loader />
              </Grid.Col>
            )}
            <Grid.Col span={12}>
              <Title>Login</Title>
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
                <Link to="/register">
                  <Button variant="light">Create an account</Button>
                </Link>
                <Button
                  onClick={() => {
                    handleLogin();
                  }}
                >
                  Login
                </Button>
              </Group>
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Group justify="center">
                <Text size="sm">
                  <Link to="/forgot-password">Forgot password?</Link>
                </Text>
              </Group>
            </Grid.Col>
          </Grid>
        </Card>
      </Flex>
    </Container>
  );
}
