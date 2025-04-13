import { Loader } from "@mantine/core";

type ILoaderProps = {
  size: "sm" | "md" | "lg";
};

export default function Loading({ size }: ILoaderProps) {
  return (
    <div>
      <Loader size={size} />
    </div>
  );
}
