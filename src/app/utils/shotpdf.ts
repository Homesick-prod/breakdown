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
  primary: '#4F46E5',      // Indigo
  secondary: '#7C3AED',    // Purple
  dark: '#374151',         // Gray 700
  medium: '#9CA3AF',       // Gray 400
  light: '#F9FAFB',        // Gray 50
  white: '#FFFFFF',
  border: '#E5E7EB'
};

/**
 * Creates a clean and subtle dot grid background.
 */
const createBackgroundPattern = (doc: jsPDF): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(COLORS.light);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  const spacing = 5;
  const dotRadius = 0.2;

  doc.setFillColor(COLORS.border);
  doc.setGState(new doc.GState({ opacity: 0.5 }));

  for (let x = spacing; x < pageWidth; x += spacing) {
    for (let y = spacing; y < pageHeight; y += spacing) {
      doc.circle(x, y, dotRadius, 'F');
    }
  }

  doc.setGState(new doc.GState({ opacity: 1 }));
};

/**
 * Creates a clean card background
 */
const createCardBackground = (doc: jsPDF, x: number, y: number, width: number, height: number, isHeader = false): void => {
  if (isHeader) {
    doc.setFillColor(COLORS.primary);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');
  } else {
    doc.setFillColor('#000000');
    doc.setGState(new doc.GState({ opacity: 0.03 }));
    doc.roundedRect(x + 0.3, y + 0.3, width, height, 2, 2, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
    
    doc.setFillColor(COLORS.white);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');
    
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
  if (!text) return [''];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (doc.getTextWidth(testLine) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);
  
  return lines;
};

/**
 * OPTIMIZED: Resizes image to max 1920px, compresses, and adds to the PDF.
 */
const addImageToPDF = (doc: jsPDF, imageDataUrl: string, x: number, y: number, maxWidth: number, maxHeight: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        // --- FIX 1: Downscale image to a max of 1920px on its longest side ---
        const MAX_DIMENSION = 1920;
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        
        let canvasWidth = img.naturalWidth;
        let canvasHeight = img.naturalHeight;

        if (canvasWidth > MAX_DIMENSION || canvasHeight > MAX_DIMENSION) {
          if (aspectRatio > 1) { // Landscape
            canvasWidth = MAX_DIMENSION;
            canvasHeight = MAX_DIMENSION / aspectRatio;
          } else { // Portrait or square
            canvasHeight = MAX_DIMENSION;
            canvasWidth = MAX_DIMENSION * aspectRatio;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
            resolve(false);
            return;
        }

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.8); // Adjusted quality for good balance
        
        let displayWidth = maxWidth;
        let displayHeight = displayWidth / aspectRatio;
        if (displayHeight > maxHeight) {
          displayHeight = maxHeight;
          displayWidth = displayHeight * aspectRatio;
        }
        const centeredX = x + (maxWidth - displayWidth) / 2;
        const centeredY = y + (maxHeight - displayHeight) / 2;
        
        doc.addImage(jpegDataUrl, 'JPEG', centeredX, centeredY, displayWidth, displayHeight);
        
        // --- FIX 2: Removed the unwanted border drawing ---
        // The line that drew the border has been deleted.

        resolve(true);
      } catch (e) {
        console.error('Error adding canvas image to PDF:', e);
        resolve(false);
      }
    };

    img.onerror = () => {
      console.error('Failed to load image for canvas processing.');
      resolve(false);
    };

    img.src = imageDataUrl;
  });
};


/**
 * Sanitizes filename by removing invalid characters
 */
const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '-').substring(0, 100);
};

/**
 * Creates a clean header with Thai font support
 */
const createCleanHeader = (doc: jsPDF, projectTitle: string): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  createCardBackground(doc, 15, 15, pageWidth - 30, 30, true);
  
  doc.setFont('IBMPlexSansThai', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(COLORS.white);
  doc.text(projectTitle || 'Untitled Project', 25, 32);
  
  doc.setFont('IBMPlexSansThai', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.white);
  doc.setGState(new doc.GState({ opacity: 0.9 }));
  doc.text('Shot List', 25, 40);
  doc.setGState(new doc.GState({ opacity: 1 }));
  
  const dateText = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFont('IBMPlexSansThai', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.white);
  doc.setGState(new doc.GState({ opacity: 0.8 }));
  doc.text(dateText, pageWidth - 25, 40, { align: 'right' });
  doc.setGState(new doc.GState({ opacity: 1 }));
};

/**
 * Optimized table for rendering the shot list
 */
class OptimizedTable {
  private doc: jsPDF;
  private currentY: number;
  private pageHeight: number;
  private pageWidth: number;
  private marginLeft: number;
  private baseRowHeight: number;
  private headerHeight: number;
  private cardSpacing: number;

  constructor(doc: jsPDF, startY: number) {
    this.doc = doc;
    this.currentY = startY;
    this.pageHeight = doc.internal.pageSize.getHeight();
    this.pageWidth = doc.internal.pageSize.getWidth();
    this.marginLeft = 15;
    this.baseRowHeight = 18;
    this.headerHeight = 15;
    this.cardSpacing = 2;
  }

  private getColumnWidths(): number[] {
    const tableWidth = this.pageWidth - (this.marginLeft * 2);
    const widthPercentages = [5, 5, 8, 8, 10, 6, 28, 18, 12];
    return widthPercentages.map(p => (tableWidth * p) / 100);
  }

  private getColumnPositions(): number[] {
    const widths = this.getColumnWidths();
    const positions = [this.marginLeft];
    for (let i = 0; i < widths.length - 1; i++) {
      positions.push(positions[i] + widths[i]);
    }
    return positions;
  }

  private checkPageBreak(requiredHeight: number): void {
    if (this.currentY + requiredHeight > this.pageHeight - 20) {
      this.doc.addPage();
      createBackgroundPattern(this.doc);
      this.currentY = 20;
      this.drawTableHeader();
    }
  }

  private drawTableHeader(): void {
    const headers = ['SCENE', 'SHOT', 'SIZE', 'ANGLE', 'MOVEMENT', 'LENS', 'DESCRIPTION', 'REFERENCE', 'NOTES'];
    const positions = this.getColumnPositions();
    const widths = this.getColumnWidths();

    createCardBackground(
      this.doc,
      this.marginLeft,
      this.currentY,
      this.pageWidth - (this.marginLeft * 2),
      this.headerHeight,
      true
    );

    this.doc.setFont('IBMPlexSansThai', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.white);

    headers.forEach((header, index) => {
      this.doc.text(header, positions[index] + widths[index] / 2, this.currentY + this.headerHeight / 2 + 1, { align: 'center' });
    });

    this.currentY += this.headerHeight + this.cardSpacing;
  }

  async drawTable(data: string[][], imagePreviews: ImagePreviews, shotItems: ShotItem[]): Promise<void> {
    this.drawTableHeader();

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const rowData = data[rowIndex];
      const shot = shotItems[rowIndex];
      
      this.checkPageBreak(this.baseRowHeight + this.cardSpacing);

      const positions = this.getColumnPositions();
      const widths = this.getColumnWidths();

      createCardBackground(this.doc, this.marginLeft, this.currentY, this.pageWidth - (this.marginLeft * 2), this.baseRowHeight);

      for (let colIndex = 0; colIndex < rowData.length; colIndex++) {
        await this.renderCellContent(rowData[colIndex], colIndex, positions[colIndex], this.currentY, widths[colIndex], this.baseRowHeight, shot, imagePreviews);
      }

      this.currentY += this.baseRowHeight + this.cardSpacing;
    }
  }
  
  private async renderCellContent(
    content: string, colIndex: number, x: number, y: number,
    width: number, height: number, shot: ShotItem, imagePreviews: ImagePreviews
  ): Promise<void> {
    const padding = 2;
    const textY = y + height / 2 + 1;

    if (colIndex === 7) { // REFERENCE column
      const imageUrl = imagePreviews[shot.id];
      if (imageUrl) {
        const success = await addImageToPDF(this.doc, imageUrl, x + padding, y + padding, width - (padding * 2), height - (padding * 2));
        if (!success) {
          this.doc.setTextColor('#E74C3C');
          this.doc.text('Error', x + width / 2, textY, { align: 'center' });
        }
      } else {
        this.doc.setFillColor(COLORS.light);
        this.doc.roundedRect(x + padding, y + padding, width - (padding * 2), height - (padding * 2), 1, 1, 'F');
        this.doc.setTextColor(COLORS.medium);
        this.doc.text('No Image', x + width / 2, textY, { align: 'center' });
      }
      return;
    }

    this.doc.setFont('IBMPlexSansThai', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.dark);
    
    if(colIndex === 0 || colIndex === 1 || colIndex === 2) { // Scene, Shot, Size
      this.doc.setFont('IBMPlexSansThai', 'bold');
      if (colIndex === 0 || colIndex === 1) this.doc.setTextColor(COLORS.primary);
      if (colIndex === 2) this.doc.setTextColor(COLORS.secondary);
    }
    
    const textX = (colIndex < 6 || colIndex === 7) ? x + width / 2 : x + padding;
    const align = (colIndex < 6 || colIndex === 7) ? 'center' : 'left';

    const lines = wrapText(this.doc, content, width - (padding * 2), (colIndex === 6 || colIndex === 8) ? 7 : 8);
    const lineHeight = 4.2;
    const startY = y + padding + 3;

    lines.slice(0, 3).forEach((line, index) => {
        let lineY = textY;
        if(colIndex === 6 || colIndex === 8) { // Align multi-line text to top
            lineY = startY + (index * lineHeight);
        }
        if(lineY < y + height - padding) {
            this.doc.text(line, textX, lineY, { align });
        }
    });
  }
}

/**
 * Main export function
 */
export const exportShotListToPDF = async (
  projectTitle: string,
  shotListItems: ShotItem[],
  imagePreviews: ImagePreviews
): Promise<void> => {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    try {
      doc.addFileToVFS('IBMPlexSansThai-Regular.ttf', IBMPlexSansThaiRegular);
      doc.addFont('IBMPlexSansThai-Regular.ttf', 'IBMPlexSansThai', 'normal');
      doc.addFont('IBMPlexSansThai-Regular.ttf', 'IBMPlexSansThai', 'bold');
    } catch (fontError) {
      console.warn('Failed to load custom font, using helvetica:', fontError);
    }
    doc.setFont('IBMPlexSansThai');

    createBackgroundPattern(doc);
    createCleanHeader(doc, projectTitle);

    const tableRows = shotListItems.map(shot => [
      shot.sceneNumber, shot.shotNumber, shot.shotSize, shot.angle,
      shot.movement, shot.lens, shot.description, '', shot.notes
    ]);

    const table = new OptimizedTable(doc, 50);
    await table.drawTable(tableRows, imagePreviews, shotListItems);

    const sanitizedTitle = sanitizeFilename(projectTitle || 'Shot-List');
    doc.save(`${sanitizedTitle}-Shot-List-${new Date().toISOString().split('T')[0]}.pdf`);
    
    console.log(`PDF exported successfully.`);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};