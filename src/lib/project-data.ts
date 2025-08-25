/**
 * Project Data Abstraction Layer
 * 
 * This service provides a clean interface for all localStorage operations,
 * decoupling components from direct storage access for better maintainability
 * and future scalability.
 */

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  lastModified?: string; // For backwards compatibility
}

export interface ProjectData {
  scheduleData?: any;
  shotListData?: any;
  headerInfo?: any;
  timelineItems?: any[];
  imagePreviews?: Record<string, string>;
  // Future modules can be added here
  scriptBreakdownData?: any;
  storyboardData?: any;
  callSheetsData?: any;
  contactsData?: any;
  continuityData?: any;
  budgetData?: any;
  calendarData?: any;
}

export interface FullProject extends ProjectSummary {
  data: ProjectData;
}

const PROJECTS_KEY = 'shootingScheduleProjects';

/**
 * Get all projects as summary objects (for project hub display)
 */
export function getAllProjects(): ProjectSummary[] {
  try {
    const projects = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    // Sort by most recently updated
    return projects.sort((a: ProjectSummary, b: ProjectSummary) => 
      new Date(b.updatedAt || b.lastModified || b.createdAt).getTime() - 
      new Date(a.updatedAt || a.lastModified || a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Failed to load projects:', error);
    return [];
  }
}

/**
 * Get complete project data by ID
 */
export function getProjectById(projectId: string): FullProject | null {
  try {
    const projects = getAllProjects();
    return projects.find(p => p.id === projectId) as FullProject || null;
  } catch (error) {
    console.error('Failed to load project:', error);
    return null;
  }
}

/**
 * Create a new project
 */
export function createNewProject(title: string, description: string = ''): FullProject {
  const newProject: FullProject = {
    id: generateId(),
    name: title,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: {
      scheduleData: null,
      shotListData: null,
    }
  };

  const projects = getAllProjects();
  const updatedProjects = [newProject, ...projects];
  
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));
  
  return newProject;
}

/**
 * Update project metadata (name, description)
 */
export function updateProjectMetadata(
  projectId: string, 
  updates: Partial<Pick<ProjectSummary, 'name' | 'description'>>
): boolean {
  try {
    const projects = getAllProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) return false;
    
    projects[projectIndex] = {
      ...projects[projectIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    return true;
  } catch (error) {
    console.error('Failed to update project metadata:', error);
    return false;
  }
}

/**
 * Update shooting schedule data for a project
 */
export function updateShootingSchedule(
  projectId: string, 
  scheduleData: any
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const projects = getAllProjects();
      const projectIndex = projects.findIndex(p => p.id === projectId);
      
      if (projectIndex === -1) {
        resolve(false);
        return;
      }
      
      const project = projects[projectIndex] as FullProject;
      project.data = {
        ...project.data,
        ...scheduleData // This includes headerInfo, timelineItems, imagePreviews
      };
      project.updatedAt = new Date().toISOString();
      
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
      resolve(true);
    } catch (error) {
      console.error('Failed to update shooting schedule:', error);
      resolve(false);
    }
  });
}

/**
 * Update shot list data for a project
 */
export function updateShotList(
  projectId: string, 
  shotListData: any
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const projects = getAllProjects();
      const projectIndex = projects.findIndex(p => p.id === projectId);
      
      if (projectIndex === -1) {
        resolve(false);
        return;
      }
      
      const project = projects[projectIndex] as FullProject;
      project.data = {
        ...project.data,
        shotListData
      };
      project.updatedAt = new Date().toISOString();
      
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
      resolve(true);
    } catch (error) {
      console.error('Failed to update shot list:', error);
      resolve(false);
    }
  });
}

/**
 * Delete a project completely
 */
export function deleteProject(projectId: string): boolean {
  try {
    const projects = getAllProjects();
    const filteredProjects = projects.filter(p => p.id !== projectId);
    
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(filteredProjects));
    return true;
  } catch (error) {
    console.error('Failed to delete project:', error);
    return false;
  }
}

/**
 * Duplicate an existing project
 */
export function duplicateProject(sourceProjectId: string): FullProject | null {
  try {
    const sourceProject = getProjectById(sourceProjectId);
    if (!sourceProject) return null;
    
    const duplicatedProject: FullProject = {
      ...sourceProject,
      id: generateId(),
      name: `${sourceProject.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const projects = getAllProjects();
    const updatedProjects = [duplicatedProject, ...projects];
    
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));
    
    return duplicatedProject;
  } catch (error) {
    console.error('Failed to duplicate project:', error);
    return null;
  }
}

/**
 * Check if a project exists
 */
export function projectExists(projectId: string): boolean {
  return getProjectById(projectId) !== null;
}

/**
 * Get project statistics
 */
export function getProjectStats() {
  const projects = getAllProjects();
  
  const totalProjects = projects.length;
  const projectsWithSchedules = projects.filter(p => 
    (p as FullProject).data?.timelineItems?.length > 0
  ).length;
  const projectsWithShotLists = projects.filter(p => 
    (p as FullProject).data?.shotListData?.shotListItems?.length > 0
  ).length;
  
  return {
    totalProjects,
    projectsWithSchedules,
    projectsWithShotLists,
    recentlyUpdated: projects.slice(0, 5) // Most recent 5 projects
  };
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Export utilities for backward compatibility
 */
export { generateId };