import { useState, useEffect } from "react";

export function useKeyboardOffset() {
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const handleResize = () => {
      const offset = window.innerHeight - visualViewport.height;
      // We only want to set the offset if the keyboard is actually taking up space
      setKeyboardOffset(offset > 100 ? offset : 0);
    };

    handleResize(); // Initial check

    visualViewport.addEventListener("resize", handleResize);
    return () => visualViewport.removeEventListener("resize", handleResize);
  }, []);

  return keyboardOffset;
}
