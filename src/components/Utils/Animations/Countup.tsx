import { useEffect, useRef, useState } from "react";
import styles from "./Countup.module.scss";

interface ICountUpProps {
  targetNumber: number;
}

export default function CountUp({ targetNumber }: ICountUpProps) {
  const [currentNumber, setCurrentNumber] = useState(0);
  const animationFrameId = useRef<number | null>(null);
  const previousNumberRef = useRef(0);

  useEffect(() => {
    const initialNumber = previousNumberRef.current;
    let startTimestamp: number | null = null;
    const duration = 1500;

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = timestamp - startTimestamp;
      const progressFraction = Math.min(progress / duration, 1);
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progressFraction);
      const nextNumber = Math.floor(
        initialNumber + (targetNumber - initialNumber) * easedProgress,
      );
      setCurrentNumber(nextNumber);

      if (progress < duration) {
        animationFrameId.current = requestAnimationFrame(animate);
      } else {
        setCurrentNumber(targetNumber);
        previousNumberRef.current = targetNumber; // Update ref at the end
      }
    };

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [targetNumber]);

  // Set the initial value and previous ref without animation on first load
  useEffect(() => {
    setCurrentNumber(targetNumber);
    previousNumberRef.current = 0;
  }, []);

  return (
    <span className={styles.counter}>{currentNumber.toLocaleString()}</span>
  );
}
