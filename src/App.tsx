import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StatsHeader } from './components/StatsHeader';
import { ProjectCard } from './components/ProjectCard';
import { DeployWizard } from './components/DeployWizard';
import { ProjectDetailModal } from './components/ProjectDetailModal';
import { TelegramManager } from './components/TelegramManager';
import { SystemMonitor } from './components/SystemMonitor';
import { TemplatesGallery } from './components/TemplatesGallery';
import { Project, SystemStats } from './types';
import { STARTER_TEMPLATES } from './data/templates';
import { 
  PlusCircle, 
  Layers, 
  Terminal, 
  Bot, 
  Sparkles, 
  Server, 
  HardDrive,
  Cpu,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'projects' | 'deploy' | 'telegram' | 'metrics' | 'templates'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [filterRuntime, setFilterRuntime] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showDeployWizard, setShowDeployWizard] = useState(false);
  const [inspectingProject, setInspectingProject] = useState<Project | null>(null);
  const [inspectingInitialTab, setInspectingInitialTab] = useState<'logs' | 'files' | 'env' | 'settings'>('logs');

  // Fetch initial project list
  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setProjects(data);

        // If no projects exist, seed the first starter template so user has instant playground
        if (data.length === 0) {
          seedStarterProject();
        }
      }
    } catch (e) {
      console.warn('Projects endpoint initializing or waiting for server:', e);
    }
  };

  // Seed sample starter project
  const seedStarterProject = async () => {
    const defaultTemplate = STARTER_TEMPLATES[0]; // Python Telegram Pro Bot
    try {
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Telegram_Pro_Bot',
          runtime: defaultTemplate.runtime,
          entryPoint: defaultTemplate.entryPoint,
          buildCommand: defaultTemplate.buildCommand,
          runCommand: defaultTemplate.runCommand,
          files: defaultTemplate.files,
          env: defaultTemplate.defaultEnv,
          description: defaultTemplate.description
        })
      });
      if (res.ok) {
        fetchProjects();
      }
    } catch (e) {
      console.warn('Error seeding starter project:', e);
    }
  };

  // Fetch system metrics
  const fetchSystemStats = async () => {
    try {
      const res = await fetch('/api/system/stats');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setSystemStats(data);
      } else {
        // Safe fallback metrics if server is booting up
        setSystemStats((prev) => prev || {
          totalMemoryMb: 4096,
          usedMemoryMb: 512,
          freeMemoryMb: 3584,
          cpuPercent: 0.8,
          nodeVersion: 'v20.x',
          platform: 'Linux x64 (Cloud Run)',
          uptimeSeconds: 300,
          activeProjects: 1,
          totalProjects: 1,
          diskUsedMb: 128
        });
      }
    } catch {
      // Safe fallback metrics on transient network latency
      setSystemStats((prev) => prev || {
        totalMemoryMb: 4096,
        usedMemoryMb: 512,
        freeMemoryMb: 3584,
        cpuPercent: 0.8,
        nodeVersion: 'v20.x',
        platform: 'Linux x64 (Cloud Run)',
        uptimeSeconds: 300,
        activeProjects: 1,
        totalProjects: 1,
        diskUsedMb: 128
      });
    }
  };

  // SSE real-time sync stream
  useEffect(() => {
    fetchProjects();
    fetchSystemStats();

    const eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.addEventListener('telemetry', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.system) setSystemStats(data.system);
        if (data.projects) {
          setProjects((prev) =>
            prev.map((p) => {
              const live = data.projects.find((lp: any) => lp.id === p.id);
              if (live) {
                return {
                  ...p,
                  status: live.status,
                  stats: {
                    ...p.stats,
                    pid: live.pid,
                    cpuPercent: live.cpuPercent,
                    memoryMb: live.memoryMb,
                    uptimeSeconds: live.uptimeSeconds,
                    restarts: live.restarts
                  }
                };
              }
              return p;
            })
          );
        }
      } catch (err) {
        console.error('Error parsing SSE telemetry:', err);
      }
    });

    eventSource.addEventListener('status_change', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setProjects((prev) =>
          prev.map((p) => (p.id === data.projectId ? { ...p, status: data.status, stats: { ...p.stats, pid: data.pid || p.stats?.pid } } : p))
        );
      } catch (err) {
        console.error('Error parsing SSE status change:', err);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    const interval = setInterval(fetchSystemStats, 5000);
    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  // Action handlers
  const handleStartProject = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}/start`, { method: 'POST' });
      fetchProjects();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStopProject = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}/stop`, { method: 'POST' });
      fetchProjects();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestartProject = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}/restart`, { method: 'POST' });
      fetchProjects();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBuildProject = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}/build`, { method: 'POST' });
      fetchProjects();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      fetchProjects();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProject = async (id: string, updates: Partial<Project>) => {
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      fetchProjects();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeployCode = async (data: any): Promise<boolean> => {
    try {
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const result = await res.json();
        fetchProjects();
        if (result.project) {
          // Auto start new project
          handleStartProject(result.project.id);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleUploadFile = async (file: File): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/projects/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const result = await res.json();
        fetchProjects();
        if (result.project) {
          handleStartProject(result.project.id);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDeployTemplate = async (templateId: string): Promise<boolean> => {
    const tpl = STARTER_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return false;

    return handleDeployCode({
      name: tpl.name.replace(/\s+/g, '_'),
      runtime: tpl.runtime,
      entryPoint: tpl.entryPoint,
      buildCommand: tpl.buildCommand,
      runCommand: tpl.runCommand,
      files: tpl.files,
      env: tpl.defaultEnv,
      description: tpl.description
    });
  };

  // Filtered project list
  const filteredProjects = projects.filter((p) => {
    const matchesRuntime =
      filterRuntime === 'all'
        ? true
        : filterRuntime === 'polyglot'
        ? p.runtime.startsWith('polyglot')
        : p.runtime === filterRuntime;

    const matchesSearch =
      searchQuery.trim() === ''
        ? true
        : p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.entryPoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.port && String(p.port).includes(searchQuery));

    return matchesRuntime && matchesSearch;
  });

  const runningCount = projects.filter((p) => p.status === 'Running').length;
  const stoppedCount = projects.filter((p) => p.status === 'Stopped').length;
  const crashedCount = projects.filter((p) => p.status === 'Crashed' || p.status === 'Error').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-700 selection:text-white flex flex-col">
      
      {/* Top Main Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStats={systemStats}
        isConnected={isConnected}
        onOpenDeploy={() => setShowDeployWizard(true)}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* TAB 1: PROJECTS & FLEET */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            
            {/* Header Telemetry Cards & Filter Bar */}
            <StatsHeader
              systemStats={systemStats}
              totalProjects={projects.length}
              runningProjects={runningCount}
              stoppedProjects={stoppedCount}
              crashedProjects={crashedCount}
              onNewDeploy={() => setShowDeployWizard(true)}
              filterRuntime={filterRuntime}
              setFilterRuntime={setFilterRuntime}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />

            {/* Projects Fleet Grid */}
            {filteredProjects.length === 0 ? (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Layers className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">No Projects Found</h3>
                  <p className="text-xs text-zinc-400 max-w-md mt-1">
                    {searchQuery
                      ? `No hosted applications match "${searchQuery}". Try clearing your search filter.`
                      : 'Deploy your first Python Bot, Node.js API, C++ Engine, or Polyglot application to get started.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowDeployWizard(true)}
                  className="px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Deploy Your First Bot / App</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onStart={handleStartProject}
                    onStop={handleStopProject}
                    onRestart={handleRestartProject}
                    onBuild={handleBuildProject}
                    onDelete={handleDeleteProject}
                    onOpenLogs={(p) => {
                      setInspectingProject(p);
                      setInspectingInitialTab('logs');
                    }}
                    onOpenFiles={(p) => {
                      setInspectingProject(p);
                      setInspectingInitialTab('files');
                    }}
                    onOpenSettings={(p) => {
                      setInspectingProject(p);
                      setInspectingInitialTab('settings');
                    }}
                  />
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: DEPLOY WIZARD VIEW */}
        {activeTab === 'deploy' && (
          <DeployWizard
            onClose={() => setActiveTab('projects')}
            onDeployCode={handleDeployCode}
            onUploadFile={handleUploadFile}
            onDeployTemplate={handleDeployTemplate}
          />
        )}

        {/* TAB 3: TELEGRAM BOT CONTROLLER HUB */}
        {activeTab === 'telegram' && <TelegramManager />}

        {/* TAB 4: STARTER BLUEPRINTS */}
        {activeTab === 'templates' && (
          <TemplatesGallery
            onDeployTemplate={async (tplId) => {
              const ok = await handleDeployTemplate(tplId);
              if (ok) setActiveTab('projects');
              return ok;
            }}
          />
        )}

        {/* TAB 5: RESOURCE METRICS & FLEET PROCESS MONITOR */}
        {activeTab === 'metrics' && (
          <SystemMonitor
            systemStats={systemStats}
            projects={projects}
            onStopProject={handleStopProject}
            onStartProject={handleStartProject}
          />
        )}

      </main>

      {/* Floating Deploy Modal if opened from CTA */}
      {showDeployWizard && (
        <DeployWizard
          onClose={() => setShowDeployWizard(false)}
          onDeployCode={handleDeployCode}
          onUploadFile={handleUploadFile}
          onDeployTemplate={handleDeployTemplate}
        />
      )}

      {/* Project Inspector & Live Console Modal */}
      {inspectingProject && (
        <ProjectDetailModal
          project={inspectingProject}
          initialTab={inspectingInitialTab}
          onClose={() => setInspectingProject(null)}
          onStart={handleStartProject}
          onStop={handleStopProject}
          onRestart={handleRestartProject}
          onBuild={handleBuildProject}
          onUpdateProject={handleUpdateProject}
        />
      )}

      {/* Modern Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 font-mono gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>HOSTING PRO Enterprise v25.0 Engine Online</span>
          </div>
          <div>
            <span>Runtimes: 🐍 Python • 🟨 Node.js • ⚙️ C++ • 📦 ZIP • 🤖 Telegram Bot</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
