import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { spawn, exec, ChildProcess } from "child_process";
import multer from "multer";
import AdmZip from "adm-zip";
import { createServer as createViteServer } from "vite";

interface ManagedProcess {
  id: string;
  process: ChildProcess | null;
  pid: number | null;
  status: "Running" | "Stopped" | "Building" | "Crashed" | "Error";
  startTime: number | null;
  restarts: number;
  lastRestartTime: number;
  cpuPercent: number;
  memoryMb: number;
  stdoutBuffer: string[];
  stderrBuffer: string[];
  buildLogBuffer: string[];
}

interface ProjectRecord {
  id: string;
  name: string;
  runtime: "python" | "nodejs" | "cpp" | "polyglot_py_cpp" | "polyglot_py_js" | "polyglot_all";
  entryPoint: string;
  buildCommand?: string;
  runCommand?: string;
  status: "Running" | "Stopped" | "Building" | "Crashed" | "Error";
  autoRestart: boolean;
  maxRestarts: number;
  memoryLimitMb: number;
  port?: number;
  env: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  description?: string;
  gitRepo?: string;
  filesCount?: number;
  sizeKb?: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_DIR = path.join(DATA_DIR, "hosted");
const DB_FILE = path.join(DATA_DIR, "projects.json");
const TG_CONFIG_FILE = path.join(DATA_DIR, "telegram_config.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });

// Multer upload setup
const upload = multer({
  dest: path.join(DATA_DIR, "temp_uploads"),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const processes = new Map<string, ManagedProcess>();
let telegramProcess: ChildProcess | null = null;
let telegramPid: number | null = null;

// Initial Telegram config
let telegramConfig = {
  token: process.env.TELEGRAM_BOT_TOKEN || "8726402006:AAFIOVkH5FGdVvyJZHorNQOvob3HIkXQ-qQ",
  password: process.env.ACCESS_PASSWORD || "ANASMENO1",
  maxBots: 12,
  isRunning: false,
  lastActive: new Date().toISOString()
};

if (fs.existsSync(TG_CONFIG_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(TG_CONFIG_FILE, "utf-8"));
    telegramConfig = { ...telegramConfig, ...saved };
  } catch (e) {
    console.error("Error reading telegram config:", e);
  }
}

function saveTelegramConfig() {
  fs.writeFileSync(TG_CONFIG_FILE, JSON.stringify(telegramConfig, null, 2));
}

function loadProjects(): ProjectRecord[] {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveProjects(projects: ProjectRecord[]) {
  fs.writeFileSync(DB_FILE, JSON.stringify(projects, null, 2));
}

function getProject(id: string): ProjectRecord | undefined {
  const all = loadProjects();
  return all.find((p) => p.id === id);
}

function updateProjectRecord(id: string, updates: Partial<ProjectRecord>): ProjectRecord | null {
  const all = loadProjects();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
  saveProjects(all);
  return all[idx];
}

function getOrCreateProcessState(id: string): ManagedProcess {
  if (!processes.has(id)) {
    processes.set(id, {
      id,
      process: null,
      pid: null,
      status: "Stopped",
      startTime: null,
      restarts: 0,
      lastRestartTime: 0,
      cpuPercent: 0,
      memoryMb: 0,
      stdoutBuffer: [],
      stderrBuffer: [],
      buildLogBuffer: []
    });
  }
  return processes.get(id)!;
}

// Append log helper
function appendLog(id: string, type: "stdout" | "stderr" | "build", text: string) {
  const proc = getOrCreateProcessState(id);
  const lines = text.split("\n").filter(Boolean);
  const targetBuffer = type === "stdout" ? proc.stdoutBuffer : (type === "stderr" ? proc.stderrBuffer : proc.buildLogBuffer);
  
  for (const line of lines) {
    const entry = `[${new Date().toLocaleTimeString()}] ${line}`;
    targetBuffer.push(entry);
    if (targetBuffer.length > 500) targetBuffer.shift();
  }

  // Also write to disk log file
  const projDir = path.join(PROJECTS_DIR, id);
  if (fs.existsSync(projDir)) {
    const logFile = path.join(projDir, `${type}.log`);
    fs.appendFileSync(logFile, text + "\n");
  }

  // Notify SSE listeners
  broadcastEvent("log", { projectId: id, type, text });
}

// Auto-detect project characteristics
function analyzeDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) return { runtime: "python", entryPoint: "bot.py", buildCmd: "", runCmd: "python -u bot.py" };
  const files = fs.readdirSync(dirPath);

  const hasPy = files.some((f) => f.endsWith(".py")) || files.includes("requirements.txt");
  const hasJs = files.some((f) => f.endsWith(".js") || f.endsWith(".ts")) || files.includes("package.json");
  const hasCpp = files.some((f) => f.endsWith(".cpp") || f.endsWith(".cc")) || files.includes("Makefile") || files.includes("CMakeLists.txt");

  if (hasPy && hasCpp && hasJs) {
    return {
      runtime: "polyglot_all",
      entryPoint: "runner.py",
      buildCmd: "pip install -r requirements.txt && npm install && make",
      runCmd: "python -u runner.py"
    };
  }
  if (hasPy && hasCpp) {
    return {
      runtime: "polyglot_py_cpp",
      entryPoint: "runner.py",
      buildCmd: "g++ -O3 -shared -fPIC native_math.cpp -o libmath.so 2>/dev/null || g++ -O3 native*.cpp -o native 2>/dev/null",
      runCmd: "python -u runner.py"
    };
  }
  if (hasPy && hasJs) {
    return {
      runtime: "polyglot_py_js",
      entryPoint: "server.js",
      buildCmd: "pip install -r requirements.txt && npm install",
      runCmd: "node server.js"
    };
  }
  if (hasCpp) {
    if (files.includes("Makefile")) {
      return { runtime: "cpp", entryPoint: "app", buildCmd: "make", runCmd: "./app" };
    }
    const cppFile = files.find((f) => f.endsWith(".cpp")) || "main.cpp";
    return {
      runtime: "cpp",
      entryPoint: cppFile,
      buildCmd: `g++ -O3 -pthread ${cppFile} -o app`,
      runCmd: "./app"
    };
  }
  if (hasJs) {
    const entry = files.includes("server.js") ? "server.js" : (files.includes("index.js") ? "index.js" : (files.find((f) => f.endsWith(".js")) || "index.js"));
    const buildCmd = files.includes("package.json") ? "npm install --no-audit" : "";
    return {
      runtime: "nodejs",
      entryPoint: entry,
      buildCmd,
      runCmd: `node ${entry}`
    };
  }
  
  // Default Python
  const pyEntry = files.includes("bot.py") ? "bot.py" : (files.includes("main.py") ? "main.py" : (files.find((f) => f.endsWith(".py")) || "bot.py"));
  const pyBuild = files.includes("requirements.txt") ? "pip install -r requirements.txt" : "";
  return {
    runtime: "python",
    entryPoint: pyEntry,
    buildCmd: pyBuild,
    runCmd: `python -u ${pyEntry}`
  };
}

// Process Launching Engine
async function startProjectProcess(project: ProjectRecord): Promise<{ success: boolean; error?: string }> {
  const pState = getOrCreateProcessState(project.id);
  const projDir = path.join(PROJECTS_DIR, project.id);

  if (pState.process && pState.pid) {
    return { success: true };
  }

  if (!fs.existsSync(projDir)) {
    return { success: false, error: "Project directory not found" };
  }

  // Construct command
  let runCmd = project.runCommand;
  if (!runCmd || !runCmd.trim()) {
    if (project.runtime === "nodejs") runCmd = `node ${project.entryPoint || "index.js"}`;
    else if (project.runtime === "cpp") runCmd = "./app";
    else runCmd = `python -u ${project.entryPoint || "bot.py"}`;
  }

  appendLog(project.id, "stdout", `🚀 Launching process: ${runCmd} (Runtime: ${project.runtime})`);

  // Build environment object
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PYTHONUNBUFFERED: "1",
    FORCE_COLOR: "1",
    NODE_ENV: "production",
    PORT: project.port ? String(project.port) : undefined,
    ...project.env
  };

  try {
    const child = spawn(runCmd, {
      shell: true,
      cwd: projDir,
      env,
      detached: true
    });

    pState.process = child;
    pState.pid = child.pid || null;
    pState.status = "Running";
    pState.startTime = Date.now();

    updateProjectRecord(project.id, { status: "Running" });

    child.stdout?.on("data", (chunk: Buffer) => {
      appendLog(project.id, "stdout", chunk.toString("utf-8"));
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      appendLog(project.id, "stderr", chunk.toString("utf-8"));
    });

    child.on("error", (err) => {
      appendLog(project.id, "stderr", `Process spawn error: ${err.message}`);
      pState.status = "Error";
      pState.pid = null;
      pState.process = null;
      updateProjectRecord(project.id, { status: "Error" });
    });

    child.on("exit", (code, signal) => {
      appendLog(project.id, "stderr", `Process exited with code ${code}, signal: ${signal || "none"}`);
      const wasRunning = pState.status === "Running";
      pState.process = null;
      pState.pid = null;
      pState.cpuPercent = 0;
      pState.memoryMb = 0;

      const currentProj = getProject(project.id);
      if (wasRunning && currentProj && currentProj.autoRestart && (code !== 0 && code !== null)) {
        const now = Date.now();
        // Cooldown restart check (max restarts in window)
        if (pState.restarts < (currentProj.maxRestarts || 5)) {
          pState.restarts += 1;
          pState.lastRestartTime = now;
          pState.status = "Running";
          appendLog(project.id, "stdout", `🔄 Auto-Restarting project (Attempt #${pState.restarts}/${currentProj.maxRestarts})...`);
          setTimeout(() => {
            startProjectProcess(currentProj);
          }, 2000);
        } else {
          pState.status = "Crashed";
          appendLog(project.id, "stderr", `⚠️ Max auto-restarts exceeded. Process set to Crashed.`);
          updateProjectRecord(project.id, { status: "Crashed" });
        }
      } else {
        pState.status = code === 0 ? "Stopped" : "Error";
        updateProjectRecord(project.id, { status: pState.status });
      }

      broadcastEvent("status_change", { projectId: project.id, status: pState.status });
    });

    broadcastEvent("status_change", { projectId: project.id, status: "Running", pid: child.pid });
    return { success: true };
  } catch (err: any) {
    pState.status = "Error";
    updateProjectRecord(project.id, { status: "Error" });
    appendLog(project.id, "stderr", `Failed to start process: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// Stop Process
function stopProjectProcess(projectId: string): boolean {
  const pState = processes.get(projectId);
  if (!pState || !pState.pid) {
    updateProjectRecord(projectId, { status: "Stopped" });
    return true;
  }

  try {
    // Kill process group
    process.kill(-pState.pid, "SIGTERM");
  } catch {
    try {
      if (pState.pid) process.kill(pState.pid, "SIGTERM");
    } catch {}
  }

  setTimeout(() => {
    if (pState.pid) {
      try {
        process.kill(-pState.pid, "SIGKILL");
      } catch {
        try {
          if (pState.pid) process.kill(pState.pid, "SIGKILL");
        } catch {}
      }
    }
  }, 1500);

  pState.status = "Stopped";
  pState.process = null;
  pState.pid = null;
  pState.cpuPercent = 0;
  pState.memoryMb = 0;
  updateProjectRecord(projectId, { status: "Stopped" });
  appendLog(projectId, "stdout", "⏹ Process stopped by user.");
  broadcastEvent("status_change", { projectId, status: "Stopped" });
  return true;
}

// Execute Build & Dependency Installation Pipeline
async function runBuildPipeline(project: ProjectRecord): Promise<{ success: boolean; log: string }> {
  const pState = getOrCreateProcessState(project.id);
  const projDir = path.join(PROJECTS_DIR, project.id);
  pState.status = "Building";
  updateProjectRecord(project.id, { status: "Building" });
  broadcastEvent("status_change", { projectId: project.id, status: "Building" });

  appendLog(project.id, "build", `=== BUILD PIPELINE INITIATED === [${new Date().toISOString()}]`);

  let buildCommand = project.buildCommand || "";
  if (!buildCommand.trim()) {
    const analysis = analyzeDirectory(projDir);
    buildCommand = analysis.buildCmd;
  }

  if (!buildCommand.trim()) {
    appendLog(project.id, "build", `No build command required for ${project.runtime}. Skipping build step.`);
    pState.status = "Stopped";
    updateProjectRecord(project.id, { status: "Stopped" });
    return { success: true, log: "No build step required." };
  }

  appendLog(project.id, "build", `Executing: ${buildCommand}`);

  return new Promise((resolve) => {
    exec(buildCommand, { cwd: projDir, timeout: 180000 }, (error, stdout, stderr) => {
      if (stdout) appendLog(project.id, "build", stdout);
      if (stderr) appendLog(project.id, "build", `[STDERR]: ${stderr}`);

      if (error) {
        appendLog(project.id, "build", `❌ BUILD FAILED: ${error.message}`);
        pState.status = "Error";
        updateProjectRecord(project.id, { status: "Error" });
        broadcastEvent("status_change", { projectId: project.id, status: "Error" });
        resolve({ success: false, log: stderr || error.message });
      } else {
        appendLog(project.id, "build", `✅ BUILD COMPLETED SUCCESSFULLY.`);
        pState.status = "Stopped";
        updateProjectRecord(project.id, { status: "Stopped" });
        broadcastEvent("status_change", { projectId: project.id, status: "Stopped" });
        resolve({ success: true, log: stdout });
      }
    });
  });
}

// Periodic Telemetry & Health Monitoring Loop
setInterval(() => {
  processes.forEach((pState, id) => {
    if (pState.status === "Running" && pState.pid) {
      // Sample mock CPU/RAM simulation based on actual process existence
      try {
        process.kill(pState.pid, 0); // test alive
        // Base simulated realistic active stats
        pState.cpuPercent = Math.max(0.2, Math.min(99.0, Number((Math.random() * 4.5 + 0.8).toFixed(1))));
        pState.memoryMb = Math.max(14, Math.min(800, Number((28 + Math.random() * 8).toFixed(1))));
      } catch {
        pState.status = "Stopped";
        pState.pid = null;
        pState.process = null;
        pState.cpuPercent = 0;
        pState.memoryMb = 0;
        updateProjectRecord(id, { status: "Stopped" });
      }
    }
  });

  // Broadcast periodic telemetry pulse
  const sysStats = getSystemStatsData();
  broadcastEvent("telemetry", {
    system: sysStats,
    projects: loadProjects().map(p => {
      const ps = processes.get(p.id);
      return {
        id: p.id,
        status: ps?.status || p.status,
        pid: ps?.pid || null,
        cpuPercent: ps?.cpuPercent || 0,
        memoryMb: ps?.memoryMb || 0,
        uptimeSeconds: ps?.startTime ? Math.floor((Date.now() - ps.startTime) / 1000) : 0,
        restarts: ps?.restarts || 0
      };
    })
  });
}, 3000);

// SSE Listeners Management
const sseClients: express.Response[] = [];

function broadcastEvent(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

function getSystemStatsData() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const projects = loadProjects();
  let activeCount = 0;
  processes.forEach(p => { if (p.status === "Running") activeCount++; });

  return {
    totalMemoryMb: Math.round(totalMem / (1024 * 1024)),
    usedMemoryMb: Math.round(usedMem / (1024 * 1024)),
    freeMemoryMb: Math.round(freeMem / (1024 * 1024)),
    cpuPercent: Number((os.loadavg()[0] * 10).toFixed(1)),
    nodeVersion: process.version,
    platform: `${os.type()} ${os.arch()}`,
    uptimeSeconds: Math.floor(os.uptime()),
    activeProjects: activeCount,
    totalProjects: projects.length,
    diskUsedMb: 124
  };
}

// Telegram Runner Launcher
function launchTelegramBotRunner(): { success: boolean; pid?: number; error?: string } {
  if (telegramProcess && telegramPid) {
    try {
      process.kill(telegramPid, 0);
      return { success: true, pid: telegramPid };
    } catch {}
  }

  const scriptPath = path.join(process.cwd(), "server", "bot_controller.py");
  if (!fs.existsSync(scriptPath)) {
    return { success: false, error: "server/bot_controller.py not found" };
  }

  try {
    const env = {
      ...process.env,
      TELEGRAM_BOT_TOKEN: telegramConfig.token,
      ACCESS_PASSWORD: telegramConfig.password,
      MAX_BOTS_PER_USER: String(telegramConfig.maxBots)
    };

    telegramProcess = spawn("python3", ["-u", scriptPath], {
      cwd: process.cwd(),
      env,
      detached: true
    });

    telegramPid = telegramProcess.pid || null;
    telegramConfig.isRunning = true;
    telegramConfig.lastActive = new Date().toISOString();
    saveTelegramConfig();

    telegramProcess.stdout?.on("data", (data) => {
      console.log(`[TG-BOT-STDOUT]: ${data.toString()}`);
    });

    telegramProcess.stderr?.on("data", (data) => {
      console.error(`[TG-BOT-STDERR]: ${data.toString()}`);
    });

    telegramProcess.on("exit", () => {
      telegramProcess = null;
      telegramPid = null;
      telegramConfig.isRunning = false;
      saveTelegramConfig();
    });

    return { success: true, pid: telegramPid || undefined };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

function stopTelegramBotRunner(): boolean {
  if (telegramPid) {
    try {
      process.kill(telegramPid, "SIGTERM");
    } catch {}
    telegramPid = null;
  }
  telegramProcess = null;
  telegramConfig.isRunning = false;
  saveTelegramConfig();
  return true;
}

// Helper to list files recursively
function getProjectFilesTree(dir: string, base: string = ""): any[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: any[] = [];

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "__pycache__") continue;
    const relPath = path.join(base, entry.name);
    const fullPath = path.join(dir, entry.name);
    const stats = fs.statSync(fullPath);

    results.push({
      name: entry.name,
      path: relPath,
      size: stats.size,
      isDir: entry.isDirectory(),
      updatedAt: stats.mtime.toISOString()
    });

    if (entry.isDirectory()) {
      results.push(...getProjectFilesTree(fullPath, relPath));
    }
  }
  return results;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // ==========================================
  //  SSE REAL-TIME BROADCAST ENDPOINT
  // ==========================================
  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    sseClients.push(res);
    res.write(`data: ${JSON.stringify({ type: "connected", time: new Date().toISOString() })}\n\n`);

    req.on("close", () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  });

  // ==========================================
  //  SYSTEM STATS API
  // ==========================================
  app.get(["/api/system/stats", "/api/stats"], (req, res) => {
    res.json(getSystemStatsData());
  });

  // ==========================================
  //  PROJECTS MANAGEMENT REST APIS
  // ==========================================
  app.get("/api/projects", (req, res) => {
    const projects = loadProjects();
    const enriched = projects.map((p) => {
      const pState = processes.get(p.id);
      return {
        ...p,
        status: pState?.status || p.status,
        stats: {
          pid: pState?.pid || null,
          cpuPercent: pState?.cpuPercent || 0,
          memoryMb: pState?.memoryMb || 0,
          uptimeSeconds: pState?.startTime ? Math.floor((Date.now() - pState.startTime) / 1000) : 0,
          restarts: pState?.restarts || 0,
          lastStarted: pState?.startTime ? new Date(pState.startTime).toISOString() : undefined
        }
      };
    });
    res.json(enriched);
  });

  // Create project from code files / editor
  app.post("/api/projects/create", async (req, res) => {
    try {
      const { name, runtime, entryPoint, buildCommand, runCommand, files, env, autoRestart, memoryLimitMb, port, description } = req.body;
      const id = "proj_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
      const projDir = path.join(PROJECTS_DIR, id);
      fs.mkdirSync(projDir, { recursive: true });

      // Write files
      if (files && typeof files === "object") {
        for (const [filename, content] of Object.entries(files)) {
          const filePath = path.join(projDir, filename);
          const parentDir = path.dirname(filePath);
          if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
          fs.writeFileSync(filePath, String(content), "utf-8");
        }
      }

      const analysis = analyzeDirectory(projDir);
      const finalRuntime = runtime || analysis.runtime;
      const finalEntry = entryPoint || analysis.entryPoint;
      const finalBuild = buildCommand !== undefined ? buildCommand : analysis.buildCmd;
      const finalRun = runCommand !== undefined ? runCommand : analysis.runCmd;

      const newProject: ProjectRecord = {
        id,
        name: name || `Project_${id.substring(5, 10)}`,
        runtime: finalRuntime,
        entryPoint: finalEntry,
        buildCommand: finalBuild,
        runCommand: finalRun,
        status: "Stopped",
        autoRestart: autoRestart !== undefined ? autoRestart : true,
        maxRestarts: 5,
        memoryLimitMb: memoryLimitMb || 512,
        port: port || (finalRuntime === "nodejs" ? 8080 : undefined),
        env: env || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: description || `Built on ${finalRuntime.toUpperCase()}`
      };

      const projects = loadProjects();
      projects.unshift(newProject);
      saveProjects(projects);

      appendLog(id, "stdout", `✨ Project created successfully.`);
      res.json({ success: true, project: newProject });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Upload file or ZIP archive
  app.post("/api/projects/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const originalName = req.file.originalname;
      const ext = path.extname(originalName).toLowerCase();
      const id = "proj_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
      const projDir = path.join(PROJECTS_DIR, id);
      fs.mkdirSync(projDir, { recursive: true });

      if (ext === ".zip") {
        const zip = new AdmZip(req.file.path);
        zip.extractAllTo(projDir, true);
        fs.unlinkSync(req.file.path);
      } else {
        const targetPath = path.join(projDir, originalName);
        fs.renameSync(req.file.path, targetPath);
      }

      const analysis = analyzeDirectory(projDir);
      const projectName = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, "_");

      const newProject: ProjectRecord = {
        id,
        name: projectName || `Project_${id.substring(5, 10)}`,
        runtime: analysis.runtime as any,
        entryPoint: analysis.entryPoint,
        buildCommand: analysis.buildCmd,
        runCommand: analysis.runCmd,
        status: "Stopped",
        autoRestart: true,
        maxRestarts: 5,
        memoryLimitMb: 512,
        env: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: `Imported from ${originalName}`
      };

      const projects = loadProjects();
      projects.unshift(newProject);
      saveProjects(projects);

      appendLog(id, "stdout", `📥 Uploaded ${originalName} and extracted to project folder.`);
      res.json({ success: true, project: newProject });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get project by ID
  app.get("/api/projects/:id", (req, res) => {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const pState = processes.get(project.id);
    const files = getProjectFilesTree(path.join(PROJECTS_DIR, project.id));

    res.json({
      ...project,
      status: pState?.status || project.status,
      files,
      stats: {
        pid: pState?.pid || null,
        cpuPercent: pState?.cpuPercent || 0,
        memoryMb: pState?.memoryMb || 0,
        uptimeSeconds: pState?.startTime ? Math.floor((Date.now() - pState.startTime) / 1000) : 0,
        restarts: pState?.restarts || 0
      }
    });
  });

  // Update project settings
  app.put("/api/projects/:id", (req, res) => {
    const updated = updateProjectRecord(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Project not found" });
    res.json({ success: true, project: updated });
  });

  // Start project
  app.post("/api/projects/:id/start", async (req, res) => {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const result = await startProjectProcess(project);
    res.json(result);
  });

  // Stop project
  app.post("/api/projects/:id/stop", (req, res) => {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    stopProjectProcess(project.id);
    res.json({ success: true });
  });

  // Restart project
  app.post("/api/projects/:id/restart", async (req, res) => {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    stopProjectProcess(project.id);
    setTimeout(async () => {
      const result = await startProjectProcess(project);
      res.json(result);
    }, 1000);
  });

  // Trigger build pipeline
  app.post("/api/projects/:id/build", async (req, res) => {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const result = await runBuildPipeline(project);
    res.json(result);
  });

  // Delete project
  app.delete("/api/projects/:id", (req, res) => {
    const id = req.params.id;
    stopProjectProcess(id);
    processes.delete(id);

    const projDir = path.join(PROJECTS_DIR, id);
    if (fs.existsSync(projDir)) {
      try {
        fs.rmSync(projDir, { recursive: true, force: true });
      } catch (e) {
        console.error("Error removing proj dir:", e);
      }
    }

    const projects = loadProjects().filter((p) => p.id !== id);
    saveProjects(projects);

    res.json({ success: true });
  });

  // Get project logs
  app.get("/api/projects/:id/logs", (req, res) => {
    const id = req.params.id;
    const pState = processes.get(id);
    const projDir = path.join(PROJECTS_DIR, id);

    let stdout = pState?.stdoutBuffer.join("\n") || "";
    let stderr = pState?.stderrBuffer.join("\n") || "";
    let buildLog = pState?.buildLogBuffer.join("\n") || "";

    if (!stdout && fs.existsSync(path.join(projDir, "stdout.log"))) {
      stdout = fs.readFileSync(path.join(projDir, "stdout.log"), "utf-8").slice(-15000);
    }
    if (!stderr && fs.existsSync(path.join(projDir, "stderr.log"))) {
      stderr = fs.readFileSync(path.join(projDir, "stderr.log"), "utf-8").slice(-15000);
    }
    if (!buildLog && fs.existsSync(path.join(projDir, "build.log"))) {
      buildLog = fs.readFileSync(path.join(projDir, "build.log"), "utf-8").slice(-15000);
    }

    res.json({ stdout, stderr, buildLog });
  });

  // Clear logs
  app.delete("/api/projects/:id/logs", (req, res) => {
    const id = req.params.id;
    const pState = processes.get(id);
    if (pState) {
      pState.stdoutBuffer = [];
      pState.stderrBuffer = [];
      pState.buildLogBuffer = [];
    }
    const projDir = path.join(PROJECTS_DIR, id);
    ["stdout.log", "stderr.log", "build.log"].forEach((f) => {
      const p = path.join(projDir, f);
      if (fs.existsSync(p)) fs.writeFileSync(p, "");
    });
    res.json({ success: true });
  });

  // Read file contents
  app.get("/api/projects/:id/file", (req, res) => {
    const id = req.params.id;
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: "Missing path query" });

    const safePath = path.normalize(path.join(PROJECTS_DIR, id, filePath));
    if (!safePath.startsWith(path.join(PROJECTS_DIR, id))) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(safePath)) return res.status(404).json({ error: "File not found" });
    try {
      const content = fs.readFileSync(safePath, "utf-8");
      res.json({ content, path: filePath });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Save / create file
  app.post("/api/projects/:id/file", (req, res) => {
    const id = req.params.id;
    const { filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: "Missing filePath" });

    const safePath = path.normalize(path.join(PROJECTS_DIR, id, filePath));
    if (!safePath.startsWith(path.join(PROJECTS_DIR, id))) {
      return res.status(403).json({ error: "Access denied" });
    }

    try {
      const parentDir = path.dirname(safePath);
      if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
      fs.writeFileSync(safePath, content || "", "utf-8");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Download project as ZIP
  app.get("/api/projects/:id/download", (req, res) => {
    const id = req.params.id;
    const projDir = path.join(PROJECTS_DIR, id);
    if (!fs.existsSync(projDir)) return res.status(404).json({ error: "Not found" });

    const zip = new AdmZip();
    zip.addLocalFolder(projDir);
    const buffer = zip.toBuffer();

    res.setHeader("Content-Disposition", `attachment; filename="${id}.zip"`);
    res.setHeader("Content-Type", "application/zip");
    res.send(buffer);
  });

  // ==========================================
  //  TELEGRAM BOT RUNNER APIS
  // ==========================================
  app.get("/api/telegram/status", (req, res) => {
    res.json({
      ...telegramConfig,
      pid: telegramPid,
      isRunning: Boolean(telegramPid)
    });
  });

  app.post("/api/telegram/start", (req, res) => {
    const result = launchTelegramBotRunner();
    res.json(result);
  });

  app.post("/api/telegram/stop", (req, res) => {
    stopTelegramBotRunner();
    res.json({ success: true });
  });

  app.post("/api/telegram/config", (req, res) => {
    const { token, password, maxBots } = req.body;
    if (token) telegramConfig.token = token.trim();
    if (password) telegramConfig.password = password.trim();
    if (maxBots) telegramConfig.maxBots = Number(maxBots);
    saveTelegramConfig();
    res.json({ success: true, config: telegramConfig });
  });

  // Download the standalone python script
  app.get("/api/telegram/script", (req, res) => {
    const scriptPath = path.join(process.cwd(), "server", "bot_controller.py");
    if (!fs.existsSync(scriptPath)) return res.status(404).send("File not found");
    res.setHeader("Content-Disposition", 'attachment; filename="hosting_pro_bot.py"');
    res.setHeader("Content-Type", "text/x-python");
    res.sendFile(scriptPath);
  });

  // ==========================================
  //  VITE / PRODUCTION STATIC HANDLERS
  // ==========================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=====================================================================`);
    console.log(`  🚀 HOSTING PRO ENTERPRISE Multi-Runtime Server Online`);
    console.log(`  Server URL: http://0.0.0.0:${PORT}`);
    console.log(`  Runtimes: Python 🐍 | Node.js 🟨 | C++ ⚙️ | Polyglot 🔥`);
    console.log(`=====================================================================`);
  });
}

startServer();
