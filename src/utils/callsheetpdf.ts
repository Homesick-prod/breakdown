import { pdf } from '@react-pdf/renderer';
import React from 'react';
import CallSheetDocument from '../components/pdf/CallSheetDocument';
import type { DocumentProps } from '@react-pdf/renderer';

const sanitizeFilename = (f: string) =>
  f.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '-').substring(0, 100);

/**
 * Generates and downloads a pixel-perfect Call Sheet PDF using @react-pdf/renderer.
 */
export const exportCallSheetToPDF = async (
  headerInfo: any,
  timelineItems: any[],
  callSheetData: any,
  stats: any
) => {
  try {
    const element = React.createElement(CallSheetDocument, {
      headerInfo,
      timelineItems,
      callSheetData,
      stats,
    }) as React.ReactElement<DocumentProps>;

    const blob = await pdf(element).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    a.download = `${sanitizeFilename(headerInfo.projectTitle || 'CallSheet')}-CallSheet-${dateStr}_${timeStr}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('Call Sheet PDF exported successfully.');
  } catch (error) {
    console.error('Error generating Call Sheet PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
