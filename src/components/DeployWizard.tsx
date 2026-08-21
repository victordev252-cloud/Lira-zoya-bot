import React, { useState } from 'react';
import { 
  Code, 
  UploadCloud, 
  Sparkles, 
  GitBranch, 
  Terminal, 
  FileCode, 
  Plus, 
  Trash2, 
  Layers, 
  Check, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { RuntimeType } from '../types';
import { STARTER_TEMPLATES } from '../data/templates';

interface DeployWizardProps {
  onClose: () => void;
  onDeployCode: (data: any) => Promise<boolean>;
  onUploadFile: (file: File) => Promise<boolean>;
  onDeployTemplate: (templateId: string) => Promise<boolean>;
}

export const DeployWizard: React.FC<DeployWizardProps> = ({
  onClose,
  onDeployCode,
  onUploadFile,
  onDeployTemplate
}) => {
  const [tab, setTab] = useState<'editor' | 'upload' | 'templates' | 'git'>('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State for Direct Code Editor
  const [projectName, setProjectName] = useState('');
  const [runtime, setRuntime] = useState<RuntimeType>('python');
  const [entryPoint, setEntryPoint] = useState('bot.py');
  const [buildCommand, setBuildCommand] = useState('');
  const [runCommand, setRunCommand] = useState('python -u bot.py');
  const [autoRestart, setAutoRestart] = useState(true);
  const [port, setPort] = useState<number | undefined>(undefined);
  const [envList, setEnvList] = useState<{ key: string; value: string }[]>([
    { key: 'ENVIRONMENT', value: 'production' }
  ]);

  // Code editor file buffer
  const [codeContent, setCodeContent] = useState<string>(`import os
import sys
import time

print("=" * 50)
print("  🚀 HOSTING PRO Enterprise - Python Service")
print("=" * 50)

count = 0
while True:
    count += 1
    print(f"[{time.strftime('%X')}] Worker heartbeat pulse #{count} | Active: 🟢")
    sys.stdout.flush()
    time.sleep(5)
`);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Git state
  const [gitUrl, setGitUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('main');

  // Switch runtime presets
  const handleRuntimeChange = (newRt: RuntimeType) => {
    setRuntime(newRt);
    if (newRt === 'python') {
      setEntryPoint('bot.py');
      setBuildCommand('pip install -r requirements.txt');
      setRunCommand('python -u bot.py');
      setCodeContent(`import os
import sys
import time

print("🚀 Python Worker starting on HOSTING PRO Enterprise...")
while True:
    print(f"[{time.strftime('%X')}] Python loop active 🟢")
    sys.stdout.flush()
    time.sleep(5)
`);
    } else if (newRt === 'nodejs') {
      setEntryPoint('server.js');
      setBuildCommand('npm install');
      setRunCommand('node server.js');
      setPort(8080);
      setCodeContent(`const http = require('http');
const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'online', runtime: 'Node.js', time: new Date().toISOString() }));
});

server.listen(PORT, () => {
  console.log(\`Node.js server listening on port \${PORT} 🚀\`);
});
`);
    } else if (newRt === 'cpp') {
      setEntryPoint('main.cpp');
      setBuildCommand('g++ -O3 -pthread main.cpp -o app');
      setRunCommand('./app');
      setCodeContent(`#include <iostream>
#include <thread>
#include <chrono>

int main() {
    std::cout << "🚀 C++ Native Worker initialized on HOSTING PRO Enterprise" << std::endl;
    int cycle = 0;
    while (true) {
        cycle++;
        std::cout << "[C++ Worker] Cycle #" << cycle << " active 🟢" << std::endl << std::flush;
        std::this_thread::sleep_for(std::chrono::seconds(5));
    }
    return 0;
}
`);
    } else if (newRt === 'polyglot_py_cpp') {
      setEntryPoint('runner.py');
      setBuildCommand('g++ -O3 -shared -fPIC native.cpp -o libnative.so');
      setRunCommand('python -u runner.py');
      setCodeContent(`import ctypes
import os
import time

print("🚀 Polyglot Python + C++ Engine starting...")
# Python orchestrating native C++ logic
while True:
    print(f"[{time.strftime('%X')}] Polyglot engine cycle active 🔵")
    time.sleep(5)
`);
    }
  };

  const handleAddEnv = () => {
    setEnvList([...envList, { key: '', value: '' }]);
  };

  const handleRemoveEnv = (index: number) => {
    setEnvList(envList.filter((_, i) => i !== index));
  };

  const handleEnvChange = (index: number, field: 'key' | 'value', val: string) => {
    const next = [...envList];
    next[index][field] = val;
    setEnvList(next);
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const envMap: Record<string, string> = {};
    envList.forEach((item) => {
      if (item.key.trim()) envMap[item.key.trim()] = item.value;
    });

    const payload = {
      name: projectName.trim() || `App_${runtime.toUpperCase()}`,
      runtime,
      entryPoint,
      buildCommand,
      runCommand,
      autoRestart,
      port,
      env: envMap,
      files: {
        [entryPoint]: codeContent
      }
    };

    try {
      const ok = await onDeployCode(payload);
      if (ok) onClose();
    } catch (err: any) {
      setError(err.message || 'Deployment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file or ZIP archive to upload');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const ok = await onUploadFile(selectedFile);
      if (ok) onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
    setError(null);
    setLoading(true);
    try {
      const ok = await onDeployTemplate(templateId);
      if (ok) onClose();
    } catch (err: any) {
      setError(err.message || 'Template deployment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
      
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <span className="text-indigo-400">⚡</span>
              <span>Deploy New Project / Bot</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Supports Python, Node.js, C++, and Polyglot builds with automatic dependency resolution.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/30 px-6 pt-3 space-x-2 overflow-x-auto">
          {[
            { id: 'editor', label: 'Code Editor', icon: Code },
            { id: 'upload', label: 'Upload ZIP / File', icon: UploadCloud },
            { id: 'templates', label: '1-Click Blueprints', icon: Sparkles },
            { id: 'git', label: 'Git Repository', icon: GitBranch },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-t border-x cursor-pointer ${
                  tab === t.id
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

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {error && (
            <div className="mb-5 p-3.5 bg-rose-950/50 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: CODE EDITOR */}
          {tab === 'editor' && (
            <form onSubmit={handleSubmitCode} className="space-y-5">
              
              {/* Row 1: Name & Runtime */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Project / Bot Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., telegram_pro_bot"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Target Runtime Environment
                  </label>
                  <select
                    value={runtime}
                    onChange={(e) => handleRuntimeChange(e.target.value as RuntimeType)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-medium"
                  >
                    <option value="python">🐍 Python (Single script / pip requirements)</option>
                    <option value="nodejs">🟨 Node.js / JavaScript (npm / Express / Bots)</option>
                    <option value="cpp">⚙️ C++ (g++ -O3 / Makefile / CMake)</option>
                    <option value="polyglot_py_cpp">🔵 Polyglot (Python 🐍 + C++ ⚙️ Native)</option>
                  </select>
                </div>

              </div>

              {/* Row 2: Entrypoint & Commands */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Main Entry File
                  </label>
                  <input
                    type="text"
                    value={entryPoint}
                    onChange={(e) => setEntryPoint(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Build / Install Command
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. pip install -r requirements.txt"
                    value={buildCommand}
                    onChange={(e) => setBuildCommand(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Run / Exec Command
                  </label>
                  <input
                    type="text"
                    value={runCommand}
                    onChange={(e) => setRunCommand(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>

              </div>

              {/* Code Editor Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Source Code ({entryPoint})</span>
                  </label>
                  <span className="text-[11px] text-zinc-500 font-mono">UTF-8 Encoded</span>
                </div>
                <textarea
                  rows={10}
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 font-mono text-xs text-emerald-300 focus:outline-none focus:border-zinc-500 resize-y leading-relaxed"
                  spellCheck={false}
                />
              </div>

              {/* Environment Variables */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-300">
                    Environment Variables (.env)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddEnv}
                    className="text-[11px] text-zinc-300 hover:text-white flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variable</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {envList.map((env, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="KEY (e.g. BOT_TOKEN)"
                        value={env.key}
                        onChange={(e) => handleEnvChange(i, 'key', e.target.value)}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                      <span className="text-zinc-600 text-xs">=</span>
                      <input
                        type="text"
                        placeholder="VALUE"
                        value={env.value}
                        onChange={(e) => handleEnvChange(i, 'value', e.target.value)}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveEnv(i)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggle Options */}
              <div className="flex items-center space-x-3 pt-2">
                <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRestart}
                    onChange={(e) => setAutoRestart(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-800 text-zinc-100 focus:ring-0"
                  />
                  <span>Enable 24/7 Auto-Restart Watchdog on unexpected crash</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 disabled:opacity-50 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
                >
                  {loading ? (
                    <span>Deploying & Building...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Deploy & Launch</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: UPLOAD ZIP / FILE */}
          {tab === 'upload' && (
            <form onSubmit={handleSubmitUpload} className="space-y-6">
              
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
                }}
                className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all flex flex-col items-center justify-center ${
                  dragOver ? 'border-zinc-400 bg-zinc-950/60' : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  {selectedFile ? selectedFile.name : 'Upload your Project or ZIP Archive'}
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mb-4">
                  Supports <code className="text-indigo-300 font-mono">.zip</code> (auto-extracts multi-file projects), <code className="text-indigo-300 font-mono">.py</code>, <code className="text-indigo-300 font-mono">.js</code>, or <code className="text-indigo-300 font-mono">.cpp</code> files up to 50MB.
                </p>

                <input
                  type="file"
                  id="project-file-input"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                  }}
                  className="hidden"
                  accept=".zip,.py,.js,.ts,.cpp,.cxx,.sh"
                />

                <label
                  htmlFor="project-file-input"
                  className="px-5 py-2 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold rounded-xl cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  {selectedFile ? 'Change Selected File' : 'Browse Files on Device'}
                </label>
              </div>

              <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800 text-xs text-zinc-400 space-y-2">
                <div className="font-semibold text-zinc-300 flex items-center space-x-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-400" />
                  <span>Automatic Pipeline Detection:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-400 pl-2">
                  <li>If uploading <strong className="text-zinc-200">.zip</strong>: Automatically unpacks, checks for <code className="text-indigo-300">requirements.txt</code> or <code className="text-indigo-300">package.json</code> or <code className="text-indigo-300">Makefile</code> and builds instantly.</li>
                  <li>If uploading <strong className="text-zinc-200">.py</strong>: Automatically scans imports (telebot, pytgbot, aiohttp) and installs missing pip packages.</li>
                  <li>If uploading <strong className="text-zinc-200">.cpp</strong>: Auto-compiles via <code className="text-indigo-300">g++ -O2 -pthread</code> into native executable binary.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || loading}
                  className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 disabled:opacity-50 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
                >
                  {loading ? 'Uploading & Extracting...' : 'Upload & Deploy'}
                </button>
              </div>

            </form>
          )}

          {/* TAB 3: STARTER BLUEPRINTS */}
          {tab === 'templates' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">
                Choose from pre-configured, tested production blueprints ready for instant 1-click deployment:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STARTER_TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="bg-zinc-950/70 border border-zinc-800/90 hover:border-zinc-600 rounded-2xl p-4 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{tpl.icon}</span>
                          <div>
                            <h4 className="font-semibold text-white text-sm group-hover:text-zinc-200 transition-colors">
                              {tpl.name}
                            </h4>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">
                              {tpl.runtime}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-zinc-900 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-zinc-500">
                        {tpl.entryPoint}
                      </span>
                      <button
                        disabled={loading}
                        onClick={() => handleSelectTemplate(tpl.id)}
                        className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white disabled:opacity-50 text-xs font-semibold rounded-xl border border-zinc-700/80 shadow-xs transition-all active:scale-95 flex items-center space-x-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Deploy Template</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: GIT REPOSITORY */}
          {tab === 'git' && (
            <div className="space-y-5">
              <p className="text-xs text-zinc-400">
                Connect and clone a public or authenticated Git repository directly:
              </p>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Git Repository URL
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/username/my-bot.git"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Auth Token (Optional for Private Repos)
                  </label>
                  <input
                    type="password"
                    placeholder="ghp_..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!gitUrl || loading}
                  onClick={() => {
                    // Pre-fill editor with clone command
                    setTab('editor');
                    setProjectName(gitUrl.split('/').pop()?.replace('.git', '') || 'git-app');
                  }}
                  className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 disabled:opacity-50 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Proceed with Git Deployment
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
