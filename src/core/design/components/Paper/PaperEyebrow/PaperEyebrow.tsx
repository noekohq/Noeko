import { useNavigate } from "react-router";
import styles from "./PaperEyebrow.module.scss";
import { ActionIcon, Group, MantineColor } from "@mantine/core";
import { ArrowLeftIcon, IconProps } from "@phosphor-icons/react";

type IEyebrowAction = {
  invisible?: boolean;
  icon: React.FC<IconProps>;
  name: string;
  run: () => void;
  disabled: boolean;
  color?: MantineColor;
  weight?: IconProps["weight"];
};

interface IPaperEyebrowProps {
  withBack?: boolean;
  left?: React.ReactNode;
  actions?: IEyebrowAction[];
  right?: React.ReactNode;
}

export default function PaperEyebrow({
  withBack = true,
  left,
  actions,
  right,
}: IPaperEyebrowProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.paperEyebrow}>
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap">
          {withBack && (
            <ActionIcon
              onClick={() => navigate(-1)}
              color="gray"
              variant="subtle"
              size={"md"}
              radius={"md"}
            >
              <ArrowLeftIcon weight="bold" />
            </ActionIcon>
          )}
          {left}
        </Group>

        <Group wrap="nowrap">
          {actions &&
            actions.length > 1 &&
            actions
              .filter((a) => !a.invisible)
              .map((action) => {
                const { name, icon, disabled, run, color, weight } = action;

                const Icon = icon;

                return (
                  <ActionIcon
                    onClick={run}
                    aria-label={name}
                    size={"md"}
                    radius={"md"}
                    variant="subtle"
                    color={color || "gray"}
                    disabled={disabled}
                  >
                    <Icon weight={weight || "bold"} />
                  </ActionIcon>
                );
              })}
          {right}
        </Group>
      </Group>
    </div>
  );
}
