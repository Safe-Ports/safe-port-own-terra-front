const MAP_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MAP_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
const MAX_MAP_DIMENSION = 3200;
const JPEG_QUALITY = 0.9;

export const MAP_IMAGE_ACCEPT = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
].join(",");

function fileExtension(filename = "") {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export function isSupportedMapImage(file) {
  if (!file) return false;
  const mimeType = String(file.type || "").split(";")[0].trim().toLowerCase();
  return MAP_IMAGE_MIME_TYPES.has(mimeType) || MAP_IMAGE_EXTENSIONS.has(fileExtension(file.name));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("El navegador no pudo abrir esta imagen"));
    image.src = dataUrl;
  });
}

function findCropBounds(context, width, height) {
  const { data } = context.getImageData(0, 0, width, height);

  const lightRatioForRow = (row) => {
    let lightPixels = 0;
    for (let column = 0; column < width; column += 1) {
      const index = (row * width + column) * 4;
      if ((data[index] + data[index + 1] + data[index + 2]) / 3 > 208) lightPixels += 1;
    }
    return lightPixels / width;
  };

  const lightRatioForColumn = (column) => {
    let lightPixels = 0;
    for (let row = 0; row < height; row += 1) {
      const index = (row * width + column) * 4;
      if ((data[index] + data[index + 1] + data[index + 2]) / 3 > 208) lightPixels += 1;
    }
    return lightPixels / height;
  };

  let top = 0;
  while (top < height && lightRatioForRow(top) < 0.18) top += 1;
  let bottom = height - 1;
  while (bottom > top && lightRatioForRow(bottom) < 0.18) bottom -= 1;
  let left = 0;
  while (left < width && lightRatioForColumn(left) < 0.12) left += 1;
  let right = width - 1;
  while (right > left && lightRatioForColumn(right) < 0.12) right -= 1;

  const cropWidth = right - left;
  const cropHeight = bottom - top;
  if (cropWidth < width * 0.35 || cropHeight < height * 0.2) {
    return { left: 0, top: 0, width, height, cropped: false };
  }

  const paddingX = Math.round(cropWidth * 0.02);
  const paddingY = Math.round(cropHeight * 0.02);
  const safeLeft = Math.max(0, left - paddingX);
  const safeTop = Math.max(0, top - paddingY);
  const safeRight = Math.min(width, right + paddingX);
  const safeBottom = Math.min(height, bottom + paddingY);

  return {
    left: safeLeft,
    top: safeTop,
    width: safeRight - safeLeft,
    height: safeBottom - safeTop,
    cropped: true,
  };
}

export async function prepareMapImage(file) {
  if (!isSupportedMapImage(file)) throw new Error("Formato de imagen no compatible");

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  if (!image.naturalWidth || !image.naturalHeight) throw new Error("La imagen está vacía o dañada");

  const scale = Math.min(1, MAX_MAP_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const sourceCanvas = window.document.createElement("canvas");
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) throw new Error("El navegador no pudo procesar la imagen");

  sourceCanvas.width = width;
  sourceCanvas.height = height;
  sourceContext.fillStyle = "#ffffff";
  sourceContext.fillRect(0, 0, width, height);
  sourceContext.drawImage(image, 0, 0, width, height);

  const bounds = findCropBounds(sourceContext, width, height);
  const outputCanvas = window.document.createElement("canvas");
  const outputContext = outputCanvas.getContext("2d");
  if (!outputContext) throw new Error("El navegador no pudo preparar la imagen");

  outputCanvas.width = bounds.width;
  outputCanvas.height = bounds.height;
  outputContext.fillStyle = "#ffffff";
  outputContext.fillRect(0, 0, bounds.width, bounds.height);
  outputContext.drawImage(
    sourceCanvas,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height,
  );

  return {
    dataUrl: outputCanvas.toDataURL("image/jpeg", JPEG_QUALITY),
    cropped: bounds.cropped,
    resized: scale < 1,
    converted: ["heic", "heif"].includes(fileExtension(file.name))
      || ["image/heic", "image/heif"].includes(String(file.type || "").toLowerCase()),
  };
}

export async function mapFileFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok && typeof response.ok === "boolean") {
    throw new Error("No se pudo recuperar la imagen del plano");
  }
  const sourceBlob = await response.blob();
  const supportedType = ["image/jpeg", "image/png", "image/webp"].includes(sourceBlob.type)
    ? sourceBlob.type
    : "image/jpeg";
  const extension = supportedType === "image/png" ? "png" : supportedType === "image/webp" ? "webp" : "jpg";
  const blob = sourceBlob.type === supportedType
    ? sourceBlob
    : new Blob([sourceBlob], { type: supportedType });
  return new File([blob], `map.${extension}`, { type: supportedType });
}
