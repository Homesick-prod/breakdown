import CryptoJS from 'crypto-js';
import { generateId } from './id';

const SECRET_KEY = "hYp3r-S3cUr3-K3y-f0r-M3ntalBr3akd0wn-!@#$";

/**
 * Exports a project to an encrypted .mbd file and triggers a download.
 * @param {any} project - The project object to export.
 */
export const exportProject = (project: any) => {
  try {
    const jsonString = JSON.stringify(project, null, 2);
    const encryptedData = CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
    const dataBlob = new Blob([encryptedData], { type: 'text/plain;charset=utf-8' });
    const dataUri = URL.createObjectURL(dataBlob);
    const exportFileDefaultName = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.mbd`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    linkElement.remove();
    URL.revokeObjectURL(dataUri);
  } catch (error) {
    console.error("Export failed:", error);
    alert("Sorry, the project could not be exported.");
  }
};

/**
 * Imports an encrypted .mbd file, decrypts it, and returns the project object.
 * @param {File} file - The .mbd file to import.
 * @returns {Promise<any>} A promise that resolves with the imported project object.
 */
export const importProject = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const encryptedData = e.target?.result as string;
        const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
        const decryptedJson = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!decryptedJson) {
          throw new Error("Invalid file or wrong key.");
        }
        
        const project = JSON.parse(decryptedJson);
        // Assign a new ID to the imported project to avoid conflicts
        project.id = generateId();
        project.updatedAt = new Date().toISOString();
        
        resolve(project);
      } catch (error) {
        console.error("Import failed:", error);
        reject(new Error("Import failed. The file may be corrupt or not a valid project file."));
      }
    };
    reader.onerror = () => reject(new Error("Error reading file."));
    reader.readAsText(file);
  });
};
