import { useNavigate, useParams } from "react-router";
import styles from "./Idea.module.scss";
import useFetch from "../../hooks/useFetch";
import { IIdea, IIdeaForm } from "../../../app/database/models/idea";
import { ActionIcon, Grid, Group, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { useAlert } from "../../contexts/AlertContext";
import TextEditor from "../../components/TextEditor/TextEditor";
import { ArrowLeft } from "@phosphor-icons/react";

export default function Idea() {
  const { ideaId } = useParams();
  const { setAlert } = useAlert();

  const navigate = useNavigate();

  const { data: idea, load: reloadIdea } = useFetch<undefined, IIdea>({
    url: `/graph/ideas/${ideaId}`,
    method: "GET",
    runOnMount: true,
  });

  const [title, setTitle] = useState(idea?.title);
  useEffect(() => {
    setTitle(idea?.title);
  }, [idea?.title]);

  const { load: submitTitle } = useFetch<Partial<IIdeaForm>, IIdea>({
    url: `/graph/ideas/${ideaId}`,
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
    title && title !== idea?.title && submitTitle();
    if (!title) {
      setAlert({
        title: "Error",
        message: "Title is required",
        type: "error",
      });
    }
  }, [title]);

  const [content, setContent] = useState(idea?.content || "");
  useEffect(() => {
    setContent(idea?.content || "");
  }, [idea?.content]);

  console.log("Content: ", content);

  const { load: submitContent } = useFetch<Partial<IIdeaForm>, IIdea>({
    url: `/graph/ideas/${ideaId}`,
    method: "PUT",
    body: {
      content,
    },
    dependencies: [content],
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
    content && content !== idea?.content && submitContent();
  }, [content]);

  console.log("Idea: ", idea);

  return (
    <div className={styles.idea}>
      <Grid>
        <Grid.Col span={{ sm: 12 }}>
          <Group>
            <ActionIcon
              onClick={() => {
                navigate("/");
              }}
            >
              <ArrowLeft weight="bold" />
            </ActionIcon>
          </Group>
        </Grid.Col>
        <Grid.Col span={{ sm: 12 }}>
          <Title
            order={1}
            contentEditable
            onBlur={(e) => setTitle(e.currentTarget.innerText)}
            dangerouslySetInnerHTML={{
              __html: title || "Hold on...",
            }}
          />
        </Grid.Col>
        <Grid.Col span={12} />
        <Grid.Col span={{ sm: 12 }}>
          <TextEditor
            content={content}
            onBlur={(value) => {
              setContent(value);
            }}
          />
        </Grid.Col>
      </Grid>
    </div>
  );
}
