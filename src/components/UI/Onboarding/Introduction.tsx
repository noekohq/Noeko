import { Button, Divider, Group, Space, Stack, Text, Title } from "@mantine/core";
import PageWrapper from "../../Layout/PageWrapper";
import Content from '@core/design/components/Layout/Content';
import { useAuth } from '@/contexts/AuthContext';
import { IOnboardingProps } from "./Index";
import styles from "./Introduction.module.scss";
import ASCII from "../../Utils/Graphics/ascii/ASCII";
import { planetArt, starArt } from "../../Utils/Graphics/ascii/library/space";

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
