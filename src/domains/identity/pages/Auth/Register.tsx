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
  Checkbox,
  HoverCard,
} from "@mantine/core";
import useFetch from "@core/hooks/useFetch";
import { useForm } from "@mantine/form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ISafeUser } from "../../../../../shared/types/user";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { showNotification } from "@mantine/notifications";
import { validateEmail } from "@core/utils/data";
import StageIndicator from "@core/design/components/Utils/StageIndicator";
import { useEffect, useState } from "react";
import { QuestionIcon } from "@phosphor-icons/react";
<<<<<<< HEAD
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
=======
import type {
  IOrganization,
  IOrganizationInvitationPreview,
} from "../../../../../shared/types/organization";
import { useApiQuery } from "@/core/hooks/useApiQuery";
>>>>>>> dbc6393673ec1b06aa8a23ecdd01967fe1e94466

export default function Register() {
  const { i18n } = useLingui();
  const navigate = useNavigate();
  const { setTokens, login: loadUser } = useAuth();

  const [searchParams] = useSearchParams();

  const referralCode = searchParams.get("ref");
  const invitationToken = searchParams.get("invite");
  const {
    data: invitation,
    isLoading: loadingInvitation,
    error: invitationError,
  } = useApiQuery<IOrganizationInvitationPreview>({
    url: invitationToken
      ? `/organizations/invitations/${encodeURIComponent(invitationToken)}`
      : null,
    queryKey: ["organization-invitation", invitationToken],
    options: { retry: false },
  });

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
        if (value.length < 6) {
          return i18n._(t`Password must be at least 6 characters`);
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
      firstName: (value) => {
        if (!value) {
          return i18n._(t`First name is required`);
        }
        if (value.length < 2) {
          return i18n._(t`First name must be at least 2 characters`);
        }
      },
      lastName: (value) => {
        if (!value) {
          return i18n._(t`Last name is required`);
        }
        if (value.length < 2) {
          return i18n._(t`Last name must be at least 2 characters`);
        }
      },
    },
  });

  useEffect(() => {
    if (invitation?.email && registerForm.values.email !== invitation.email) {
      registerForm.setFieldValue("email", invitation.email);
    }
  }, [invitation?.email]);

  const { load: register, loading: loadingRegister } = useFetch<
    {
      email: string;
      password: string;
      passwordConfirmation: string;
      firstName: string;
      lastName: string;
      referralCode?: string | null;
    },
    { accessToken: string; refreshToken: string; user: ISafeUser; organization?: IOrganization }
  >({
    url: invitationToken
      ? `/organizations/invitations/${encodeURIComponent(invitationToken)}/register`
      : "/users/register-referred",
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
        title: i18n._(t`Registration Successful`),
        message: i18n._(t`Welcome!`),
      });
      loadUser(data.accessToken).then(() => {
        navigate(data.organization ? `/organizations/${data.organization.slug}` : "/");
      });
    },
    onError: (error: any) => {
      console.error(error);
      showNotification({
<<<<<<< HEAD
        title: i18n._(t`Registration Failed`),
        message: i18n._(t`An error occurred during registration`),
=======
        title: "Registration Failed",
        message: error?.response?.data?.message || "An error occurred during registration",
        color: "red",
>>>>>>> dbc6393673ec1b06aa8a23ecdd01967fe1e94466
      });
    },
  });

  const handleRegister = async () => {
    try {
      const { errors, hasErrors } = registerForm.validate();
      if (hasErrors) {
        showNotification({
          title: i18n._(t`Registration Failed`),
          message: Object.values(errors)[0],
          color: "red",
        });
        return;
      }
      await register();
    } catch (error) {
      console.error(error);
      showNotification({
        title: i18n._(t`Registration Failed`),
        message: i18n._(t`Invalid email or password`),
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

  const [checkedAgreement, setCheckedAgreement] = useState(false);

  useEffect(() => {
    if (referralCode && !invitationToken) {
      checkCode();
    }
  }, [referralCode, invitationToken]);

  if (!referralCode && !invitationToken) {
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
                  <Title>
                    <Trans>Noeko</Trans>
                  </Title>
                  <StageIndicator />
                </Group>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Text>
                  <Trans>
                    Sorry, we are not accepting direct registration during this phase. Please use an
                    invitation link or join the <a href="https://waitlist.noeko.app">waitlist</a>.
                  </Trans>
                </Text>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Link to="/login">
                  <Button variant="light">
                    <Trans>I have an account</Trans>
                  </Button>
                </Link>
              </Grid.Col>
            </Grid>
          </Card>
        </Flex>
      </Container>
    );
  }

  if (invitationToken && loadingInvitation) {
    return (
      <Flex justify="center" align="center" h="100vh">
        <Loader />
      </Flex>
    );
  }

  if (
    (invitationToken && (invitationError || !invitation)) ||
    (!invitationToken && !codeValidity?.valid)
  ) {
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
                  <Title>
                    <Trans>Noeko</Trans>
                  </Title>
                  <StageIndicator />
                </Group>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Text>
<<<<<<< HEAD
                  <Trans>
                    Sorry, it looks like this referral code is invalid. Please use a valid code or
                    join the <a href="https://noeko.neoko.app">waitlist</a>.
                  </Trans>
=======
                  Sorry, it looks like this invitation is invalid or expired. Please ask for a new
                  invitation or join the <a href="https://waitlist.noeko.app">waitlist</a>.
>>>>>>> dbc6393673ec1b06aa8a23ecdd01967fe1e94466
                </Text>
              </Grid.Col>
              <Grid.Col span={{ sm: 12 }}>
                <Link to="/login">
                  <Button variant="light">
                    <Trans>I have an account</Trans>
                  </Button>
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
                <Title>
                  <Trans>Register to Noeko!</Trans>
                </Title>
                <StageIndicator />
              </Group>
            </Grid.Col>
            <Grid.Col span={12} />
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                label={t`First name`}
                placeholder={t`First name`}
                rightSection={
                  <HoverCard width="300px" radius="lg">
                    <HoverCard.Target>
                      <QuestionIcon />
                    </HoverCard.Target>
                    <HoverCard.Dropdown>
                      <Text size="sm" c="dimmed">
                        <Trans>
                          Your first and last name are only for personalization, you can put
                          whatever you'd like here :)
                        </Trans>
                      </Text>
                    </HoverCard.Dropdown>
                  </HoverCard>
                }
                {...registerForm.getInputProps("firstName")}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                label={t`Last name`}
                placeholder={t`Last name`}
                {...registerForm.getInputProps("lastName")}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <TextInput
                label={t`Email`}
                placeholder={t`Email`}
                {...registerForm.getInputProps("email")}
                readOnly={!!invitationToken}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <PasswordInput
                label={t`Password`}
                placeholder={t`Password`}
                {...registerForm.getInputProps("password")}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <PasswordInput
                label={t`Confirm password`}
                placeholder={t`Confirm password`}
                {...registerForm.getInputProps("passwordConfirmation")}
                withAsterisk
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }} />
            <Grid.Col span={12}>
              <Checkbox
                size="xs"
                label={
                  <Text size="xs" c="dimmed">
                    <Trans>
                      By creating an account, you agree to our{" "}
                      <a href="https://www.noeko.app/privacy">Privacy Policy</a> and{" "}
                      <a href="https://www.noeko.app/terms-of-service">Terms of Service</a>.
                    </Trans>
                  </Text>
                }
                onChange={(e) => {
                  setCheckedAgreement(e.currentTarget.checked);
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ sm: 12 }}>
              <Group justify="right">
                <Link to="/login">
                  <Button variant="light" color="gray">
                    <Trans>Have an account?</Trans>
                  </Button>
                </Link>
                <Button
                  onClick={() => {
                    handleRegister();
                  }}
                  disabled={!checkedAgreement}
                  loading={loadingRegister}
                >
                  <Trans>Register</Trans>
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </Card>
      </Flex>
    </Container>
  );
}
