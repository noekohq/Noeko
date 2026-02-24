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
import PageWrapper from "@/components/Layout/PageWrapper";
import LeftSidebar from "@core/design/components/Layout/Left";
import RightSidebar from "@core/design/components/Layout/Right";
import Content from "@core/design/components/Layout/Content";
import StatusBar from "@core/design/components/Layout/Bottom";
import Nav from "@core/design/components/Layout/Nav";
import TopBar from "@core/design/components/Layout/TopBar";

export default function Profile() {
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
        if (!value) return "Email is required";
        if (!validateEmail(value)) return "Invalid email";
      },
      password: (value) => {
        if (!value) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
      },
      newPassword: (value) => {
        if (!value) return "New password is required";
        if (value.length < 8) return "New password must be at least 8 characters";
      },
      newPasswordConfirmation: (value, values) => {
        if (!value) return "New password confirmation is required";
        if (value !== values.password) return "Passwords do not match";
      },
      firstName: (value) => {
        if (!value) return "First name is required";
      },
      lastName: (value) => {
        if (!value) return "Last name is required";
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
        title: "Success",
        message: message || "Profile updated successfully",
      });
      reloadUser();
    },
    onError: (error: any) => {
      showNotification({
        title: "Error",
        message: error?.response?.data?.message || "Something went wrong",
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
            <Title order={1}>Profile</Title>
          </Grid.Col>
          <Grid.Col span={12}>
            <Title order={3}>Your name is...</Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <TextInput
              label="First name"
              placeholder="First name"
              {...profileForm.getInputProps("firstName")}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <TextInput
              label="Last name"
              placeholder="Last name"
              {...profileForm.getInputProps("lastName")}
            />
          </Grid.Col>
          <Grid.Col span={12} />
          <Grid.Col span={12}>
            <Title order={3}>Your email is...</Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <TextInput label="Email" placeholder="Email" {...profileForm.getInputProps("email")} />
          </Grid.Col>
          <Grid.Col span={12} />
          <Grid.Col span={12}>
            <Title order={3}>Update Password</Title>
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <PasswordInput
              label="New password"
              placeholder="New password"
              {...profileForm.getInputProps("newPassword")}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <PasswordInput
              label="Confirm password"
              placeholder="Confirm password"
              {...profileForm.getInputProps("newPasswordConfirmation")}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12, md: 6 }}>
            <PasswordInput
              name="password"
              label="Current Password"
              placeholder="Current Password"
              {...profileForm.getInputProps("password")}
            />
          </Grid.Col>
          <Grid.Col span={{ sm: 12 }}>
            <Group justify="right">
              <Button
                leftSection={loadingProfile ? <Loader size="sm" /> : null}
                onClick={handleSave}
              >
                Save
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
