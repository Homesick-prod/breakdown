import { pdf } from '@react-pdf/renderer';
import React from 'react';
import ScheduleDocument from '../components/pdf/ScheduleDocument';
import type { DocumentProps } from '@react-pdf/renderer';

const sanitizeFilename = (f: string) =>
  f.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '-').substring(0, 100);

/**
 * Generates and downloads a pixel-perfect Shooting Schedule PDF using @react-pdf/renderer.
 */
export const exportToPDF = async (
  headerInfo: any,
  timelineItems: any[],
  stats: any,
  imagePreviews: { [key: string]: string }
) => {
  try {
    const element = React.createElement(ScheduleDocument, {
      headerInfo,
      timelineItems,
      imagePreviews,
      stats,
    }) as React.ReactElement<DocumentProps>;

    const blob = await pdf(element).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    a.download = `${sanitizeFilename(headerInfo.projectTitle || 'Schedule')}-Schedule-${dateStr}_${timeStr}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('Schedule PDF exported successfully.');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const exportFullScheduleToPDF = async (
  days: Array<{
    headerInfo: any;
    timelineItems: any[];
    stats: any;
    imagePreviews: { [key: string]: string };
  }>,
  projectTitle?: string
) => {
  try {
    const firstHeader = days[0]?.headerInfo || {};
    const element = React.createElement(ScheduleDocument, {
      headerInfo: firstHeader,
      timelineItems: days[0]?.timelineItems || [],
      imagePreviews: days[0]?.imagePreviews || {},
      stats: days[0]?.stats || {},
      days,
    }) as React.ReactElement<DocumentProps>;

    const blob = await pdf(element).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    a.download = `${sanitizeFilename(projectTitle || firstHeader.projectTitle || 'Schedule')}-Full-Schedule-${dateStr}_${timeStr}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('Full schedule PDF exported successfully.');
  } catch (error) {
    console.error('Error generating full schedule PDF:', error);
    throw new Error(`Failed to generate full schedule PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
