/**
 * Loads an image File, crops it to a centered square, scales it to `size`
 * pixels, and returns a JPEG data URL at the given quality. Designed for
 * avatar storage in localStorage where small footprint matters.
 */
export async function downscaleSquareImage(
  file: File,
  size = 128,
  quality = 0.85,
): Promise<string> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  const srcSize = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - srcSize) / 2;
  const sy = (img.naturalHeight - srcSize) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", quality);
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unexpected FileReader result"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image decode failed"));
    img.src = src;
  });
}
