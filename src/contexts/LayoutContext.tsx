import React, { useContext, useState } from "react";

type ILayoutContext = {
  leftSidebar: {
    opened: boolean;
    setOpened: (opened: boolean) => void;
  };
  rightSidebar: {
    opened: boolean;
    setOpened: (opened: boolean) => void;
  };
};

const initialLayoutContext: ILayoutContext = {
  leftSidebar: {
    opened: false,
    setOpened: (opened: boolean) => {},
  },
  rightSidebar: {
    opened: false,
    setOpened: (opened: boolean) => {},
  },
};

const LayoutContext = React.createContext(initialLayoutContext);

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [leftSidebar, setLeftSidebar] = useState({
    opened: false,
    setOpened: (opened: boolean) => setLeftSidebar({ ...leftSidebar, opened }),
  });

  const [rightSidebar, setRightSidebar] = useState({
    opened: false,
    setOpened: (opened: boolean) =>
      setRightSidebar({ ...rightSidebar, opened }),
  });

  return (
    <LayoutContext.Provider value={{ leftSidebar, rightSidebar }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => useContext(LayoutContext);
