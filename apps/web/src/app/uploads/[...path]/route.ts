import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const filePath = path.join("/");
  const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:3030";
  const targetUrl = `${backendUrl}/uploads/${filePath}`;

  const headers: HeadersInit = {};
  const range = req.headers.get("range");
  if (range) {
    headers["range"] = range;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers,
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    const forwardHeaders = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "last-modified",
      "etag",
      "cache-control",
    ];

    for (const h of forwardHeaders) {
      const val = upstreamRes.headers.get(h);
      if (val) responseHeaders.set(h, val);
    }

    if (!responseHeaders.has("accept-ranges")) {
      responseHeaders.set("accept-ranges", "bytes");
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new NextResponse(`Media not found or backend unreachable`, {
      status: 502,
    });
  }
}
