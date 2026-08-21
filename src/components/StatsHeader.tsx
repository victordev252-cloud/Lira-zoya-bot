import React from 'react';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Activity, 
  ShieldCheck, 
  Layers, 
  Play, 
  Square, 
  Flame,
  CheckCircle2
} from 'lucide-react';
import { SystemStats } from '../types';

interface StatsHeaderProps {
  systemStats: SystemStats | null;
  totalProjects: number;
  runningProjects: number;
  stoppedProjects: number;
  crashedProjects: number;
  onNewDeploy: () => void;
  filterRuntime: string;
  setFilterRuntime: (rt: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const StatsHeader: React.FC<StatsHeaderProps> = ({
  systemStats,
  totalProjects,
  runningProjects,
  stoppedProjects,
  crashedProjects,
  filterRuntime,
  setFilterRuntime,
  searchQuery,
  setSearchQuery
}) => {
  const ramPercent = systemStats
    ? Math.min(100, Math.round((systemStats.usedMemoryMb / systemStats.totalMemoryMb) * 100))
    : 25;

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Hero Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Active Projects Fleet */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Active Processes
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Play className="w-4 h-4 fill-emerald-400/20" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {runningProjects}
            </span>
            <span className="text-sm text-zinc-400 font-mono">
              / {totalProjects} deployed
            </span>
          </div>
          <div className="mt-3 flex items-center space-x-3 text-xs">
            <span className="flex items-center text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              {runningProjects} Online
            </span>
            <span className="flex items-center text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-zinc-600 mr-1.5" />
              {stoppedProjects} Stopped
            </span>
            {crashedProjects > 0 && (
              <span className="flex items-center text-rose-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-400 mr-1.5" />
                {crashedProjects} Alert
              </span>
            )}
          </div>
        </div>

        {/* Card 2: RAM Memory Utilization */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              RAM Memory Guard
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {systemStats ? `${systemStats.usedMemoryMb} MB` : '184 MB'}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              / {systemStats ? `${systemStats.totalMemoryMb} MB` : '1024 MB'}
            </span>
          </div>
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800/60">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  ramPercent > 85 ? 'bg-rose-500' : (ramPercent > 60 ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-400')
                }`}
                style={{ width: `${ramPercent}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-zinc-400 font-mono">
              <span>{ramPercent}% Allocated</span>
              <span className="text-emerald-400">Optimized &lt; 1GB</span>
            </div>
          </div>
        </div>

        {/* Card 3: CPU Load & Execution Threads */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              CPU Utilization
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {systemStats ? `${systemStats.cpuPercent}%` : '2.4%'}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              System Average
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center text-cyan-300">
              <Activity className="w-3.5 h-3.5 mr-1" />
              Native Async Loop
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              Platform: Linux Container
            </span>
          </div>
        </div>

        {/* Card 4: Auto-Recovery & Watchdog 24/7 */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Watchdog 24/7
            </span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-xl font-bold text-emerald-400 tracking-tight flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-1.5" />
              Auto-Recovery
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-400 line-clamp-2">
            Subprocesses continuously monitored with crash recovery & persistent SQLite storage.
          </p>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80">
        
        {/* Runtime Pills Filter */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Runtimes', icon: '⚡' },
            { id: 'python', label: 'Python 🐍', icon: '🐍' },
            { id: 'nodejs', label: 'Node.js 🟨', icon: '🟨' },
            { id: 'cpp', label: 'C++ ⚙️', icon: '⚙️' },
            { id: 'polyglot', label: 'Polyglot 🔥', icon: '🔥' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterRuntime(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                filterRuntime === item.id
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                  : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-zinc-800/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search projects, files, or ports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950/80 border border-zinc-800 text-zinc-200 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 placeholder-zinc-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
            <Layers className="w-3.5 h-3.5" />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-zinc-500 hover:text-zinc-300"
            >
              ✕
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
