// utils/storage.js
export class StorageManager {
  static getStorageUsage() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }
  
  static getStorageUsageMB() {
    return (this.getStorageUsage() / (1024 * 1024)).toFixed(2);
  }
  
  static isStorageAvailable(dataSize) {
    const current = this.getStorageUsage();
    const estimated = current + dataSize;
    // Conservative limit of 4MB (browsers typically allow 5-10MB)
    return estimated < 4 * 1024 * 1024;
  }
  
  static cleanupOldProjects(maxProjects = 3) {
    try {
      const projects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
      if (projects.length > maxProjects) {
        // Sort by last modified and keep only the most recent
        projects.sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));
        const projectsToKeep = projects.slice(0, maxProjects);
        
        localStorage.setItem('shootingScheduleProjects', JSON.stringify(projectsToKeep));
        return projects.length - projectsToKeep.length; // Return number of projects removed
      }
      return 0;
    } catch (error) {
      console.error('Cleanup failed:', error);
      return 0;
    }
  }
  
  static compressImage(file, maxWidth = 600, quality = 0.7) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => {
        console.error('Failed to load image for compression');
        resolve(null);
      };
      
      if (file instanceof File) {
        img.src = URL.createObjectURL(file);
      } else if (typeof file === 'string') {
        img.src = file;
      } else {
        resolve(null);
      }
    });
  }
  
  static async compressImagePreviews(imagePreviews) {
    const compressed = {};
    
    for (const [key, value] of Object.entries(imagePreviews)) {
      if (typeof value === 'string' && value.startsWith('data:image/')) {
        try {
          const compressedImage = await this.compressImage(value, 400, 0.6);
          compressed[key] = compressedImage || value; // Fallback to original if compression fails
        } catch (error) {
          console.warn('Failed to compress image:', error);
          compressed[key] = value;
        }
      } else {
        compressed[key] = value;
      }
    }
    
    return compressed;
  }
  
  // Emergency storage cleanup when quota is exceeded
  static emergencyCleanup() {
    try {
      // Remove all non-essential items first
      const keysToRemove = [];
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          // Remove temporary or cache items
          if (key.startsWith('temp_') || key.startsWith('cache_')) {
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // If still not enough space, compress existing project images
      const projects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
      const compressedProjects = projects.map(project => ({
        ...project,
        data: {
          ...project.data,
          imagePreviews: {} // Remove all images as last resort
        }
      }));
      
      localStorage.setItem('shootingScheduleProjects', JSON.stringify(compressedProjects));
      
      return true;
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      return false;
    }
  }
  
  // Check if we're close to quota limit
  static isNearQuotaLimit() {
    const usageMB = parseFloat(this.getStorageUsageMB());
    return usageMB > 3.5; // Warning when over 3.5MB
  }
  
  // Get a user-friendly storage report
  static getStorageReport() {
    const usageMB = parseFloat(this.getStorageUsageMB());
    const projects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
    
    return {
      totalUsageMB: usageMB,
      projectCount: projects.length,
      isNearLimit: this.isNearQuotaLimit(),
      recommendCleanup: usageMB > 3 || projects.length > 5
    };
  }
}