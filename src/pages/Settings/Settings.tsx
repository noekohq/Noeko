import {
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import RightSidebar from "../../components/UI/RightSidebar";
import LeftSidebar from "../../components/UI/LeftSidebar";
import styles from "./Settings.module.scss";
import { useSettings } from "../../contexts/SettingsContext";
import { IThemeSpec } from "../../declarations/themes";
import { Link } from "react-router";

export default function Settings() {
  const {
    ui: {
      theme: {
        bodyFont: { get: bodyFont, set: setBodyFont },
        scheme: { get: scheme, set: setScheme },
        override: { get: override, set: setOverride },
      },
    },
  } = useSettings();

  return (
    <PageWrapper>
      <LeftSidebar />
      <Container p="lg" w="100%" className={styles.settings}>
        <Grid>
          <Grid.Col span={12}>
            <Title>Settings</Title>
          </Grid.Col>
          <Grid.Col span={12}>
            <Card withBorder radius="lg">
              <Grid>
                <Grid.Col>
                  <Title order={3}>Other Settings</Title>
                </Grid.Col>
                <Grid.Col>
                  <Group>
                    <Link to="/tags">
                      <Button variant="light">Tags</Button>
                    </Link>
                    <Link to="profile">
                      <Button variant="light">Profile</Button>
                    </Link>
                  </Group>
                </Grid.Col>
              </Grid>
            </Card>
          </Grid.Col>
          <Grid.Col span={12}>
            <Card withBorder radius="lg">
              <Grid>
                <Grid.Col>
                  <Title order={3}>Theme</Title>
                </Grid.Col>
                <Grid.Col span={{ xs: 12, sm: 6, md: 4 }}>
                  <Select
                    label="Theme"
                    value={override}
                    data={[
                      {
                        label: "Default",
                        value: "qwest" as const,
                        disabled: override === "qwest",
                      },
                    ]}
                    onChange={(v) => {
                      setOverride(v as IThemeSpec["override"]);
                    }}
                  />
                </Grid.Col>
                <Grid.Col span={{ xs: 12, sm: 6, md: 4 }}>
                  <Select
                    label="Color Scheme"
                    value={scheme}
                    data={[
                      { label: "Dark", value: "dark" as const },
                      { label: "Light", value: "light" as const },
                      { label: "Auto", value: "auto" as const },
                    ]}
                    onChange={(v) => {
                      setScheme(v as IThemeSpec["scheme"]);
                    }}
                  />
                </Grid.Col>
                <Grid.Col span={{ xs: 12, sm: 6, md: 4 }}>
                  <Select
                    label="Body Font"
                    value={bodyFont}
                    data={[
                      { label: "Sans-Serif", value: "sans-serif" as const },
                      { label: "Serif", value: "serif" as const },
                    ]}
                    onChange={(v) => {
                      setBodyFont(v as IThemeSpec["bodyFont"]);
                    }}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <Divider my="sm" />
                </Grid.Col>
                <Grid.Col span={12}>
                  <Stack gap="sm">
                    <Title order={3}>Preview</Title>
                    <Text>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit,
                      sed do eiusmod tempor incididunt ut labore et dolore magna
                      aliqua. Ut enim ad minim veniam, quis nostrud exercitation
                      ullamco laboris nisi ut aliquip ex ea commodo consequat.
                      Duis aute irure dolor in reprehenderit in voluptate velit
                      esse cillum dolore eu fugiat nulla pariatur. Excepteur
                      sint occaecat cupidatat non proident, sunt in culpa qui
                      officia deserunt mollit anim id est laborum.
                    </Text>
                    <Group justify="flex-end">
                      <Button variant="default">Do it!</Button>
                      <Button variant="outline">Do it!</Button>
                      <Button variant="light">Do it!</Button>
                      <Button>Do it!</Button>
                    </Group>
                  </Stack>
                </Grid.Col>
              </Grid>
            </Card>
          </Grid.Col>
          <Grid.Col span={12}>
            <Card withBorder radius="lg">
              <Stack>
                <Title order={3}>Imports</Title>
                <Link to="/import">
                  <Button variant="default">Import Ideas</Button>
                </Link>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Container>
      <RightSidebar />
    </PageWrapper>
  );
}
