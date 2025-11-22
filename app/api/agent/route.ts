import { NextRequest } from "next/server";
import { duckDuckGoSearch, extractLinks, fetchPage, pickDocumentLinks } from "@/lib/fetchers";
import { fetchAndMaybeParse, htmlToText } from "@/lib/parsers";
import { buildReport } from "@/lib/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Output = {
  report: string;
  sources: { title: string; url: string }[];
  downloads: { url: string; filename: string }[];
  logs: string[];
};

export async function POST(req: NextRequest) {
  const { prompt } = (await req.json().catch(() => ({}))) as { prompt?: string };
  const logs: string[] = [];
  const say = (m: string) => logs.push(m);
  if (!prompt || prompt.trim().length < 5) {
    return new Response("Prompt required", { status: 400 });
  }
  try {
    say(`Searching the web for: ${prompt.slice(0, 140)}`);
    const searchTerms = [prompt, deriveExpandedQuery(prompt)];
    const results = (
      await Promise.all(searchTerms.map((q) => duckDuckGoSearch(q, 10)))
    ).flat();
    // de-dupe by URL
    const seen = new Set<string>();
    const unique = results.filter((r) => (seen.has(r.url) ? false : seen.add(r.url))).slice(0, 12);
    say(`Found ${unique.length} initial results.`);

    // Fetch pages
    const pages = await Promise.allSettled(unique.map((r) => fetchPage(r.url)));
    const pageDatas = pages
      .filter((p) => p.status === "fulfilled")
      .map((p) => (p as PromiseFulfilledResult<Awaited<ReturnType<typeof fetchPage>>>).value);
    say(`Fetched ${pageDatas.length} pages.`);

    // Extract page texts and document links
    const pageSources = pageDatas.map((p) => ({
      title: p.title || p.url,
      url: p.url,
      text: htmlToText(p.html),
      links: extractLinks(p.html, p.url),
    }));
    const docLinks = pickDocumentLinks(pageSources.flatMap((p) => p.links)).slice(0, 12);
    say(`Identified ${docLinks.length} documents for download.`);

    // Parse documents (PDF/DOCX/TEXT)
    const parsedDocs = await Promise.allSettled(docLinks.map((d) => fetchAndMaybeParse(d.href)));
    const docSources = parsedDocs
      .filter((p) => p.status === "fulfilled")
      .map((p) => (p as PromiseFulfilledResult<Awaited<ReturnType<typeof fetchAndMaybeParse>>>).value)
      .map((d) => ({ title: d.url.split("/").pop() || d.url, url: d.url, text: d.text || "" }));
    say(`Parsed ${docSources.length} documents.`);

    // Prepare downloads via proxy
    const downloads = docLinks.map((d) => ({
      url: `/api/proxy?url=${encodeURIComponent(d.href)}`,
      filename: d.filename,
    }));

    // Build report
    const sources = [...pageSources.map((p) => ({ title: p.title, url: p.url, text: p.text })), ...docSources].slice(
      0,
      24
    );
    const report = buildReport(prompt, sources);

    const output: Output = {
      report,
      sources: sources.map((s) => ({ title: s.title, url: s.url })),
      downloads,
      logs,
    };
    return Response.json(output);
  } catch (err: any) {
    return new Response(`Agent error: ${err.message || String(err)}`, { status: 500 });
  }
}

function deriveExpandedQuery(prompt: string): string {
  const extras = ["site:.pdf", "filetype:pdf", "whitepaper", "report", "analysis", "insights"].join(" OR ");
  return `${prompt} (${extras})`;
}

