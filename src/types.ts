export type RuntimeType =
  | 'python'
  | 'nodejs'
  | 'cpp'
  | 'polyglot_py_cpp'
  | 'polyglot_py_js'
  | 'polyglot_all';

export type ProjectStatus = 'Running' | 'Stopped' | 'Building' | 'Crashed' | 'Error';

export interface ProjectEnvVar {
  key: string;
  value: string;
}

export interface ProjectStats {
  pid: number | null;
  cpuPercent: number;
  memoryMb: number;
  uptimeSeconds: number;
  restarts: number;
  lastStarted?: string;
  lastExitCode?: number | null;
  lastError?: string;
}

export interface ProjectFile {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  runtime: RuntimeType;
  entryPoint: string;
  buildCommand?: string;
  runCommand?: string;
  status: ProjectStatus;
  autoRestart: boolean;
  maxRestarts: number;
  memoryLimitMb: number;
  port?: number;
  stats: ProjectStats;
  env: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  description?: string;
  gitRepo?: string;
  filesCount?: number;
  sizeKb?: number;
}

export interface SystemStats {
  totalMemoryMb: number;
  usedMemoryMb: number;
  freeMemoryMb: number;
  cpuPercent: number;
  nodeVersion: string;
  platform: string;
  uptimeSeconds: number;
  activeProjects: number;
  totalProjects: number;
  diskUsedMb: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'stdout' | 'stderr' | 'build' | 'system';
  message: string;
}

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  runtime: RuntimeType;
  icon: string;
  entryPoint: string;
  buildCommand?: string;
  runCommand?: string;
  files: Record<string, string>;
  defaultEnv?: Record<string, string>;
}

export interface TelegramConfig {
  token: string;
  password: string;
  maxBots: number;
  isRunning: boolean;
  pid?: number | null;
  lastActive?: string;
  botUsername?: string;
}
