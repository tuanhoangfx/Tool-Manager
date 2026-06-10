/** GitHub Releases API — extension ZIP download (E0001). */
export type GitHubRelease = {
  tag_name?: string;
  html_url?: string;
  published_at?: string;
  assets?: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
};
