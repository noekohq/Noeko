import { Box, Container, Group, Stack, Title } from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import useFetch from "../../hooks/useFetch";
import { IIdeaForm } from "../../../app/database/models/ideas";
import { useNavigate, useParams } from "react-router";
import styles from "./ViewIdea.module.scss";
import { useAuth } from "../../contexts/AuthContext";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import { showNotification } from "@mantine/notifications";

export default function PublicIdea() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();

  const { loggedIn } = useAuth();

  const {
    data: idea,
    load: reloadIdea,
    loading: loadingIdea,
  } = useFetch<undefined, IIdeaForm>({
    url: `/ideas/${ideaId}/public`,
    dependencies: [ideaId],
    method: "GET",
    runOnMount: true,
    onError: () => {
      showNotification({
        title: "Error",
        message: "Failed to load idea",
        color: "red",
      });
      navigate("/");
    },
  });

  return (
    <PageWrapper>
      {loggedIn && <LeftSidebar />}
      <Container className={styles.viewIdea} pt="lg">
        <Stack>
          <Group>
            <Title>{idea?.title}</Title>
          </Group>
          <Box
            dangerouslySetInnerHTML={{
              __html: idea?.content || "",
            }}
          ></Box>
        </Stack>
      </Container>
      {loggedIn && <RightSidebar />}
    </PageWrapper>
  );
}
