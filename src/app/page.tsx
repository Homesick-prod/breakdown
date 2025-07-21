'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import CryptoJS from 'crypto-js';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Calendar, Clock, Film, Plus, Save,
  ChevronDown, Trash2, Copy, Download, Camera, ChevronRight,
  Settings, Upload, FileDown, CloudRain, Eye, Github,
  MoreVertical, Edit2, X, ArrowLeft, Users, Hash,
  MapPin, Sunrise, Sunset, Thermometer, CloudDrizzle,
  Coffee, Moon, FileText, Loader2, Check, CloudOff,
  Image as ImageIcon, Folder
} from 'lucide-react';

// Utility function for generating unique IDs
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Encryption key for .mbd files
const SECRET_KEY = "hYp3r-S3cUr3-K3y-f0r-M3ntalBr3akd0wn-!@#$";

// Time calculation utilities
const calculateEndTime = (startTime, duration) => {
  if (!startTime || duration === null || duration < 0 || isNaN(duration)) return '';
  try {
    const [hours, minutes] = startTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return '';
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const endHours = endDate.getHours().toString().padStart(2, '0');
    const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
    return `${endHours}:${endMinutes}`;
  } catch { return ''; }
};

const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  try {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) return 0;
    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);
    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);
    const diffMillis = endDate.getTime() - startDate.getTime();
    const diffMinutes = Math.round(diffMillis / 60000);
    return diffMinutes >= 0 ? diffMinutes : 0;
  } catch { return 0; }
};

// Export/Import Functions
const exportProject = (project) => {
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

const importProject = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const encryptedData = e.target.result as string;
        const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
        const decryptedJson = bytes.toString(CryptoJS.enc.Utf8);
        if (!decryptedJson) {
          throw new Error("Invalid file or wrong key.");
        }
        const project = JSON.parse(decryptedJson);
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

// PDF Export Function
const exportToPDF = (headerInfo, timelineItems, stats, imagePreviews) => {
  const printWindow = window.open('', '_blank');

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
  };

  const formatTimeRange = (start, end) => {
    return `${start || '00:00'} - ${end || '00:00'}`;
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
                <div style="font-size: 6pt;">MentalBreakdown | Beta V.1.2.2.1 Created by Tawich P.</div>
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


function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col h-2 sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm text-slate-600 font-medium">
              MentalBreakdown
            </p>
            <p className="text-xs text-slate-500 mt-1">
              ©{new Date().getFullYear()} | V.1.2.2.1 (Beta) Created by Tawich P.
            </p>
          </div>
          <div className="flex items-center space-x-5">
            <a
              href="https://github.com/Homesick-prod/breakdown"
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 text-slate-400 hover:text-slate-600 transition-colors"
              title="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Modern Schedule Editor Component
function ShootingScheduleEditor({ project, onBack, onSave }) {
  // State initialization with lazy loading
  const [headerInfo, setHeaderInfo] = useState(() => {
    const defaultHeader = {
      projectTitle: project?.name || '',
      episodeNumber: '',
      shootingDay: '',
      totalDays: '',
      date: new Date().toISOString().split('T')[0],
      callTime: '',
      sunrise: '06:30',
      sunset: '18:30',
      weather: '',
      location1: '',
      location2: '',
      director: '',
      producer: '',
      dop: '',
      firstAD: '',
      secondAD: '',
      pd: '',
      artTime: '',
      lunchTime: '',
      dinnerTime: '',
      precipProb: '',
      temp: '',
      realFeel: '',
      firstmealTime: '',
      secondmealTime: '',
      wrapTime: ''
    };
    return project?.data?.headerInfo ? { ...defaultHeader, ...project.data.headerInfo } : defaultHeader;
  });

  const [timelineItems, setTimelineItems] = useState(() => project?.data?.timelineItems || []);
  const [imagePreviews, setImagePreviews] = useState(() => project?.data?.imagePreviews || {});
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showProductionDetails, setShowProductionDetails] = useState(false);

  const debounceTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);
  const tableContainerRef = useRef(null);
  const floatingScrollbarRef = useRef(null);
  const floatingScrollbarContentRef = useRef(null);
  const [showFloatingScrollbar, setShowFloatingScrollbar] = useState(false);
  const isSyncingScroll = useRef(false);

  // Autosave functionality
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('dirty');

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      await new Promise(resolve => setTimeout(resolve, 500));
      onSave({
        headerInfo,
        timelineItems,
        imagePreviews
      });
      setSaveStatus('saved');
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSaveStatus('idle');
    }, 1200);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [headerInfo, timelineItems, imagePreviews, onSave]);

  // Floating scrollbar logic
  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const floatingScrollbar = floatingScrollbarRef.current;
    const tableEl = tableContainer ? tableContainer.querySelector('table') : null;

    if (!tableContainer || !floatingScrollbar || !tableEl) return;

    const updateScrollbar = () => {
      const tableWidth = tableEl.offsetWidth;
      if (floatingScrollbarContentRef.current) {
        floatingScrollbarContentRef.current.style.width = `${tableWidth + 100}px`;
      }

      const isScrollable = tableContainer.scrollWidth > tableContainer.clientWidth;
      const containerRect = tableContainer.getBoundingClientRect();
      const isTableBottomOffscreen = containerRect.bottom > window.innerHeight;

      setShowFloatingScrollbar(isScrollable && isTableBottomOffscreen);
    };

    const handleTableScroll = () => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      floatingScrollbar.scrollLeft = tableContainer.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    };

    const handleFloatingScroll = () => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;
      tableContainer.scrollLeft = floatingScrollbar.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    };

    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(tableEl);

    tableContainer.addEventListener('scroll', handleTableScroll);
    floatingScrollbar.addEventListener('scroll', handleFloatingScroll);
    window.addEventListener('resize', updateScrollbar);
    window.addEventListener('scroll', updateScrollbar, true);

    updateScrollbar();

    return () => {
      observer.disconnect();
      tableContainer.removeEventListener('scroll', handleTableScroll);
      floatingScrollbar.removeEventListener('scroll', handleFloatingScroll);
      window.removeEventListener('resize', updateScrollbar);
      window.removeEventListener('scroll', updateScrollbar, true);
    };
  }, [timelineItems]);

  // Time calculation functions
  const recalculateAndUpdateTimes = useCallback((items) => {
    let lastEndTime = headerInfo.callTime || '06:00';

    const updatedItems = items.map((item) => {
      const newStart = lastEndTime;
      const currentDuration = typeof item.duration === 'number' ? item.duration : 0;
      const newEnd = calculateEndTime(newStart, currentDuration);
      lastEndTime = newEnd || lastEndTime;
      return { ...item, start: newStart, end: newEnd };
    });

    setTimelineItems(updatedItems);
  }, [headerInfo.callTime]);

  const handleItemChange = useCallback((itemId, field, value) => {
    const itemIndex = timelineItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;

    if (field === 'start' && itemIndex === 0) {
      setHeaderInfo(prev => ({ ...prev, callTime: value }));
      return;
    }

    let newItems = [...timelineItems];
    const itemToChange = { ...newItems[itemIndex] };
    let requiresRecalculation = false;

    if (field === 'end') {
      const newEndTime = value < itemToChange.start ? itemToChange.start : value;
      itemToChange.end = newEndTime;
      itemToChange.duration = calculateDuration(itemToChange.start, newEndTime);
      requiresRecalculation = true;
    } else if (field === 'duration') {
      const newDuration = parseInt(value, 10) || 0;
      itemToChange.duration = newDuration < 0 ? 0 : newDuration;
      itemToChange.end = calculateEndTime(itemToChange.start, itemToChange.duration);
      requiresRecalculation = true;
    } else if (field !== 'start') {
      itemToChange[field] = value;
    }
    newItems[itemIndex] = itemToChange;

    if (requiresRecalculation) {
      let lastEndTime = newItems[itemIndex].end;
      for (let i = itemIndex + 1; i < newItems.length; i++) {
        newItems[i].start = lastEndTime;
        newItems[i].end = calculateEndTime(lastEndTime, newItems[i].duration);
        lastEndTime = newItems[i].end;
      }
    }

    setTimelineItems(newItems);
  }, [timelineItems]);

  const addShot = useCallback(() => {
    const lastItem = timelineItems[timelineItems.length - 1];
    const newStartTime = lastItem ? lastItem.end : (headerInfo.callTime || '06:00');

    const newShot = {
      id: generateId(),
      type: 'shot',
      start: newStartTime,
      duration: 10,
      end: '',
      sceneNumber: '',
      shotNumber: '',
      intExt: 'INT',
      dayNight: 'DAY',
      location: '',
      description: '',
      cast: '',
      shotSize: 'MS',
      angle: 'Eye Level',
      movement: 'Still',
      lens: '',
      props: '',
      costume: '',
      notes: '',
      imageUrl: ''
    };

    newShot.end = calculateEndTime(newShot.start, newShot.duration);
    setTimelineItems(prevItems => [...prevItems, newShot]);
  }, [timelineItems, headerInfo.callTime]);

  const addBreak = useCallback(() => {
    const lastItem = timelineItems[timelineItems.length - 1];
    const newStartTime = lastItem ? lastItem.end : (headerInfo.callTime || '06:00');

    const newBreak = {
      id: generateId(),
      type: 'break',
      start: newStartTime,
      duration: 30,
      end: '',
      description: 'Meal Break'
    };

    newBreak.end = calculateEndTime(newBreak.start, newBreak.duration);
    setTimelineItems(prevItems => [...prevItems, newBreak]);
  }, [timelineItems, headerInfo.callTime]);

  const removeTimelineItem = useCallback((itemId) => {
    if (imagePreviews[itemId]) {
      const newPreviews = { ...imagePreviews };
      delete newPreviews[itemId];
      setImagePreviews(newPreviews);
    }
    const newItems = timelineItems.filter(item => item.id !== itemId);
    recalculateAndUpdateTimes(newItems);
  }, [timelineItems, recalculateAndUpdateTimes, imagePreviews]);

  const handleImageUpload = useCallback((itemId, file) => {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviews(prev => ({
        ...prev,
        [itemId]: reader.result
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveImage = useCallback((itemId) => {
    setImagePreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[itemId];
      return newPreviews;
    });
  }, []);

  const handlePasteImage = useCallback((e, itemId) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const html = clipboardData.getData('text/html');
    if (html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const img = doc.querySelector('img');

      if (img && img.src) {
        e.preventDefault();
        fetch(img.src)
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch pasted image from URL.');
            return res.blob();
          })
          .then(blob => {
            if (blob.type.startsWith('image/')) {
              handleImageUpload(itemId, blob);
            } else {
              console.error('Pasted source was not a valid image type.');
            }
          })
          .catch(err => console.error("Error processing pasted image:", err));
        return;
      }
    }

    const items = clipboardData.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleImageUpload(itemId, file);
            return;
          }
        }
      }
    }
  }, [handleImageUpload]);

  const stats = useMemo(() => {
    const totalDuration = timelineItems.reduce((sum, item) => sum + (item.duration || 0), 0);
    const shotCount = timelineItems.filter(item => item.type === 'shot').length;
    const breakTime = timelineItems.filter(item => item.type === 'break').reduce((sum, item) => sum + (item.duration || 0), 0);

    return {
      totalHours: Math.floor(totalDuration / 60),
      totalMinutes: totalDuration % 60,
      shotCount,
      breakHours: Math.floor(breakTime / 60),
      breakMinutes: breakTime % 60
    };
  }, [timelineItems]);

  const handleExportProject = () => {
    const projectData = {
      ...project,
      data: {
        headerInfo,
        timelineItems,
        imagePreviews
      }
    };
    exportProject(projectData);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      const oldIndex = timelineItems.findIndex(item => item.id === active.id);
      const newIndex = timelineItems.findIndex(item => item.id === over.id);

      const newOrderedItems = arrayMove(timelineItems, oldIndex, newIndex);
      recalculateAndUpdateTimes(newOrderedItems);
    }
  }

  useEffect(() => {
    recalculateAndUpdateTimes(timelineItems);
  }, [headerInfo.callTime, recalculateAndUpdateTimes]);

return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-x-hidden flex flex-col">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='110' height='73.33' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cstyle%3E.pattern %7B width: 100%25; height: 100%25; --s: 110px; --c1: %23dedede; --c2: %23ededed; --c3: %23d6d6d6; --_g: var(--c1) 10%25,var(--c2) 10.5%25 19%25,%230000 19.5%25 80.5%25,var(--c2) 81%25 89.5%25,var(--c3) 90%25; --_c: from -90deg at 37.5%25 50%25,%230000 75%25; --_l1: linear-gradient(145deg,var(--_g)); --_l2: linear-gradient( 35deg,var(--_g)); background: var(--_l1), var(--_l1) calc(var(--s)/2) var(--s), var(--_l2), var(--_l2) calc(var(--s)/2) var(--s), conic-gradient(var(--_c),var(--c1) 0) calc(var(--s)/8) 0, conic-gradient(var(--_c),var(--c3) 0) calc(var(--s)/2) 0, linear-gradient(90deg,var(--c3) 38%25,var(--c1) 0 50%25,var(--c3) 0 62%25,var(--c1) 0); background-size: var(--s) calc(2*var(--s)/3); %7D%3C/style%3E%3C/defs%3E%3CforeignObject width='100%25' height='100%25'%3E%3Cdiv class='pattern' xmlns='http://www.w3.org/1999/xhtml'%3E%3C/div%3E%3C/foreignObject%3E%3C/svg%3E")`,
        }}
      ></div>

      {/* Main content wrapper, now a div with position:relative so z-index works */}
      <div className="relative z-10 flex flex-col flex-grow">
        <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
          <div className="px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{headerInfo.projectTitle || 'Untitled Project'}</h1>
                  <p className="text-xs text-gray-500">Shooting Schedule Editor</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <SaveStatusIndicator status={saveStatus} />
                <div className="h-6 w-px bg-gray-200"></div>
                <button
                  onClick={handleExportProject}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  <span className="hidden sm:inline">Save .mbd</span>
                </button>
                <button
                  onClick={() => exportToPDF(headerInfo, timelineItems, stats, imagePreviews)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export PDF</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* This is the primary content area */}
        <main className="flex-1 p-6">
          {/* Production Details Section */}
          <div className="mb-6">
            <button
              onClick={() => setShowProductionDetails(!showProductionDetails)}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all"
            >
              <Settings className="w-4 h-4 text-gray-700" />
              <span className="font-medium text-gray-900">Production Details</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showProductionDetails ? 'rotate-180' : ''}`} />
            </button>

            {showProductionDetails && (
              <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Project Information */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Film className="w-4 h-4 text-gray-600" />
                      Project Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
                        <input
                          type="text"
                          value={headerInfo.projectTitle}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, projectTitle: e.target.value })}
                          className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Episode #</label>
                          <input
                            type="text"
                            value={headerInfo.episodeNumber}
                            placeholder="Ep. No."
                            onChange={(e) => setHeaderInfo({ ...headerInfo, episodeNumber: e.target.value })}
                            className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Day/Total</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={headerInfo.shootingDay}
                              onChange={(e) => setHeaderInfo({ ...headerInfo, shootingDay: e.target.value })}
                              className="text-gray-500 w-14 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center transition-all"
                              placeholder="1"
                            />
                            <span className="text-gray-500">/</span>
                            <input
                              type="text"
                              value={headerInfo.totalDays}
                              onChange={(e) => setHeaderInfo({ ...headerInfo, totalDays: e.target.value })}
                              className="text-gray-500 w-14 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center transition-all"
                              placeholder="3"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shooting Date</label>
                        <input
                          type="date"
                          value={headerInfo.date}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, date: e.target.value })}
                          className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Time & Location */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-600" />
                      Time & Location
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Call Time</label>
                          <input
                            type="time"
                            value={headerInfo.callTime}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, callTime: e.target.value })}
                            className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Wrap Time</label>
                          <input
                            type="time"
                            value={headerInfo.wrapTime}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, wrapTime: e.target.value })}
                            className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Sunrise className="w-3 h-3 inline mr-1" />
                            Sunrise
                          </label>
                          <input
                            type="time"
                            value={headerInfo.sunrise}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, sunrise: e.target.value })}
                            className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Sunset className="w-3 h-3 inline mr-1" />
                            Sunset
                          </label>
                          <input
                            type="time"
                            value={headerInfo.sunset}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, sunset: e.target.value })}
                            className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location 1</label>
                        <input
                          type="text"
                          value={headerInfo.location1}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, location1: e.target.value })}
                          placeholder="Main location"
                          className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location 2</label>
                        <input
                          type="text"
                          value={headerInfo.location2}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, location2: e.target.value })}
                          placeholder="Secondary location (optional)"
                          className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Weather & Meals */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <CloudRain className="w-4 h-4 text-gray-600" />
                      Weather & Meals
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Weather Forecast</label>
                        <input
                          type="text"
                          value={headerInfo.weather}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, weather: e.target.value })}
                          placeholder="Considerable cloudiness"
                          className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Thermometer className="w-3 h-3 inline mr-1" />
                            Temp
                          </label>
                          <input
                            type="text"
                            value={headerInfo.temp}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, temp: e.target.value })}
                            placeholder="34°"
                            className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Real Feel</label>
                          <input
                            type="text"
                            value={headerInfo.realFeel}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, realFeel: e.target.value })}
                            placeholder="37°"
                            className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          <CloudDrizzle className="w-3 h-3 inline mr-1" />
                          Precipitation %
                        </label>
                        <input
                          type="text"
                          value={headerInfo.precipProb}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, precipProb: e.target.value })}
                          placeholder="73%"
                          className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Coffee className="w-3 h-3 inline mr-1" />
                            First Meal
                          </label>
                          <input
                            type="time"
                            value={headerInfo.firstmealTime}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, firstmealTime: e.target.value })}
                            className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Moon className="w-3 h-3 inline mr-1" />
                            Second Meal
                          </label>
                          <input
                            type="time"
                            value={headerInfo.secondmealTime}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, secondmealTime: e.target.value })}
                            className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Crew */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      Key Crew
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Producer</label>
                        <input
                          type="text"
                          value={headerInfo.producer}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, producer: e.target.value })}
                          placeholder="Name & Phone"
                          className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Director</label>
                        <input
                          type="text"
                          value={headerInfo.director}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, director: e.target.value })}
                          placeholder="Name & Phone"
                          className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Production Designer</label>
                        <input
                          type="text"
                          value={headerInfo.pd}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, pd: e.target.value })}
                          placeholder="Name & Phone"
                          className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Director of Photography</label>
                        <input
                          type="text"
                          value={headerInfo.dop}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, dop: e.target.value })}
                          placeholder="Name & Phone"
                          className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">1st AD</label>
                        <input
                          type="text"
                          value={headerInfo.firstAD}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, firstAD: e.target.value })}
                          placeholder="Name & Phone"
                          className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">2nd AD</label>
                        <input
                          type="text"
                          value={headerInfo.secondAD}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, secondAD: e.target.value })}
                          placeholder="Name & Phone"
                          className="text-gray-500 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Duration</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalHours}h {stats.totalMinutes}m</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Shots</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.shotCount}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Film className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Break Time</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.breakHours}h {stats.breakMinutes}m</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Est. Wrap</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {timelineItems.length > 0 ? timelineItems[timelineItems.length - 1].end : '--:--'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={addShot}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Shot
            </button>
            <button
              onClick={addBreak}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
            >
              <Coffee className="w-4 h-4" />
              Add Break
            </button>
          </div>

          {/* Timeline Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div ref={tableContainerRef} className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <table className="w-full" style={{ minWidth: '1600px' }}>
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
                    <tr>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Dur.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Scene</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Shot</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">INT/EXT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Size</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Angle</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Movement</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Lens</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Cast</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Props</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Costume</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Notes</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <SortableContext
                      items={timelineItems.map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {timelineItems.map((item, index) => (
                        <SortableItem
                          key={item.id}
                          id={item.id}
                          item={item}
                          index={index}
                          imagePreviews={imagePreviews}
                          handleItemChange={handleItemChange}
                          handleImageUpload={handleImageUpload}
                          handlePasteImage={handlePasteImage}
                          removeTimelineItem={removeTimelineItem}
                          handleRemoveImage={handleRemoveImage}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </table>
              </DndContext>
              {timelineItems.length === 0 && (
                <div className="text-center py-16">
                  <Film className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">No shots added yet</p>
                  <p className="text-sm text-gray-400 mt-2">Click "Add Shot" to start building your schedule</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Floating scrollbar */}
        <div
          ref={floatingScrollbarRef}
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 overflow-x-auto transition-opacity duration-200"
          style={{
            opacity: showFloatingScrollbar ? 1 : 0,
            pointerEvents: showFloatingScrollbar ? 'auto' : 'none',
            height: '20px'
          }}
        >
          <div ref={floatingScrollbarContentRef} style={{ height: '1px' }}></div>
        </div>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);

  const handleSelectProject = useCallback((project) => {
    setSelectedProject(project);
    setCurrentView('editor');
  }, []);

  const handleCreateProject = useCallback((project) => {
    setSelectedProject(project);
    setCurrentView('editor');
  }, []);

  const handleSaveProject = useCallback((data) => {
    if (!selectedProject) return;

    const projects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
    const updatedProjects = projects.map(p => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          data,
          name: data.headerInfo.projectTitle,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });

    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
  }, [selectedProject]);

  const handleBackToDashboard = useCallback(() => {
    setCurrentView('dashboard');
    setSelectedProject(null);
  }, []);

  useEffect(() => {
    // Load Plus Jakarta Sans (for English) and IBM Plex Sans Thai (for Thai) fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Set the font family with a fallback for Thai
    document.body.style.fontFamily = "'Plus Jakarta Sans', 'IBM Plex Sans Thai', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif";
  }, []);


  return (
    <>
      {currentView === 'dashboard' && (
        <ProjectDashboard
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
        />
      )}

      {currentView === 'editor' && selectedProject && (
        <ShootingScheduleEditor
          project={selectedProject}
          onBack={handleBackToDashboard}
          onSave={handleSaveProject}
        />
      )}
    </>
  );
}

export default App;

// Empty State Component
function EmptyState({ onCreateProject }) {
  return (
    <div className="text-center py-24">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
        <Folder className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
      <p className="text-gray-500 mb-8 max-w-sm mx-auto">
        Create your first shooting schedule project and start organizing your film production.
      </p>
      <button
        onClick={onCreateProject}
        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Create Your First Project
      </button>
    </div>
  );
}

// Project Card Menu Component
function ProjectCardMenu({ project, onEdit, onDuplicate, onExport, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit Details
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            Export
          </button>
          <div className="border-t border-gray-100 my-1"></div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Modern Project Dashboard
function ProjectDashboard({ onSelectProject, onCreateProject }) {
  const [projects, setProjects] = useState([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const fileInputRef = useRef(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  useEffect(() => {
    const savedProjects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
    savedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(savedProjects);
  }, []);

  const handleOpenEditModal = (project) => {
    setEditingProject(project);
    setEditedName(project.name);
    setEditedDescription(project.description || '');
  };

  const handleCloseEditModal = () => {
    setEditingProject(null);
  };

  const handleUpdateProject = () => {
    if (!editingProject || !editedName.trim()) return;
    const updatedProjects = projects.map(p => {
      if (p.id === editingProject.id) {
        return { ...p, name: editedName, description: editedDescription, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(updatedProjects);
    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
    handleCloseEditModal();
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const newProject = {
      id: generateId(),
      name: newProjectName,
      description: newProjectDescription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: null
    };
    const updatedProjects = [newProject, ...projects];
    updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(updatedProjects);
    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
    setNewProjectName('');
    setNewProjectDescription('');
    setShowNewProjectModal(false);
    onCreateProject(newProject);
  };

  const handleDeleteProject = (projectId) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    const updatedProjects = projects.filter(p => p.id !== projectId);
    setProjects(updatedProjects);
    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
  };

  const handleDuplicateProject = (project) => {
    const duplicatedProject = {
      ...project,
      id: generateId(),
      name: `${project.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updatedProjects = [duplicatedProject, ...projects];
    updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setProjects(updatedProjects);
    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
  };

  const handleExportProject = (project) => {
    exportProject(project);
  };

  const handleImportProject = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const importedProject = await importProject(file);
      const updatedProjects = [...projects, importedProject];
      updatedProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setProjects(updatedProjects);
      localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
      alert('Project imported successfully!');
    } catch (error) {
      alert(error.message);
    }
    if (e.target) e.target.value = null;
  };

  return (
    <div className=" min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 opacity-[0.01]" style={{
        '--s': '100px',
        '--c1': '#ffffff',
        '--c2': '#797979FF',
        '--_g': '#0000, #0004 5%, var(--c2) 6% 14%, var(--c1) 16% 24%, var(--c2) 26% 34%, var(--c1) 36% 44%, var(--c2) 46% 54%, var(--c1) 56% 64%, var(--c2) 66% 74%, var(--c1) 76% 84%, var(--c2) 86% 94%, #0004 95%, #0000',
        background: 'radial-gradient(100% 50% at 100% 0, var(--_g)), radial-gradient(100% 50% at 0 50%, var(--_g)), radial-gradient(100% 50% at 100% 100%, var(--_g))',
        backgroundSize: 'var(--s) calc(2 * var(--s))'
      }}></div>
      <main className="flex-grow z-2">
        <nav className="bg-white shadow-sm border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <Film className="w-8 h-8 text-indigo-600" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">MentalBreakdown</h1>
                  <p className="text-xs text-gray-500">Film Shooting Schedule Editor</p>
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import Project
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mbd,.json"
                onChange={handleImportProject}
                className="hidden"
              />
            </div>
          </div>
        </nav>
        <div className="z-12 max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your Projects</h2>
            <p className="text-gray-600">Manage your shooting schedules and production timelines</p>
          </div>

          {projects.length === 0 ? (
            <EmptyState onCreateProject={() => setShowNewProjectModal(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="h-64 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-gray-50 transition-all duration-200 group"
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center mb-3 transition-colors">
                    <Plus className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <span className="text-gray-600 font-medium group-hover:text-indigo-600 transition-colors">
                    Create New Project
                  </span>
                </div>
              </button>

              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className="h-64 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer group overflow-hidden flex flex-col"
                >
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {project.name}
                      </h3>
                      <ProjectCardMenu
                        project={project}
                        onEdit={() => handleOpenEditModal(project)}
                        onDuplicate={() => handleDuplicateProject(project)}
                        onExport={() => handleExportProject(project)}
                        onDelete={() => handleDeleteProject(project.id)}
                      />
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                      {project.description || 'No description'}
                    </p>
                  </div>
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(project.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Create Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/15 backdrop-blur-sm transition-opacity"
              onClick={() => setShowNewProjectModal(false)}
            ></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Create New Project</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className=" w-full px-4 py-2 border text-gray-700  border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Brief description of your project"
                    rows={3}
                    className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/15 backdrop-blur-sm transition-opacity"
              onClick={handleCloseEditModal}
            ></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Edit Project</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateProject}
                  disabled={!editedName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Save Status Indicator Component
function SaveStatusIndicator({ status }) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: 'Saving...',
          className: 'text-gray-600'
        };
      case 'dirty':
        return {
          icon: <CloudOff className="w-4 h-4" />,
          text: 'Unsaved changes',
          className: 'text-amber-600'
        };
      case 'saved':
        return {
          icon: <Check className="w-4 h-4" />,
          text: 'Saved',
          className: 'text-green-600'
        };
      case 'idle':
      default:
        return {
          icon: <Save className="w-4 h-4" />,
          text: 'All changes saved',
          className: 'text-gray-500'
        };
    }
  };

  const { icon, text, className } = getStatusDisplay();

  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${className} transition-all duration-300`}>
      {icon}
      <span className="hidden sm:inline">{text}</span>
    </div>
  );
}

// Sortable Item Component
function SortableItem({ id, item, index, imagePreviews, handleItemChange, handleImageUpload, handlePasteImage, removeTimelineItem, handleRemoveImage }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isBreak = item.type === 'break';
  const isFirstItem = index === 0;

  return (
    <tr ref={setNodeRef} style={style} className={`group ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${isBreak ? 'bg-amber-50' : ''}`}>
      <td className="px-2 py-3 whitespace-nowrap text-center">
        <button {...attributes} {...listeners} className="cursor-grab p-1 text-gray-400 hover:text-gray-600 transition-colors">
          <GripVertical size={16} />
        </button>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={item.start}
            onChange={(e) => handleItemChange(item.id, 'start', e.target.value)}
            disabled={!isFirstItem}
            className={`text-gray-600 px-3 py-1.5 text-sm border rounded-lg font-medium transition-all ${isFirstItem
              ? 'border-gray-300 hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
              : 'border-gray-200 bg-gray-100 text-gray-100 cursor-not-allowed'
              }`}
          />
          <span className="text-gray-400">→</span>
          <input
            type="time"
            value={item.end}
            onChange={(e) => handleItemChange(item.id, 'end', e.target.value)}
            className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all"
          />
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            value={item.duration}
            onChange={(e) => handleItemChange(item.id, 'duration', e.target.value)}
            className="text-gray-600 w-16 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all"
          />
          <span className="text-sm text-gray-500">min</span>
        </div>
      </td>
      {isBreak ? (
        <td colSpan="15" className="px-4 py-3">
          <input
            type="text"
            value={item.description}
            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
            className="text-amber-800 w-full px-4 py-2 bg-amber-100 border border-amber-200 rounded-lg hover:border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 font-medium transition-all"
            placeholder="Break description"
          />
        </td>
      ) : (
        <>
          <td className="px-4 py-3 whitespace-nowrap">
            <input
              type="text"
              value={item.sceneNumber}
              onChange={(e) => handleItemChange(item.id, 'sceneNumber', e.target.value)}
              className="text-gray-600 w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all"
              placeholder="1A"
            />
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            <input
              type="text"
              value={item.shotNumber}
              onChange={(e) => handleItemChange(item.id, 'shotNumber', e.target.value)}
              className="text-gray-600 w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all"
              placeholder="001"
            />
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            <select
              value={item.intExt}
              onChange={(e) => handleItemChange(item.id, 'intExt', e.target.value)}
              className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="INT">INT</option>
              <option value="EXT">EXT</option>
              <option value="INT/EXT">INT/EXT</option>
            </select>
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            <select
              value={item.dayNight}
              onChange={(e) => handleItemChange(item.id, 'dayNight', e.target.value)}
              className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="DAY">DAY</option>
              <option value="NIGHT">NIGHT</option>
              <option value="DAWN">DAWN</option>
              <option value="DUSK">DUSK</option>
            </select>
          </td>
          <td className="px-4 py-3">
            <input
              type="text"
              value={item.location}
              onChange={(e) => handleItemChange(item.id, 'location', e.target.value)}
              className="text-gray-600 w-36 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder="Location"
            />
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            <select
              value={item.shotSize}
              onChange={(e) => handleItemChange(item.id, 'shotSize', e.target.value)}
              className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="">Select...</option>
              <option value="ECU">ECU - Extreme Close Up</option>
              <option value="CU">CU - Close Up</option>
              <option value="MCU">MCU - Medium Close Up</option>
              <option value="MS">MS - Medium Shot</option>
              <option value="MLS">MLS - Medium Long Shot</option>
              <option value="LS">LS - Long Shot</option>
              <option value="WS">WS - Wide Shot</option>
              <option value="EWS">EWS - Extreme Wide Shot</option>
              <option value="OTS">OTS - Over the Shoulder</option>
              <option value="POV">POV - Point of View</option>
              <option value="2S">2S - Two Shot</option>
              <option value="3S">3S - Three Shot</option>
              <option value="INS">INS - Insert</option>
              <option value="CUTAWAY">Cutaway</option>
            </select>
          </td>
          <td className="px-4 py-3">
            <select
              value={item.angle}
              onChange={(e) => handleItemChange(item.id, 'angle', e.target.value)}
              className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="">Select...</option>
              <option value="Eye Level">Eye Level</option>
              <option value="High Angle">High Angle</option>
              <option value="Low Angle">Low Angle</option>
              <option value="Dutch/Canted">Dutch/Canted</option>
              <option value="Bird's Eye">Bird's Eye View</option>
              <option value="Worm's Eye">Worm's Eye View</option>
              <option value="Over Head">Over Head</option>
              <option value="Hip Level">Hip Level</option>
              <option value="Knee Level">Knee Level</option>
              <option value="Ground Level">Ground Level</option>
              <option value="Shoulder Level">Shoulder Level</option>
              <option value="Top 45">Top 45°</option>
              <option value="Profile">Profile (90°)</option>
              <option value="3/4 Front">3/4 Front</option>
              <option value="3/4 Back">3/4 Back</option>
            </select>
          </td>
          <td className="px-4 py-3">
            <select
              value={item.movement}
              onChange={(e) => handleItemChange(item.id, 'movement', e.target.value)}
              className="text-gray-600 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="">Select...</option>
              <option value="Still">Still</option>
              <option value="Pan Left">Pan Left</option>
              <option value="Pan Right">Pan Right</option>
              <option value="Tilt Up">Tilt Up</option>
              <option value="Tilt Down">Tilt Down</option>
              <option value="Dolly In">Dolly In</option>
              <option value="Dolly Out">Dolly Out</option>
              <option value="Dolly Left">Dolly Left</option>
              <option value="Dolly Right">Dolly Right</option>
              <option value="Truck Left">Truck Left</option>
              <option value="Truck Right">Truck Right</option>
              <option value="Zoom In">Zoom In</option>
              <option value="Zoom Out">Zoom Out</option>
              <option value="Handheld">Handheld</option>
              <option value="Handheld (Ronin)">Handheld (Ronin)</option>
              <option value="Steadicam">Steadicam</option>
              <option value="Crane Up">Crane Up</option>
              <option value="Crane Down">Crane Down</option>
              <option value="Jib">Jib</option>
              <option value="Track">Track</option>
              <option value="Arc Left">Arc Left</option>
              <option value="Arc Right">Arc Right</option>
              <option value="360°">360° Rotation</option>
              <option value="Whip Pan">Whip Pan</option>
              <option value="Push In">Push In</option>
              <option value="Pull Out">Pull Out</option>
              <option value="Follow">Follow</option>
              <option value="Lead">Lead</option>
            </select>
          </td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={item.lens ? item.lens.replace('mm', '').trim() : ''}
                onChange={(e) => handleItemChange(item.id, 'lens', e.target.value)}
                className="text-gray-600 w-16 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="50"
              />
              <span className="text-sm text-gray-500">mm</span>
            </div>
          </td>
          <td className="px-4 py-3">
            <textarea
              value={item.description}
              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
              className="text-gray-600 w-52 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all"
              placeholder="Scene description"
              rows="2"
            />
          </td>
          <td className="px-4 py-3">
            <input
              type="text"
              value={item.cast}
              onChange={(e) => handleItemChange(item.id, 'cast', e.target.value)}
              className="text-gray-600 w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder="Cast"
            />
          </td>
          <td className="px-4 py-3" onPaste={(e) => handlePasteImage(e, item.id)}>
            <div className="flex flex-col items-center gap-2">
              {imagePreviews[item.id] ? (
                <div className="relative group">
                  <img
                    src={imagePreviews[item.id]}
                    alt={`Reference for ${item.shotNumber}`}
                    className="w-20 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(imagePreviews[item.id], '_blank')}
                  />
                  <button
                    onClick={() => handleRemoveImage(item.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                id={`image-${item.id}`}
                onChange={(e) => handleImageUpload(item.id, e.target.files[0])}
                className="hidden"
              />
              <label
                htmlFor={`image-${item.id}`}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors"
              >
                {imagePreviews[item.id] ? 'Change' : 'Upload'}
              </label>
            </div>
          </td>
          <td className="px-4 py-3">
            <input
              type="text"
              value={item.props}
              onChange={(e) => handleItemChange(item.id, 'props', e.target.value)}
              className="text-gray-600 w-36 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder="Props"
            />
          </td>
          <td className="px-4 py-3">
            <input
              type="text"
              value={item.costume}
              onChange={(e) => handleItemChange(item.id, 'costume', e.target.value)}
              className="text-gray-600 w-36 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder="Costume"
            />
          </td>
          <td className="px-4 py-3">
            <textarea
              value={item.notes}
              onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)}
              className="text-gray-600 w-36 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none transition-all"
              placeholder="Notes"
              rows="2"
            />
          </td>
        </>
      )}
      <td className="px-4 py-3 whitespace-nowrap text-center">
        <button
          onClick={() => removeTimelineItem(item.id)}
          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}