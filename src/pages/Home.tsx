import {
  Button,
  Code,
  Container,
  Flex,
  Grid,
  Group,
  Text,
  Title,
} from "@mantine/core";
import useFetch from "../hooks/useFetch";
import { notifications } from "@mantine/notifications";
import { Link } from "react-router";

export default function Home() {
  const { load: getMessage } = useFetch<undefined, string>({
    url: "/hello",
    onSuccess: (data) => {
      notifications.show({
        title: "Message",
        message: data,
        autoClose: false,
      });
    },
  });

  return (
    <Container h={"80vh"}>
      <Flex direction="column" justify="center" h={"100%"}>
        <Grid>
          <Grid.Col span={12}>
            <Title order={1}>Lightning App</Title>
          </Grid.Col>
          <Grid.Col span={12} />
          <Grid.Col span={12}>
            <Text>
              Edit this file at <Code>src/App.tsx</Code>
            </Text>
          </Grid.Col>
          <Grid.Col span={12}>
            <Group gap="md">
              <Button
                onClick={() => {
                  getMessage();
                }}
              >
                Get message
              </Button>
              <Link to="/second">
                <Button variant="outline">Second page</Button>
              </Link>
            </Group>
          </Grid.Col>
        </Grid>
      </Flex>
    </Container>
  );
}
