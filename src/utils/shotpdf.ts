import jsPDF from 'jspdf';
import { IBMPlexSansThaiRegular } from './ibmPlexSansThai-Regular-normal';

// Type definitions to match your application
type ShotItem = {
  id: string;
  sceneNumber: string;
  shotNumber: string;
  shotSize: string;
  angle: string;
  movement: string;
  lens: string;
  description: string;
  notes: string;
  imageUrl: string;
};

type ImagePreviews = {
  [key: string]: string;
};

/**
 * Softer color palette for the PDF
 */
const COLORS = {
  primary: '#4F46E5',      // Softer Indigo
  secondary: '#7C3AED',    // Softer Purple
  accent: '#DB2777',       // Softer Pink
  dark: '#374151',         // Gray 700
  medium: '#9CA3AF',       // Gray 400
  light: '#F9FAFB',        // Gray 50
  white: '#FFFFFF',
  success: '#059669',      // Softer Green
  warning: '#D97706',      // Softer Amber
  surface: '#FEFEFE',
  border: '#E5E7EB'
};

/**
 * Converts a base64 image data URL to a format compatible with jsPDF
 */
const processImageData = (dataUrl: string): { format: string; data: string; width?: number; height?: number } | null => {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return null;
    }
    
    const [header, data] = dataUrl.split(',');
    if (!data) return null;
    
    const formatMatch = header.match(/data:image\/([^;]+)/);
    const format = formatMatch ? formatMatch[1].toLowerCase() : 'jpeg';
    
    const supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];
    const finalFormat = supportedFormats.includes(format) ? format : 'jpeg';
    
    return { format: finalFormat, data };
  } catch (error) {
    console.warn('Error processing image data:', error);
    return null;
  }
};

/**
 * CHANGED: Creates a clean and subtle dot grid background suitable for printing.
 */
const createBackgroundPattern = (doc: jsPDF): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Set a clean, light background color
  doc.setFillColor(COLORS.light); // Uses a very light gray (#F9FAFB)
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // --- Dot Grid Pattern ---
  const spacing = 5;      // The distance between dots in mm
  const dotRadius = 0.2;  // The size of each dot in mm

  // Set the color and opacity for the dots
  doc.setFillColor(COLORS.border); // A light, non-intrusive gray (#E5E7EB)
  doc.setGState(new doc.GState({ opacity: 0.5 })); // Make dots semi-transparent

  // Create the grid of dots across the page
  for (let x = spacing; x < pageWidth - spacing; x += spacing) {
    for (let y = spacing; y < pageHeight - spacing; y += spacing) {
      doc.circle(x, y, dotRadius, 'F');
    }
  }

  // Reset the graphics state to full opacity for all subsequent content
  doc.setGState(new doc.GState({ opacity: 1 }));
};


/**
 * Creates a clean card background
 */
const createCardBackground = (doc: jsPDF, x: number, y: number, width: number, height: number, isHeader = false): void => {
  if (isHeader) {
    // Clean header background
    doc.setFillColor(COLORS.primary);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');
  } else {
    // Card shadow
    doc.setFillColor('#000000');
    doc.setGState(new doc.GState({ opacity: 0.03 }));
    doc.roundedRect(x + 0.3, y + 0.3, width, height, 2, 2, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
    
    // Card background
    doc.setFillColor(COLORS.white);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');
    
    // Card border
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, width, height, 2, 2, 'S');
  }
};

/**
 * Wraps text to fit within specified width
 */
const wrapText = (doc: jsPDF, text: string, maxWidth: number, fontSize: number): string[] => {
  doc.setFontSize(fontSize);
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const textWidth = doc.getTextWidth(testLine);
    
    if (textWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [''];
};

/**
 * Adds an image to the PDF with proper scaling and error handling
 */
const addImageToPDF = async (doc: jsPDF, imageData: string, x: number, y: number, maxWidth: number, maxHeight: number): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const processedImage = processImageData(imageData);
      if (!processedImage) {
        resolve(false);
        return;
      }

      const img = new Image();
      img.onload = function() {
        try {
          // Calculate scaled dimensions
          const aspectRatio = this.naturalWidth / this.naturalHeight;
          let width = maxWidth;
          let height = width / aspectRatio;
          
          if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
          }
          
          // Center the image
          const centeredX = x + (maxWidth - width) / 2;
          const centeredY = y + (maxHeight - height) / 2;
          
          // Add the image
          doc.addImage(
            `data:image/${processedImage.format};base64,${processedImage.data}`,
            processedImage.format.toUpperCase(),
            centeredX,
            centeredY,
            width,
            height
          );
          
          // Add subtle border around image
          doc.setDrawColor(COLORS.border);
          doc.setLineWidth(0.2);
          doc.roundedRect(centeredX, centeredY, width, height, 1, 1, 'S');
          
          resolve(true);
        } catch (error) {
          console.warn('Error adding image to PDF:', error);
          resolve(false);
        }
      };
      
      img.onerror = () => {
        console.warn('Failed to load image');
        resolve(false);
      };
      
      img.src = imageData;
    } catch (error) {
      console.warn('Error processing image:', error);
      resolve(false);
    }
  });
};

/**
 * Sanitizes filename by removing invalid characters
 */
const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100);
};

/**
 * Creates a clean header without problematic unicode characters but with Thai font support
 */
const createCleanHeader = (doc: jsPDF, projectTitle: string): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background
  createCardBackground(doc, 15, 15, pageWidth - 30, 30, true);
  
  // Project title with Thai font support
  doc.setFont('IBMPlexSansThai', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(COLORS.white);
  doc.text(projectTitle || 'Untitled Project', 25, 32);
  
  // Subtitle without emojis but with Thai font
  doc.setFont('IBMPlexSansThai', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.white);
  doc.setGState(new doc.GState({ opacity: 0.9 }));
  doc.text('Professional Shot List', 25, 40);
  doc.setGState(new doc.GState({ opacity: 1 }));
  
  // Date with Thai font
  const dateText = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  doc.setFont('IBMPlexSansThai', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.white);
  doc.setGState(new doc.GState({ opacity: 0.8 }));
  doc.text(dateText, pageWidth - 25, 40, { align: 'right' });
  doc.setGState(new doc.GState({ opacity: 1 }));
};

/**
 * Optimized table for fitting exactly 6 shots per page
 */
class OptimizedTable {
  private doc: jsPDF;
  private currentY: number;
  private pageHeight: number;
  private pageWidth: number;
  private marginLeft: number;
  private marginRight: number;
  private baseRowHeight: number;
  private headerHeight: number;
  private cardSpacing: number;

  constructor(doc: jsPDF, startY: number) {
    this.doc = doc;
    this.currentY = startY;
    this.pageHeight = doc.internal.pageSize.getHeight();
    this.pageWidth = doc.internal.pageSize.getWidth();
    this.marginLeft = 15;
    this.marginRight = 15;
    // Adjusted height and spacing for exactly 6 shots per page
    this.baseRowHeight = 18; 
    this.headerHeight = 15;
    this.cardSpacing = 2;    
  }

  private getOptimizedColumnWidths(): number[] {
    const tableWidth = this.pageWidth - this.marginLeft - this.marginRight;
    
    const widthPercentages = [5, 5, 8, 8, 10, 6, 28, 18, 12]; // Total: 100%
    return widthPercentages.map(p => (tableWidth * p) / 100);
  }

  private getColumnPositions(): number[] {
    const widths = this.getOptimizedColumnWidths();
    const positions = [this.marginLeft];
    
    for (let i = 0; i < widths.length - 1; i++) {
      positions.push(positions[positions.length - 1] + widths[i]);
    }
    
    return positions;
  }

  private checkPageBreak(requiredHeight: number): void {
    if (this.currentY + requiredHeight > this.pageHeight - 20) { // Page bottom margin
      this.doc.addPage();
      createBackgroundPattern(this.doc);
      this.currentY = 25;
      this.drawCleanHeader();
    }
  }

  private drawCleanHeader(): void {
    const headers = [
      'SCENE',
      'SHOT', 
      'SIZE',
      'ANGLE',
      'MOVEMENT',
      'LENS',
      'DESCRIPTION',
      'REFERENCE',
      'NOTES'
    ];
    
    const positions = this.getColumnPositions();
    const widths = this.getOptimizedColumnWidths();

    createCardBackground(
      this.doc, 
      this.marginLeft, 
      this.currentY, 
      this.pageWidth - this.marginLeft - this.marginRight, 
      this.headerHeight,
      true
    );

    this.doc.setFont('IBMPlexSansThai', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.white);

    headers.forEach((header, index) => {
      const x = positions[index] + widths[index] / 2;
      const y = this.currentY + this.headerHeight / 2 + 1;
      
      this.doc.text(header, x, y, { align: 'center' });
    });

    this.currentY += this.headerHeight + this.cardSpacing;
  }

  async drawOptimizedTable(data: string[][], imagePreviews: ImagePreviews, shotItems: ShotItem[]): Promise<void> {
    this.drawCleanHeader();

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      const rowHeight = this.calculateRowHeight(row, shotItems[rowIndex], imagePreviews);
      
      this.checkPageBreak(rowHeight + this.cardSpacing);

      const positions = this.getColumnPositions();
      const widths = this.getOptimizedColumnWidths();

      createCardBackground(
        this.doc,
        this.marginLeft,
        this.currentY,
        this.pageWidth - this.marginLeft - this.marginRight,
        rowHeight
      );

      this.doc.setFont('IBMPlexSansThai', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(COLORS.dark);

      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex];
        const x = positions[colIndex];
        const y = this.currentY;
        const cellWidth = widths[colIndex];
        const cellHeight = rowHeight;

        await this.renderCell(cell, colIndex, x, y, cellWidth, cellHeight, shotItems[rowIndex], imagePreviews);
      }

      this.currentY += rowHeight + this.cardSpacing;
    }
  }

  private calculateRowHeight(row: string[], shot: ShotItem, imagePreviews: ImagePreviews): number {
    let maxHeight = this.baseRowHeight;
    
    if (imagePreviews[shot.id]) {
      maxHeight = Math.max(maxHeight, 16); 
    }
    
    const descriptionLines = Math.ceil((row[6] || '').length / 50);
    const notesLines = Math.ceil((row[8] || '').length / 35);
    const textHeight = Math.max(descriptionLines, notesLines) * 3.5 + 10;
    
    // Cap the row height to the base height to enforce 6 shots per page
    return Math.min(Math.max(maxHeight, textHeight), this.baseRowHeight);
  }

  private async renderCell(
    content: string, 
    colIndex: number, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    shot: ShotItem, 
    imagePreviews: ImagePreviews
  ): Promise<void> {
    const padding = 2;
    const textY = y + height / 2 + 1;

    if (colIndex === 7) { // Reference column
      if (imagePreviews[shot.id]) {
        const imageSuccess = await addImageToPDF(
          this.doc,
          imagePreviews[shot.id],
          x + padding,
          y + padding,
          width - padding * 2,
          height - padding * 2
        );
        
        if (!imageSuccess) {
          this.doc.setTextColor(COLORS.warning);
          this.doc.setFontSize(7);
          this.doc.text('Image Error', x + width / 2, textY, { align: 'center' });
        }
      } else {
        // No image placeholder
        this.doc.setFillColor(COLORS.light);
        this.doc.roundedRect(x + padding, y + padding, width - padding * 2, height - padding * 2, 1, 1, 'F');
        this.doc.setTextColor(COLORS.medium);
        this.doc.setFontSize(7);
        this.doc.text('No Image', x + width / 2, textY, { align: 'center' });
      }
    } else if (colIndex === 6 || colIndex === 8) { // Description and Notes
      const lines = wrapText(this.doc, content, width - padding * 2, 7);
      const startY = y + padding + 3;
      
      this.doc.setFont('IBMPlexSansThai', 'normal');
      this.doc.setTextColor(COLORS.dark);
      this.doc.setFontSize(7);
      lines.slice(0, 4).forEach((line, lineIndex) => {
        const lineY = startY + lineIndex * 3.5;
        if (lineY < y + height - padding) {
          this.doc.text(line, x + padding, lineY, { align: 'left' });
        }
      });
    } else {
      // Regular cells with Thai font support
      let textColor = COLORS.dark;
      let fontSize = 8;
      
      if (colIndex === 0 || colIndex === 1) { // Scene and Shot numbers
        textColor = COLORS.primary;
        this.doc.setFont('IBMPlexSansThai', 'bold');
      } else if (colIndex === 2) { // Shot size
        textColor = COLORS.secondary;
        this.doc.setFont('IBMPlexSansThai', 'bold');
      } else {
        this.doc.setFont('IBMPlexSansThai', 'normal');
      }
      
      this.doc.setTextColor(textColor);
      this.doc.setFontSize(fontSize);
      
      const align = (colIndex === 6 || colIndex === 8) ? 'left' : 'center';
      const textX = align === 'center' ? x + width / 2 : x + padding;
      this.doc.text(content, textX, textY, { align });
    }
  }
}

/**
 * Creates a clean footer with statistics
 */
const createCleanFooter = (doc: jsPDF, shotItems: ShotItem[], imagePreviews: ImagePreviews, pageNum: number, totalPages: number): void => {
  // Footer removed as requested
};

/**
 * Exports shot list data to an optimized PDF document
 */
export const exportShotListToPDF = async (
  projectTitle: string,
  shotListItems: ShotItem[],
  imagePreviews: ImagePreviews
): Promise<void> => {
  try {
    // Create new PDF document in landscape orientation
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Register and set IBM Plex Sans Thai font with proper error handling
    try {
      doc.addFileToVFS('IBMPlexSansThai-Regular.ttf', IBMPlexSansThaiRegular);
      doc.addFont('IBMPlexSansThai-Regular.ttf', 'IBMPlexSansThai', 'normal');
      doc.addFont('IBMPlexSansThai-Regular.ttf', 'IBMPlexSansThai', 'bold');
      doc.setFont('IBMPlexSansThai');
    } catch (fontError) {
      console.warn('Failed to load custom font, using helvetica:', fontError);
      doc.setFont('helvetica');
    }

    // Create subtle background pattern
    createBackgroundPattern(doc);

    // Create clean header
    createCleanHeader(doc, projectTitle);

    // Prepare table data
    const tableRows = shotListItems.map(shot => [
      shot.sceneNumber || '',
      shot.shotNumber || '',
      shot.shotSize || '',
      shot.angle || '',
      shot.movement || '',
      shot.lens || '',
      shot.description || '',
      '', // Reference column handled separately
      shot.notes || ''
    ]);

    // Create and draw the optimized table
    const table = new OptimizedTable(doc, 50);
    await table.drawOptimizedTable(tableRows, imagePreviews, shotListItems);

    // Footer removed as requested

    // Generate filename and save the PDF
    const sanitizedTitle = sanitizeFilename(projectTitle || 'Shot-List');
    const filename = `${sanitizedTitle}-Shot-List-${new Date().toISOString().split('T')[0]}.pdf`;
    
    doc.save(filename);
    
    console.log(`PDF exported successfully: ${filename}`);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};