import { useEffect, useRef } from "react";
import { useLandscape } from "../../contexts/LandscapeContext";
import { useLayout } from "../../contexts/LayoutContext";
import { RabbitholeIndicator } from "../Display/Rabbitholes/RabbitholeIndicator";
import MobileBar from "../UI/Layout/MobileBar";
import styles from "./PageWrapper.module.scss";
import StatusBar from "../UI/Layout/StatusBar";
import useScroll from "../../hooks/useScroll";

type PageWrapperProps = {
  children: React.ReactNode;
};

export default function PageWrapper({ children }: PageWrapperProps) {
  const { isMobile } = useLayout();

  const wrapperRef = useRef<HTMLDivElement>(null);

  const {
    rabbitholes: {
      entered: { get: enteredRabbithole },
    },
  } = useLandscape();

  const hasEnteredRabbithole = enteredRabbithole !== null;

  return (
    <div
      className={`${styles.pageWrapper} ${hasEnteredRabbithole ? styles.hasRabbithole : ""}`}
      ref={wrapperRef}
    >
      {children}
      {isMobile && <MobileBar />}
    </div>
  );
}
