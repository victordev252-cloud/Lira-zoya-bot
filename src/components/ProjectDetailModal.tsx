import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  FolderTree, 
  Key, 
  Settings, 
  Download, 
  Play, 
  Square, 
  RotateCw, 
  Trash2, 
  Save, 
  Plus, 
  Copy, 
  Search, 
  Filter, 
  FileCode, 
  Folder, 
  Eye, 
  EyeOff, 
  Check, 
  Hammer,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Project, ProjectFile } from '../types';

interface ProjectDetailModalProps {
  project: Project;
  initialTab?: 'logs' | 'files' | 'env' | 'settings';
  onClose: () => void;
  onStart: (id: string) => Promise<void>;
  onStop: (id: string) => Promise<void>;
  onRestart: (id: string) => Promise<void>;
  onBuild: (id: string) => Promise<void>;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  initialTab = 'logs',
  onClose,
  onStart,
  onStop,
  onRestart,
  onBuild,
  onUpdateProject
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'files' | 'env' | 'settings'>(initialTab);
  
  // Logs state
  const [logFilter, setLogFilter] = useState<'all' | 'stdout' | 'stderr' | 'build'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [logs, setLogs] = useState<{ stdout: string; stderr: string; buildLog: string }>({
    stdout: '',
    stderr: '',
    buildLog: ''
  });
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Files state
  const [filesList, setFilesList] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>(project.entryPoint);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileSaving, setFileSaving] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileModal, setShowNewFileModal] = useState(false);

  // Env state
  const [envPairs, setEnvPairs] = useState<{ key: string; value: string; show?: boolean }[]>([]);
  const [envSavedMessage, setEnvSavedMessage] = useState(false);

  // Settings form state
  const [entryPoint, setEntryPoint] = useState(project.entryPoint);
  const [buildCommand, setBuildCommand] = useState(project.buildCommand || '');
  const [runCommand, setRunCommand] = useState(project.runCommand || '');
  const [autoRestart, setAutoRestart] = useState(project.autoRestart);
  const [maxRestarts, setMaxRestarts] = useState(project.maxRestarts || 5);
  const [port, setPort] = useState(project.port || '');
  const [copiedLogs, setCopiedLogs] = useState(false);

  // Fetch live logs periodically
  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/logs`);
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setLogs(data);
      }
    } catch {
      // Quietly handle transient polling errors
    }
  };

  // Fetch project files
  const fetchFiles = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}`);
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.files) {
          setFilesList(data.files);
          if (!selectedFile && data.files.length > 0) {
            const firstFile = data.files.find((f: any) => !f.isDir);
            if (firstFile) setSelectedFile(firstFile.path);
          }
        }
      }
    } catch {
      // Quietly handle transient polling errors
    }
  };

  // Fetch specific file content
  const loadFileContent = async (filePath: string) => {
    try {
      const res = await fetch(`/api/projects/${project.id}/file?path=${encodeURIComponent(filePath)}`);
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setFileContent(data.content || '');
      }
    } catch {
      // Quietly handle transient polling errors
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchFiles();

    // Init Env
    const initialEnv = Object.entries(project.env || {}).map(([k, v]) => ({
      key: k,
      value: v,
      show: false
    }));
    setEnvPairs(initialEnv);

    // Live log polling
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [project.id]);

  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollTop = terminalEndRef.current.scrollHeight;
    }
  }, [logs, activeTab, logFilter]);

  const handleSaveFile = async () => {
    if (!selectedFile) return;
    setFileSaving(true);
    try {
      await fetch(`/api/projects/${project.id}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selectedFile, content: fileContent })
      });
      fetchFiles();
    } catch (e) {
      console.error('Error saving file:', e);
    } finally {
      setFileSaving(false);
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    try {
      await fetch(`/api/projects/${project.id}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: newFileName.trim(), content: '' })
      });
      setSelectedFile(newFileName.trim());
      setFileContent('');
      setNewFileName('');
      setShowNewFileModal(false);
      fetchFiles();
    } catch (e) {
      console.error('Error creating file:', e);
    }
  };

  const handleSaveEnv = async () => {
    const envObj: Record<string, string> = {};
    envPairs.forEach((item) => {
      if (item.key.trim()) envObj[item.key.trim()] = item.value;
    });

    await onUpdateProject(project.id, { env: envObj });
    setEnvSavedMessage(true);
    setTimeout(() => setEnvSavedMessage(false), 3000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateProject(project.id, {
      entryPoint,
      buildCommand,
      runCommand,
      autoRestart,
      maxRestarts: Number(maxRestarts),
      port: port ? Number(port) : undefined
    });
    alert('Project settings updated successfully!');
  };

  const handleClearLogs = async () => {
    await fetch(`/api/projects/${project.id}/logs`, { method: 'DELETE' });
    setLogs({ stdout: '', stderr: '', buildLog: '' });
  };

  const handleCopyLogs = () => {
    const combined = `${logs.buildLog ? '--- BUILD LOG ---\n' + logs.buildLog + '\n' : ''}${logs.stdout}\n${logs.stderr}`;
    navigator.clipboard.writeText(combined);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const getFilteredLogs = () => {
    let raw = '';
    if (logFilter === 'stdout') raw = logs.stdout;
    else if (logFilter === 'stderr') raw = logs.stderr;
    else if (logFilter === 'build') raw = logs.buildLog;
    else {
      raw = `${logs.buildLog ? '=== BUILD LOG ===\n' + logs.buildLog + '\n\n' : ''}${logs.stdout}${logs.stderr ? '\n=== ERRORS / STDERR ===\n' + logs.stderr : ''}`;
    }

    if (!logSearch.trim()) return raw;
    const lines = raw.split('\n');
    return lines.filter((l) => l.toLowerCase().includes(logSearch.toLowerCase())).join('\n');
  };

  const isRunning = project.status === 'Running';
  const isBuilding = project.status === 'Building';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-zinc-950/85 backdrop-blur-md overflow-hidden">
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-6xl h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950/70 flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl">
              {project.runtime === 'python' ? '🐍' : (project.runtime === 'nodejs' ? '🟨' : (project.runtime === 'cpp' ? '⚙️' : '🔥'))}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{project.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                  isRunning ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {project.status}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                ID: {project.id} • Entry: {project.entryPoint} {project.port ? `• Port :${project.port}` : ''}
              </p>
            </div>
          </div>

          {/* Quick Process Control Buttons */}
          <div className="flex items-center space-x-2">
            {!isRunning ? (
              <button
                disabled={isBuilding}
                onClick={() => onStart(project.id)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start</span>
              </button>
            ) : (
              <button
                onClick={() => onStop(project.id)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Stop</span>
              </button>
            )}

            <button
              disabled={!isRunning}
              onClick={() => onRestart(project.id)}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-xl border border-zinc-700 transition-all active:scale-95 cursor-pointer"
              title="Restart"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              disabled={isBuilding}
              onClick={() => onBuild(project.id)}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-amber-300 rounded-xl border border-zinc-700 transition-all active:scale-95 cursor-pointer"
              title="Trigger Build Pipeline"
            >
              <Hammer className={`w-4 h-4 ${isBuilding ? 'animate-bounce' : ''}`} />
            </button>

            <a
              href={`/api/projects/${project.id}/download`}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl border border-zinc-700 transition-all active:scale-95 flex items-center cursor-pointer"
              title="Download Project ZIP"
            >
              <Download className="w-4 h-4" />
            </a>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>

        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-6 pt-2 space-x-2">
          {[
            { id: 'logs', label: 'Live Console & Logs', icon: Terminal },
            { id: 'files', label: 'File Explorer & IDE', icon: FolderTree },
            { id: 'env', label: 'Environment (.env)', icon: Key },
            { id: 'settings', label: 'Runtime & Build Config', icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-t border-x cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-zinc-900 border-zinc-800 text-white -mb-px shadow-xs'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Tab View Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-zinc-900">
          
          {/* TAB 1: LOGS & TERMINAL */}
          {activeTab === 'logs' && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-3">
              
              {/* Terminal Control Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                
                {/* Filter Pills */}
                <div className="flex items-center space-x-1">
                  {[
                    { id: 'all', label: 'Combined Stream' },
                    { id: 'stdout', label: 'STDOUT' },
                    { id: 'stderr', label: 'STDERR' },
                    { id: 'build', label: 'Build Pipeline' },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setLogFilter(btn.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                        logFilter === btn.id
                          ? 'bg-zinc-100 text-zinc-900 font-semibold'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Search & Actions */}
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search log stream..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg pl-7 pr-3 py-1 focus:outline-none focus:border-zinc-500 font-mono w-44 sm:w-56"
                    />
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2 top-2 pointer-events-none" />
                  </div>

                  <label className="flex items-center space-x-1.5 text-xs text-zinc-400 cursor-pointer bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="rounded bg-zinc-950 border-zinc-800 text-zinc-100 focus:ring-0"
                    />
                    <span className="font-mono text-[11px]">Auto-Scroll</span>
                  </label>

                  <button
                    onClick={handleCopyLogs}
                    className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 text-xs flex items-center space-x-1 transition-all cursor-pointer"
                    title="Copy Logs"
                  >
                    {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={handleClearLogs}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 text-xs transition-all cursor-pointer"
                    title="Clear Logs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

              {/* Terminal Viewport */}
              <div 
                ref={terminalEndRef}
                className="flex-1 bg-zinc-950 rounded-2xl p-4 font-mono text-xs overflow-y-auto border border-zinc-800/90 leading-relaxed space-y-0.5 shadow-inner"
              >
                {getFilteredLogs() ? (
                  <pre className="text-zinc-300 whitespace-pre-wrap break-all font-mono selection:bg-zinc-700 selection:text-white">
                    {getFilteredLogs()}
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 font-mono text-xs">
                    <Terminal className="w-8 h-8 mb-2 opacity-40" />
                    <span>No logs recorded for this stream. Start the process or trigger a build.</span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: FILE EXPLORER & CODE EDITOR */}
          {activeTab === 'files' && (
            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
              
              {/* File Tree Left Sidebar */}
              <div className="w-full sm:w-64 border-r border-zinc-800 bg-zinc-950/60 p-3 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Project Tree
                  </span>
                  <button
                    onClick={() => setShowNewFileModal(true)}
                    className="p-1 text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 text-xs flex items-center space-x-1 transition-all cursor-pointer"
                    title="New File"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-0.5">
                  {filesList.map((f) => (
                    <button
                      key={f.path}
                      onClick={() => !f.isDir && setSelectedFile(f.path)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center space-x-2 transition-all cursor-pointer ${
                        selectedFile === f.path
                          ? 'bg-zinc-800 text-white font-semibold border border-zinc-700'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                      }`}
                    >
                      {f.isDir ? <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <FileCode className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                      <span className="truncate">{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Editor Right Workspace */}
              <div className="flex-1 flex flex-col bg-zinc-950/30 overflow-hidden">
                
                {/* Editor Header */}
                <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-mono text-xs text-zinc-300">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    <span>{selectedFile || 'Select a file'}</span>
                  </div>
                  <button
                    onClick={handleSaveFile}
                    disabled={fileSaving || !selectedFile}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-900 disabled:opacity-50 text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{fileSaving ? 'Saving...' : 'Save File'}</span>
                  </button>
                </div>

                {/* Text Area Code Editor */}
                <div className="flex-1 p-4 overflow-hidden">
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="w-full h-full bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 font-mono text-xs text-emerald-300 focus:outline-none focus:border-zinc-500 leading-relaxed resize-none selection:bg-zinc-700 selection:text-white"
                    spellCheck={false}
                  />
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: ENVIRONMENT VARIABLES (.ENV) */}
          {activeTab === 'env' && (
            <div className="flex-1 p-6 overflow-y-auto max-w-3xl space-y-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Environment Configuration (.env)</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Secure key-value variables passed directly into runtime subprocess execution.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnvPairs([...envPairs, { key: '', value: '', show: true }])}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center space-x-1 shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Key</span>
                </button>
              </div>

              {envSavedMessage && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>Environment variables updated! Restart the process to apply changes.</span>
                </div>
              )}

              <div className="space-y-3">
                {envPairs.map((pair, idx) => (
                  <div key={idx} className="flex items-center space-x-2 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                    <input
                      type="text"
                      placeholder="KEY_NAME"
                      value={pair.key}
                      onChange={(e) => {
                        const next = [...envPairs];
                        next[idx].key = e.target.value;
                        setEnvPairs(next);
                      }}
                      className="w-1/3 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
                    />
                    <span className="text-zinc-600 text-xs">=</span>
                    <input
                      type={pair.show ? 'text' : 'password'}
                      placeholder="Secret Value"
                      value={pair.value}
                      onChange={(e) => {
                        const next = [...envPairs];
                        next[idx].value = e.target.value;
                        setEnvPairs(next);
                      }}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...envPairs];
                        next[idx].show = !next[idx].show;
                        setEnvPairs(next);
                      }}
                      className="p-2 text-zinc-400 hover:text-white cursor-pointer"
                      title={pair.show ? 'Hide Value' : 'Show Value'}
                    >
                      {pair.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnvPairs(envPairs.filter((_, i) => i !== idx))}
                      className="p-2 text-zinc-500 hover:text-rose-400 cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end">
                <button
                  onClick={handleSaveEnv}
                  className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Save Environment Variables
                </button>
              </div>

            </div>
          )}

          {/* TAB 4: RUNTIME & BUILD CONFIG */}
          {activeTab === 'settings' && (
            <div className="flex-1 p-6 overflow-y-auto max-w-3xl">
              
              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                <div>
                  <h3 className="text-base font-bold text-white">Runtime & Build Configuration</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Customize execution paths, build commands, and memory limits.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Entry File Path
                    </label>
                    <input
                      type="text"
                      value={entryPoint}
                      onChange={(e) => setEntryPoint(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Assigned Port (Optional)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 8080"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Build Pipeline Command
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., pip install -r requirements.txt || g++ -O3 main.cpp -o app"
                    value={buildCommand}
                    onChange={(e) => setBuildCommand(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Process Run Command
                  </label>
                  <input
                    type="text"
                    value={runCommand}
                    onChange={(e) => setRunCommand(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRestart}
                      onChange={(e) => setAutoRestart(e.target.checked)}
                      className="rounded bg-zinc-950 border-zinc-800 text-zinc-100 focus:ring-0"
                    />
                    <span>Auto-Restart Watchdog on abnormal exit</span>
                  </label>

                  <div className="flex items-center space-x-3 text-xs text-zinc-300">
                    <span>Max restart retry limit:</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={maxRestarts}
                      onChange={(e) => setMaxRestarts(Number(e.target.value))}
                      className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Update Runtime Settings
                  </button>
                </div>

              </form>

            </div>
          )}

        </div>

      </div>

      {/* New File Creation Prompt Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <h4 className="text-sm font-bold text-white mb-2">Create New File</h4>
            <input
              type="text"
              placeholder="e.g. utils.py, config.json, native.cpp"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowNewFileModal(false)}
                className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                className="px-4 py-1.5 bg-zinc-100 text-zinc-900 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
