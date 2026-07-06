import "server-only";
import { put, get } from "@vercel/blob";
import path from "node:path";
import crypto from "node:crypto";

/** Stores a file under <subdir>/ in Vercel Blob (private access) and returns the relative key to persist on the record. */
export async function saveUploadedFile(file: File, subdir: string) {
  const ext = path.extname(file.name).slice(0, 10);
  const key = `${subdir}/${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await put(key, buffer, { access: "private", addRandomSuffix: false });

  return { fileKey: key, fileName: file.name };
}

export async function saveBuffer(buffer: Buffer, subdir: string, fileName: string) {
  const ext = path.extname(fileName).slice(0, 10);
  const key = `${subdir}/${crypto.randomUUID()}${ext}`;
  await put(key, buffer, { access: "private", addRandomSuffix: false });

  return { fileKey: key };
}

/** Decodes a `data:image/...;base64,...` string and stores it under <subdir>/. */
export async function saveBase64Image(dataUrl: string, subdir: string) {
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image data URL");
  const [, ext, base64] = match;
  return saveBuffer(Buffer.from(base64, "base64"), subdir, `photo.${ext}`);
}

/** Reads a previously stored file back out of Vercel Blob. Throws if the key doesn't exist. */
export async function readUploadedFile(fileKey: string) {
  const result = await get(fileKey, { access: "private" });
  if (!result || result.statusCode !== 200) throw new Error("Not found");
  const chunks: Uint8Array[] = [];
  const reader = result.stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return { data: Buffer.concat(chunks), contentType: result.blob.contentType };
}
