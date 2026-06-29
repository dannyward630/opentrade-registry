import type { SourceRegistryEntry } from "@opentrade-registry/core";

export type SnapshotResolutionMethod = "direct" | "socrata_export" | "dated_page_link";

export type ResolvedOfficialSnapshotUrl = {
  url: string;
  method: SnapshotResolutionMethod;
};

export type SnapshotResolverOptions = {
  signal?: AbortSignal;
  fetchPage?: (url: string, options: { signal?: AbortSignal }) => Promise<string>;
};

const DIRECT_SOURCES = new Set([
  "us.ca.cslb.contractors",
  "us.fl.dbpr.construction",
  "us.mn.dli.licenses_registrations",
]);

const SOCRATA_SOURCES = new Set([
  "us.or.ccb.active_licenses",
  "us.tx.tdlr.all_licenses",
  "us.wa.lni.contractors",
]);

const DATED_PAGE_SOURCES = new Set(["us.az.roc.contractors"]);

export async function resolveOfficialSnapshotUrl(
  source: SourceRegistryEntry,
  options: SnapshotResolverOptions = {},
): Promise<ResolvedOfficialSnapshotUrl> {
  if (DIRECT_SOURCES.has(source.id)) {
    return { url: validateHttps(source.sourceUrl), method: "direct" };
  }
  if (SOCRATA_SOURCES.has(source.id)) {
    return { url: buildSocrataExportUrl(source.sourceUrl), method: "socrata_export" };
  }
  if (DATED_PAGE_SOURCES.has(source.id)) {
    const pageUrl = validateHttps(source.sourceUrl);
    const html = await (options.fetchPage ?? fetchOfficialPage)(pageUrl, { signal: options.signal });
    return { url: findNewestDataLink(pageUrl, html), method: "dated_page_link" };
  }
  throw new Error(`Source unavailable: ${source.id} does not declare an automatic snapshot resolver.`);
}

function buildSocrataExportUrl(sourceUrl: string): string {
  const url = new URL(validateHttps(sourceUrl));
  const datasetId = url.pathname.match(/\/([a-z0-9]{4}-[a-z0-9]{4})\/?$/i)?.[1];
  if (!datasetId) throw new Error("Source unavailable: the official Socrata URL does not contain a dataset ID.");
  return `${url.origin}/api/views/${datasetId}/rows.csv?accessType=DOWNLOAD`;
}

function findNewestDataLink(pageUrl: string, html: string): string {
  const page = new URL(pageUrl);
  const links = [...html.matchAll(/href\s*=\s*(["'])(.*?)\1/gi)]
    .map((match) => match[2])
    .filter((href): href is string => Boolean(href))
    .map((href) => new URL(href, page))
    .filter((url) => url.hostname === page.hostname && /\.(?:csv|xlsx|zip)(?:$|[?#])/i.test(url.href))
    .sort((left, right) => right.href.localeCompare(left.href));
  if (!links[0]) throw new Error("Source unavailable: the official page exposed no supported data file.");
  return links[0].href;
}

async function fetchOfficialPage(url: string, options: { signal?: AbortSignal }): Promise<string> {
  const response = await fetch(url, {
    headers: { accept: "text/html", "user-agent": "OpenTrade-Registry/1.0 (+https://github.com/dannyward630/opentrade-registry)" },
    redirect: "error",
    signal: options.signal,
  });
  if (!response.ok) throw new Error(`Source unavailable: discovery page returned HTTP ${response.status}.`);
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > 2 * 1024 * 1024) throw new Error("Source unavailable: discovery page exceeded 2 MiB.");
  const html = await response.text();
  if (Buffer.byteLength(html) > 2 * 1024 * 1024) throw new Error("Source unavailable: discovery page exceeded 2 MiB.");
  return html;
}

function validateHttps(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Source unavailable: official snapshot URLs must use HTTPS.");
  return url.href;
}
