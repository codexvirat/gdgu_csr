import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/lib/auth";
import { resolveUploadPath } from "@/lib/storage";

const IMAGE_MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  await requireUser();

  const { path: segments } = await params;
  const fileKey = segments.join("/");

  try {
    const filePath = resolveUploadPath(fileKey);
    const data = await readFile(filePath);
    const name = request.nextUrl.searchParams.get("name") ?? segments[segments.length - 1];
    const contentType = IMAGE_MIME_TYPES[path.extname(fileKey).toLowerCase()] ?? "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(name)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
