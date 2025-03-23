import { useParams } from "react-router";
import styles from "./Idea.module.scss";
import useFetch from "../../hooks/useFetch";
import { IIdea } from "../../../app/database/models/idea";
import { Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { useAlert } from "../../contexts/AlertContext";

export default function Idea() {
  const { ideaId } = useParams();
  const { setAlert } = useAlert();

  console.log("Idea id: ", ideaId);

  const { data: idea, load: reloadIdea } = useFetch<undefined, IIdea>({
    url: `/graph/ideas/${ideaId}`,
    method: "GET",
    runOnMount: true,
  });

  console.log("Idea: ", idea);

  const [title, setTitle] = useState(idea?.title);
  useEffect(() => {
    setTitle(idea?.title);
  }, [idea?.title]);

  const { load: submitTitle } = useFetch({
    url: `/ideas/${ideaId}`,
    method: "PUT",
    body: {
      title,
    },
    dependencies: [title],
    onSuccess: () => {
      reloadIdea();
    },
    onError: (error) => {
      setAlert({
        title: "Error",
        message: "There was an error updating the idea",
        type: "error",
      });
    },
  });

  useEffect(() => {
    title && submitTitle();
  }, [title]);

  return (
    <div className={styles.idea}>
      <Title order={1}>{idea?.title}</Title>
    </div>
  );
}
