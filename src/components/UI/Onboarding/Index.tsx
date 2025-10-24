import { Stack } from "@mantine/core";
import { IUserForm } from "../../../../app/database/models/user";
import { useAuth } from "../../../contexts/AuthContext";
import { useState } from "react";
import { updateUser } from "../../../utils/user";
import Introduction from "./Introduction";
import ChooseYourPath from "./ChooseYourPath";

export type IOnboardingProps = {
  next: () => void;
  complete: () => Promise<void>;
};

export default function Onboarding() {
  const { user, reload } = useAuth();
  const handleMarkComplete = async () => {
    await updateUser({
      onboarding: {
        viewedWelcomeScreenAt: new Date(),
      },
    });
    await reload();
  };

  const [stage, setStage] = useState<number>(0);

  const nextStep = () => {
    setStage(stage + 1);
  };

  const StageToView = [Introduction, ChooseYourPath];

  const Stage = StageToView[stage];

  return <Stage next={nextStep} complete={handleMarkComplete} />;
}
