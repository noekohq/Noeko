import { useParams } from "react-router";
import styles from "./Idea.module.scss";
import useFetch from "../../hooks/useFetch";

export default function Idea() {
  const { ideaId } = useParams();

  const { data: idea } = useFetch({
    url: `/api/ideas/${ideaId}`,
    method: "GET",
    runOnDependencies: [ideaId],
  });

  console.log("Idea: ", idea);

  return <div className={styles.idea}>This is an idea</div>;
}
