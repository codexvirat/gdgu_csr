import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

function uploadsRoot() {
  return path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "./uploads");
}

/** Stores a file under uploads/<subdir>/ and returns the relative key to persist on the record (never a public URL). */
export async function saveUploadedFile(file: File, subdir: string) {
  const dir = path.join(uploadsRoot(), subdir);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name).slice(0, 10);
  const key = `${subdir}/${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsRoot(), key), buffer);

  return { fileKey: key, fileName: file.name };
}

export async function saveBuffer(buffer: Buffer, subdir: string, fileName: string) {
  const dir = path.join(uploadsRoot(), subdir);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(fileName).slice(0, 10);
  const key = `${subdir}/${crypto.randomUUID()}${ext}`;
  await writeFile(path.join(uploadsRoot(), key), buffer);

  return { fileKey: key };
}

/** Decodes a `data:image/...;base64,...` string and stores it under uploads/<subdir>/. */
export async function saveBase64Image(dataUrl: string, subdir: string) {
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image data URL");
  const [, ext, base64] = match;
  return saveBuffer(Buffer.from(base64, "base64"), subdir, `photo.${ext}`);
}

export function resolveUploadPath(fileKey: string) {
  const root = uploadsRoot();
  const resolved = path.resolve(root, fileKey);
  if (!resolved.startsWith(root)) {
    throw new Error("Invalid file key");
  }
  return resolved;
}
