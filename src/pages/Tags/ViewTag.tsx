import {
  Container,
  Title,
  Text,
  Badge,
  SimpleGrid,
  Card,
  Group,
  Stack,
  Loader,
  Alert,
  ThemeIcon,
} from "@mantine/core";
import PageWrapper from "../../components/Layout/PageWrapper";
import LeftSidebar from "../../components/UI/LeftSidebar";
import RightSidebar from "../../components/UI/RightSidebar";
import useFetch from "../../hooks/useFetch";
import { ITag } from "../../../app/database/models/tag";
import { useParams } from "react-router";
import { IIdea } from "../../../app/database/models/ideas";
import { Tag as PhosphorTag, WarningCircle } from "@phosphor-icons/react";

export default function ViewTag() {
  const { tagId } = useParams<{ tagId: string }>();

  const {
    data: tag,
    loading: loadingTag,
    errors: tagErrors,
  } = useFetch<undefined, ITag>({
    url: `/tags/${tagId}`,
    runOnMount: true,
  });

  const {
    data: ideas,
    loading: loadingIdeas,
    errors: ideaErrors,
  } = useFetch<undefined, IIdea[]>({
    url: `/tags/${tagId}/ideas`,
    runOnMount: true,
  });

  const {
    data: relatedIdeas,
    loading: loadingRelatedIdeas,
    errors: relatedIdeaErrors,
  } = useFetch<undefined, IIdea[]>({
    url: `/tags/${tagId}/similar-ideas`,
    runOnMount: true,
  });

  if (loadingTag) {
    return (
      <PageWrapper>
        <LeftSidebar />
        <Container
          w="100%"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "calc(100vh - 60px)",
          }}
        >
          <Loader size="xl" />
        </Container>
        <RightSidebar />
      </PageWrapper>
    );
  }

  if (tagErrors && tagErrors.length > 0) {
    return (
      <PageWrapper>
        <LeftSidebar />
        <Container w="100%" py="md">
          <Alert
            icon={<WarningCircle size={24} />} // Updated icon
            title="Error!"
            color="red"
            variant="filled"
          >
            Failed to load tag details: {tagErrors.join(", ")}
          </Alert>
        </Container>
        <RightSidebar />
      </PageWrapper>
    );
  }

  if (!tag) {
    return (
      <PageWrapper>
        <LeftSidebar />
        <Container w="100%" py="md">
          <Alert
            icon={<WarningCircle size={24} />} // Updated icon
            title="Not Found"
            color="yellow"
            variant="filled"
          >
            Tag not found. It might have been deleted or you may not have
            access.
          </Alert>
        </Container>
        <RightSidebar />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <LeftSidebar />
      <Container w="100%" py="xl">
        <Stack gap="xl">
          {/* Tag Details */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group gap="lg" mb="xs">
              <Group>
                <ThemeIcon
                  size="lg"
                  variant="light"
                  color={tag.color || "gray"}
                >
                  <PhosphorTag size={24} /> {/* Updated icon */}
                </ThemeIcon>
                <Title order={2}>{tag.name}</Title>
              </Group>
              {tag.color && (
                <Badge
                  color={tag.color}
                  variant="light"
                  size="lg"
                  style={{ border: `1px solid ${tag.color}` }}
                >
                  {tag.name}
                </Badge>
              )}
            </Group>
            {tag.description && (
              <Text size="sm" c="dimmed" mt="xs">
                {tag.description}
              </Text>
            )}
            <Text size="xs" c="dimmed" mt="sm">
              Created: {new Date(tag.createdAt).toLocaleDateString()}
            </Text>
            {tag.updatedAt && tag.updatedAt !== tag.createdAt && (
              <Text size="xs" c="dimmed">
                Last Updated: {new Date(tag.updatedAt).toLocaleDateString()}
              </Text>
            )}
          </Card>

          {/* Ideas with this Tag */}
          <Stack gap="md">
            <Title order={3}>Ideas with this Tag</Title>
            {loadingIdeas && (
              <Group justify="center" py="md">
                <Loader />
              </Group>
            )}
            {ideaErrors && ideaErrors.length > 0 && (
              <Alert
                icon={<WarningCircle size={24} />} // Updated icon
                title="Error!"
                color="red"
                mt="md"
              >
                Failed to load ideas for this tag: {ideaErrors.join(", ")}
              </Alert>
            )}
            {!loadingIdeas &&
            !(ideaErrors && ideaErrors.length > 0) &&
            ideas &&
            ideas.length > 0 ? (
              <SimpleGrid cols={2} spacing="lg">
                {ideas.map((idea) => (
                  <Card
                    shadow="sm"
                    padding="lg"
                    radius="md"
                    withBorder
                    key={idea.id.toString()}
                  >
                    <Text fw={500}>{idea.title || "Untitled Idea"}</Text>
                    <Text size="sm" c="dimmed" lineClamp={3} mt={4}>
                      {idea.derived?.generative_summary?.sentenceOverview ||
                        idea.content?.substring(0, 150) ||
                        "No summary available."}
                    </Text>
                    {/* TODO: Add Link to Idea page: e.g., <Button component={Link} to={`/ideas/${idea.id}`} mt=\"md\">View Idea</Button> */}
                  </Card>
                ))}
              </SimpleGrid>
            ) : (
              !loadingIdeas &&
              !(ideaErrors && ideaErrors.length > 0) && (
                <Text c="dimmed">
                  No ideas are currently associated with this tag.
                </Text>
              )
            )}
          </Stack>

          {/* Similar Ideas */}
          <Stack gap="md">
            <Title order={3}>Related Ideas (Similar)</Title>
            {loadingRelatedIdeas && (
              <Group justify="center" py="md">
                <Loader />
              </Group>
            )}
            {relatedIdeaErrors && relatedIdeaErrors.length > 0 && (
              <Alert
                icon={<WarningCircle size={24} />} // Updated icon
                title="Error!"
                color="red"
                mt="md"
              >
                Failed to load similar ideas: {relatedIdeaErrors.join(", ")}
              </Alert>
            )}
            {!loadingRelatedIdeas &&
            !(relatedIdeaErrors && relatedIdeaErrors.length > 0) &&
            relatedIdeas &&
            relatedIdeas.length > 0 ? (
              <SimpleGrid cols={2} spacing="lg">
                {relatedIdeas.map((idea) => (
                  <Card
                    shadow="sm"
                    padding="lg"
                    radius="md"
                    withBorder
                    key={idea.id.toString()}
                  >
                    <Text fw={500}>{idea.title || "Untitled Idea"}</Text>
                    <Text size="sm" c="dimmed" lineClamp={3} mt={4}>
                      {idea.derived?.generative_summary?.sentenceSummary ||
                        idea.content?.substring(0, 150) ||
                        "No summary available."}
                    </Text>
                    {/* TODO: Add Link to Idea page: e.g., <Button component={Link} to={`/ideas/${idea.id}`} mt=\"md\">View Idea</Button> */}
                  </Card>
                ))}
              </SimpleGrid>
            ) : (
              !loadingRelatedIdeas &&
              !(relatedIdeaErrors && relatedIdeaErrors.length > 0) && (
                <Text c="dimmed">
                  No similar ideas found for this tag. Embeddings might be
                  missing or no ideas match the criteria.
                </Text>
              )
            )}
          </Stack>
        </Stack>
      </Container>
      <RightSidebar />
    </PageWrapper>
  );
}
