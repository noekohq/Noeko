import { useEffect, useState } from "react";
import IconToggle from "../../components/Display/Interactions/Toggle/IconToggle";
import PageWrapper from "../../components/Layout/PageWrapper";
import StatusBar from "../../components/UI/Layout/Bottom";
import Content from "../../components/UI/Layout/Content";
import LeftSidebar from "../../components/UI/Layout/Left";
import RightSidebar from "../../components/UI/Layout/Right";
import styles from "./Mobile.module.scss";
import {
  ArrowRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  IntersectSquareIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { ActionIcon, Group, Stack, Text, Title } from "@mantine/core";
import Selection from "../../components/Display/Interactions/Selection";
import ConnectableThing from "../../components/Display/Interactions/Connections/ConnectableThing";
import useFetch from "../../hooks/useFetch";
import { IConnectable } from "../../../app/services/Graph";
import { useInteraction } from "../../contexts/InteractionContext";
import { Link } from "react-router";
import { toYYYYMMDD } from "../../utils/datetime";
import { ITask } from "../../../app/database/models/task";
import { useLayout } from "../../contexts/LayoutContext";
import { capitalize, formatDate } from "../../utils/formatting";
import ProgressBar from "../../components/Utils/Info/ProgressBar";
import TaskButton from "../../components/Display/Tasks/TaskButton";

type IDashboardView = "jump-back-in" | "tasks";

export default function MobileDashboard({}) {
  const [view, setView] = useState<IDashboardView>("jump-back-in");

  const viewToComponent = {
    "jump-back-in": JumpBackIn,
    tasks: TaskList,
  };

  const viewToTitle = {
    "jump-back-in": "Jump back in",
    tasks: "Getting things done",
  };

  const View = viewToComponent[view];

  return (
    <div className={styles.dashboard}>
      <PageWrapper>
        <LeftSidebar></LeftSidebar>
        <Content>
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={2}>{viewToTitle[view]}</Title>
              <IconToggle
                value={view}
                options={[
                  {
                    icon: <IntersectSquareIcon />,
                    value: "jump-back-in" satisfies IDashboardView,
                  },
                  {
                    icon: <CheckIcon />,
                    value: "tasks" satisfies IDashboardView,
                  },
                ]}
                onChange={(view) => {
                  setView(view as IDashboardView);
                }}
              />
            </Group>
            <View />
          </Stack>
        </Content>
        <StatusBar></StatusBar>
        <RightSidebar></RightSidebar>
      </PageWrapper>
    </div>
  );
}

function JumpBackIn() {
  const [view, setView] = useState<"recent">("recent");

  const {
    data: recent,
    load: loadRecent,
    loading: loadingRecent,
  } = useFetch<undefined, IConnectable[]>({
    url: `/insights/recent?limit=20`,
    method: "GET",
  });

  useEffect(() => {
    loadRecent();
  }, []);

  const toView = () => {
    switch (view) {
      case "recent":
        return recent;
      default:
        return undefined;
    }
  };

  return (
    <div className={styles.jumpBackIn}>
      <Stack gap="md">
        <Group justify="space-between" w="100%">
          <Selection
            name="View"
            options={[
              {
                label: "Recent",
                value: "recent",
              },
            ]}
            initialValue="recent"
          />
        </Group>
        {!toView()?.length && (
          <Text size="sm" c="dimmed">
            Nothing here yet.
          </Text>
        )}
        {toView()?.map((thing) => {
          return <ConnectableThing key={thing.id.toString()} thing={thing} />;
        })}
      </Stack>
    </div>
  );
}

type IViewOptions = "daily" | "urgency" | "availability";
function TaskList() {
  const [byView, setByView] = useState<IViewOptions>("daily");

  const {
    actions: { newTask },
  } = useInteraction();

  const viewToComponent: Record<IViewOptions, React.ComponentType<any>> = {
    daily: DailyTasks,
    urgency: UrgentTasks,
    availability: AvailableTasks,
  };

  const Component = viewToComponent[byView];

  return (
    <div className={styles.taskList}>
      <Group w="100%" justify="center" mt="2px">
        <Selection
          name="Daily"
          options={[
            {
              label: "Daily",
              value: "daily",
            },
            {
              label: "Urgency",
              value: "urgency",
            },
            {
              label: "Availability",
              value: "availability",
            },
          ]}
          onSelect={(value) => setByView(value as IViewOptions)}
          initialValue={byView}
        />
      </Group>
      <Component />
      <div className={styles.ui}>
        <Group justify="flex-end" gap="xs">
          <Link to="/tasks">
            <ActionIcon variant="light" color="gray" size={"md"}>
              <ArrowRightIcon weight="bold" size={16} />
            </ActionIcon>
          </Link>
          <ActionIcon
            onClick={() => newTask()}
            size={"md"}
            color="gray"
            variant="light"
          >
            <PlusIcon weight="bold" size={16} />
          </ActionIcon>
        </Group>
      </div>
    </div>
  );
}

function DailyTasks() {
  const todayDate = toYYYYMMDD(new Date());
  const [date, setDate] = useState(todayDate);
  const { data: tasks, load: getTasks } = useFetch<undefined, ITask[]>({
    url: `/tasks/daily?date=${date}`,
    dependencies: [date],
  });

  const incrementDate = (by: number) => {
    const normalized = date.split("-").join("");
    const year = parseInt(normalized.substring(0, 4));
    const month = parseInt(normalized.substring(4, 6)) - 1;
    const day = parseInt(normalized.substring(6, 8));
    const currentDate = new Date(year, month, day);

    currentDate.setDate(currentDate.getDate() + by);

    setDate(toYYYYMMDD(currentDate));
  };

  useEffect(() => {
    getTasks();
  }, [date]);

  const {
    actions: { newTask },
  } = useInteraction();

  const incompleteTasks: ITask[] =
    tasks?.filter((task) => !task.completedAt) ?? [];
  const completeTasks: ITask[] =
    tasks?.filter((task) => task.completedAt) ?? [];

  const progress = tasks?.length
    ? (completeTasks.length / tasks.length) * 100
    : 0;

  const { isMobile } = useLayout();

  const formattedDate = () => {
    const normalized = date.split("-").join("");
    const year = parseInt(normalized.substring(0, 4));
    const month = parseInt(normalized.substring(4, 6)) - 1;
    const day = parseInt(normalized.substring(6, 8));
    const currentDate = new Date(year, month, day);
    return capitalize(formatDate(currentDate));
  };

  return (
    <div className={styles.daily}>
      <Stack gap="xs">
        <Stack gap="xs" justify="flex-start" align="center">
          <Group gap="0" wrap="nowrap" justify="space-between" w="100%">
            <ActionIcon
              size={isMobile ? "md" : "xs"}
              variant="light"
              color="gray"
              onClick={() => {
                incrementDate(-1);
              }}
            >
              <CaretLeftIcon size={isMobile ? 16 : 12} weight="bold" />
            </ActionIcon>
            <Text size={isMobile ? "md" : "sm"} c="dark.2" fw="bold">
              {formattedDate()}
            </Text>
            <Group gap="xs">
              <ActionIcon
                size={isMobile ? "md" : "xs"}
                variant="light"
                color="gray"
                onClick={() => {
                  incrementDate(1);
                }}
              >
                <CaretRightIcon size={isMobile ? 16 : 12} weight="bold" />
              </ActionIcon>
            </Group>
          </Group>
        </Stack>
        {!tasks?.length && (
          <Text size="sm" c="dimmed" ta="center">
            No tasks {formattedDate().toLocaleLowerCase()}.
          </Text>
        )}
        {!!tasks && tasks.length > 0 && (
          <div className={styles.progress}>
            <ProgressBar progress={progress} />
          </div>
        )}
        <>
          {!!incompleteTasks?.length &&
            incompleteTasks?.map((task) => {
              return (
                <TaskButton
                  key={task.id.toString()}
                  task={task}
                  onMark={() => {
                    getTasks();
                  }}
                />
              );
            })}
          {!!completeTasks?.length &&
            completeTasks?.map((task) => {
              return (
                <TaskButton
                  key={task.id.toString()}
                  task={task}
                  onMark={() => {
                    getTasks();
                  }}
                />
              );
            })}
        </>
      </Stack>
    </div>
  );
}

function UrgentTasks() {
  return <div>By urgency</div>;
}

function AvailableTasks() {
  return <div>By availability</div>;
}
