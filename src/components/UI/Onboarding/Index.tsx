import { Stack } from "@mantine/core";
import { IUserForm } from "../../../../app/database/models/user";
import { useAuth } from "../../../contexts/AuthContext";
import { useState } from "react";
import { updateUser } from "../../../utils/user";
import Introduction from "./Introduction";
import ChooseYourPath from "./ChooseYourPath";
import Hotkeys from "./Hotkeys";
import Concepts from "./Concepts";
import { useLayout } from "../../../contexts/LayoutContext";
import Feedback from "./Feedback";

export type IOnboardingProps = {
  next: () => void;
  complete: (cb?: () => void) => Promise<void>;
};

export default function Onboarding() {
  const { isDesktop, isWideScreen, isUltraWide, isTablet } = useLayout();
  const { reload } = useAuth();
  const handleMarkComplete = async (cb?: () => void) => {
    await updateUser({
      settings: {
        isNew: false,
      },
    });
    await reload();
    cb?.();
  };

  const [stage, setStage] = useState<number>(0);

  const nextStep = () => {
    setStage(stage + 1);
  };

  const DesktopOnly = [Hotkeys];

  const StageToView = [
    Introduction,
    Concepts,
    ...(isDesktop || isWideScreen || isUltraWide ? DesktopOnly : []),
    Feedback,
    ChooseYourPath,
  ];

  const Stage = StageToView[stage];

  return <Stage next={nextStep} complete={handleMarkComplete} />;
}
