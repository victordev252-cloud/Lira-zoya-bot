import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Play, 
  Square, 
  RotateCw, 
  Download, 
  Key, 
  Lock, 
  ShieldCheck, 
  Terminal, 
  Send, 
  Check, 
  ExternalLink,
  HelpCircle,
  Sparkles,
  MessageSquareCode
} from 'lucide-react';
import { TelegramConfig } from '../types';

export const TelegramManager: React.FC = () => {
  const [config, setConfig] = useState<TelegramConfig>({
    token: '8726402006:AAFIOVkH5FGdVvyJZHorNQOvob3HIkXQ-qQ',
    password: 'ANASMENO1',
    maxBots: 12,
    isRunning: false
  });
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [simMessage, setSimMessage] = useState('');
  const [simLog, setSimLog] = useState<{ sender: 'user' | 'bot'; text: string; time: string }[]>([
    {
      sender: 'bot',
      text: '🔒 HOSTING PRO Enterprise v25.0\nFadlan geli Password-ka si aad u gasho maamulka:',
      time: new Date().toLocaleTimeString()
    }
  ]);
  const [isSimAuthed, setIsSimAuthed] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/telegram/status');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setConfig(data);
      }
    } catch {
      // Quietly continue if backend daemon endpoint is restarting
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleDaemon = async (action: 'start' | 'stop') => {
    setLoading(true);
    try {
      await fetch(`/api/telegram/${action}`, { method: 'POST' });
      fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSimSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMessage.trim()) return;

    const input = simMessage.trim();
    const time = new Date().toLocaleTimeString();
    const newLogs = [...simLog, { sender: 'user' as const, text: input, time }];

    if (!isSimAuthed) {
      if (input === config.password) {
        setIsSimAuthed(true);
        newLogs.push({
          sender: 'bot',
          text: '✅ Password-ka waa sax! Hadda qor /start si aad u bilowdo maamulka.',
          time: new Date().toLocaleTimeString()
        });
      } else {
        newLogs.push({
          sender: 'bot',
          text: '❌ Password-ka aad gelisay waa khaldan yahay. Fadlan isku day mar kale.',
          time: new Date().toLocaleTimeString()
        });
      }
    } else {
      if (input === '/start') {
        newLogs.push({
          sender: 'bot',
          text: '🚀 HOSTING PRO ENTERPRISE v25.0\n-----------------------------------\n📦 Mashruucyadaada: 4/12\n🟢 Online: 3 | 🔴 Offline: 1\n⚡ Taageerada: Python, Node.js, C++, ZIP Archives\n-----------------------------------\n\n🕹 Awaamiirta:\n➕ /newhosting - Soo rar Project cusub (.py, .js, .cpp, .zip)\n📊 /status - Maamul, Kici, Jooji, ama fiiri Logs\nℹ️ /help - Caawimaad',
          time: new Date().toLocaleTimeString()
        });
      } else if (input === '/newhosting') {
        newLogs.push({
          sender: 'bot',
          text: '📤 Soo rar Mashruucaaga!\n\nFadlan hadda soo dir faylkaaga:\n• 🐍 Python (.py)\n• 🟨 Node.js (.js)\n• ⚙️ C++ Source (.cpp)\n• 📦 ZIP Archive (.zip)',
          time: new Date().toLocaleTimeString()
        });
      } else if (input === '/status') {
        newLogs.push({
          sender: 'bot',
          text: '📊 Mashaariicdaada iyo Xaaladooda:\n🟢 🐍 Telegram_Pro_Bot\n🟢 🟨 Node_Express_API\n🟢 ⚙️ Native_Cpp_Engine\n🔴 🔵 Polyglot_Worker',
          time: new Date().toLocaleTimeString()
        });
      } else if (input === '/help') {
        newLogs.push({
          sender: 'bot',
          text: '📖 Hagaha Hosting Pro Enterprise v25.0:\n1. Qor /newhosting\n2. Soo dir fayl (.py, .js, .cpp, .zip)\n3. Nidaamku wuxuu si toos ah u dhisayaa (compile/build) una kicinayaa.\n4. Auto-Recovery 24/7!',
          time: new Date().toLocaleTimeString()
        });
      } else {
        newLogs.push({
          sender: 'bot',
          text: `🤖 Awaamiirta la garanayo: /start, /newhosting, /status, /help`,
          time: new Date().toLocaleTimeString()
        });
      }
    }

    setSimLog(newLogs);
    setSimMessage('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Telegram Bot Controller Daemon
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase ${
                  config.isRunning 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}>
                  {config.isRunning ? '🟢 DAEMON ACTIVE' : '🔴 DAEMON STOPPED'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Control and upload multi-runtime Python, Node.js, and C++ projects directly from your Telegram app with automated compilation, logs, and watchdog recovery.
              </p>
            </div>
          </div>

          {/* Daemon Actions */}
          <div className="flex items-center space-x-2.5 shrink-0">
            {!config.isRunning ? (
              <button
                disabled={loading}
                onClick={() => handleToggleDaemon('start')}
                className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Daemon</span>
              </button>
            ) : (
              <button
                disabled={loading}
                onClick={() => handleToggleDaemon('stop')}
                className="flex items-center space-x-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Daemon</span>
              </button>
            )}

            <a
              href="/api/telegram/script"
              download="hosting_pro_bot.py"
              className="flex items-center space-x-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 transition-all active:scale-95"
              title="Download Standalone Python Script"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Download Script</span>
            </a>
          </div>

        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Configuration Settings */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 space-y-5">
          
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center space-x-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Bot Credentials & Access Control
              </h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
              Encrypted / Secure
            </span>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>Telegram Bot credentials updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Telegram Bot Token (from @BotFather)</span>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300"
                >
                  {showToken ? 'Hide Token' : 'Reveal Token'}
                </button>
              </label>
              <input
                type={showToken ? 'text' : 'password'}
                required
                value={config.token}
                onChange={(e) => setConfig({ ...config, token: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Master Access Password
                </label>
                <input
                  type="text"
                  required
                  value={config.password}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Max Projects Per User
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={config.maxBots}
                  onChange={(e) => setConfig({ ...config, maxBots: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-zinc-500 text-center"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Save Configuration
              </button>
            </div>

          </form>

          {/* Command Cheat Sheet */}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <MessageSquareCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>Supported Telegram Commands</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-indigo-400 font-bold">/start</span>
                <p className="text-zinc-400 text-[10px] mt-0.5">Overview & status summary</p>
              </div>
              <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-indigo-400 font-bold">/newhosting</span>
                <p className="text-zinc-400 text-[10px] mt-0.5">Upload .py, .js, .cpp, .zip</p>
              </div>
              <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-indigo-400 font-bold">/status</span>
                <p className="text-zinc-400 text-[10px] mt-0.5">Manage bots, logs & restart</p>
              </div>
              <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-indigo-400 font-bold">/help</span>
                <p className="text-zinc-400 text-[10px] mt-0.5">Detailed guide & instructions</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Live Telegram Web Simulator */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
          
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Interactive Telegram Bot Simulator
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Live Interactive Sandbox
              </span>
            </div>

            {/* Chat Messages Window */}
            <div className="mt-4 bg-zinc-950 rounded-2xl p-4 h-[300px] overflow-y-auto space-y-3 font-mono text-xs border border-zinc-800/80">
              {simLog.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-zinc-800/90 text-zinc-200 rounded-bl-none border border-zinc-700/60'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-zinc-500 mt-1 px-1">{msg.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSimSend} className="mt-4 flex items-center space-x-2">
            <input
              type="text"
              placeholder={isSimAuthed ? "Type command (/start, /newhosting, /status)..." : `Enter Password (e.g. ${config.password})...`}
              value={simMessage}
              onChange={(e) => setSimMessage(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-zinc-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold rounded-xl flex items-center space-x-1 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>

        </div>

      </div>

    </div>
  );
};
