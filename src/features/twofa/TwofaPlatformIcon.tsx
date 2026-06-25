import { useState } from "react";
import { KeyRound } from "lucide-react";
import { HUB_DIRECTORY_CARD_ICON_GLYPH_PX, compactIconSize } from "@tool-workspace/hub-ui";
import { resolveTwofaPlatformIcon } from "./twofa-platform-icon";

const ICON_PX = 16;
const COMPACT_ICON_PX = HUB_DIRECTORY_CARD_ICON_GLYPH_PX;

type Props = {
  service: string;
  className?: string;
  compact?: boolean;
};

export function TwofaPlatformIcon({ service, className = "", compact = false }: Props) {
  const hit = resolveTwofaPlatformIcon(service);
  const [imgFailed, setImgFailed] = useState(false);
  const title = hit?.label ?? service;
  const iconPx = compact ? compactIconSize(COMPACT_ICON_PX) : ICON_PX;

  if (hit && !imgFailed) {
    return (
      <span
        className={`twofa-brand-icon-shell twofa-platform-icon inline-flex shrink-0 items-center${className ? ` ${className}` : ""}`}
        title={title}
      >
        <img
          src={hit.src}
          alt=""
          className="twofa-brand-icon-shell__img twofa-platform-icon__img"
          width={iconPx}
          height={iconPx}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  const initials = service.trim().slice(0, 2).toUpperCase() || "??";

  return (
    <span
      className={`twofa-platform-icon twofa-platform-icon--fallback inline-flex shrink-0 items-center justify-center${className ? ` ${className}` : ""}`}
      title={title}
      aria-hidden
    >
      {hit && imgFailed ? (
        <KeyRound size={compact ? iconPx : 11} className="opacity-75" aria-hidden />
      ) : (
        <span className="twofa-platform-icon__initials">{initials}</span>
      )}
    </span>
  );
}
