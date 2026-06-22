import packageJson from "../../package.json";

/** App release label (keep in sync with package.json version). */
export const APP_VERSION = packageJson.version;

export const APP_USER_LABEL = "admin";

/** Sidebar brand — human name only (version lives in tab header). */
export const DATA_BOX_PRODUCT = {
  code: "P0020",
  name: "Data Box",
} as const;
