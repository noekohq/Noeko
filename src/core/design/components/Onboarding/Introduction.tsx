import { Group, Text } from "@mantine/core";
import { useAuth } from "@domains/identity/contexts/AuthContext";
import { IOnboardingProps } from "./Index";
import styles from "./Introduction.module.scss";
import ASCII from "../Graphics/ascii/ASCII";
import { planetArt, starArt } from "../Graphics/ascii/library/space";

export default function Introduction({ next }: IOnboardingProps) {
  const { user } = useAuth();

  return (
    <div className={styles.introduction}>
      <div className={styles.content}>
        <h1 className={styles.title}>Welcome to Noeko</h1>
        <Text>Your self-organizing universe for connected thought.</Text>
        <Text>Ready to get started {user?.firstName}?</Text>
      </div>
      <Group justify="center" className={styles.action}>
        <button className={styles.button} onClick={next}>
          Begin Your Journey
        </button>
      </Group>
      <ASCII className={styles.artPlanet}>{planetArt}</ASCII>
      <ASCII className={styles.artStars}>{starArt}</ASCII>
    </div>
  );
}
