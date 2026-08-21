import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  RotateCw, 
  Terminal, 
  FolderOpen, 
  Settings, 
  Trash2, 
  Hammer, 
  Download, 
  Activity, 
  Cpu, 
  HardDrive,
  Clock,
  ExternalLink,
  Shield,
  FileCode
} from 'lucide-react';
import { Project, RuntimeType } from '../types';

interface ProjectCardProps {
  project: Project;
  onStart: (id: string) => Promise<void>;
  onStop: (id: string) => Promise<void>;
  onRestart: (id: string) => Promise<void>;
  onBuild: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenLogs: (project: Project) => void;
  onOpenFiles: (project: Project) => void;
  onOpenSettings: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onStart,
  onStop,
  onRestart,
  onBuild,
  onDelete,
  onOpenLogs,
  onOpenFiles,
  onOpenSettings
}) => {
  const [isBusy, setIsBusy] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const getRuntimeBadge = (runtime: RuntimeType) => {
    switch (runtime) {
      case 'python':
        return {
          label: 'Python',
          icon: '🐍',
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        };
      case 'nodejs':
        return {
          label: 'Node.js',
          icon: '🟨',
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        };
      case 'cpp':
        return {
          label: 'C++',
          icon: '⚙️',
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
        };
      case 'polyglot_py_cpp':
        return {
          label: 'Python + C++',
          icon: '🔵',
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
        };
      case 'polyglot_py_js':
        return {
          label: 'Python + JS',
          icon: '🟣',
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300'
        };
      case 'polyglot_all':
        return {
          label: 'Polyglot 3x',
          icon: '🔥',
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        };
      default:
        return {
          label: 'Custom',
          icon: '📦',
          bg: 'bg-slate-500/10 border-slate-500/30 text-slate-300'
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Running':
        return {
          label: 'RUNNING',
          dotBg: 'bg-emerald-400 animate-pulse',
          badgeBg: 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
        };
      case 'Building':
        return {
          label: 'BUILDING',
          dotBg: 'bg-amber-400 animate-spin',
          badgeBg: 'bg-amber-950/50 border-amber-800 text-amber-300'
        };
      case 'Crashed':
        return {
          label: 'CRASHED',
          dotBg: 'bg-rose-500',
          badgeBg: 'bg-rose-950/50 border-rose-800 text-rose-300'
        };
      case 'Error':
        return {
          label: 'ERROR',
          dotBg: 'bg-rose-500',
          badgeBg: 'bg-rose-950/50 border-rose-800 text-rose-300'
        };
      default:
        return {
          label: 'STOPPED',
          dotBg: 'bg-slate-500',
          badgeBg: 'bg-slate-900 border-slate-800 text-slate-400'
        };
    }
  };

  const formatUptime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const handleAction = async (action: () => Promise<void>) => {
    setIsBusy(true);
    try {
      await action();
    } finally {
      setIsBusy(false);
    }
  };

  const runtimeBadge = getRuntimeBadge(project.runtime);
  const statusBadge = getStatusBadge(project.status);
  const isRunning = project.status === 'Running';
  const isBuilding = project.status === 'Building';

  return (
    <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-5 shadow-sm hover:border-zinc-700/90 transition-all flex flex-col justify-between group relative">
      
      {/* Header Info */}
      <div>
        
        <div className="flex items-start justify-between gap-2">
          
          <div className="flex items-center space-x-2.5 min-w-0">
            <span className="text-xl" role="img" aria-label="runtime-icon">
              {runtimeBadge.icon}
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-base truncate tracking-tight group-hover:text-zinc-200 transition-colors">
                {project.name}
              </h3>
              <p className="text-xs text-zinc-400 font-mono truncate">
                {project.entryPoint} {project.port ? `• :${project.port}` : ''}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border shrink-0 ${statusBadge.badgeBg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotBg}`} />
            <span>{statusBadge.label}</span>
          </div>

        </div>

        {/* Runtime & Command Tags */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${runtimeBadge.bg}`}>
            {runtimeBadge.label}
          </span>

          {project.autoRestart && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60" title="Auto-restart enabled">
              Auto-Restart
            </span>
          )}

          {project.stats?.pid && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-950 text-indigo-300 border border-indigo-900/50">
              PID: {project.stats.pid}
            </span>
          )}
        </div>

        {/* Description or command preview */}
        <p className="mt-2.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
          {project.description || `Executable: ${project.runCommand || project.entryPoint}`}
        </p>

        {/* Live Telemetry Panel (When Running) */}
        <div className="mt-4 bg-zinc-950/70 rounded-xl p-3 border border-zinc-800/80 font-mono text-xs text-zinc-300 grid grid-cols-3 gap-2">
          
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase flex items-center">
              <Cpu className="w-3 h-3 mr-1 text-cyan-400" /> CPU
            </span>
            <span className="font-semibold text-zinc-200 mt-0.5">
              {isRunning ? `${project.stats?.cpuPercent || 0.4}%` : '0%'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase flex items-center">
              <HardDrive className="w-3 h-3 mr-1 text-emerald-400" /> RAM
            </span>
            <span className="font-semibold text-zinc-200 mt-0.5">
              {isRunning ? `${project.stats?.memoryMb || 24} MB` : '0 MB'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase flex items-center">
              <Clock className="w-3 h-3 mr-1 text-amber-400" /> Uptime
            </span>
            <span className="font-semibold text-zinc-200 mt-0.5">
              {isRunning ? formatUptime(project.stats?.uptimeSeconds || 0) : '--'}
            </span>
          </div>

        </div>

      </div>

      {/* Footer Controls & Buttons */}
      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-col gap-2">
        
        {/* Primary Action Row: Start / Stop / Restart / Build */}
        <div className="flex items-center space-x-2">
          
          {!isRunning ? (
            <button
              disabled={isBusy || isBuilding}
              onClick={() => handleAction(() => onStart(project.id))}
              className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold py-2 px-3 rounded-xl shadow-sm transition-all active:scale-98 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start</span>
            </button>
          ) : (
            <button
              disabled={isBusy}
              onClick={() => handleAction(() => onStop(project.id))}
              className="flex-1 flex items-center justify-center space-x-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold py-2 px-3 rounded-xl shadow-sm transition-all active:scale-98 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Stop</span>
            </button>
          )}

          <button
            disabled={isBusy || !isRunning}
            onClick={() => handleAction(() => onRestart(project.id))}
            className="flex items-center justify-center p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-xl border border-zinc-700/70 transition-all active:scale-95 cursor-pointer"
            title="Restart process"
          >
            <RotateCw className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />
          </button>

          <button
            disabled={isBusy || isBuilding}
            onClick={() => handleAction(() => onBuild(project.id))}
            className="flex items-center justify-center p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-amber-300 rounded-xl border border-zinc-700/70 transition-all active:scale-95 cursor-pointer"
            title="Trigger build & install dependencies"
          >
            <Hammer className={`w-4 h-4 ${isBuilding ? 'animate-bounce' : ''}`} />
          </button>

          <button
            onClick={() => onOpenLogs(project)}
            className="flex items-center justify-center p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl border border-zinc-700/70 transition-all active:scale-95 cursor-pointer"
            title="Live Logs & Console"
          >
            <Terminal className="w-4 h-4" />
          </button>

          <button
            onClick={() => onOpenFiles(project)}
            className="flex items-center justify-center p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl border border-zinc-700/70 transition-all active:scale-95 cursor-pointer"
            title="File Explorer & Code Editor"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          <button
            onClick={() => onOpenSettings(project)}
            className="flex items-center justify-center p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl border border-zinc-700/70 transition-all active:scale-95 cursor-pointer"
            title="Project Settings & Env Vars"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Delete Button with Safety Check */}
          {!showConfirmDelete ? (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="flex items-center justify-center p-2 bg-zinc-950 hover:bg-rose-950/60 text-zinc-500 hover:text-rose-400 rounded-xl border border-zinc-800/80 transition-all cursor-pointer"
              title="Delete Project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleAction(() => onDelete(project.id))}
                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg transition-all"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-2 py-1 bg-zinc-800 text-zinc-400 text-[10px] rounded-lg"
              >
                ✕
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
