"use client";

/**
 * Shrinks a photo before it leaves the device.
 *
 * Unlike a PDF or a Word file, a photo genuinely has to reach the server —
 * reading handwriting needs the model's vision, and there is no client-side
 * substitute. What it does not have to do is travel at camera resolution: a
 * modern phone photo is routinely 4000px and 8MB, and none of that extra
 * detail helps a model read a page of handwriting. Downscaling to a sane
 * reading width both keeps the request well under Vercel's 4.5MB body limit
 * and cuts the vision tokens Anthropic bills for, since those scale with
 * image resolution.
 */

export const MAX_SOURCE_BYTES = 20 * 1024 * 1024; // 20MB, before downscaling
/** Long edge, in px. Plenty for a photographed page of text. */
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export interface PreparedPhoto {
  /** Base64, no data: URI prefix. */
  base64: string;
  mediaType: "image/jpeg";
}

export type PhotoPrepareErrorCode = "tooLarge" | "notAnImage" | "decodeFailed";

export class PhotoPrepareError extends Error {
  constructor(
    message: string,
    public readonly code: PhotoPrepareErrorCode,
    public readonly sizeMb?: string,
  ) {
    super(message);
    this.name = "PhotoPrepareError";
  }
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith("image/")) {
    throw new PhotoPrepareError("not an image", "notAnImage");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new PhotoPrepareError(
      "file too large",
      "tooLarge",
      (file.size / 1024 / 1024).toFixed(1),
    );
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    throw new PhotoPrepareError("could not decode image", "decodeFailed");
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new PhotoPrepareError("canvas unavailable", "decodeFailed");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) {
    throw new PhotoPrepareError("could not encode image", "decodeFailed");
  }

  const base64 = await blobToBase64(blob);
  return { base64, mediaType: "image/jpeg" };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // "data:image/jpeg;base64,xxxx" — only the part after the comma.
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
