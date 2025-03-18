import { useParams } from "react-router";
import styles from "./Idea.module.scss";
import useFetch from "../../hooks/useFetch";
import { IIdea } from "../../../app/database/models/idea";

export default function Idea() {
  const { ideaId } = useParams();

  const { data: idea } = useFetch<undefined, IIdea>({
    url: `/graph/ideas/${ideaId}`,
    method: "GET",
    runOnMount: true,
  });

  console.log("Idea: ", idea);

  return <div className={styles.idea}>{idea?.title}</div>;
}
