import { getImage, setImage } from './db'; // We need our database helpers

// Helper to convert a Base64 string back into a File object for IndexedDB
const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type });
};

// Helper to read a local file as text
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

/**
 * EXPORT: Creates a self-contained .mbd file with all data and images.
 */
export const exportProject = async (project: any) => {
  if (!project) {
    console.error("Export failed: project data is missing.");
    return;
  }
  
  // Create a deep copy to avoid changing the app's state
  const projectToExport = JSON.parse(JSON.stringify(project));

  // --- BUNDLE SHOT LIST IMAGES (from IndexedDB) ---
  if (projectToExport.data?.shotListData?.shotListItems) {
    const shotListItems = projectToExport.data.shotListData.shotListItems;
    const imageDataMap: { [key: string]: string } = {};
    
    for (const item of shotListItems) {
      if (item.imageUrl) { // Check if the item is supposed to have an image
        const imageFile = await getImage(item.id);
        if (imageFile) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
          });
          imageDataMap[item.id] = dataUrl;
        }
      }
    }
    
    // Attach the bundled Base64 images to the export data
    if (Object.keys(imageDataMap).length > 0) {
      // Use 'imagePreviews' as it's the key the Shot List PDF exporter expects
      projectToExport.data.shotListData.imagePreviews = imageDataMap;
    }
  }

  // Note: Shooting Schedule images are already in Base64 format in `project.data.imagePreviews`
  // so they are automatically included in the export.

  const projectJson = JSON.stringify(projectToExport, null, 2);
  const blob = new Blob([projectJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name || 'project'}.mbd`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * IMPORT: Reads a .mbd file, extracts data and images, and prepares it for the app.
 */
export const importProject = async (file: File): Promise<any> => {
  if (!file.name.endsWith('.mbd') && !file.name.endsWith('.json')) {
    throw new Error('Invalid file type. Please select a .mbd file.');
  }

  const projectJson = await readFileAsText(file);
  const importedProject = JSON.parse(projectJson);

  // Validation Check
  if (!importedProject.id || typeof importedProject.id !== 'string') {
    throw new Error('Import failed: The file is missing a valid project ID.');
  }

  // --- EXTRACT AND SAVE SHOT LIST IMAGES (to IndexedDB) ---
  const bundledShotListImages = importedProject.data?.shotListData?.imagePreviews;

  if (bundledShotListImages && typeof bundledShotListImages === 'object') {
    for (const shotId in bundledShotListImages) {
      const dataUrl = bundledShotListImages[shotId];
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image')) {
        try {
          const imageFile = await dataUrlToFile(dataUrl, `${shotId}.png`);
          await setImage(shotId, imageFile);
        } catch (error) {
          console.error(`Failed to process image for shot ${shotId}:`, error);
        }
      }
    }
    // Clean the temporary image data from the object before it's saved to localStorage
    delete importedProject.data.shotListData.imagePreviews;
  }
  
  // Note: The Shooting Schedule's Base64 images in `importedProject.data.imagePreviews`
  // are kept as-is, because that's where the Schedule Editor expects to find them.
  
  return importedProject;
};