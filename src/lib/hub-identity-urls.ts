import { createHubIdentityUrls } from "@tool-workspace/hub-identity";

const urls = createHubIdentityUrls({
  toolHubUrl: import.meta.env.VITE_TOOL_HUB_URL,
  toolHostnames: ["databox.infi.io.vn"],
  dev: import.meta.env.DEV,
});

export const { resolveToolHubOrigin, toolHubUsersUrl, toolHubSignInUrl, isToolHubOrigin } = urls;
