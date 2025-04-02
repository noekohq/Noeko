import { Container, Grid, Title } from "@mantine/core";
import { useAuth } from "../../contexts/AuthContext";

export default function Profile() {
  const { user } = useAuth();

  return (
    <Container>
      <Grid>
        <Grid.Col span={12}>
          <Title order={1}>Profile</Title>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
