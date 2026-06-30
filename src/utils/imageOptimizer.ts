const DEFAULT_MAX_LONG_EDGE = 1600;
const DEFAULT_TARGET_BYTES = 450 * 1024;
const DEFAULT_HARD_MAX_BYTES = 1800 * 1024;
const DEFAULT_START_QUALITY = 0.82;
const DEFAULT_MIN_QUALITY = 0.68;
const OUTPUT_TYPE = 'image/jpeg';

type OptimizeImageOptions = {
  maxLongEdge?: number;
  targetBytes?: number;
  hardMaxBytes?: number;
  startQuality?: number;
  minQuality?: number;
};

type ImageDimensions = {
  width: number;
  height: number;
};

const getOutputName = (name: string) => {
  const baseName = name.replace(/\.[^.]+$/, '') || 'image';
  return `${baseName}.jpg`;
};

const getScaledDimensions = (width: number, height: number, maxLongEdge: number): ImageDimensions => {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) return { width, height };

  const scale = maxLongEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const blobToFile = (blob: Blob, sourceFile: File) => (
  new File([blob], getOutputName(sourceFile.name), {
    type: OUTPUT_TYPE,
    lastModified: Date.now(),
  })
);

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> => (
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode optimized image.'));
    }, OUTPUT_TYPE, quality);
  })
);

const drawImageToCanvas = (
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  dimensions: ImageDimensions
) => {
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context is not available.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, dimensions.width, dimensions.height);
  ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight, 0, 0, dimensions.width, dimensions.height);

  return canvas;
};

const loadImageElement = (file: File): Promise<HTMLImageElement> => (
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image.'));
    };
    img.src = url;
  })
);

const encodeWithinBudget = async (
  sourceCanvas: HTMLCanvasElement,
  sourceFile: File,
  dimensions: ImageDimensions,
  options: Required<OptimizeImageOptions>
) => {
  let currentCanvas = sourceCanvas;
  let currentDimensions = dimensions;
  let bestBlob: Blob | null = null;

  while (true) {
    for (let quality = options.startQuality; quality >= options.minQuality; quality -= 0.04) {
      const blob = await canvasToBlob(currentCanvas, Math.max(options.minQuality, Number(quality.toFixed(2))));
      bestBlob = blob;
      if (blob.size <= options.targetBytes) return blobToFile(blob, sourceFile);
    }

    if (!bestBlob) return sourceFile;
    if (bestBlob.size <= options.hardMaxBytes || Math.max(currentDimensions.width, currentDimensions.height) <= 900) {
      return blobToFile(bestBlob, sourceFile);
    }

    currentDimensions = {
      width: Math.max(1, Math.round(currentDimensions.width * 0.85)),
      height: Math.max(1, Math.round(currentDimensions.height * 0.85)),
    };

    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = currentDimensions.width;
    resizedCanvas.height = currentDimensions.height;
    const ctx = resizedCanvas.getContext('2d', { alpha: false });
    if (!ctx) return blobToFile(bestBlob, sourceFile);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, currentDimensions.width, currentDimensions.height);
    ctx.drawImage(currentCanvas, 0, 0, currentDimensions.width, currentDimensions.height);
    currentCanvas = resizedCanvas;
  }
};

export async function optimizeImageFile(file: File, options: OptimizeImageOptions = {}): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (typeof document === 'undefined') return file;

  const resolvedOptions: Required<OptimizeImageOptions> = {
    maxLongEdge: options.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE,
    targetBytes: options.targetBytes ?? DEFAULT_TARGET_BYTES,
    hardMaxBytes: options.hardMaxBytes ?? DEFAULT_HARD_MAX_BYTES,
    startQuality: options.startQuality ?? DEFAULT_START_QUALITY,
    minQuality: options.minQuality ?? DEFAULT_MIN_QUALITY,
  };

  try {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      const dimensions = getScaledDimensions(bitmap.width, bitmap.height, resolvedOptions.maxLongEdge);
      const canvas = drawImageToCanvas(bitmap, bitmap.width, bitmap.height, dimensions);
      bitmap.close();
      return encodeWithinBudget(canvas, file, dimensions, resolvedOptions);
    }

    const image = await loadImageElement(file);
    const dimensions = getScaledDimensions(image.naturalWidth, image.naturalHeight, resolvedOptions.maxLongEdge);
    const canvas = drawImageToCanvas(image, image.naturalWidth, image.naturalHeight, dimensions);
    return encodeWithinBudget(canvas, file, dimensions, resolvedOptions);
  } catch (err) {
    console.error('Image optimization failed; falling back to original file:', err);
    return file;
  }
}

export const fileToDataUrl = (file: File): Promise<string> => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })
);

export function fetchImageUrlAsDataUrl(url: string): Promise<string | null> {
  if (!url || !url.startsWith('http')) return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      } catch (err) {
        console.warn('Canvas conversion failed (likely CORS tainted canvas):', err);
        resolve(null);
      }
    };

    img.onerror = (err) => {
      console.warn('Image element failed to load for export (likely CORS or network block):', err);
      resolve(null);
    };

    const separator = url.includes('?') ? '&' : '?';
    img.src = `${url}${separator}cors_bust=${Date.now()}`;
  });
}
