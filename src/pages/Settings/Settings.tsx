import { Container, Grid, Title } from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import RightSidebar from "../../components/UI/RightSidebar";

export default function Settings() {
  return (
    <PageWrapper>
      <Container p="lg">
        <Grid>
          <Grid.Col span={12}>
            <Title>Settings</Title>
          </Grid.Col>
          <Grid.Col span={12}>Coming soon...</Grid.Col>
        </Grid>
      </Container>
      <RightSidebar />
    </PageWrapper>
  );
}
