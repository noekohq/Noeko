import { ActionIcon, Box, Container, Group, Stack, Title, Tooltip } from "@mantine/core";
import PageWrapper from '@/components/Layout/PageWrapper';
import useFetch from '@/hooks/useFetch';
import { IIdeaForm } from '../../../shared/types/idea';
import { useNavigate, useParams, useSearchParams } from "react-router";
import styles from "./ViewIdea.module.scss";
import { useAuth } from '@/contexts/AuthContext';
import LeftSidebar from '@core/design/components/Layout/Left';
import RightSidebar from '@core/design/components/Layout/Right';
import { Pencil } from "@phosphor-icons/react";
import { useEffect } from "react";
import Content from '@core/design/components/Layout/Content';
import StatusBar from '@core/design/components/Layout/Bottom';
import Nav from '@core/design/components/Layout/Nav';
import TopBar from '@core/design/components/Layout/TopBar';

export default function ViewIdea() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();

  const { loggedIn } = useAuth();

  const {
    data: idea,
    load: reloadIdea,
    loading: loadingIdea,
  } = useFetch<undefined, IIdeaForm>({
    url: `/ideas/${ideaId}`,
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
      <TopBar />
      {loggedIn && <LeftSidebar />}
      <Content>
        <Stack>
          <Group>
            <Title>{idea?.title}</Title>
            <Group>
              <Tooltip label="Edit Idea">
                <ActionIcon variant="subtle" onClick={() => navigate(`/idea/${ideaId}`)} c="dark.6">
                  <Pencil size={24} />
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
      </Content>
      {loggedIn && <Nav />}
      {loggedIn && <RightSidebar />}
    </PageWrapper>
  );
}
