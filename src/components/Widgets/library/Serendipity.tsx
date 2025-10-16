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
  ArrowLeftIcon,
  ArrowRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { markdownToHtml } from "../../../utils/formatting";

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
    if (page >= 1) {
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

  return (
    <div className={styles.serendipity}>
      {loadingSpyglass && (
        <div className={styles.loader}>
          <Loading size="sm" color="dark.3" />
        </div>
      )}
      {!!viewing && (
        <div className={styles.record}>
          <div className={styles.query}>
            <Link
              to={`/spyglass/records/${viewing.id.toString()}`}
              style={{
                textDecoration: "none",
              }}
            >
              <Text size="sm" c="dark.1" ff="heading" title={viewing.baseQuery}>
                {viewing?.baseQuery}{" "}
                <ArrowRightIcon
                  size={12}
                  weight="bold"
                  style={{ position: "relative", top: "2px" }}
                />
              </Text>
            </Link>
          </div>
          <div className={styles.content}>
            {viewing.analysis?.findings.length === 0 ||
              (!viewingFinding && (
                <Text size="sm" c="dimmed">
                  Nothing to see here :/
                </Text>
              ))}
            <Transition
              mounted={isContentVisible && !!viewingFinding}
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
                          <Text
                            size="sm"
                            dangerouslySetInnerHTML={{
                              __html: markdownToHtml(viewingFinding.excerpt),
                            }}
                          />
                        </Blockquote>
                        <Text size="sm">{viewingFinding.analysis}</Text>
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
            w="100%"
            wrap="nowrap"
          >
            <ActionIcon
              variant="light"
              radius="lg"
              size="md"
              color="gray"
              onClick={handlePreviousPage}
              disabled={page === 0}
            >
              <ArrowLeftIcon weight="bold" />
            </ActionIcon>
            <ActionIcon
              onClick={handlePrevious}
              disabled={currentFinding === 0}
              variant="light"
              radius="lg"
              size="md"
              color="gray"
            >
              <CaretLeftIcon weight="bold" size={14} />
            </ActionIcon>
            <Text size="sm" c="dimmed">
              {currentFinding + 1} / {analysis?.findings.length}
            </Text>
            <ActionIcon
              onClick={handleNext}
              disabled={
                currentFinding === (analysis?.findings?.length ?? 0) - 1
              }
              variant="light"
              radius="lg"
              size="md"
              color="gray"
            >
              <CaretRightIcon weight="bold" size={14} />
            </ActionIcon>
            <ActionIcon
              variant="light"
              radius="lg"
              size="md"
              color="gray"
              onClick={handleNextPage}
            >
              <ArrowRightIcon weight="bold" />
            </ActionIcon>
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
