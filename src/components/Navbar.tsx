import React from 'react';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Bot, 
  PlusCircle, 
  Terminal, 
  Layers, 
  Activity,
  Zap,
  Sparkles
} from 'lucide-react';
import { SystemStats } from '../types';

interface NavbarProps {
  activeTab: 'projects' | 'deploy' | 'telegram' | 'metrics' | 'templates';
  setActiveTab: (tab: 'projects' | 'deploy' | 'telegram' | 'metrics' | 'templates') => void;
  systemStats: SystemStats | null;
  isConnected: boolean;
  onOpenDeploy: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  systemStats,
  isConnected,
  onOpenDeploy
}) => {
  return (
    <header className="bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('projects')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Server className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  HOSTING PRO
                </span>
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  v25.0 Enterprise
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono hidden sm:block">
                Multi-Runtime Engine: Python • Node.js • C++ • Polyglot
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-zinc-950/60 p-1.5 rounded-xl border border-zinc-800/80">
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'projects'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/80'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Projects & Bots</span>
              {systemStats && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-900 text-zinc-300 border border-zinc-700/50">
                  {systemStats.totalProjects}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('deploy')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'deploy'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/80'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Deploy Project</span>
            </button>

            <button
              onClick={() => setActiveTab('telegram')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'telegram'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/80'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Telegram Bot Hub</span>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'templates'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/80'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Starter Blueprints</span>
            </button>

            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'metrics'
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/80'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Resource Monitor</span>
            </button>
          </nav>

          {/* Right Status & Action Controls */}
          <div className="flex items-center space-x-3">
            {/* Live Telemetry Pill */}
            {systemStats && (
              <div className="hidden lg:flex items-center space-x-3 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs text-zinc-300 font-mono">
                <div className="flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>CPU: {systemStats.cpuPercent}%</span>
                </div>
                <div className="w-px h-3 bg-zinc-800" />
                <div className="flex items-center space-x-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>RAM: {systemStats.usedMemoryMb} MB</span>
                </div>
              </div>
            )}

            {/* Live SSE Status Dot */}
            <div 
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                isConnected 
                  ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300' 
                  : 'bg-amber-950/40 border-amber-800/50 text-amber-300'
              }`}
              title={isConnected ? "Real-time sync active" : "Reconnecting telemetry..."}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="hidden sm:inline">{isConnected ? 'LIVE SYNC' : 'OFFLINE'}</span>
            </div>

            {/* Quick Deploy CTA Button */}
            <button
              onClick={onOpenDeploy}
              className="flex items-center space-x-2 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold px-3.5 py-2 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Deploy Bot / App</span>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="flex md:hidden border-t border-zinc-800 bg-zinc-950/90 overflow-x-auto px-4 py-2 space-x-1 text-xs">
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            activeTab === 'projects' ? 'bg-zinc-800 text-white font-medium border border-zinc-700' : 'text-zinc-400'
          }`}
        >
          Projects ({systemStats?.totalProjects || 0})
        </button>
        <button
          onClick={() => setActiveTab('deploy')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            activeTab === 'deploy' ? 'bg-zinc-800 text-white font-medium border border-zinc-700' : 'text-zinc-400'
          }`}
        >
          Deploy
        </button>
        <button
          onClick={() => setActiveTab('telegram')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            activeTab === 'telegram' ? 'bg-zinc-800 text-white font-medium border border-zinc-700' : 'text-zinc-400'
          }`}
        >
          Telegram Hub
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            activeTab === 'templates' ? 'bg-zinc-800 text-white font-medium border border-zinc-700' : 'text-zinc-400'
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
            activeTab === 'metrics' ? 'bg-zinc-800 text-white font-medium border border-zinc-700' : 'text-zinc-400'
          }`}
        >
          Metrics
        </button>
      </div>
    </header>
  );
};
