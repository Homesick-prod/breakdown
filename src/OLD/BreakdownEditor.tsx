'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Calendar, Clock, Film, Plus, FolderOpen, Save, Menu, X, ChevronLeft, Users, Cloud, Trash2, Edit3, Copy, FileText, Download, Camera, ChevronRight, Settings, ZoomIn, ZoomOut, Upload, FileDown, Sun, CloudRain, Eye } from 'lucide-react';
// --- END MODIFICATION ---
import { analytics } from '../firebase/config';
// --- Helper Functions ---
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

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
    if (endDate < startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    const diffMillis = endDate.getTime() - startDate.getTime();
    const diffMinutes = Math.round(diffMillis / 60000);
    return diffMinutes >= 0 ? diffMinutes : 0;
  } catch { return 0; }
};



// --- Export/Import Functions ---
const exportProject = (project) => {
  const dataStr = JSON.stringify(project, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const exportFileDefaultName = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  linkElement.remove();
};

const importProject = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const project = JSON.parse(e.target.result);
        project.id = generateId(); // New ID for imported project
        project.updatedAt = new Date().toISOString();
        resolve(project);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
};

// --- PDF Export Function ---
const exportToPDF = (headerInfo, timelineItems, stats, imagePreviews) => {
  // Create print window
  const printWindow = window.open('', '_blank');

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
  };

  // Format time display
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

                /* Header Section */
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

                /* Info Grid */
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

                /* Schedule Table */
                .schedule-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 8pt;
                    margin-bottom: 10px;
                    table-layout: fixed; /* Essential for fixed column widths */
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

                /* Special rows */
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

                /* Cell styles */
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

                /* Hand held notation */
                .handheld {
                    background-color: #66cccc !important;
                    color: white;
                }

                /* Footer */
                .footer {
                    margin-top: 15px;
                    display: flex;
                    justify-content: space-between;
                    font-size: 8pt;
                    color: #666;
                }

                /* Print optimizations */
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
                        <div class="breakdown-title">Breakdown Q${headerInfo.shootingDay || '1'} of 3</div>
                        <div class="project-title">${headerInfo.projectTitle || 'GLORY'}</div>
                        <div class="sub-info">Shooting date : ${formatDate(headerInfo.date)}</div>
                    </div>

                    <div class="right-info">
                        <div class="page-info">Q${headerInfo.shootingDay || '1'}</div>
                        <div class="sub-info">Rise ${headerInfo.sunrise || '5:57'} | Set ${headerInfo.sunset || '18:50'}</div>
                        <div class="sub-info">${headerInfo.weather || 'Considerable cloudiness'}</div>
                        <div class="sub-info">Probability of Precipitation ${headerInfo.precipProb || '73%'}</div>
                        <div class="sub-info">${headerInfo.temp || '34°'} | Real Feel ${headerInfo.realFeel || '37°'}</div>
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
                        <span class="info-value">${headerInfo.warpTime || ''}</span>
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
                        <th rowspan="2" style="width: 60px;">Angle</th>
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
      // Determine break type based on description
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
      // Regular shot row
      const imageHtml = imagePreviews[item.id]
        ? `<img src="${imagePreviews[item.id]}" class="ref-image" alt="Ref">`
        : '';

      // Check if handheld
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
                <div style="font-size: 6pt;">Film Shooting Schedule Beta V.1.1.4 Created by Tawich P.</div>
            </div>
        </body>
        </html>
    `;

  // Write content and print
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load then print
  printWindow.onload = function () {
    printWindow.print();
  };
};

// --- Modern Project Dashboard ---
function ProjectDashboard({ onSelectProject, onCreateProject }) {
  const [projects, setProjects] = useState([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Load projects from localStorage
    const savedProjects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
    setProjects(savedProjects);
  }, []);

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

    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));

    setNewProjectName('');
    setNewProjectDescription('');
    setShowNewProjectModal(false);

    onCreateProject(newProject);
  };

  const handleDeleteProject = (projectId) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

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

    const updatedProjects = [...projects, duplicatedProject];
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
      setProjects(updatedProjects);
      localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
      alert('Project imported successfully!');
    } catch (error) {
      alert('Error importing project. Please check the file format.');
    }

    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50 relative overflow-hidden">
      {/* Subtle texture background */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>

      {/* Modern Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-slate-200 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Film className="w-8 h-8 text-indigo-600 mr-3" />
              <h1 className="text-xl font-bold text-slate-900">Film Shooting Schedule Editor</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Project
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportProject}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Your Projects</h2>
          <p className="text-slate-600">Manage your film shooting schedules in one place</p>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* New Project Card */}
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border-2 border-dashed border-slate-300 p-6 hover:border-indigo-400 hover:shadow-md hover:bg-white/90 transition-all duration-200 group"
          >
            <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
              <Plus className="w-12 h-12 text-slate-400 group-hover:text-indigo-600 mb-3 transition-colors" />
              <span className="text-slate-600 font-medium group-hover:text-indigo-600 transition-colors">Create New Project</span>
            </div>
          </button>

          {/* Project Cards */}
          {projects.map(project => (
            <div key={project.id} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:bg-white/90 transition-all duration-200">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{project.name}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{project.description || 'No description'}</p>
                  </div>
                </div>

                <div className="flex items-center text-xs text-slate-500 mb-4">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>{new Date(project.updatedAt).toLocaleDateString('th-TH')}</span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={() => onSelectProject(project)}
                    className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <FolderOpen className="w-4 h-4 mr-1" />
                    Open
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleExportProject(project)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      title="Export"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicateProject(project)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowNewProjectModal(false)}></div>

            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Create New Project</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Enter project description"
                    rows="3"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableItem({ item, index, imagePreviews, handleItemChange, handleImageUpload, handlePasteImage, removeTimelineItem }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <tr ref={setNodeRef} style={style} className={item.type === 'break' ? 'bg-orange-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
            {/* This is the drag handle. We attach the listeners to it. */}
            <td className="px-2 py-3 whitespace-nowrap text-center align-middle">
                <button {...attributes} {...listeners} className="cursor-grab p-1 text-gray-400 hover:text-gray-700">
                    <GripVertical size={16} />
                </button>
            </td>

            {/* The rest of your table row content remains the same */}
            <td className="px-4 py-3 whitespace-nowrap">
              <div className="flex items-center space-x-2 text-sm">
                <input type="time" value={item.start} onChange={(e) => handleItemChange(item.id, 'start', e.target.value)} className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium" readOnly />
                <span className="text-gray-600">-</span>
                <input type="time" value={item.end} onChange={(e) => handleItemChange(item.id, 'end', e.target.value)} className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium" readOnly />
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center">
                    <input type="number" min="0" value={item.duration} onChange={(e) => handleItemChange(item.id, 'duration', e.target.value)} className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 font-medium" />
                    <span className="ml-1 text-sm text-gray-600">mins</span>
                </div>
            </td>
            {item.type === 'break' ? (
                <td colSpan="15" className="px-4 py-3">
                    <input type="text" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="w-full px-3 py-1 bg-orange-100 border border-orange-200 rounded focus:ring-2 focus:ring-orange-500 font-semibold text-gray-900" placeholder="Break description" />
                </td>
            ) : (
                <>
                    <td className="px-4 py-3 whitespace-nowrap"><input type="text" value={item.sceneNumber} onChange={(e) => handleItemChange(item.id, 'sceneNumber', e.target.value)} className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 font-medium" placeholder="1A" /></td>
                    <td className="px-4 py-3 whitespace-nowrap"><input type="text" value={item.shotNumber} onChange={(e) => handleItemChange(item.id, 'shotNumber', e.target.value)} className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 font-medium" placeholder="001" /></td>
                    <td className="px-4 py-3 whitespace-nowrap"><select value={item.intExt} onChange={(e) => handleItemChange(item.id, 'intExt', e.target.value)} className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"><option value="INT">INT</option><option value="EXT">EXT</option><option value="INT/EXT">INT/EXT</option></select></td>
                    <td className="px-4 py-3 whitespace-nowrap"><select value={item.dayNight} onChange={(e) => handleItemChange(item.id, 'dayNight', e.target.value)} className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"><option value="DAY">DAY</option><option value="NIGHT">NIGHT</option><option value="DAWN">DAWN</option><option value="DUSK">DUSK</option></select></td>
                    <td className="px-4 py-3"><input type="text" value={item.location} onChange={(e) => handleItemChange(item.id, 'location', e.target.value)} className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900" placeholder="Location" /></td>
                    <td className="px-4 py-3 whitespace-nowrap"><select value={item.shotSize} onChange={(e) => handleItemChange(item.id, 'shotSize', e.target.value)} className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"><option value="">Select...</option><option value="ECU">ECU - Extreme Close Up</option><option value="CU">CU - Close Up</option><option value="MCU">MCU - Medium Close Up</option><option value="MS">MS - Medium Shot</option><option value="MLS">MLS - Medium Long Shot</option><option value="LS">LS - Long Shot</option><option value="WS">WS - Wide Shot</option><option value="EWS">EWS - Extreme Wide Shot</option><option value="OTS">OTS - Over the Shoulder</option><option value="POV">POV - Point of View</option><option value="2S">2S - Two Shot</option><option value="3S">3S - Three Shot</option><option value="INS">INS - Insert</option><option value="CUTAWAY">Cutaway</option></select></td>
                    <td className="px-4 py-3"><select value={item.angle} onChange={(e) => handleItemChange(item.id, 'angle', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"><option value="">Select...</option><option value="Eye Level">Eye Level</option><option value="High Angle">High Angle</option><option value="Low Angle">Low Angle</option><option value="Dutch/Canted">Dutch/Canted</option><option value="Bird's Eye">Bird's Eye View</option><option value="Worm's Eye">Worm's Eye View</option><option value="Over Head">Over Head</option><option value="Hip Level">Hip Level</option><option value="Knee Level">Knee Level</option><option value="Ground Level">Ground Level</option><option value="Shoulder Level">Shoulder Level</option><option value="Top 45">Top 45°</option><option value="Profile">Profile (90°)</option><option value="3/4 Front">3/4 Front</option><option value="3/4 Back">3/4 Back</option></select></td>
                    <td className="px-4 py-3"><select value={item.movement} onChange={(e) => handleItemChange(item.id, 'movement', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"><option value="">Select...</option><option value="Still">Still</option><option value="Pan Left">Pan Left</option><option value="Pan Right">Pan Right</option><option value="Tilt Up">Tilt Up</option><option value="Tilt Down">Tilt Down</option><option value="Dolly In">Dolly In</option><option value="Dolly Out">Dolly Out</option><option value="Dolly Left">Dolly Left</option><option value="Dolly Right">Dolly Right</option><option value="Truck Left">Truck Left</option><option value="Truck Right">Truck Right</option><option value="Zoom In">Zoom In</option><option value="Zoom Out">Zoom Out</option><option value="Handheld">Handheld</option><option value="Handheld (Ronin)">Handheld (Ronin)</option><option value="Steadicam">Steadicam</option><option value="Crane Up">Crane Up</option><option value="Crane Down">Crane Down</option><option value="Jib">Jib</option><option value="Track">Track</option><option value="Arc Left">Arc Left</option><option value="Arc Right">Arc Right</option><option value="360°">360° Rotation</option><option value="Whip Pan">Whip Pan</option><option value="Push In">Push In</option><option value="Pull Out">Pull Out</option><option value="Follow">Follow</option><option value="Lead">Lead</option></select></td>
                    <td className="px-4 py-3"><div className="flex items-center"><input type="number" value={item.lens ? item.lens.replace('mm', '').trim() : ''} onChange={(e) => handleItemChange(item.id, 'lens', e.target.value)} className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900" placeholder="50" /><span className="ml-1 text-sm text-gray-600">mm</span></div></td>
                    <td className="px-4 py-3"><textarea value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} className="w-48 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 resize-none" placeholder="Scene description" rows="2" /></td>
                    <td className="px-4 py-3"><input type="text" value={item.cast} onChange={(e) => handleItemChange(item.id, 'cast', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900" placeholder="Cast" /></td>
                    <td className="px-4 py-3" onPaste={(e) => handlePasteImage(e, item.id)}>
                        <div className="flex flex-col items-center space-y-1 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 rounded border-2 border-dashed border-gray-300 p-2 hover:border-indigo-400 transition-colors">
                            {imagePreviews[item.id] ? (<img src={imagePreviews[item.id]} alt={`Reference for ${item.shotNumber}`} className="w-20 h-16 object-cover rounded border border-gray-300 cursor-pointer hover:opacity-90" onClick={() => window.open(imagePreviews[item.id], '_blank')} />) : (<div className="w-20 h-16 bg-gray-100 rounded border border-gray-300 flex items-center justify-center"><Camera className="w-6 h-6 text-gray-400" /></div>)}
                            <input type="file" accept="image/*" id={`image-${item.id}`} onChange={(e) => handleImageUpload(item.id, e.target.files[0])} className="hidden" />
                            <label htmlFor={`image-${item.id}`} className="cursor-pointer text-xs text-indigo-600 hover:text-indigo-700 font-medium">{imagePreviews[item.id] ? 'Change' : 'Upload / Paste'}</label>
                        </div>
                    </td>
                    <td className="px-4 py-3"><input type="text" value={item.props} onChange={(e) => handleItemChange(item.id, 'props', e.target.value)} className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900" placeholder="Props" /></td>
                    <td className="px-4 py-3"><input type="text" value={item.costume} onChange={(e) => handleItemChange(item.id, 'costume', e.target.value)} className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900" placeholder="Costume" /></td>
                    <td className="px-4 py-3"><textarea value={item.notes} onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)} className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 resize-none" placeholder="Notes" rows="2" /></td>
                </>
            )}
            <td className="px-4 py-3 whitespace-nowrap text-center">
                <button onClick={() => removeTimelineItem(item.id)} className="text-red-600 hover:text-red-800 transition-colors">
                    <Trash2 className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
}

// --- Modern Shooting Schedule Editor ---
function ShootingScheduleEditor({ project, onBack, onSave }) {
  const [headerInfo, setHeaderInfo] = useState({
    projectTitle: project?.name || '',
    episodeNumber: '',
    shootingDay: '1',
    totalDays: '3',
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
    pa: '',
    artTime: '',
    lunchTime: '',
    dinnerTime: '',
    precipProb: '',
    temp: '',
    realFeel: ''
  });

  const [timelineItems, setTimelineItems] = useState([]);
  const [imagePreviews, setImagePreviews] = useState({});
  const [showProductionDetails, setShowProductionDetails] = useState(false);
  const [tableZoom, setTableZoom] = useState(100);

  // Load project data
  useEffect(() => {
    if (project?.data) {
      setHeaderInfo(project.data.headerInfo || headerInfo);
      setTimelineItems(project.data.timelineItems || []);
      setImagePreviews(project.data.imagePreviews || {});
    }
  }, [project]);

  // Auto-save functionality
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (project) {
        onSave({
          headerInfo,
          timelineItems,
          imagePreviews
        });
      }
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [headerInfo, timelineItems, imagePreviews, project, onSave]);

  // Helper to recalculate times
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

  // Add Shot
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
    setTimelineItems([...timelineItems, newShot]);
  }, [timelineItems, headerInfo.callTime]);

  // Add Break
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
    setTimelineItems([...timelineItems, newBreak]);
  }, [timelineItems, headerInfo.callTime]);

  // Remove item
  const removeTimelineItem = useCallback((itemId) => {
    if (imagePreviews[itemId]) {
      const newPreviews = { ...imagePreviews };
      delete newPreviews[itemId];
      setImagePreviews(newPreviews);
    }
    const newItems = timelineItems.filter(item => item.id !== itemId);
    recalculateAndUpdateTimes(newItems);
  }, [timelineItems, recalculateAndUpdateTimes, imagePreviews]);

  // Handle item change
  const handleItemChange = useCallback((itemId, field, value) => {
    let requiresRecalculation = false;

    const newItems = timelineItems.map(item => {
      if (item.id === itemId) {
        const newItemData = { ...item };

        if (field === 'duration') {
          const newDuration = parseInt(value, 10) || 0;
          newItemData.duration = newDuration < 0 ? 0 : newDuration;
          newItemData.end = calculateEndTime(item.start, newItemData.duration);
          requiresRecalculation = true;
        } else if (field === 'start') {
          newItemData.start = value;
          newItemData.duration = calculateDuration(value, item.end);
          requiresRecalculation = true;
        } else if (field === 'end') {
          newItemData.end = value;
          newItemData.duration = calculateDuration(item.start, value);
          requiresRecalculation = true;
        } else {
          newItemData[field] = value;
        }

        return newItemData;
      }
      return item;
    });

    if (requiresRecalculation) {
      const itemIndex = newItems.findIndex(item => item.id === itemId);
      if (itemIndex !== -1 && field !== 'start') {
        let lastEndTime = newItems[itemIndex].end;
        for (let i = itemIndex + 1; i < newItems.length; i++) {
          newItems[i].start = lastEndTime;
          newItems[i].end = calculateEndTime(lastEndTime, newItems[i].duration);
          lastEndTime = newItems[i].end;
        }
      }
      setTimelineItems(newItems);
    } else {
      setTimelineItems(newItems);
    }
  }, [timelineItems]);

  // Handle image upload from file picker
  const handleImageUpload = useCallback((itemId, file) => {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviews(prev => ({
        ...prev,
        [itemId]: reader.result
      }));
    };
    reader.readAsDataURL(file); // This works on File and Blob objects
  }, []);

  // Handle pasting image from clipboard
  const handlePasteImage = useCallback((e, itemId) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // --- Primary check for Google Sheets HTML content ---
    const html = clipboardData.getData('text/html');
    if (html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const img = doc.querySelector('img');

      if (img && img.src) {
        e.preventDefault();

        // The src from Google is a URL that needs to be fetched.
        // NOTE: This client-side fetch may fail if the image URL isn't publicly accessible.
        fetch(img.src)
          .then(res => {
            if (!res.ok) throw new Error('Failed to fetch pasted image from URL.');
            return res.blob();
          })
          .then(blob => {
            if (blob.type.startsWith('image/')) {
              handleImageUpload(itemId, blob); // Use existing upload handler with the fetched blob
            } else {
              console.error('Pasted source was not a valid image type.');
            }
          })
          .catch(err => console.error("Error processing pasted image:", err));
        
        return; // Exit after attempting to handle HTML content
      }
    }

    // --- Fallback check for direct image data ---
    const items = clipboardData.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleImageUpload(itemId, file);
            return; // Exit after handling the first direct image
          }
        }
      }
    }
  }, [handleImageUpload]);


  // Calculate statistics
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

  // Zoom controls with more range
  const handleZoomIn = () => setTableZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setTableZoom(prev => Math.max(prev - 10, 25));
  const handleZoomReset = () => setTableZoom(100);

  // Export current project
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
    const {active, over} = event;
    
    if (active.id !== over.id) {
      const oldIndex = timelineItems.findIndex(item => item.id === active.id);
      const newIndex = timelineItems.findIndex(item => item.id === over.id);
      
      const newOrderedItems = arrayMove(timelineItems, oldIndex, newIndex);
      
      // THIS IS THE KEY:
      // After reordering the items in the array, we call the recalculate function.
      recalculateAndUpdateTimes(newOrderedItems);
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpolygon points='50 0 60 40 100 50 60 60 50 100 40 60 0 50 40 40'/%3E%3C/g%3E%3C/svg%3E")`,
      }}></div>

      {/* Modern Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{headerInfo.projectTitle || 'Untitled Project'}</h1>
                <p className="text-sm text-gray-600">Shooting Schedule</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleExportProject}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export
              </button>
              <button
                onClick={() => exportToPDF(headerInfo, timelineItems, stats, imagePreviews)}
                className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </button>
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Auto-saved</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        {/* Main Content */}
        <main className="w-full">
          <div className="p-6">
            {/* Collapsible Production Details */}
            <div className="mb-6">
              <button
                onClick={() => setShowProductionDetails(!showProductionDetails)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 hover:bg-white/90 transition-all"
              >
                <Settings className="w-4 h-4 text-gray-700" />
                <span className="font-medium text-gray-900">Production Details</span>
                <ChevronRight className={`w-4 h-4 text-gray-700 transition-transform ${showProductionDetails ? 'rotate-90' : ''}`} />
              </button>

              {showProductionDetails && (
                <div className="mt-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Project Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">Project Information</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
                        <input
                          type="text"
                          value={headerInfo.projectTitle}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, projectTitle: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Episode #</label>
                          <input
                            type="text"
                            value={headerInfo.episodeNumber}
                            placeholder="Episode No."
                            onChange={(e) => setHeaderInfo({ ...headerInfo, episodeNumber: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Q ... of ...</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={headerInfo.shootingDay}
                              onChange={(e) => setHeaderInfo({ ...headerInfo, shootingDay: e.target.value })}
                              className="w-12 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-center"
                              placeholder="1"
                            />
                            <span className="text-gray-600">of</span>
                            <input
                              type="text"
                              value={headerInfo.totalDays}
                              onChange={(e) => setHeaderInfo({ ...headerInfo, totalDays: e.target.value })}
                              className="w-12 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 text-center"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                        />
                      </div>
                    </div>

                    {/* Time & Location */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">Time & Location</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Call Time</label>
                          <input
                            type="time"
                            value={headerInfo.callTime}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, callTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Wrap up Time</label>
                          <input
                            type="time"
                            value={headerInfo.wrapTime}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, warpTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Sunrise</label>
                          <input
                            type="time"
                            value={headerInfo.sunrise}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, sunrise: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Sunset</label>
                          <input
                            type="time"
                            value={headerInfo.sunset}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, sunset: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location 2</label>
                        <input
                          type="text"
                          value={headerInfo.location2}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, location2: e.target.value })}
                          placeholder="Secondary location (optional)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                        />
                      </div>
                    </div>

                    {/* Weather & Meals */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">Weather & Meals</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Weather Forecast</label>
                        <input
                          type="text"
                          value={headerInfo.weather}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, weather: e.target.value })}
                          placeholder="Considerable cloudiness"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Temp</label>
                          <input
                            type="text"
                            value={headerInfo.temp}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, temp: e.target.value })}
                            placeholder="34°"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Real Feel</label>
                          <input
                            type="text"
                            value={headerInfo.realFeel}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, realFeel: e.target.value })}
                            placeholder="37°"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Precipitation %</label>
                        <input
                          type="text"
                          value={headerInfo.precipProb}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, precipProb: e.target.value })}
                          placeholder="73%"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">First Meal Time</label>
                          <input
                            type="time"
                            value={headerInfo.firstmealTime}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, firstmealTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Second Meal Time</label>
                          <input
                            type="time"
                            value={headerInfo.secondmealTime}
                            onChange={(e) => setHeaderInfo({ ...headerInfo, secondmealTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Key Crew */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">Key Crew</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Producer</label>
                        <input
                          type="text"
                          value={headerInfo.producer}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, producer: e.target.value })}
                          placeholder="Name & Phone"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Director</label>
                        <input
                          type="text"
                          value={headerInfo.director}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, director: e.target.value })}
                          placeholder="Name & Phone"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Production Designer</label>
                        <input
                          type="text"
                          value={headerInfo.pd}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, pa: e.target.value })}
                          placeholder="Name & Phone"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Director of Photography</label>
                        <input
                          type="text"
                          value={headerInfo.dop}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, dop: e.target.value })}
                          placeholder="Name & Phone"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">1st AD</label>
                        <input
                          type="text"
                          value={headerInfo.firstAD}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, firstAD: e.target.value })}
                          placeholder="Name & Phone"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">2nd AD</label>
                        <input
                          type="text"
                          value={headerInfo.secondAD}
                          onChange={(e) => setHeaderInfo({ ...headerInfo, secondAD: e.target.value })}
                          placeholder="Name & Phone"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                        />
                      </div>

                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Duration</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalHours}h {stats.totalMinutes}m</p>
                  </div>
                  <Clock className="w-8 h-8 text-indigo-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Shots</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.shotCount}</p>
                  </div>
                  <Film className="w-8 h-8 text-indigo-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Break Time</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.breakHours}h {stats.breakMinutes}m</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Est. Wrap</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {timelineItems.length > 0 ? timelineItems[timelineItems.length - 1].end : '--:--'}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-green-600 opacity-20" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={addShot}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Shot
              </button>
              <button
                onClick={addBreak}
                className="inline-flex items-center px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Break
              </button>
            </div>

            {/* Schedule Table */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
              <div
                className="overflow-auto"
                style={{
                  transform: `scale(${tableZoom / 100})`,
                  transformOrigin: 'top left',
                  width: `${10000 / tableZoom}%`,
                  maxWidth: `${10000 / tableZoom}%`
                }}
              >
                <table className="divide-y divide-gray-200" style={{ width: 'max-content', minWidth: '100%' }}>
                  <thead className="bg-gray-50 sticky top-0 z-20">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Dur.</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Scene</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Shot</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">INT/EXT</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Size</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Angle</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Movement</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Lens</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Cast</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Blockshot</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Main Props</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Costume</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Remarks</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timelineItems.map((item, index) => (
                      <tr key={item.id} className={item.type === 'break' ? 'bg-orange-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2 text-sm">
                            <input
                              type="time"
                              value={item.start}
                              onChange={(e) => handleItemChange(item.id, 'start', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                            />
                            <span className="text-gray-600">-</span>
                            <input
                              type="time"
                              value={item.end}
                              onChange={(e) => handleItemChange(item.id, 'end', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="0"
                              value={item.duration}
                              onChange={(e) => handleItemChange(item.id, 'duration', e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 font-medium"
                            />
                            <span className="ml-1 text-sm text-gray-600">mins</span>
                          </div>
                        </td>

                        {item.type === 'break' ? (
                          <td colSpan="15" className="px-4 py-3">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              className="w-full px-3 py-1 bg-orange-100 border border-orange-200 rounded focus:ring-2 focus:ring-orange-500 font-semibold text-gray-900"
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
                                className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 font-medium"
                                placeholder="1A"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="text"
                                value={item.shotNumber}
                                onChange={(e) => handleItemChange(item.id, 'shotNumber', e.target.value)}
                                className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 font-medium"
                                placeholder="001"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <select
                                value={item.intExt}
                                onChange={(e) => handleItemChange(item.id, 'intExt', e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
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
                                className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
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
                                className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                                placeholder="Location"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <select
                                value={item.shotSize}
                                onChange={(e) => handleItemChange(item.id, 'shotSize', e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
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
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
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
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
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
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  value={item.lens ? item.lens.replace('mm', '').trim() : ''}
                                  onChange={(e) => handleItemChange(item.id, 'lens', e.target.value)}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                                  placeholder="50"
                                />
                                <span className="ml-1 text-sm text-gray-600">mm</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <textarea
                                value={item.description}
                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                className="w-48 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 resize-none"
                                placeholder="Scene description"
                                rows="2"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.cast}
                                onChange={(e) => handleItemChange(item.id, 'cast', e.target.value)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                                placeholder="Cast"
                              />
                            </td>
                            <td className="px-4 py-3" onPaste={(e) => handlePasteImage(e, item.id)}>
                              <div className="flex flex-col items-center space-y-1 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 rounded border-2 border-dashed border-gray-300 p-2 hover:border-indigo-400 transition-colors">
                                {imagePreviews[item.id] ? (
                                  <img
                                    src={imagePreviews[item.id]}
                                    alt={`Reference for ${item.shotNumber}`}
                                    className="w-20 h-16 object-cover rounded border border-gray-300 cursor-pointer hover:opacity-90"
                                    onClick={() => window.open(imagePreviews[item.id], '_blank')}
                                  />
                                ) : (
                                  <div className="w-20 h-16 bg-gray-100 rounded border border-gray-300 flex items-center justify-center">
                                    <Camera className="w-6 h-6 text-gray-400" />
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
                                  className="cursor-pointer text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                  {imagePreviews[item.id] ? 'Change' : 'Upload / Paste'}
                                </label>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.props}
                                onChange={(e) => handleItemChange(item.id, 'props', e.target.value)}
                                className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                                placeholder="Props"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.costume}
                                onChange={(e) => handleItemChange(item.id, 'costume', e.target.value)}
                                className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                                placeholder="Costume"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <textarea
                                value={item.notes}
                                onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)}
                                className="w-32 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900 resize-none"
                                placeholder="Notes"
                                rows="2"
                              />
                            </td>
                          </>
                        )}

                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <button
                            onClick={() => removeTimelineItem(item.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {timelineItems.length === 0 && (
                  <div className="text-center py-12">
                    <Film className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">No shots added yet</p>
                    <p className="text-sm text-gray-500">Click "Add Shot" to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// --- Main App Component ---
function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedProject, setSelectedProject] = useState(null);

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setCurrentView('editor');
  };

  const handleCreateProject = (project) => {
    setSelectedProject(project);
    setCurrentView('editor');
  };

  const handleSaveProject = (data) => {
    if (!selectedProject) return;

    const projects = JSON.parse(localStorage.getItem('shootingScheduleProjects') || '[]');
    const updatedProjects = projects.map(p => {
      if (p.id === selectedProject.id) {
        return {
          ...p,
          data,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });

    localStorage.setItem('shootingScheduleProjects', JSON.stringify(updatedProjects));
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedProject(null);
  };

  // Add modern font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Apply font to body
    document.body.style.fontFamily = "'Sarabun', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
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