'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Calendar, Camera, Users, Clock, MapPin, 
  TrendingUp, Activity, Zap, ArrowRight,
  CheckCircle, AlertCircle, Film, Palette,
  FileText, Clipboard, Phone, DollarSign,
  Lock, Play, Plus, BarChart3
} from 'lucide-react';
import { getProjectById, FullProject } from '@/lib/project-data';

interface QuickActionItem {
  name: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isLocked: boolean;
  color: string;
}

interface ProgressMetric {
  label: string;
  current: number;
  total: number;
  percentage: number;
  color: string;
}

export default function ProjectDashboard() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const [project, setProject] = useState<FullProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      const projectData = getProjectById(projectId);
      setProject(projectData);
      setLoading(false);
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h2>
          <p className="text-gray-500">The requested project could not be loaded.</p>
        </div>
      </div>
    );
  }

  // Calculate project metrics
  const timelineItems = project.data?.timelineItems || [];
  const shotListItems = project.data?.shotListData?.shotListItems || [];
  
  const totalShots = timelineItems.filter(item => item.type === 'shot').length;
  const totalScenes = new Set(timelineItems.map(item => item.sceneNumber).filter(Boolean)).size;
  const totalDuration = timelineItems.reduce((sum, item) => sum + (item.duration || 0), 0);
  
  const progressMetrics: ProgressMetric[] = [
    {
      label: "Scenes Scheduled",
      current: totalScenes,
      total: Math.max(totalScenes + 5, 15), // Simulated total
      percentage: totalScenes > 0 ? Math.min((totalScenes / Math.max(totalScenes + 5, 15)) * 100, 100) : 0,
      color: "bg-blue-500"
    },
    {
      label: "Shots Planned",
      current: shotListItems.length,
      total: Math.max(shotListItems.length + 20, 50), // Simulated total
      percentage: shotListItems.length > 0 ? Math.min((shotListItems.length / Math.max(shotListItems.length + 20, 50)) * 100, 100) : 0,
      color: "bg-green-500"
    },
    {
      label: "Schedule Progress",
      current: totalShots,
      total: Math.max(totalShots + 10, 25), // Simulated total
      percentage: totalShots > 0 ? Math.min((totalShots / Math.max(totalShots + 10, 25)) * 100, 100) : 0,
      color: "bg-purple-500"
    }
  ];

  // Find upcoming shoot day
  const upcomingShootDay = timelineItems.length > 0 ? {
    date: project.data?.headerInfo?.date || new Date().toISOString().split('T')[0],
    scenes: totalScenes,
    shots: totalShots,
    callTime: project.data?.headerInfo?.callTime || '08:00',
    location: project.data?.headerInfo?.location1 || 'Studio'
  } : null;

  const quickActions: QuickActionItem[] = [
    {
      name: "Go to Schedule",
      description: "Manage shooting schedule",
      href: `/projects/${projectId}/schedule`,
      icon: Calendar,
      isLocked: false,
      color: "from-blue-500 to-blue-600"
    },
    {
      name: "Go to Shot List",
      description: "Plan and organize shots",
      href: `/projects/${projectId}/shotlist`,
      icon: Camera,
      isLocked: false,
      color: "from-green-500 to-green-600"
    },
    {
      name: "Create Call Sheet",
      description: "Generate daily call sheets",
      href: `/projects/${projectId}/callsheets`,
      icon: Clipboard,
      isLocked: true,
      color: "from-purple-500 to-purple-600"
    },
    {
      name: "Breakdown Script",
      description: "Analyze script elements",
      href: `/projects/${projectId}/breakdown`,
      icon: FileText,
      isLocked: true,
      color: "from-orange-500 to-orange-600"
    }
  ];

  const recentActivity = [
    {
      id: 1,
      action: "Updated shooting schedule",
      time: "2 hours ago",
      user: "You",
      icon: Calendar,
      color: "text-blue-600"
    },
    {
      id: 2,
      action: "Added 5 new shots to shot list",
      time: "1 day ago", 
      user: "You",
      icon: Camera,
      color: "text-green-600"
    },
    {
      id: 3,
      action: "Created project",
      time: new Date(project.createdAt).toLocaleDateString(),
      user: "You",
      icon: Plus,
      color: "text-gray-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Page Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-500 mt-1">Project Dashboard • Overview & Quick Actions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Active Project
            </div>
          </div>
        </div>
      </header>

      <div className="p-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Scenes</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalScenes}</p>
                <p className="text-sm text-green-600 mt-1">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  Ready to shoot
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Film className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Shots</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{shotListItems.length}</p>
                <p className="text-sm text-blue-600 mt-1">
                  <Camera className="w-4 h-4 inline mr-1" />
                  In shot list
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Camera className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Est. Duration</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
                </p>
                <p className="text-sm text-purple-600 mt-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Shooting time
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Last Updated</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {new Date(project.updatedAt).toLocaleDateString('en-US', { day: 'numeric' })}
                </p>
                <p className="text-sm text-amber-600 mt-1">
                  <Activity className="w-4 h-4 inline mr-1" />
                  {new Date(project.updatedAt).toLocaleDateString('en-US', { month: 'short' })}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Shoot Day Widget */}
            {upcomingShootDay ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-indigo-600" />
                    Upcoming Shoot Day
                  </h2>
                  <Link 
                    href={`/projects/${projectId}/schedule`}
                    className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
                  >
                    View Schedule <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Shoot Date</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {new Date(upcomingShootDay.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Call Time</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{upcomingShootDay.callTime}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Location</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {upcomingShootDay.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/50">
                    <span className="text-sm text-gray-600">
                      {upcomingShootDay.scenes} scenes • {upcomingShootDay.shots} shots planned
                    </span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium text-green-600">Ready to shoot</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                  Upcoming Shoot Day
                </h2>
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No shooting schedule created yet</p>
                  <Link 
                    href={`/projects/${projectId}/schedule`}
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Schedule
                  </Link>
                </div>
              </div>
            )}

            {/* Project Progress Widget */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
                <BarChart3 className="w-6 h-6 text-purple-600" />
                Project Progress
              </h2>
              <div className="space-y-6">
                {progressMetrics.map((metric, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                      <span className="text-sm text-gray-500">
                        {metric.current}/{metric.total} ({Math.round(metric.percentage)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${metric.color}`}
                        style={{ width: `${metric.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Quick Actions Widget */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
                <Zap className="w-6 h-6 text-amber-500" />
                Quick Actions
              </h2>
              <div className="space-y-3">
                {quickActions.map((action, index) => (
                  <div key={index}>
                    {action.isLocked ? (
                      <div className="flex items-center p-4 rounded-xl border border-gray-200 opacity-50 cursor-not-allowed">
                        <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center mr-4`}>
                          <action.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-500">{action.name}</h3>
                          <p className="text-sm text-gray-400">{action.description}</p>
                        </div>
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                    ) : (
                      <Link href={action.href}>
                        <div className="flex items-center p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group">
                          <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform`}>
                            <action.icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {action.name}
                            </h3>
                            <p className="text-sm text-gray-500">{action.description}</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity Widget */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
                <Activity className="w-6 h-6 text-green-500" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <activity.icon className={`w-4 h-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.user} • {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Info Widget */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Project Details</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Created</p>
                  <p className="text-gray-900 font-medium">
                    {new Date(project.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Updated</p>
                  <p className="text-gray-900 font-medium">
                    {new Date(project.updatedAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {project.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <p className="text-gray-900">{project.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}