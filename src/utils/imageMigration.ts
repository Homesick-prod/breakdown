import { isFirebaseEnabled, uploadImageToStorage } from '../lib/firebase';
import { getImage, setImage } from './db';
import { optimizeImageFile } from './imageOptimizer';

const OPTIMIZED_SKIP_BYTES = 520 * 1024;

type LegacyImageMigrationInput = {
  projectId?: string;
  itemId: string;
  imageUrl?: string | null;
  previewUrl?: string | null;
};

export type LegacyImageMigrationResult = {
  imageUrl: string;
  file: File;
  changed: boolean;
};

const isHttpUrl = (value?: string | null) => !!value && /^https?:\/\//i.test(value);
const isDataImageUrl = (value?: string | null) => !!value && value.startsWith('data:image');

const isCurrentManagedStorageUrl = (value?: string | null) => {
  if (!isHttpUrl(value)) return false;

  try {
    const decoded = decodeURIComponent(value || '');
    return decoded.includes('/o/projects/') && decoded.includes('/images/');
  } catch {
    return (value || '').includes('%2Fimages%2F');
  }
};

const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || 'image/png' });
};

const shouldReencode = (file: File) => {
  const isJpeg = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name);
  return !isJpeg || file.size > OPTIMIZED_SKIP_BYTES;
};

export async function migrateLegacyStoredImage({
  projectId,
  itemId,
  imageUrl,
  previewUrl,
}: LegacyImageMigrationInput): Promise<LegacyImageMigrationResult | null> {
  let sourceFile = await getImage(itemId);
  let createdFromInlineData = false;

  if (!sourceFile && isDataImageUrl(previewUrl)) {
    sourceFile = await dataUrlToFile(previewUrl as string, `${itemId}.png`);
    createdFromInlineData = true;
  } else if (!sourceFile && isDataImageUrl(imageUrl)) {
    sourceFile = await dataUrlToFile(imageUrl as string, `${itemId}.png`);
    createdFromInlineData = true;
  }

  if (!sourceFile) return null;

  const optimizedFile = shouldReencode(sourceFile)
    ? await optimizeImageFile(sourceFile)
    : sourceFile;

  const replacedLocalFile = createdFromInlineData || optimizedFile !== sourceFile || optimizedFile.name !== sourceFile.name;
  if (replacedLocalFile) {
    await setImage(itemId, optimizedFile);
  }

  let nextImageUrl = isHttpUrl(imageUrl) ? (imageUrl as string) : 'true';
  let uploaded = false;

  const shouldUpload = isFirebaseEnabled
    && !!projectId
    && (!isHttpUrl(imageUrl) || !isCurrentManagedStorageUrl(imageUrl));

  if (shouldUpload) {
    try {
      nextImageUrl = await uploadImageToStorage(`projects/${projectId}/images/${itemId}.jpg`, optimizedFile);
      uploaded = true;
    } catch (err) {
      console.error(`Failed to migrate legacy image ${itemId} to Firebase Storage:`, err);
    }
  }

  return {
    imageUrl: nextImageUrl,
    file: optimizedFile,
    changed: replacedLocalFile || uploaded || nextImageUrl !== imageUrl,
  };
}
