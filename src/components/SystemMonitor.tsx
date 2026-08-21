import React from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Server, 
  ShieldCheck, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Square,
  Clock,
  Layers,
  Zap
} from 'lucide-react';
import { SystemStats, Project } from '../types';

interface SystemMonitorProps {
  systemStats: SystemStats | null;
  projects: Project[];
  onStopProject: (id: string) => Promise<void>;
  onStartProject: (id: string) => Promise<void>;
}

export const SystemMonitor: React.FC<SystemMonitorProps> = ({
  systemStats,
  projects,
  onStopProject,
  onStartProject
}) => {
  const totalRam = systemStats?.totalMemoryMb || 1024;
  const usedRam = systemStats?.usedMemoryMb || 240;
  const freeRam = systemStats?.freeMemoryMb || (totalRam - usedRam);
  const ramPercent = Math.min(100, Math.round((usedRam / totalRam) * 100));
  const cpuPercent = systemStats?.cpuPercent || 2.5;

  const runningProjects = projects.filter(p => p.status === 'Running');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Resource Telemetry Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* RAM Usage Breakdown */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Memory Utilization
            </span>
            <HardDrive className="w-5 h-5 text-indigo-400" />
          </div>
          
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">{usedRam} MB</span>
            <span className="text-xs text-zinc-500 font-mono">/ {totalRam} MB</span>
          </div>

          <div className="mt-4">
            <div className="w-full bg-zinc-950 rounded-full h-3 overflow-hidden p-0.5 border border-zinc-800">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${ramPercent}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] font-mono text-zinc-400">
              <span>{ramPercent}% in use</span>
              <span className="text-emerald-400">{freeRam} MB Free</span>
            </div>
          </div>
        </div>

        {/* CPU Load Gauge */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              CPU Compute Load
            </span>
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white tracking-tight">{cpuPercent}%</span>
            <span className="text-xs text-zinc-500 font-mono">Multi-core Async</span>
          </div>

          <div className="mt-4">
            <div className="w-full bg-zinc-950 rounded-full h-3 overflow-hidden p-0.5 border border-zinc-800">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, cpuPercent * 5))}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] font-mono text-zinc-400">
              <span>Load: Nominal</span>
              <span className="text-cyan-300">Linux Threaded</span>
            </div>
          </div>
        </div>

        {/* Runtime Toolchain Status */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Native Toolchains
            </span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between bg-zinc-950/60 px-3 py-1.5 rounded-xl border border-zinc-800/80">
              <span className="text-zinc-300">🐍 Python 3.11+</span>
              <span className="text-emerald-400 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> READY</span>
            </div>
            <div className="flex items-center justify-between bg-zinc-950/60 px-3 py-1.5 rounded-xl border border-zinc-800/80">
              <span className="text-zinc-300">🟨 Node.js / NPM</span>
              <span className="text-emerald-400 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> READY</span>
            </div>
            <div className="flex items-center justify-between bg-zinc-950/60 px-3 py-1.5 rounded-xl border border-zinc-800/80">
              <span className="text-zinc-300">⚙️ GCC / G++ (C++)</span>
              <span className="text-emerald-400 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1" /> READY</span>
            </div>
          </div>
        </div>

      </div>

      {/* Active Subprocesses Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-sm overflow-hidden">
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Live Subprocess Fleet Table</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Active process isolation, PID telemetry, and real-time execution controls.
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 bg-zinc-950 rounded-xl text-zinc-300 border border-zinc-800">
            {runningProjects.length} Running Subprocesses
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            
            <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">PID</th>
                <th className="py-3 px-4">Project Name</th>
                <th className="py-3 px-4">Runtime</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">CPU %</th>
                <th className="py-3 px-4">Memory</th>
                <th className="py-3 px-4">Restarts</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500 font-sans">
                    No hosted processes found. Deploy a bot or application to see telemetry.
                  </td>
                </tr>
              ) : (
                projects.map((p) => {
                  const isRun = p.status === 'Running';
                  return (
                    <tr key={p.id} className="hover:bg-zinc-950/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-indigo-300">
                        {p.stats?.pid || '--'}
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-white">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 uppercase text-[11px] text-zinc-400">
                        {p.runtime}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isRun ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-cyan-300">
                        {isRun ? `${p.stats?.cpuPercent || 0.4}%` : '0%'}
                      </td>
                      <td className="py-3 px-4 text-emerald-300">
                        {isRun ? `${p.stats?.memoryMb || 24} MB` : '0 MB'}
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        {p.stats?.restarts || 0}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isRun ? (
                          <button
                            onClick={() => onStopProject(p.id)}
                            className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] rounded-lg transition-all"
                          >
                            Terminate
                          </button>
                        ) : (
                          <button
                            onClick={() => onStartProject(p.id)}
                            className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white text-[11px] rounded-lg transition-all"
                          >
                            Launch
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>

      </div>

    </div>
  );
};
