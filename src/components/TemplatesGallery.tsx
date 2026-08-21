import React, { useState } from 'react';
import { 
  Sparkles, 
  Play, 
  Code, 
  Terminal, 
  Check, 
  HardDrive, 
  Cpu, 
  ArrowRight,
  FileCode,
  Layers
} from 'lucide-react';
import { STARTER_TEMPLATES } from '../data/templates';
import { StarterTemplate } from '../types';

interface TemplatesGalleryProps {
  onDeployTemplate: (templateId: string) => Promise<boolean>;
}

export const TemplatesGallery: React.FC<TemplatesGalleryProps> = ({ onDeployTemplate }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<StarterTemplate>(STARTER_TEMPLATES[0]);
  const [deploying, setDeploying] = useState(false);
  const [deployedId, setDeployedId] = useState<string | null>(null);

  const handleDeploy = async (templateId: string) => {
    setDeploying(true);
    try {
      const ok = await onDeployTemplate(templateId);
      if (ok) {
        setDeployedId(templateId);
        setTimeout(() => setDeployedId(null), 3000);
      }
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Curated Multi-Runtime Blueprints
            </h2>
            <p className="text-xs text-zinc-400">
              Instant 1-click deploy production configurations for Python, Node.js, C++, and Polyglot architectures.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Templates Selection Grid */}
        <div className="lg:col-span-5 space-y-3">
          {STARTER_TEMPLATES.map((tpl) => {
            const isSelected = selectedTemplate.id === tpl.id;
            return (
              <div
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-900 border-zinc-500 shadow-sm'
                    : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{tpl.icon}</span>
                    <div>
                      <h3 className="text-sm font-bold text-white">{tpl.name}</h3>
                      <span className="text-[10px] font-mono text-indigo-400 uppercase">
                        {tpl.runtime}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-zinc-300 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                  {tpl.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Selected Template Deep-Dive Preview */}
        <div className="lg:col-span-7 bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between space-y-5">
          
          <div>
            
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{selectedTemplate.icon}</span>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedTemplate.name}</h3>
                  <span className="text-xs font-mono text-zinc-400">
                    Entry: <code className="text-indigo-300">{selectedTemplate.entryPoint}</code>
                  </span>
                </div>
              </div>

              <button
                disabled={deploying}
                onClick={() => handleDeploy(selectedTemplate.id)}
                className="px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-900 disabled:opacity-50 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center space-x-2 cursor-pointer"
              >
                {deployedId === selectedTemplate.id ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Deployed & Running!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>{deploying ? 'Deploying...' : 'Deploy Blueprint Now'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Architecture Details */}
            <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 uppercase">Build Pipeline</span>
                <p className="text-zinc-200 mt-1 font-semibold truncate">
                  {selectedTemplate.buildCommand || 'None required (interpreted)'}
                </p>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80">
                <span className="text-[10px] text-zinc-500 uppercase">Execution Command</span>
                <p className="text-emerald-300 mt-1 font-semibold truncate">
                  {selectedTemplate.runCommand}
                </p>
              </div>
            </div>

            {/* Included Files Code Snippet */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5 font-mono text-xs text-zinc-400">
                <span className="flex items-center space-x-1.5">
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Main Code Preview ({selectedTemplate.entryPoint})</span>
                </span>
                <span className="text-[10px] text-zinc-500">Auto-configured</span>
              </div>

              <div className="bg-zinc-950 rounded-2xl p-4 font-mono text-xs text-zinc-300 overflow-x-auto max-h-[300px] border border-zinc-800/80 leading-relaxed">
                <pre className="whitespace-pre-wrap font-mono">
                  {selectedTemplate.files[selectedTemplate.entryPoint] || Object.values(selectedTemplate.files)[0]}
                </pre>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
