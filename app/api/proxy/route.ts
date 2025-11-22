import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new Response("Missing url", { status: 400 });
  }
  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36",
      },
    });
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const filename = decodeURIComponent(new URL(url).pathname.split("/").pop() || "download");
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    return new Response(upstream.body, { headers, status: 200 });
  } catch (err: any) {
    return new Response(`Proxy error: ${err.message || String(err)}`, { status: 500 });
  }
}

