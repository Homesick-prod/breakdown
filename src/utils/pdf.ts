import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IBMPlexSansThaiRegular } from './ibmPlexSansThai-Regular-normal';

/**
 * Sanitizes filename by removing invalid characters
 */
const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '-').substring(0, 100);
};

/**
 * Formats a date string into Thai format (Buddhist Era)
 */
const formatThaiDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
};

/**
 * Draws a clean, professional, bordered panel
 */
const drawPanel = (doc: jsPDF, title: string, x: number, y: number, w: number, h: number) => {
  doc.setFillColor('#FFFFFF');
  doc.setDrawColor('#E5E7EB');
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');
  
  // Title
  doc.setFont('IBMPlexSansThai', 'bold');
  doc.setFontSize(7);
  doc.setTextColor('#4B5563'); // gray-600
  doc.text(title.toUpperCase(), x + 4, y + 4.5);
};

/**
 * Generates and downloads a native PDF of the Shooting Schedule.
 */
export const exportToPDF = (
  headerInfo: any,
  timelineItems: any[],
  stats: any,
  imagePreviews: { [key: string]: string }
) => {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Load custom Thai font
    try {
      doc.addFileToVFS('IBMPlexSansThai-Regular.ttf', IBMPlexSansThaiRegular);
      doc.addFont('IBMPlexSansThai-Regular.ttf', 'IBMPlexSansThai', 'normal');
      doc.addFont('IBMPlexSansThai-Regular.ttf', 'IBMPlexSansThai', 'bold');
    } catch (fontError) {
      console.warn('Failed to load custom font, using helvetica:', fontError);
    }
    doc.setFont('IBMPlexSansThai');

    const pageWidth = doc.internal.pageSize.getWidth(); // A4 Landscape: 297mm

    // Draw Main Header Box (Slate 800)
    doc.setFillColor('#1F2937');
    doc.roundedRect(10, 10, 277, 35, 2, 2, 'F');

    // Left Column Info (Key Crew)
    doc.setFont('IBMPlexSansThai', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#E5E7EB');
    let leftY = 15;
    doc.text(`Director: ${headerInfo.director || '-'}`, 15, leftY); leftY += 4;
    doc.text(`Producer: ${headerInfo.producer || '-'}`, 15, leftY); leftY += 4;
    doc.text(`DOP: ${headerInfo.dop || '-'}`, 15, leftY); leftY += 4;
    doc.text(`1st AD: ${headerInfo.firstAD || '-'}`, 15, leftY); leftY += 4;
    doc.text(`2nd AD: ${headerInfo.secondAD || '-'}`, 15, leftY); leftY += 4;
    doc.text(`PD: ${headerInfo.pd || '-'}`, 15, leftY);

    // Center Column Info (Project & Date)
    doc.setFont('IBMPlexSansThai', 'bold');
    doc.setFontSize(16);
    doc.setTextColor('#FFFFFF');
    doc.text(headerInfo.projectTitle || 'Untitled Project', 148.5, 18, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor('#F3F4F6');
    doc.text(`Breakdown Q${headerInfo.shootingDay || '1'} of ${headerInfo.totalDays || 1}`, 148.5, 25, { align: 'center' });
    
    doc.setFont('IBMPlexSansThai', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#D1D5DB');
    doc.text(`Shooting Date: ${formatThaiDate(headerInfo.date)}`, 148.5, 31, { align: 'center' });

    // Right Column Info (Metadata / Weather)
    doc.setFont('IBMPlexSansThai', 'bold');
    doc.setFontSize(16);
    doc.setTextColor('#F59E0B'); // Amber
    doc.text(`Q${headerInfo.shootingDay || '1'}`, 282, 18, { align: 'right' });

    doc.setFont('IBMPlexSansThai', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#E5E7EB');
    doc.text(`Rise: ${headerInfo.sunrise || '--:--'} | Set: ${headerInfo.sunset || '--:--'}`, 282, 23, { align: 'right' });
    doc.text(`${headerInfo.weather || 'Considerable cloudiness'}`, 282, 27, { align: 'right' });
    doc.text(`Precip Prob: ${headerInfo.precipProb || '--%'}`, 282, 31, { align: 'right' });
    doc.text(`${headerInfo.temp || '--°'} | Feels: ${headerInfo.realFeel || '--°'}`, 282, 35, { align: 'right' });

    // Draw Sub Panels
    // Card 1: Call/Wrap
    drawPanel(doc, 'Call / Wrap up Times', 10, 48, 80, 16);
    doc.setFont('IBMPlexSansThai', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor('#1F2937');
    doc.text(`Crew Call: ${headerInfo.callTime || '-'}`, 14, 57);
    doc.text(`Wrap Up: ${headerInfo.wrapTime || '-'}`, 14, 61);

    // Card 2: Location
    drawPanel(doc, 'Location', 95, 48, 107, 16);
    doc.setFont('IBMPlexSansThai', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor('#1F2937');
    const loc1 = headerInfo.location1 || headerInfo.location || '-';
    const loc2 = headerInfo.location2 || '';
    const wrappedLoc1 = doc.splitTextToSize(`Loc 1: ${loc1}`, 99);
    const wrappedLoc2 = loc2 ? doc.splitTextToSize(`Loc 2: ${loc2}`, 99) : [];
    let locY = 57;
    if (wrappedLoc1[0]) {
      doc.text(wrappedLoc1[0], 99, locY);
      locY += 4;
    }
    if (wrappedLoc2[0]) {
      doc.text(wrappedLoc2[0], 99, locY);
    }

    // Card 3: Meal Times
    drawPanel(doc, 'Meal Times', 207, 48, 80, 16);
    doc.setFont('IBMPlexSansThai', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor('#1F2937');
    doc.text(`First Meal: ${headerInfo.firstmealTime || '-'}`, 211, 57);
    doc.text(`Second Meal: ${headerInfo.secondmealTime || '-'}`, 211, 61);

    // Prepare table body rows
    const bodyData = timelineItems.map((item) => {
      if (item.type === 'break') {
        return [
          item.start || '00:00',
          item.end || '00:00',
          `${item.duration || 0}'`,
          { content: item.description || 'Break', colSpan: 14 }
        ];
      } else {
        return [
          item.start || '00:00',
          item.end || '00:00',
          `${item.duration || 0}'`,
          `${item.intExt || ''}\n(${item.location || ''})`,
          item.dayNight || '',
          item.sceneNumber || '',
          item.shotNumber || '',
          item.shotSize || '',
          item.angle || '',
          item.movement || '',
          item.lens ? `${item.lens}mm` : '',
          item.description || '',
          item.cast || '',
          '', // Blockshot image cell placeholder
          item.props || '',
          item.costume || '',
          item.notes || ''
        ];
      }
    });

    // Generate table using jspdf-autotable
    autoTable(doc, {
      startY: 68,
      head: [
        [
          { content: 'Time', colSpan: 2, styles: { halign: 'center' } },
          { content: 'dur.', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'INT/EXT\n(Location)', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Period', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Scene', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Shot', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Shot Type\n/ Size', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Angle', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Movement', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Lens', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Description', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
          { content: 'Cast', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Blockshot', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Main Props', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Costume', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'Remark', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
        ],
        [
          { content: 'Start', styles: { halign: 'center' } },
          { content: 'End', styles: { halign: 'center' } }
        ]
      ],
      body: bodyData,
      theme: 'grid',
      styles: {
        font: 'IBMPlexSansThai',
        fontSize: 6.5,
        cellPadding: 1,
        valign: 'middle',
        halign: 'center',
        lineWidth: 0.1,
        lineColor: '#E5E7EB',
        textColor: '#1F2937'
      },
      headStyles: {
        fillColor: '#1F2937',
        textColor: '#FFFFFF',
        fontSize: 6.5,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 12 },
        2: { cellWidth: 8 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 12 },
        5: { cellWidth: 10, fontStyle: 'bold' },
        6: { cellWidth: 10, fontStyle: 'bold' },
        7: { cellWidth: 15 },
        8: { cellWidth: 15 },
        9: { cellWidth: 15 },
        10: { cellWidth: 12 },
        11: { cellWidth: 40, halign: 'left' },
        12: { cellWidth: 18, halign: 'left' },
        13: { cellWidth: 20 },
        14: { cellWidth: 20, halign: 'left' },
        15: { cellWidth: 20, halign: 'left' },
        16: { cellWidth: 20, halign: 'left' }
      },
      margin: { left: 10, right: 10, top: 10, bottom: 12 },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const item = timelineItems[data.row.index];
          if (!item) return;

          if (item.type === 'break') {
            const desc = (item.description || '').toLowerCase();
            let bgColor = '#FEF3C7'; // Default break (amber)
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
          } else {
            // Handheld check
            if (item.movement && item.movement.toLowerCase().includes('hand')) {
              data.cell.styles.fillColor = '#E0F2FE'; // Sky blue
              data.cell.styles.textColor = '#0369A1';
            }
            // Set min height for image row
            if (data.row.height < 16) {
              data.row.height = 16;
            }
          }
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 13) {
          const item = timelineItems[data.row.index];
          if (item && item.type !== 'break') {
            const base64 = imagePreviews[item.id];
            if (base64) {
              try {
                const padding = 1;
                const x = data.cell.x + padding;
                const y = data.cell.y + padding;
                const w = data.cell.width - padding * 2;
                const h = data.cell.height - padding * 2;

                // Detect format
                let format = 'JPEG';
                if (base64.startsWith('data:image/')) {
                  const detected = base64.substring("data:image/".length, base64.indexOf(";base64")).toUpperCase();
                  if (['PNG', 'JPEG', 'JPG', 'WEBP'].includes(detected)) {
                    format = detected === 'JPG' ? 'JPEG' : detected;
                  }
                }

                doc.addImage(base64, format, x, y, w, h, undefined, 'FAST');
              } catch (err) {
                console.error('Error drawing image in PDF:', err);
              }
            }
          }
        }
      },
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFont('IBMPlexSansThai', 'normal');
        doc.setFontSize(6);
        doc.setTextColor('#9CA3AF'); // gray-400
        
        const dateStr = new Date().toLocaleString('th-TH');
        doc.text(`Generated on ${dateStr}`, 10, pageHeight - 6);
        doc.text(`MentalBreakdown | Beta V.2.3.5.1 Created by Tawich P.`, pageWidth - 10, pageHeight - 6, { align: 'right' });
      }
    });

    const sanitizedTitle = sanitizeFilename(headerInfo.projectTitle || 'Shooting-Schedule');
    doc.save(`${sanitizedTitle}-Schedule-${new Date().toISOString().split('T')[0]}.pdf`);
    console.log('Shooting Schedule PDF exported successfully.');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
