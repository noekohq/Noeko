import {
  ActionIcon,
  Box,
  Container,
  Group,
  Stack,
  Title,
  Tooltip,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import useFetch from "../../hooks/useFetch";
import { IIdeaForm } from "../../../app/database/models/ideas";
import { useNavigate, useParams, useSearchParams } from "react-router";
import styles from "./ViewIdea.module.scss";
import { useAuth } from "../../contexts/AuthContext";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import { Pencil } from "@phosphor-icons/react";
import { useEffect } from "react";

export default function ViewIdea() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();

  const { loggedIn } = useAuth();

  const {
    data: idea,
    load: reloadIdea,
    loading: loadingIdea,
  } = useFetch<undefined, IIdeaForm>({
    url: `/graph/ideas/${ideaId}`,
    dependencies: [ideaId],
    query: {
      withRelatedIdeas: "true",
      withConnections: "true",
      withDerived: "true",
    },
    method: "GET",
    runOnMount: true,
  });

  const isLoaded = idea !== undefined;

  const [searchParams, setSearchParams] = useSearchParams();

  const highlightText = searchParams.get("highlightText");

  useEffect(() => {
    if (isLoaded && highlightText) {
      window.location.hash = `#:~:text=${highlightText}`;
      setSearchParams({});
    }
  }, [highlightText, isLoaded]);

  return (
    <PageWrapper>
      {loggedIn && <LeftSidebar />}
      <Container className={styles.viewIdea} pt="lg">
        <Stack>
          <Group>
            <Title>{idea?.title}</Title>
            <Group>
              <Tooltip label="Edit Idea">
                <ActionIcon onClick={() => navigate(`/idea/${ideaId}`)}>
                  <Pencil />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
          <div
            dangerouslySetInnerHTML={{
              __html: idea?.content || "",
            }}
          />
        </Stack>
      </Container>
      {loggedIn && <RightSidebar />}
    </PageWrapper>
  );
}
