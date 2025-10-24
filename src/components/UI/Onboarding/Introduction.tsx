import {
  Button,
  Divider,
  Group,
  Space,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import PageWrapper from "../../Layout/PageWrapper";
import Content from "../Layout/Content";
import { useAuth } from "../../../contexts/AuthContext";
import { IOnboardingProps } from "./Index";
import { Link } from "react-router";

export default function Introduction({ next }: IOnboardingProps) {
  const { user } = useAuth();

  return (
    <PageWrapper>
      <Content>
        <Stack>
          <Title>Nice to meet you {user?.firstName}!</Title>
          <Text size="md">Welcome to your self organizing knowledge base.</Text>
          <Group justify="start">
            <Button variant="light" radius="md" onClick={next}>
              Let's get started!
            </Button>
          </Group>
        </Stack>
      </Content>
    </PageWrapper>
  );
}
