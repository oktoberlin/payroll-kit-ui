import type { CSSProperties } from "react";

import { ICONS, type IconName } from "./icons";

export type { IconName };

export function Icon({
  name,
  size = 14,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const Component = ICONS[name];
  return <Component size={size} className={className} style={style} aria-hidden="true" strokeWidth={2} />;
}
