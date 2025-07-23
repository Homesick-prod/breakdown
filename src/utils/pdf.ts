/**
 * Generates an HTML string for the PDF content and opens it in a new window for printing.
 * @param {any} headerInfo - The project's header information.
 * @param {any[]} timelineItems - The array of timeline items (shots and breaks).
 * @param {any} stats - Calculated stats for the schedule.
 * @param {object} imagePreviews - A map of item IDs to base64 image data URLs.
 */
export const exportToPDF = (headerInfo: any, timelineItems: any[], stats: any, imagePreviews: { [key: string]: string }) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to export to PDF.');
    return;
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
  };

  const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Breakdown Q${headerInfo.shootingDay || '1'} - ${headerInfo.projectTitle}</title>
            <meta charset="UTF-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');

                @page {
                    size: A4 landscape;
                    margin: 8mm;
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Sarabun', Arial, sans-serif;
                    font-size: 9pt;
                    line-height: 1.2;
                    color: #000;
                    background: white;
                }

                .header {
                    width: 100%;
                    margin-bottom: 10px;
                }

                .top-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    background: #f0f0f0;
                    padding: 8px 12px;
                    border: 1px solid #000;
                }

                .left-info {
                    flex: 1;
                }

                .center-title {
                    flex: 2;
                    text-align: center;
                    padding: 0 20px;
                }

                .right-info {
                    flex: 1;
                    text-align: right;
                }

                .project-title {
                    font-size: 24pt;
                    font-weight: 700;
                    color: #000;
                    margin: 5px 0;
                }

                .breakdown-title {
                    font-size: 10pt;
                    color: #333;
                    margin-top: 5px;
                }

                .page-info {
                    font-size: 10pt;
                    font-weight: 600;
                    margin-bottom: 5px;
                }

                .sub-info {
                    font-size: 8pt;
                    color: #333;
                    line-height: 1.4;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 2fr 1fr;
                    gap: 10px;
                    margin-bottom: 8px;
                }

                .info-box {
                    background: #f8f8f8;
                    border: 1px solid #ccc;
                    padding: 6px 10px;
                    font-size: 8pt;
                }

                .info-box-title {
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    font-size: 8pt;
                }

                .info-item {
                    margin: 2px 0;
                    display: flex;
                    justify-content: space-between;
                }

                .info-label {
                    font-weight: 500;
                    color: #555;
                }

                .info-value {
                    font-weight: 400;
                    color: #000;
                }

                .schedule-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 8pt;
                    margin-bottom: 10px;
                    table-layout: fixed;
                }

                .schedule-table th {
                    background: #4a4a4a;
                    color: white;
                    padding: 6px 4px;
                    text-align: center;
                    font-weight: 600;
                    font-size: 7pt;
                    border: 1px solid #333;
                    text-transform: uppercase;
                }

                .schedule-table td {
                    padding: 4px;
                    border: 1px solid #ccc;
                    vertical-align: middle;
                    text-align: center;
                }

                .schedule-table tr:nth-child(even) {
                    background-color: #f9f9f9;
                }

                .section-header {
                    background-color: #e0e0e0 !important;
                    font-weight: 600;
                    text-align: center;
                }

                .lunch-row {
                    background-color: #cc9999 !important;
                    color: white;
                    font-weight: 600;
                }

                .dinner-row {
                    background-color: #cc9999 !important;
                    color: white;
                    font-weight: 600;
                }

                .wrap-row {
                    background-color: #666666 !important;
                    color: white;
                    font-weight: 600;
                }

                .break-row {
                    background-color: #ffcc99 !important;
                    font-weight: 600;
                }

                .setup-row {
                    background-color: #cccccc !important;
                }

                .travel-row {
                    background-color: #dddddd !important;
                }

                .time-cell {
                    font-weight: 600;
                    white-space: nowrap;
                    font-size: 8pt;
                }

                .scene-cell {
                    font-weight: 600;
                    color: #000;
                }

                .shot-cell {
                    font-weight: 600;
                    color: #000;
                }

                .description-cell {
                    text-align: left;
                    padding-left: 6px;
                    font-size: 8pt;
                }

                .ref-image {
                    max-width: 60px;
                    max-height: 45px;
                    object-fit: cover;
                    display: block;
                    margin: 0 auto;
                    border: 1px solid #ddd;
                }

                .handheld {
                    background-color: #66cccc !important;
                    color: white;
                }

                .footer {
                    margin-top: 15px;
                    display: flex;
                    justify-content: space-between;
                    font-size: 8pt;
                    color: #666;
                }

                @media print {
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }

                    .header,
                    .info-grid {
                        page-break-after: avoid !important;
                        break-after: avoid;
                    }

                    .schedule-table {
                        page-break-inside: auto;
                        break-inside: auto;
                    }

                    .schedule-table thead {
                        display: table-header-group;
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }

                    .schedule-table tr {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="top-header">
                    <div class="left-info">
                        <div class="info-label">Director : ${headerInfo.director || '-'}</div>
                        <div class="info-label">Producer : ${headerInfo.producer || '-'}</div>
                        <div class="info-label">Production Designer : ${headerInfo.pd || '-'}</div>
                        <div class="info-label">Director of Photography : ${headerInfo.dop || '-'}</div>
                        <div class="info-label">1st AD : ${headerInfo.firstAD || '-'}</div>
                        <div class="info-label">2nd AD : ${headerInfo.secondAD || '-'}</div>
                    </div>

                    <div class="center-title">
                        <div class="breakdown-title">Breakdown Q${headerInfo.shootingDay || '1'} of ${headerInfo.totalDays || 1}</div>
                        <div class="project-title">${headerInfo.projectTitle || '-'}</div>
                        <div class="sub-info">Shooting date : ${formatDate(headerInfo.date)}</div>
                    </div>

                    <div class="right-info">
                        <div class="page-info">Q${headerInfo.shootingDay || '1'}</div>
                        <div class="sub-info">Rise ${headerInfo.sunrise || '--:--'} | Set ${headerInfo.sunset || '--:--'}</div>
                        <div class="sub-info">${headerInfo.weather || 'Considerable cloudiness'}</div>
                        <div class="sub-info">Probability of Precipitation ${headerInfo.precipProb || '--%'}</div>
                        <div class="sub-info">${headerInfo.temp || '--°'} | Real Feel ${headerInfo.realFeel || '--°'}</div>
                    </div>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-box">
                    <div class="info-box-title">Call/Wrap up Times</div>
                    <div class="info-item">
                        <span class="info-label">Crew call :</span>
                        <span class="info-value">${headerInfo.callTime || ''}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Wrap up :</span>
                        <span class="info-value">${headerInfo.wrapTime || ''}</span>
                    </div>
                </div>

                <div class="info-box" style="text-align: center;">
                    <div class="info-box-title">Location</div>
                    <div style="margin: 5px 0;">
                        <div><strong>Location 1</strong></div>
                        <div>${headerInfo.location1 || headerInfo.location || '-'}</div>
                    </div>
                    ${headerInfo.location2 ? `
                        <div style="margin: 5px 0;">
                            <div><strong>Location 2</strong></div>
                            <div>${headerInfo.location2}</div>
                        </div>
                    ` : ''}
                </div>

                <div class="info-box">
                    <div class="info-box-title">Meal Times</div>
                    <div class="info-item">
                        <span class="info-label">First Meal :</span>
                        <span class="info-value">${headerInfo.firstmealTime || '-'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Second Meal :</span>
                        <span class="info-value">${headerInfo.secondmealTime || '-'}</span>
                    </div>
                </div>
            </div>

            <table class="schedule-table">
                <thead>
                    <tr>
                        <th colspan="2" style="width: 120px;">Time</th> <th rowspan="2" style="width: 40px;">dur.</th>
                        <th rowspan="2" style="width: 60px;">INT/EXT<br/>(Location)</th>
                        <th rowspan="2" style="width: 50px;">Period</th>
                        <th rowspan="2" style="width: 50px;">Scene</th>
                        <th rowspan="2" style="width: 40px;">Shot</th>
                        <th rowspan="2" style="width: 80px;">Shot Type<br/>/ Size</th>
                        <th rowspan="2" style="width: 80px;">Angle</th>
                        <th rowspan="2" style="width: 70px;">Movement</th>
                        <th rowspan="2" style="width: 50px;">Lens</th>
                        <th rowspan="2" style="width: 180px;">Description</th>
                        <th rowspan="2" style="width: 60px;">Cast</th>
                        <th rowspan="2" style="width: 80px;">Blockshot</th>
                        <th rowspan="2" style="width: 80px;">Main Props</th>
                        <th rowspan="2" style="width: 70px;">Costume</th>
                        <th rowspan="2" style="width: 100px;">Remark</th>
                    </tr>
                    <tr>
                        <th style="width: 60px;">Start</th> <th style="width: 60px;">End</th>
                    </tr>
                </thead>
                <tbody>
                    ${timelineItems.map((item, index) => {
    let rowClass = '';
    let cellContent = '';

    if (item.type === 'break') {
      if (item.description.toLowerCase().includes('lunch')) {
        rowClass = 'lunch-row';
      } else if (item.description.toLowerCase().includes('dinner')) {
        rowClass = 'dinner-row';
      } else if (item.description.toLowerCase().includes('wrap')) {
        rowClass = 'wrap-row';
      } else if (item.description.toLowerCase().includes('set up') || item.description.toLowerCase().includes('setup')) {
        rowClass = 'setup-row';
      } else if (item.description.toLowerCase().includes('เดินทาง') || item.description.toLowerCase().includes('travel')) {
        rowClass = 'travel-row';
      } else {
        rowClass = 'break-row';
      }

      cellContent = `
                                <td class="time-cell">${item.start || '00:00'}</td>
                                <td class="time-cell">${item.end || '00:00'}</td>
                                <td>${item.duration}'</td>
                                <td colspan="14" class="description-cell" style="text-align: center; font-weight: 600;">${item.description}</td>
                            `;
    } else {
      const imageHtml = imagePreviews[item.id]
        ? `<img src="${imagePreviews[item.id]}" class="ref-image" alt="Ref">`
        : '';

      if (item.movement && item.movement.toLowerCase().includes('hand')) {
        rowClass = 'handheld';
      }

      cellContent = `
                                <td class="time-cell">${item.start || '00:00'}</td>
                                <td class="time-cell">${item.end || '00:00'}</td>
                                <td>${item.duration}'</td>
                                <td>${item.intExt || ''}<br/><span style="font-size: 7pt;">(${item.location || ''})</span></td>
                                <td>${item.dayNight || ''}</td>
                                <td class="scene-cell">${item.sceneNumber || ''}</td>
                                <td class="shot-cell">${item.shotNumber || ''}</td>
                                <td>${item.shotSize || ''}</td>
                                <td>${item.angle || ''}</td>
                                <td>${item.movement || ''}</td>
                                <td>${item.lens || ''}mm</td>
                                <td class="description-cell">${item.description || ''}</td>
                                <td style="font-size: 8pt;">${item.cast || ''}</td>
                                <td>${imageHtml}</td>
                                <td style="font-size: 8pt;">${item.props || ''}</td>
                                <td style="font-size: 8pt;">${item.costume || ''}</td>
                                <td style="font-size: 8pt;">${item.notes || ''}</td>
                            `;
    }

    return `<tr class="${rowClass}">${cellContent}</tr>`;
  }).join('')}
                </tbody>
            </table>

            <div class="footer">
                <div style="font-size: 6pt;">Generated on ${new Date().toLocaleString('th-TH')}</div>
                <div style="font-size: 6pt;">MentalBreakdown | Beta V.2.0.2.1 Created by Tawich P.</div>
            </div>
        </body>
        </html>
    `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.onload = function () {
    printWindow.print();
  };
};
