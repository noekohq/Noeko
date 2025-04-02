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

export default function Register() {
  const navigate = useNavigate();
  const { setTokens, loadUser } = useAuth();

  const registerForm = useForm({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) =>
        value.length >= 6 ? null : "Password must be at least 6 characters",
      passwordConfirmation: (value, values) =>
        value === values.password ? null : "Passwords do not match",
      firstName: (value) =>
        value.length >= 2 ? null : "First name must be at least 2 characters",
      lastName: (value) =>
        value.length >= 2 ? null : "Last name must be at least 2 characters",
    },
  });

  const { load: register, loading: loadingRegister } = useFetch<
    {
      email: string;
      password: string;
      passwordConfirmation: string;
      firstName: string;
      lastName: string;
    },
    { accessToken: string; refreshToken: string; user: ISafeUser }
  >({
    url: "/users/register",
    method: "POST",
    body: {
      email: registerForm.values.email,
      password: registerForm.values.password,
      passwordConfirmation: registerForm.values.passwordConfirmation,
      firstName: registerForm.values.firstName,
      lastName: registerForm.values.lastName,
    },
    dependencies: [registerForm.values],
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      showNotification({
        title: "Registration Successful",
        message: "Welcome!",
      });
      loadUser().then(() => {
        navigate("/");
      });
    },
    onError: (error) => {
      console.error(error);
      showNotification({
        title: "Registration Failed",
        message: "An error occurred during registration",
      });
    },
  });

  const handleRegister = async () => {
    try {
      await register();
    } catch (error) {
      console.error(error);
      showNotification({
        title: "Registration Failed",
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
            {loadingRegister && (
              <Grid.Col span={12}>
                <Loader />
              </Grid.Col>
            )}
            <Grid.Col span={12}>
              <Title>Register</Title>
            </Grid.Col>
            <Grid.Col span={12} />
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                label="First name"
                placeholder="First name"
                {...registerForm.getInputProps("firstName")}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                label="Last name"
                placeholder="Last name"
                {...registerForm.getInputProps("lastName")}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                label="Email"
                placeholder="Email"
                {...registerForm.getInputProps("email")}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <PasswordInput
                label="Password"
                placeholder="Password"
                {...registerForm.getInputProps("password")}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <PasswordInput
                label="Confirm password"
                placeholder="Confirm password"
                {...registerForm.getInputProps("passwordConfirmation")}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }} />
            <Grid.Col span={{ sm: 12 }}>
              <Group justify="right">
                <Link to="/login">
                  <Button variant="light">Have an account?</Button>
                </Link>
                <Button
                  onClick={() => {
                    handleRegister();
                  }}
                >
                  Register
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </Card>
      </Flex>
    </Container>
  );
}
