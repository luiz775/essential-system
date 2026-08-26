import { useColorMode } from "../theme/ColorModeContext";

type Props = {
  size?: number;
};

export function BrandMark({ size = 40 }: Props) {
  const { mode } = useColorMode();
  return (
    <img
      src={mode === "light" ? "/icon-light.png" : "/icon.png"}
      alt="Essential System"
      width={size}
      height={size}
      draggable={false}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        objectFit: "cover",
        flexShrink: 0,
        display: "block",
      }}
    />
  );
}
