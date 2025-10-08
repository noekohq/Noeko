import styles from "./Serendipity.module.scss";
import { IWidgetConfig } from "../index.d";
import useFetch from "../../../hooks/useFetch";
import { ISpyglassSearch } from "../../../../app/database/models/search";
import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Blockquote,
  Button,
  Group,
  Progress,
  Stack,
  Text,
  Title,
  Transition,
} from "@mantine/core";
import { SpyglassIcon } from "../../Utils/Icons/Icons";
import { Link, useNavigate } from "react-router";
import Loading from "../../Display/Loading/Loading";
import {
  ArrowRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";

const SWITCH_INTERVAL = 20000;
const TRANSITION_DURATION = 200;

export default function Serendipity() {
  const [page, setPage] = useState(0);
  const [currentFinding, setCurrentFinding] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const [isContentVisible, setContentVisible] = useState(true);

  const {
    load: loadSpyglass,
    data: spyglassSearch,
    loading: loadingSpyglass,
  } = useFetch<undefined, ISpyglassSearch[]>({
    url: `/search/spyglass/history/light?pageSize=1&page=${page}`,
    dependencies: [page],
  });

  const navigate = useNavigate();

  useEffect(() => {
    loadSpyglass();
  }, [page]);

  console.log("Spyglass query: ", spyglassSearch);

  const viewing = spyglassSearch?.[0];
  const analysis = viewing?.analysis;
  const viewingFinding = analysis?.findings[currentFinding];

  useEffect(() => {
    setCurrentFinding(0);
  }, [viewing]);

  useEffect(() => {
    setCurrentFinding(0);
    setAnimationKey((prevKey) => prevKey + 1);
  }, [viewing]);

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
      setCurrentFinding(0);
      setAnimationKey((prevKey) => prevKey + 1);
    }
  };

  const handleNextPage = () => {
    if (!spyglassSearch) {
      return;
    }
    setPage(page + 1);
    setCurrentFinding(0);
    setAnimationKey((prevKey) => prevKey + 1);
  };

  const handleChangeFinding = (newIndex: number) => {
    setContentVisible(false);

    setTimeout(() => {
      setCurrentFinding(newIndex);
      setAnimationKey((prev) => prev + 1); // For the progress bar

      setContentVisible(true);
    }, TRANSITION_DURATION);
  };

  const handleNext = () => {
    if (currentFinding < (analysis?.findings.length ?? 0) - 1) {
      handleChangeFinding(currentFinding + 1);
      setAnimationKey((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentFinding > 0) {
      handleChangeFinding(currentFinding - 1);
      setAnimationKey((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (!analysis?.findings || analysis.findings.length === 0) {
      return;
    }

    const timer = setInterval(() => {
      if (currentFinding < analysis.findings.length - 1) {
        handleChangeFinding(currentFinding + 1);
        setAnimationKey((prev) => prev + 1);
      } else {
        setPage(page + 1);
        setAnimationKey((prev) => prev + 1);
      }
    }, SWITCH_INTERVAL);
    return () => clearInterval(timer);
  }, [currentFinding, page, analysis]);

  const clipContent = (content: string, len: number) => {
    if (content.length > len) {
      return `${content.slice(0, len)}...`;
    }
    return content;
  };

  return (
    <div className={styles.serendipity}>
      {loadingSpyglass && <Loading size="sm" color="dark.3" />}
      {!!viewing && (
        <div className={styles.record}>
          <div className={styles.query}>
            <Text size="md" c="dimmed" fs="italic" title={viewing.baseQuery}>
              <Group
                gap="xs"
                align="center"
                justify="space-between"
                wrap="nowrap"
              >
                {viewing?.baseQuery}
              </Group>
            </Text>
          </div>
          <Group justify="space-between" align="center" mb="sm">
            <ActionIcon
              onClick={handlePrevious}
              disabled={currentFinding === 0}
              variant="subtle"
              color="gray"
              size="sm"
            >
              <CaretLeftIcon size={14} />
            </ActionIcon>
            <Text size="xs" c="dimmed">
              {currentFinding + 1} / {analysis?.findings.length}
            </Text>
            <ActionIcon
              onClick={handleNext}
              disabled={
                currentFinding === (analysis?.findings?.length ?? 0) - 1
              }
              variant="subtle"
              color="gray"
              size="sm"
            >
              <CaretRightIcon size={14} />
            </ActionIcon>
          </Group>
          <div className={styles.content}>
            <Transition
              mounted={isContentVisible}
              transition={"pop-top-left"}
              duration={TRANSITION_DURATION}
            >
              {(style) => {
                return (
                  <div
                    style={{
                      ...style,
                      height: "100%",
                    }}
                  >
                    <div className={styles.progress}>
                      <Progress
                        key={animationKey}
                        value={100}
                        className={styles.timerBar}
                        styles={{
                          root: {
                            animationDuration: `${SWITCH_INTERVAL / 1000}s`,
                          },
                        }}
                        radius="xs"
                        color="gray"
                        size="xs"
                      />
                    </div>
                    {!!viewingFinding && (
                      <Stack gap="sm">
                        <Blockquote color="gray" p={"sm"}>
                          <Text size="sm">
                            {clipContent(viewingFinding.excerpt, 96)}
                          </Text>
                        </Blockquote>
                        <Text size="sm">
                          {clipContent(viewingFinding.analysis, 96)}
                        </Text>
                      </Stack>
                    )}
                  </div>
                );
              }}
            </Transition>
          </div>
          <Group
            justify="space-between"
            gap="xs"
            mt="lg"
            className={styles.ui}
            w="100%"
            wrap="nowrap"
          >
            <Button
              variant="light"
              radius="lg"
              size="sm"
              color="gray"
              onClick={handlePreviousPage}
              leftSection={<CaretLeftIcon />}
            >
              Prev
            </Button>
            <Button
              variant="light"
              radius="lg"
              size="sm"
              color="gray"
              onClick={handleNextPage}
              rightSection={<CaretRightIcon />}
            >
              Next
            </Button>
            <Button
              variant="light"
              radius="lg"
              size="sm"
              color="gray"
              onClick={handleNextPage}
            >
              <ArrowRightIcon weight="bold" size={14} />
            </Button>
          </Group>
        </div>
      )}
      {!viewing && !loadingSpyglass && (
        <div className={styles.prompt}>
          <Group justify="center">
            <Title order={1}>Spyglass</Title>
          </Group>
          <Link
            to={`/spyglass?q="How do I get started with Noeko?"`}
            style={{
              textDecoration: "none",
            }}
          >
            <div className={styles.card}>
              <Text size="sm" c="dark.2">
                <Group gap="8px" wrap="nowrap">
                  How do I get started with Noeko?
                  <SpyglassIcon size={12} color="var(--mantine-color-dark-2)" />
                </Group>
              </Text>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

export const config: IWidgetConfig = {
  columns: {
    default: 5,
    min: 4,
    max: 6,
  },
};
