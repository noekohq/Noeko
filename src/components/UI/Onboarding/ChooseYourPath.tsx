import { Button, Group, Stack, Text, Title } from "@mantine/core";
import PageWrapper from "../../Layout/PageWrapper";
import Content from "@core/design/components/Layout/Content";
import { IOnboardingProps } from "./Index";
import { Link, useNavigate } from "react-router";
import useFetch from "@core/hooks/useFetch";
import { ISafeIdea } from "../../../../shared/types/idea";
import { showNotification } from "@mantine/notifications";
import styles from "./ChooseYourPath.module.scss";

export default function ChooseYourPath({ next, complete }: IOnboardingProps) {
  const navigate = useNavigate();

  const { load: firstIdea } = useFetch<undefined, ISafeIdea>({
    url: "/ideas/first",
    method: "POST",
    onSuccess: async (i) => {
      await complete(() => {
        navigate(`/idea/${i.id.toString()}`);
      });
    },
    onError: (error) => {
      console.error("Error creating user's first idea: ", error);
      showNotification({
        title: "Error creating idea!",
        message: "Please try again later.",
      });
    },
  });

  const importPath = async () => {
    await complete(() => {
      navigate(`/import`);
    });
  };

  const firstIdeaPath = async () => {
    firstIdea();
  };

  return (
    <div className={styles.choosePath}>
      <h2>Choose your path</h2>
      <Text size="lg">
        Enough about us, how can we best get <i>you</i> started?
      </Text>
      <Group justify="center">
        <button className={styles.button} onClick={firstIdeaPath}>
          Create your first idea
        </button>
        <button className={styles.buttonTwo} onClick={importPath}>
          Import your ideas
        </button>
      </Group>
    </div>
  );
}
