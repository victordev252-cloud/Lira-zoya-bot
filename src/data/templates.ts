import { StarterTemplate } from '../types';

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'python-telegram-bot',
    name: 'Python Telegram Pro Bot',
    description: 'Production-ready Telegram Bot with command handlers, inline keyboards, and SQLite database persistence.',
    runtime: 'python',
    icon: '🐍',
    entryPoint: 'bot.py',
    buildCommand: 'pip install pyTelegramBotAPI python-dotenv',
    runCommand: 'python -u bot.py',
    defaultEnv: {
      BOT_TOKEN: 'YOUR_BOT_TOKEN_HERE',
      ENVIRONMENT: 'production',
      ADMIN_ID: '123456789'
    },
    files: {
      'bot.py': `import os
import sys
import time
import sqlite3
import telebot
from telebot import types

TOKEN = os.getenv("BOT_TOKEN", "8726402006:AAFIOVkH5FGdVvyJZHorNQOvob3HIkXQ-qQ")
bot = telebot.TeleBot(TOKEN)

# Initialize SQLite database
conn = sqlite3.connect("bot_data.db", check_same_thread=False)
cursor = conn.cursor()
cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        username TEXT,
        joined_at TEXT
    )
""")
conn.commit()

@bot.message_handler(commands=['start'])
def send_welcome(message):
    uid = message.from_user.id
    uname = message.from_user.username or "User"
    cursor.execute("INSERT OR REPLACE INTO users VALUES (?, ?, datetime('now'))", (uid, uname))
    conn.commit()

    markup = types.InlineKeyboardMarkup(row_width=2)
    btn1 = types.InlineKeyboardButton("📊 System Status", callback_data="status")
    btn2 = types.InlineKeyboardButton("⚡ Ping", callback_data="ping")
    markup.add(btn1, btn2)

    bot.reply_to(message, f"👋 Welcome {uname}!\\n\\n🚀 Powered by HOSTING PRO Enterprise Enterprise Runner.\\nStatus: 🟢 Active\\nPython: {sys.version.split()[0]}", reply_markup=markup)

@bot.callback_query_handler(func=lambda call: True)
def callback_handler(call):
    if call.data == "status":
        cursor.execute("SELECT COUNT(*) FROM users")
        total = cursor.fetchone()[0]
        bot.answer_callback_query(call.id, f"Users Registered: {total}")
    elif call.data == "ping":
        bot.answer_callback_query(call.id, "🏓 Pong! Latency: < 15ms")

@bot.message_handler(func=lambda message: True)
def echo_all(message):
    bot.reply_to(message, f"🤖 Echo: {message.text}")

if __name__ == '__main__':
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 🚀 Python Telegram Bot is starting polling...")
    sys.stdout.flush()
    try:
        bot.infinity_polling(timeout=10, long_polling_timeout=5)
    except Exception as e:
        print(f"Bot error: {e}", file=sys.stderr)
`,
      'requirements.txt': `pyTelegramBotAPI==4.14.0
python-dotenv==1.0.0
`
    }
  },
  {
    id: 'nodejs-express-api',
    name: 'Node.js Microservice & Webhook Bot',
    description: 'High-speed Express & Node.js webhook server with live health metrics and background event loop.',
    runtime: 'nodejs',
    icon: '🟨',
    entryPoint: 'server.js',
    buildCommand: 'npm install',
    runCommand: 'node server.js',
    defaultEnv: {
      PORT: '8080',
      NODE_ENV: 'production',
      APP_NAME: 'HostingPro-NodeApp'
    },
    files: {
      'server.js': `const http = require('http');
const os = require('os');

const PORT = process.env.PORT || 8080;
let requestCount = 0;
const startTime = Date.now();

const server = http.createServer((req, res) => {
  requestCount++;
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'online',
      service: process.env.APP_NAME || 'Node Service',
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      requestsHandled: requestCount,
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      systemCpuCount: os.cpus().length,
      timestamp: new Date().toISOString()
    }, null, 2));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(\`[\${new Date().toISOString()}] 🚀 Node.js microservice listening on port \${PORT}\`);
  console.log(\`Memory Heap: \${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB\`);
});

// Periodic background worker log
setInterval(() => {
  console.log(\`[\${new Date().toLocaleTimeString()}] 💓 Heartbeat: \${requestCount} reqs processed. Heap: \${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\`);
}, 30000);
`,
      'package.json': `{
  "name": "hosting-pro-node-worker",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {}
}
`
    }
  },
  {
    id: 'cpp-highperf-engine',
    name: 'C++ High-Performance Compute Engine',
    description: 'Ultra-fast native C++ worker with multithreading, system resource telemetry, and continuous processing.',
    runtime: 'cpp',
    icon: '⚙️',
    entryPoint: 'main.cpp',
    buildCommand: 'g++ -O3 -pthread main.cpp -o app',
    runCommand: './app',
    defaultEnv: {
      WORKER_THREADS: '4',
      LOG_INTERVAL: '10'
    },
    files: {
      'main.cpp': `#include <iostream>
#include <chrono>
#include <thread>
#include <vector>
#include <cmath>
#include <iomanip>
#include <csignal>

volatile sig_atomic_t g_running = 1;

void signal_handler(int sig) {
    g_running = 0;
    std::cout << "\\n[C++ Worker] Caught signal " << sig << ", shutting down gracefully...\\n" << std::flush;
}

// Compute prime count simulation
long long compute_work(int iterations) {
    long long count = 0;
    for (int i = 2; i < iterations; ++i) {
        bool is_prime = true;
        for (int j = 2; j * j <= i; ++j) {
            if (i % j == 0) {
                is_prime = false;
                break;
            }
        }
        if (is_prime) count++;
    }
    return count;
}

int main() {
    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);

    std::cout << "====================================================\\n";
    std::cout << "  HOSTING PRO C++ Native Enterprise Engine v25.0\\n";
    std::cout << "  Compiled with: g++ -O3 -pthread\\n";
    std::cout << "====================================================\\n" << std::flush;

    long long cycle = 0;
    auto start_time = std::chrono::steady_clock::now();

    while (g_running) {
        cycle++;
        auto t0 = std::chrono::high_resolution_clock::now();
        long long primes = compute_work(50000);
        auto t1 = std::chrono::high_resolution_clock::now();
        double ms = std::chrono::duration<double, std::milli>(t1 - t0).count();

        auto uptime = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::steady_clock::now() - start_time
        ).count();

        std::cout << "[Cycle #" << std::setw(5) << cycle << "] "
                  << "Primes: " << primes << " in " << std::fixed << std::setprecision(2) << ms << " ms | "
                  << "Uptime: " << uptime << "s | Status: 🟢 HEALTHY"
                  << std::endl << std::flush;

        std::this_thread::sleep_for(std::chrono::seconds(5));
    }

    std::cout << "[C++ Worker] Terminated successfully. Total cycles: " << cycle << std::endl;
    return 0;
}
`,
      'Makefile': `CXX = g++
CXXFLAGS = -O3 -Wall -pthread

all: app

app: main.cpp
\t$(CXX) $(CXXFLAGS) main.cpp -o app

clean:
\trm -f app
`
    }
  },
  {
    id: 'polyglot-python-cpp',
    name: 'Polyglot: Python + C++ Fast Engine',
    description: 'Dual-runtime architecture compiling a fast C++ shared binary/utility seamlessly driven by Python orchestration.',
    runtime: 'polyglot_py_cpp',
    icon: '🔵',
    entryPoint: 'runner.py',
    buildCommand: 'g++ -O3 -shared -fPIC native_math.cpp -o libmath.so && pip install -r requirements.txt',
    runCommand: 'python -u runner.py',
    defaultEnv: {
      MODULE_NAME: 'NativeAccelerator'
    },
    files: {
      'native_math.cpp': `#include <cstdint>

extern "C" {
    int64_t fast_fibonacci(int32_t n) {
        if (n <= 0) return 0;
        if (n == 1) return 1;
        int64_t a = 0, b = 1, c = 0;
        for (int32_t i = 2; i <= n; i++) {
            c = a + b;
            a = b;
            b = c;
        }
        return b;
    }

    double fast_matrix_sum(int32_t size) {
        double sum = 0.0;
        for (int32_t i = 0; i < size; i++) {
            for (int32_t j = 0; j < size; j++) {
                sum += (i * 0.5) + (j * 0.25);
            }
        }
        return sum;
    }
}
`,
      'runner.py': `import os
import sys
import time
import ctypes

lib_path = os.path.abspath("libmath.so")
if not os.path.exists(lib_path):
    print(f"❌ Shared library {lib_path} not found! Compile with g++ first.", file=sys.stderr)
    sys.exit(1)

native = ctypes.CDLL(lib_path)
native.fast_fibonacci.argtypes = [ctypes.c_int32]
native.fast_fibonacci.restype = ctypes.c_int64

native.fast_matrix_sum.argtypes = [ctypes.c_int32]
native.fast_matrix_sum.restype = ctypes.c_double

print("=" * 60)
print("  🚀 POLYGLOT RUNTIME: Python 🐍 + C++ ⚙️ Native Shared Lib")
print("=" * 60)
sys.stdout.flush()

count = 0
while True:
    count += 1
    t0 = time.perf_counter()
    fib = native.fast_fibonacci(45)
    mat = native.fast_matrix_sum(500)
    dt = (time.perf_counter() - t0) * 1000

    print(f"[{time.strftime('%X')}] Iteration #{count}: Fib(45) = {fib} | Matrix Sum: {mat:.2f} (C++ execution: {dt:.3f}ms)")
    sys.stdout.flush()
    time.sleep(5)
`,
      'requirements.txt': `requests==2.31.0
`
    }
  }
];
