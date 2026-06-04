import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IBMPlexSansThaiRegular } from './ibmPlexSansThai-Regular-normal';

type CastCall = {
  id?: string;
  role?: string;
  name?: string;
  callTime?: string;
  notes?: string;
};

type CallSheetData = {
  generalCall?: string;
  castCalls?: CastCall[];
  departmentNotes?: string;
  transportNotes?: string;
  safetyNotes?: string;
  lineRemarks?: string;
  lastGeneratedAt?: string;
};

/**
 * Sanitizes filename by removing invalid characters
 */
const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '-').substring(0, 100);
};

/**
 * Formats date into English format: Day, DD MMM YYYY
 */
const formatEnglishDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Summarizes scene numbers from timeline items
 */
const summarizeScenes = (timelineItems: any[]) => {
  const sceneSet = new Set<string>();
  timelineItems.forEach(item => {
    if (item?.type === 'shot' && item.sceneNumber) sceneSet.add(String(item.sceneNumber));
  });
  return Array.from(sceneSet)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .join(', ');
};

/**
 * Main export function for native PDF call sheet
 */
export const exportCallSheetToPDF = (
  headerInfo: any,
  timelineItems: any[],
  callSheetData: CallSheetData,
  stats: any
) => {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Load custom Thai font
    try {
      doc.addFileToVFS('IBMPlexSansThai-Regular.ttf', IBMPlexSansThaiRegular);
      doc.addFont('IBMPlexSansThai-Regular.ttf', 'IBMPlexSansThai', 'normal');
      doc.addFont('IBMPlexSansThai-Regular.ttf', 'IBMPlexSansThai', 'bold');
    } catch (fontError) {
      console.warn('Failed to load custom font, using helvetica:', fontError);
    }
    doc.setFont('IBMPlexSansThai');

    const pageWidth = doc.internal.pageSize.getWidth(); // A4 Portrait: 210mm
    const margin = 10;
    const printWidth = pageWidth - margin * 2; // 190mm

    // 1. HEADER HERO BANNER (Slate 800)
    doc.setFillColor('#1F2937');
    doc.roundedRect(margin, 10, printWidth, 24, 2, 2, 'F');

    // Title / Label
    doc.setFont('IBMPlexSansThai', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor('#F59E0B'); // Gold/Amber
    doc.text('PRODUCTION CALL SHEET', margin + 5, 16);

    doc.setFontSize(14);
    doc.setTextColor('#FFFFFF');
    const projectTitle = headerInfo.projectTitle || 'Untitled Project';
    doc.text(projectTitle, margin + 5, 24);

    // Metadata Right Column (Day & Date)
    doc.setFont('IBMPlexSansThai', 'bold');
    doc.setFontSize(12);
    doc.setTextColor('#FFFFFF');
    doc.text(`DAY ${headerInfo.shootingDay || '1'} OF ${headerInfo.totalDays || '1'}`, margin + printWidth - 5, 16, { align: 'right' });

    doc.setFont('IBMPlexSansThai', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#E5E7EB');
    doc.text(formatEnglishDate(headerInfo.date), margin + printWidth - 5, 21, { align: 'right' });
    
    const scenesText = summarizeScenes(timelineItems);
    doc.text(`Scenes: ${scenesText || 'None'} | Shots: ${stats?.shotCount || 0}`, margin + printWidth - 5, 25.5, { align: 'right' });

    // 2. TIMES & WEATHER BOX (Left Column)
    const boxY = 37;
    const boxH = 34;
    const colW = 92;

    doc.setFillColor('#FFFFFF');
    doc.setDrawColor('#E5E7EB');
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, boxY, colW, boxH, 1.5, 1.5, 'FD');

    doc.setFont('IBMPlexSansThai', 'bold');
    doc.setFontSize(7);
    doc.setTextColor('#4B5563');
    doc.text('GENERAL CREW CALL', margin + 4, boxY + 5);

    const crewCall = callSheetData.generalCall || headerInfo.callTime || '--:--';
    doc.setFontSize(22);
    doc.setTextColor('#111827');
    doc.text(crewCall, margin + 4, boxY + 14);

    // Subtimes grid
    doc.setFont('IBMPlexSansThai', 'normal');
    doc.setFontSize(7);
    doc.setTextColor('#6B7280');
    
    doc.text('SHOOTING CALL', margin + 4, boxY + 20);
    doc.text('MEAL 1 (LUNCH)', margin + 4, boxY + 25);
    doc.text('MEAL 2 (DINNER)', margin + 4, boxY + 30);

    const firstScene = timelineItems.find(item => item?.type === 'shot');
    const shootCall = firstScene ? (firstScene.start || '--:--') : crewCall;

    doc.setFont('IBMPlexSansThai', 'bold');
    doc.setTextColor('#111827');
    doc.text(shootCall, margin + 28, boxY + 20);
    doc.text(headerInfo.firstmealTime || '--:--', margin + 28, boxY + 25);
    doc.text(headerInfo.secondmealTime || '--:--', margin + 28, boxY + 30);

    // Right side of crew call times: Wrap Time & Total Dur
    doc.setFont('IBMPlexSansThai', 'normal');
    doc.setFontSize(7);
    doc.setTextColor('#6B7280');
    doc.text('ESTIMATED WRAP', margin + 50, boxY + 20);
    doc.text('TOTAL DURATION', margin + 50, boxY + 25);

    const wrapTime = headerInfo.wrapTime || '--:--';
    const totalDuration = `${stats?.totalHours ?? 0}h ${stats?.totalMinutes ?? 0}m`;
    doc.setFont('IBMPlexSansThai', 'bold');
    doc.setTextColor('#111827');
    doc.text(wrapTime, margin + 74, boxY + 20);
    doc.text(totalDuration, margin + 74, boxY + 25);

    // 3. LOCATIONS & KEY CREW BOX (Right Column)
    const rightColX = margin + colW + 6; // 10 + 92 + 6 = 108
    doc.setFillColor('#FFFFFF');
    doc.roundedRect(rightColX, boxY, colW, boxH, 1.5, 1.5, 'FD');

    doc.setFont('IBMPlexSansThai', 'bold');
    doc.setFontSize(7);
    doc.setTextColor('#4B5563');
    doc.text('SHOOTING LOCATION', rightColX + 4, boxY + 5);

    doc.setFont('IBMPlexSansThai', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor('#111827');
    
    const loc1 = headerInfo.location1 || headerInfo.location || '-';
    const loc2 = headerInfo.location2 || '';
    const wrappedLoc1 = doc.splitTextToSize(`Loc 1: ${loc1}`, colW - 8);
    const wrappedLoc2 = loc2 ? doc.splitTextToSize(`Loc 2: ${loc2}`, colW - 8) : [];
    
    let locY = boxY + 9;
    if (wrappedLoc1[0]) {
      doc.text(wrappedLoc1[0], rightColX + 4, locY);
      locY += 4;
    }
    if (wrappedLoc2[0]) {
      doc.text(wrappedLoc2[0], rightColX + 4, locY);
      locY += 4;
    }

    // Weather & Sun
    doc.setFont('IBMPlexSansThai', 'normal');
    doc.setFontSize(7);
    doc.setTextColor('#6B7280');
    doc.text('WEATHER', rightColX + 4, boxY + 25);
    doc.text('SUN INFO', rightColX + 4, boxY + 30);

    const weatherText = `${headerInfo.weather || 'Clear'} (${headerInfo.temp || '--°'} / Feels ${headerInfo.realFeel || '--°'})`;
    const sunText = `Rise: ${headerInfo.sunrise || '--:--'} | Set: ${headerInfo.sunset || '--:--'} | Rain: ${headerInfo.precipProb || '--%'}`;
    doc.setFont('IBMPlexSansThai', 'bold');
    doc.setTextColor('#111827');
    doc.text(weatherText, rightColX + 18, boxY + 25);
    doc.text(sunText, rightColX + 18, boxY + 30);

    // 4. KEY CREW CONTACTS PANEL
    const crewY = 74;
    doc.setFillColor('#FFFFFF');
    doc.roundedRect(margin, crewY, printWidth, 14, 1.5, 1.5, 'FD');

    doc.setFont('IBMPlexSansThai', 'bold');
    doc.setFontSize(7);
    doc.setTextColor('#4B5563');
    doc.text('KEY CREW CONTACTS', margin + 4, crewY + 4);

    doc.setFont('IBMPlexSansThai', 'normal');
    doc.setFontSize(7);
    
    const crewContacts = [
      ['Producer', headerInfo.producer],
      ['Director', headerInfo.director],
      ['DOP', headerInfo.dop],
      ['1st AD', headerInfo.firstAD],
      ['2nd AD', headerInfo.secondAD]
    ].filter(c => c[1]);

    let crewX = margin + 4;
    crewContacts.forEach(([role, name]) => {
      doc.setFont('IBMPlexSansThai', 'normal');
      doc.setTextColor('#6B7280');
      doc.text(`${role.toUpperCase()}:`, crewX, crewY + 9);
      
      doc.setFont('IBMPlexSansThai', 'bold');
      doc.setTextColor('#111827');
      doc.text(name, crewX + doc.getTextWidth(`${role.toUpperCase()}: `), crewY + 9);
      crewX += 37;
    });

    // 5. CAST CALL TABLE (starts at Y=91)
    const castCalls = callSheetData.castCalls || [];
    const castTableBody = castCalls.length ? castCalls.map((c, i) => [
      String(i + 1).padStart(2, '0'),
      c.role || '-',
      c.name || '-',
      c.callTime || '-',
      c.notes || '-'
    ]) : [['-', 'No cast call entries.', '-', '-', '-']];

    doc.setFont('IBMPlexSansThai', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor('#111827');
    doc.text('CAST CALL', margin, 92);

    let nextY = 94;

    autoTable(doc, {
      startY: nextY,
      head: [['#', 'Role / Character', 'Cast Member', 'Call Time', 'Notes / Remarks']],
      body: castTableBody,
      theme: 'grid',
      styles: {
        font: 'IBMPlexSansThai',
        fontSize: 7.5,
        cellPadding: 1.5,
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: '#E5E7EB',
        textColor: '#1F2937'
      },
      headStyles: {
        fillColor: '#374151',
        textColor: '#FFFFFF',
        fontSize: 7.5,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: '#9CA3AF' },
        1: { cellWidth: 45, fontStyle: 'bold' },
        2: { cellWidth: 55 },
        3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 55 }
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        nextY = data.cursor ? data.cursor.y : nextY;
      }
    });

    // 6. SHOOTING SCHEDULE SUMMARY (render below cast call)
    nextY += 8;
    doc.setFont('IBMPlexSansThai', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor('#111827');
    doc.text('SHOOTING SCHEDULE SUMMARY', margin, nextY - 2);

    const scheduleTableBody = timelineItems.map((item) => {
      if (item.type === 'break') {
        return [
          `${item.start || '--:--'} - ${item.end || '--:--'} (${item.duration || 0}')`,
          { content: `Break: ${item.description || ''}`, colSpan: 4 }
        ];
      }

      const shotMeta = [
        item.intExt,
        item.dayNight,
        item.shotSize,
        item.angle,
        item.movement,
        item.lens ? `${item.lens}mm` : ''
      ].filter(Boolean).join(' / ');

      return [
        `${item.start || '--:--'}\n${item.end || '--:--'} (${item.duration || 0}')`,
        `Sc. ${item.sceneNumber || '-'}\nShot ${item.shotNumber || '-'}`,
        `${item.location || loc1}\n(${shotMeta})`,
        item.description || '-',
        `Cast: ${item.cast || '-'}\nNotes: ${item.notes || '-'}`
      ];
    });

    autoTable(doc, {
      startY: nextY,
      head: [['Time', 'Scene / Shot', 'Set & Camera Meta', 'Description / Action', 'Cast / Notes']],
      body: scheduleTableBody,
      theme: 'grid',
      styles: {
        font: 'IBMPlexSansThai',
        fontSize: 7,
        cellPadding: 1.5,
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: '#E5E7EB',
        textColor: '#1F2937'
      },
      headStyles: {
        fillColor: '#1F2937',
        textColor: '#FFFFFF',
        fontSize: 7,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 40 },
        3: { cellWidth: 63 },
        4: { cellWidth: 45 }
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const item = timelineItems[data.row.index];
          if (!item) return;

          if (item.type === 'break') {
            const desc = (item.description || '').toLowerCase();
            let bgColor = '#FEF3C7'; // Break (amber)
            let textColor = '#92400E';

            if (desc.includes('lunch') || desc.includes('dinner')) {
              bgColor = '#FEE2E2'; // Rose
              textColor = '#991B1B';
            } else if (desc.includes('wrap')) {
              bgColor = '#374151'; // Dark slate grey
              textColor = '#FFFFFF';
            } else if (desc.includes('set up') || desc.includes('setup')) {
              bgColor = '#F3F4F6'; // Grey
              textColor = '#1F2937';
            } else if (desc.includes('เดินทาง') || desc.includes('travel')) {
              bgColor = '#E5E7EB'; // Slate-200
              textColor = '#1F2937';
            }

            data.cell.styles.fillColor = bgColor;
            data.cell.styles.textColor = textColor;
          }
        }
      },
      didDrawPage: (data) => {
        nextY = data.cursor ? data.cursor.y : nextY;
      }
    });

    // 7. DAILY NOTES & SPECIAL REMARKS (render below schedule table)
    nextY += 8;

    // Check if we need a new page for notes to avoid cutting them off
    if (nextY > 230) {
      doc.addPage();
      nextY = 20;
    }

    doc.setFont('IBMPlexSansThai', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor('#111827');
    doc.text('DAILY NOTES & INSTRUCTIONS', margin, nextY - 2);

    const notesData = [
      [
        { content: 'DEPARTMENT NOTES', styles: { fontStyle: 'bold', fillColor: '#F3F4F6', textColor: '#374151' } },
        { content: 'PARKING / TRANSPORT', styles: { fontStyle: 'bold', fillColor: '#F3F4F6', textColor: '#374151' } }
      ],
      [
        callSheetData.departmentNotes || '-',
        callSheetData.transportNotes || '-'
      ],
      [
        { content: 'SAFETY & EMERGENCY', styles: { fontStyle: 'bold', fillColor: '#FEE2E2', textColor: '#991B1B' } },
        { content: 'LINE REMARKS', styles: { fontStyle: 'bold', fillColor: '#F3F4F6', textColor: '#374151' } }
      ],
      [
        callSheetData.safetyNotes || '-',
        callSheetData.lineRemarks || '-'
      ]
    ];

    autoTable(doc, {
      startY: nextY,
      body: notesData,
      theme: 'grid',
      styles: {
        font: 'IBMPlexSansThai',
        fontSize: 7.5,
        cellPadding: 2,
        valign: 'top',
        lineWidth: 0.1,
        lineColor: '#E5E7EB',
        textColor: '#1F2937'
      },
      columnStyles: {
        0: { cellWidth: 95 },
        1: { cellWidth: 95 }
      },
      margin: { left: margin, right: margin }
    });

    // Footer on all pages
    const pageCount = doc.internal.pages.length - 1; // jsPDF array length has one extra element
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setDrawColor('#E5E7EB');
      doc.setLineWidth(0.1);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

      doc.setFont('IBMPlexSansThai', 'normal');
      doc.setFontSize(6);
      doc.setTextColor('#9CA3AF');
      
      const dateStr = new Date().toLocaleString('th-TH');
      doc.text(`Generated on ${dateStr}`, margin, pageHeight - 6);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
      doc.text(`MentalBreakdown | Universal Call Sheet`, pageWidth - margin, pageHeight - 6, { align: 'right' });
    }

    const sanitizedTitle = sanitizeFilename(projectTitle || 'Call-Sheet');
    doc.save(`${sanitizedTitle}-CallSheet-${new Date().toISOString().split('T')[0]}.pdf`);
    console.log('Call Sheet PDF exported successfully.');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
