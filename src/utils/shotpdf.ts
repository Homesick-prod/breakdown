import { pdf } from '@react-pdf/renderer';
import React from 'react';
import ShotlistDocument from '../components/pdf/ShotlistDocument';
import type { DocumentProps } from '@react-pdf/renderer';

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

const sanitizeFilename = (filename: string): string =>
  filename.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '-').substring(0, 100);

export const exportShotListToPDF = async (
  projectTitle: string,
  shotListItems: ShotItem[],
  imagePreviews: ImagePreviews
): Promise<void> => {
  try {
    const element = React.createElement(ShotlistDocument, {
      projectTitle,
      shotListItems,
      imagePreviews,
    }) as React.ReactElement<DocumentProps>;

    const blob = await pdf(element).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    a.download = `${sanitizeFilename(projectTitle || 'Shot-List')}-Shot-List-${dateStr}_${timeStr}.pdf`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('Shot list PDF exported successfully.');
  } catch (error) {
    console.error('Error generating shot list PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
