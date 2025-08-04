import { Loader, MantineColor, MantineSize } from "@mantine/core";

type ILoaderProps = {
  size?: MantineSize;
  color?: MantineColor;
};

export default function Loading({ size, color }: ILoaderProps) {
  return (
    <div>
      <Loader size={size} color={color} />
    </div>
  );
}
