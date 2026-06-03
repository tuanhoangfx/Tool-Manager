import { useState } from "react";
import { KeyRound } from "lucide-react";
import { resolveTwofaPlatformIcon } from "./twofa-platform-icon";

/** Same footprint as Cookie route table icons (`h-4 w-4`). */
const ICON_PX = 16;

type Props = {
  service: string;
  className?: string;
};

export function TwofaPlatformIcon({ service, className = "" }: Props) {
  const hit = resolveTwofaPlatformIcon(service);
  const [imgFailed, setImgFailed] = useState(false);
  const title = hit?.label ?? service;

  if (hit && !imgFailed) {
    return (
      <span
        className={`twofa-platform-icon inline-flex shrink-0 items-center${className ? ` ${className}` : ""}`}
        title={title}
      >
        <img
          src={hit.src}
          alt=""
          className="twofa-platform-icon__img"
          width={ICON_PX}
          height={ICON_PX}
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
        <KeyRound size={11} className="opacity-75" aria-hidden />
      ) : (
        <span className="twofa-platform-icon__initials">{initials}</span>
      )}
    </span>
  );
}
