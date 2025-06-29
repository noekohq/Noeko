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
import { Link, useNavigate, useSearchParams } from "react-router";
import { ISafeUser } from "../../../app/database/models/user";
import { useAuth } from "../../contexts/AuthContext";
import { showNotification } from "@mantine/notifications";
import { validateEmail } from "../../utils/data";
import StageIndicator from "../../components/Utils/Info/StageIndicator";
import { useEffect } from "react";

export default function Register() {
  const navigate = useNavigate();
  const { setTokens, login: loadUser } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const referralCode = searchParams.get("ref");
  console.log("Invite code: ", referralCode);

  const registerForm = useForm({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      passwordConfirmation: "",
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
        if (value.length < 6) {
          return "Password must be at least 6 characters";
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
      firstName: (value) => {
        if (!value) {
          return "First name is required";
        }
        if (value.length < 2) {
          return "First name must be at least 2 characters";
        }
      },
      lastName: (value) => {
        if (!value) {
          return "Last name is required";
        }
        if (value.length < 2) {
          return "Last name must be at least 2 characters";
        }
      },
    },
  });

  const { load: register, loading: loadingRegister } = useFetch<
    {
      email: string;
      password: string;
      passwordConfirmation: string;
      firstName: string;
      lastName: string;
      referralCode: string | null;
    },
    { accessToken: string; refreshToken: string; user: ISafeUser }
  >({
    url: "/users/register-referred",
    method: "POST",
    body: {
      email: registerForm.values.email,
      password: registerForm.values.password,
      passwordConfirmation: registerForm.values.passwordConfirmation,
      firstName: registerForm.values.firstName,
      lastName: registerForm.values.lastName,
      referralCode: referralCode,
    },
    dependencies: [registerForm.values],
    onSuccess: (data) => {
      setTokens(data.accessToken);
      showNotification({
        title: "Registration Successful",
        message: "Welcome!",
      });
      loadUser(data.accessToken).then(() => {
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
      const { errors, hasErrors } = registerForm.validate();
      if (hasErrors) {
        showNotification({
          title: "Registration Failed",
          message: Object.values(errors)[0],
          color: "red",
        });
        return;
      }
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

  const { data: codeValidity, load: checkCode } = useFetch<
    { referralCode: string | null },
    { valid: boolean; user?: { name: string } }
  >({
    url: "/users/validate-referral",
    method: "POST",
    body: {
      referralCode,
    },
    dependencies: [referralCode],
  });

  useEffect(() => {
    if (referralCode) {
      checkCode();
    }
  }, [referralCode]);

  console.log("Code is valid: ", codeValidity);

  if (!referralCode) {
    return (
      <Container
        style={{
          width: "100%",
          height: "100vh",
        }}
      >
        <Flex justify="center" align="center" h="100%">
          <Card w={{ xs: "90vw", sm: "50vw", lg: "30vw" }} p="lg" radius="lg">
            <Grid>
              <Grid.Col span={12}>
                <Group>
                  <Title>Qwest</Title>
                  <StageIndicator />
                </Group>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Text>
                  Sorry, we are not accepting direct registration during this
                  phase. Please use an invitation link or join the{" "}
                  <a href="https://waitlist.qwest.so">waitlist</a>.
                </Text>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Link to="/login">
                  <Button variant="light">I have an account</Button>
                </Link>
              </Grid.Col>
            </Grid>
          </Card>
        </Flex>
      </Container>
    );
  }

  if (!codeValidity?.valid) {
    return (
      <Container
        style={{
          width: "100%",
          height: "100vh",
        }}
      >
        <Flex justify="center" align="center" h="100%">
          <Card w={{ xs: "90vw", sm: "50vw", lg: "30vw" }} p="lg">
            <Grid>
              <Grid.Col span={12}>
                <Group>
                  <Title>Qwest</Title>
                  <StageIndicator />
                </Group>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Text>
                  Sorry, it looks like this referral code is invalid. Please use
                  a valid code or join the{" "}
                  <a href="https://waitlist.qwest.so">waitlist</a>.
                </Text>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Link to="/login">
                  <Button variant="light">I have an account</Button>
                </Link>
              </Grid.Col>
            </Grid>
          </Card>
        </Flex>
      </Container>
    );
  }

  return (
    <Container
      style={{
        width: "100%",
        height: "100vh",
      }}
    >
      <Flex justify="center" align="center" h="100%">
        <Card w={{ xs: "90vw", sm: "50vw", lg: "30vw" }} p="lg" radius="lg">
          <Grid>
            {loadingRegister && (
              <Grid.Col span={12}>
                <Loader />
              </Grid.Col>
            )}
            <Grid.Col span={12}>
              <Group>
                <Title>Register to Qwest!</Title>
                <StageIndicator />
              </Group>
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
            <Grid.Col span={12}>
              <Group justify="end">
                <Text c="dimmed" size="xs" fs="italic">
                  Say hello to {codeValidity.user?.name} for us!
                </Text>
              </Group>
            </Grid.Col>
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
