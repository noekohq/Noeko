import { useEffect, useRef } from "react";
import { useLayout } from "../contexts/LayoutContext";

interface IUseScrollArgs {
  ref: React.RefObject<HTMLElement | null> | null;
}

export default function useScroll({ ref }: IUseScrollArgs) {
  const {
    scroll: { isScrolled, setIsScrolled, scrollDirection, setScrollDirection },
  } = useLayout();

  const lastScrollPosition = useRef(0);

  const handleScroll = () => {
    if (!ref?.current) return;
    const direction =
      ref.current.scrollTop > lastScrollPosition.current ? "down" : "up";
    setIsScrolled(ref.current.scrollTop > 0);
    setScrollDirection(direction);
    lastScrollPosition.current = ref.current.scrollTop;
  };

  useEffect(() => {
    if (!ref?.current) return;
    ref.current?.addEventListener("scroll", handleScroll);

    return () => {
      ref.current?.removeEventListener("scroll", handleScroll);
    };
  }, []);
}
