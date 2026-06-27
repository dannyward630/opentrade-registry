import { downloadOfficialSource, type DownloadOptions, type DownloadedSource } from "@opentrade/registry";

export type DownloadedSourceFile = DownloadedSource;
export type DownloadSourceOptions = Omit<DownloadOptions, "allowedHosts"> & { allowedHosts?: string[] };

export async function downloadSourceToTempFile(sourceUrl: string, options: DownloadSourceOptions = {}): Promise<DownloadedSourceFile> {
  const allowedHosts = options.allowedHosts ?? [new URL(sourceUrl).hostname];
  try {
    return await downloadOfficialSource(sourceUrl, { ...options, allowedHosts });
  } catch (error) {
    if (error instanceof Error) Object.assign(error, { exitCode: 3 });
    throw error;
  }
}
