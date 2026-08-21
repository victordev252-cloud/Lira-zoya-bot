#!/usr/bin/env python3
"""
=====================================================================
 HOSTING PRO v25.0 (Multi-Runtime Ultimate Enterprise Edition)
 Supports Python, Node.js, C++, and Polyglot Projects (< 1GB RAM)
 Automatic Build Pipeline, Dependency Detection, Watchdog & Logs
=====================================================================
"""

import os
import sys
import subprocess
import json
import re
import signal
import asyncio
import time
import sqlite3
import shutil
import zipfile
from datetime import datetime
import logging

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# -- CONFIGURATION ----------------------------------------------------
TOKEN           = os.getenv("TELEGRAM_BOT_TOKEN", "8726402006:AAFIOVkH5FGdVvyJZHorNQOvob3HIkXQ-qQ")
ACCESS_PASSWORD = os.getenv("ACCESS_PASSWORD", "ANASMENO1")
MAX_BOTS        = int(os.getenv("MAX_BOTS_PER_USER", "12"))
DB_FILE         = os.getenv("DB_FILE", "zmovies.db")
BASE_PROJECT_DIR = os.getenv("PROJECTS_DIR", "bots")
# ---------------------------------------------------------------------

REQUIRED_PACKAGES = [
    "python-telegram-bot[job-queue]>=20.0",
    "pyTelegramBotAPI>=4.14.0",
    "requests",
    "aiohttp",
    "python-dotenv",
    "pillow"
]

def pre_install_environment():
    logger.info("Initializing Hosting Pro v25.0 Enterprise Environment...")
    for pkg in REQUIRED_PACKAGES:
        try:
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", "-U", pkg],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        except Exception as e:
            logger.warning(f"Note on package {pkg}: {e}")

try:
    from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
    from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes
except ImportError:
    pre_install_environment()
    from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
    from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes

# =====================================================================
#  DATABASE ENGINE & PERSISTENCE
# =====================================================================

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bots (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            name TEXT,
            runtime TEXT,
            file TEXT,
            path TEXT,
            entrypoint TEXT,
            build_cmd TEXT,
            run_cmd TEXT,
            pid INTEGER,
            status TEXT,
            uploaded_at TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def db_get_user_bots(user_id: str) -> list:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM bots WHERE user_id = ?", (user_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception:
        conn.close()
        return []

def db_get_all_bots() -> list:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM bots")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception:
        conn.close()
        return []

def db_save_bot(bot: dict):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO bots (id, user_id, name, runtime, file, path, entrypoint, build_cmd, run_cmd, pid, status, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        bot['id'], bot['user_id'], bot['name'], bot.get('runtime', 'python'),
        bot['file'], bot['path'], bot.get('entrypoint', ''),
        bot.get('build_cmd', ''), bot.get('run_cmd', ''),
        bot.get('pid'), bot.get('status', 'Stopped'), bot['uploaded_at']
    ))
    conn.commit()
    conn.close()

def db_update_bot_pid_status(bot_id: str, pid, status: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE bots SET pid = ?, status = ? WHERE id = ?", (pid, status, bot_id))
    conn.commit()
    conn.close()

def db_delete_bot(bot_id: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM bots WHERE id = ?", (bot_id,))
    conn.commit()
    conn.close()

# =====================================================================
#  RUNTIME DETECTION & BUILD PIPELINE
# =====================================================================

def detect_runtime(folder_or_file: str) -> tuple:
    """
    Detects runtime and returns (runtime, entrypoint, build_command, run_command)
    """
    if os.path.isfile(folder_or_file):
        ext = os.path.splitext(folder_or_file)[1].lower()
        base = os.path.basename(folder_or_file)
        if ext == '.py':
            return 'python', base, '', f"python -u {base}"
        elif ext in ['.js', '.mjs', '.cjs']:
            return 'nodejs', base, '', f"node {base}"
        elif ext in ['.cpp', '.cc', '.cxx']:
            bin_name = "app"
            return 'cpp', base, f"g++ -O2 {base} -o {bin_name} -pthread", f"./{bin_name}"
        elif ext == '.sh':
            return 'bash', base, 'chmod +x ' + base, f"./{base}"

    if os.path.isdir(folder_or_file):
        files = os.listdir(folder_or_file)
        has_py = any(f.endswith('.py') for f in files) or 'requirements.txt' in files
        has_js = any(f.endswith('.js') for f in files) or 'package.json' in files
        has_cpp = any(f.endswith('.cpp') for f in files) or 'Makefile' in files or 'CMakeLists.txt' in files

        if has_py and has_cpp and has_js:
            return 'polyglot_all', 'runner.py', 'pip install -r requirements.txt && npm install && make', 'python -u runner.py'
        elif has_py and has_cpp:
            return 'polyglot_py_cpp', 'runner.py', 'g++ -O2 -shared -fPIC native.cpp -o libnative.so && pip install -r requirements.txt', 'python -u runner.py'
        elif has_py and has_js:
            return 'polyglot_py_js', 'server.js', 'pip install -r requirements.txt && npm install', 'node server.js'
        elif has_cpp:
            if 'Makefile' in files:
                return 'cpp', 'app', 'make', './app'
            cpp_files = [f for f in files if f.endswith('.cpp')]
            main_cpp = 'main.cpp' if 'main.cpp' in files else cpp_files[0]
            return 'cpp', main_cpp, f"g++ -O2 {main_cpp} -o app -pthread", './app'
        elif has_js:
            entry = 'index.js' if 'index.js' in files else ('server.js' if 'server.js' in files else [f for f in files if f.endswith('.js')][0])
            build_cmd = 'npm install' if 'package.json' in files else ''
            return 'nodejs', entry, build_cmd, f"node {entry}"
        elif has_py:
            entry = 'bot.py' if 'bot.py' in files else ('main.py' if 'main.py' in files else [f for f in files if f.endswith('.py')][0])
            build_cmd = 'pip install -r requirements.txt' if 'requirements.txt' in files else ''
            return 'python', entry, build_cmd, f"python -u {entry}"

    return 'python', 'bot.py', '', 'python -u bot.py'

def scan_and_install_python_imports(file_path: str) -> list:
    failed = []
    try:
        if not os.path.exists(file_path):
            return []
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        imports = re.findall(r'^\s*(?:import|from)\s+([a-zA-Z0-9_]+)', content, re.MULTILINE)
        std_libs = {
            'os', 'sys', 'json', 're', 'time', 'datetime', 'math', 'random',
            'subprocess', 'asyncio', 'logging', 'hashlib', 'sqlite3', 'typing',
            'threading', 'shutil', 'tempfile', 'urllib', 'http', 'socket', 'signal',
            'ctypes', 'io', 'collections', 'itertools', 'functools'
        }
        external_libs = set(imports) - std_libs

        pkg_mapping = {
            "telebot": "pyTelegramBotAPI",
            "telegram": "python-telegram-bot",
            "dotenv": "python-dotenv",
            "PIL": "pillow",
            "bson": "pymongo",
            "bs4": "beautifulsoup4",
            "cv2": "opencv-python",
            "flask": "flask",
            "fastapi": "fastapi uvicorn"
        }

        for lib in external_libs:
            pip_name = pkg_mapping.get(lib, lib)
            try:
                subprocess.check_call(
                    [sys.executable, "-m", "pip", "install", pip_name],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=60
                )
            except Exception as ex:
                logger.warning(f"Could not auto-install {pip_name}: {ex}")
                failed.append(pip_name)
    except Exception as e:
        logger.error(f"Error scanning imports: {e}")
    return failed

def execute_build(project_dir: str, build_cmd: str, log_file: str) -> bool:
    if not build_cmd or not build_cmd.strip():
        return True
    try:
        with open(log_file, "a", encoding="utf-8") as out:
            out.write(f"\n[BUILD START] {datetime.now().isoformat()} - Command: {build_cmd}\n")
            res = subprocess.run(
                build_cmd,
                shell=True,
                cwd=project_dir,
                stdout=out,
                stderr=out,
                timeout=180
            )
            out.write(f"[BUILD END] Exit Code: {res.returncode}\n")
            return res.returncode == 0
    except Exception as e:
        with open(log_file, "a", encoding="utf-8") as out:
            out.write(f"[BUILD FAILED] Exception: {e}\n")
        return False

def is_pid_alive(pid) -> bool:
    if not pid:
        return False
    try:
        os.kill(int(pid), 0)
        return True
    except (ProcessLookupError, PermissionError, TypeError, ValueError):
        return False

def launch_process(bot: dict) -> subprocess.Popen:
    user_dir = os.path.dirname(bot['path'])
    os.makedirs(user_dir, exist_ok=True)

    run_cmd = bot.get('run_cmd')
    if not run_cmd:
        if bot.get('runtime') == 'nodejs':
            run_cmd = f"node {bot.get('entrypoint', 'index.js')}"
        elif bot.get('runtime') == 'cpp':
            run_cmd = "./app"
        else:
            run_cmd = f"python -u {bot.get('entrypoint', os.path.basename(bot['path']))}"

    out_log = open(os.path.join(user_dir, "out.log"), "a", encoding="utf-8")
    err_log = open(os.path.join(user_dir, "err.log"), "a", encoding="utf-8")

    out_log.write(f"\n--- Process Started at {datetime.now().isoformat()} [{run_cmd}] ---\n")
    out_log.flush()

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    
    # Load .env if present in project dir
    env_file = os.path.join(user_dir, ".env")
    if os.path.exists(env_file):
        try:
            with open(env_file, 'r', encoding='utf-8') as ef:
                for line in ef:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        env[k.strip()] = v.strip().strip('"').strip("'")
        except Exception:
            pass

    return subprocess.Popen(
        run_cmd,
        shell=True,
        start_new_session=True,
        cwd=user_dir,
        stdout=out_log,
        stderr=err_log,
        env=env
    )

# =====================================================================
#  TELEGRAM BOT COMMAND HANDLERS
# =====================================================================

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.user_data.get('auth'):
        await update.message.reply_text(
            "🔒 *HOSTING PRO Enterprise v25.0*\n\n"
            "Nidaamka casriga ah ee lagu martigeliyo Python 🐍, Node.js 🟨, C++ ⚙️ iyo Polyglot projects.\n\n"
            "Fadlan geli *Password-ka* maamulka si aad u gasho:",
            parse_mode='Markdown'
        )
        return

    uid = str(update.effective_user.id)
    bots = db_get_user_bots(uid)
    running = sum(1 for b in bots if is_pid_alive(b.get('pid')))

    text = (
        "🚀 *HOSTING PRO ENTERPRISE v25.0*\n"
        "-----------------------------------\n"
        f"📦 Mashruucyadaada: *{len(bots)}/{MAX_BOTS}*\n"
        f"🟢 Online: *{running}* | 🔴 Offline: *{len(bots)-running}*\n"
        "⚡ Taageerada: Python, Node.js, C++, ZIP Archives\n"
        "-----------------------------------\n\n"
        "🕹 *Awaamiirta Maamulka:*\n"
        "➕ /newhosting - Soo rar Project cusub (`.py`, `.js`, `.cpp`, `.zip`)\n"
        "📊 /status - Maamul, Kici, Jooji, ama fiiri Logs-ka\n"
        "ℹ️ /help - Caawimaad iyo faahfaahin dheeraad ah"
    )
    await update.message.reply_text(text, parse_mode='Markdown')

async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.user_data.get('auth'):
        return
    text = (
        "📖 *Hagaha Hosting Pro Enterprise v25.0*\n"
        "-----------------------------------\n\n"
        "1️⃣ Qor /newhosting si aad u bilowdo.\n"
        "2️⃣ Soo dir fayl kasta: `.py` (Python), `.js` (Node), `.cpp` (C++), ama `.zip` oo leh project dhan!\n"
        "3️⃣ Nidaamku wuxuu si toos ah u aqoonsanayaa luuqadda, u dhisayaa (compile/build), una kicinayaa.\n"
        "4️⃣ *Auto-Recovery & Memory Watchdog*: Haddii server-ka la reboot-gareeyo ama bot dhaco, si toos ah ayaa dib loogu kicinayaa.\n"
        "5️⃣ Guji /status si aad u hesho badhamada Start, Stop, Restart, iyo Live Logs."
    )
    await update.message.reply_text(text, parse_mode='Markdown')

async def handle_password(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if context.user_data.get('auth'):
        return
    txt = update.message.text.strip()
    if txt == ACCESS_PASSWORD:
        context.user_data['auth'] = True
        await update.message.reply_text("✅ *Password-ka waa sax!* Hadda qor /start si aad u bilowdo maamulka.", parse_mode='Markdown')
    else:
        await update.message.reply_text("❌ Password-ku waa khalad. Fadlan dib u hubi.")

async def new_hosting(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.user_data.get('auth'):
        return
    uid = str(update.effective_user.id)
    bots = db_get_user_bots(uid)

    if len(bots) >= MAX_BOTS:
        await update.message.reply_text(f"⚠️ Waxaad gaartay xadkaaga ugu sarreeya ee {MAX_BOTS} mashruuc. Tirtir mid hore si aad mid cusub ugu darto.")
        return

    context.user_data['ready_for_upload'] = True
    await update.message.reply_text(
        "📤 *Soo rar Mashruucaaga!*\n\n"
        "Fadlan hadda soo dir faylkaaga:\n"
        "• 🐍 Python (`.py`)\n"
        "• 🟨 Node.js / JavaScript (`.js`)\n"
        "• ⚙️ C++ Source (`.cpp`)\n"
        "• 📦 ZIP Archive (`.zip` oo ay ku jiraan package.json, requirements.txt, ama Makefile)",
        parse_mode='Markdown'
    )

async def status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.user_data.get('auth'):
        return
    uid = str(update.effective_user.id)
    bots = db_get_user_bots(uid)

    if not bots:
        await update.message.reply_text("ℹ️ Hadda ma haysid wax mashruucyo ah. Isticmaal /newhosting si aad ugu darto.")
        return

    keyboard = []
    for b in bots:
        alive = is_pid_alive(b.get('pid'))
        if not alive and b.get('status') == 'Running':
            db_update_bot_pid_status(b['id'], None, 'Stopped')
            b['status'] = 'Stopped'
            b['pid'] = None

        s_icon = "🟢" if alive else "🔴"
        rt_icon = "🐍" if b.get('runtime') == 'python' else ("🟨" if b.get('runtime') == 'nodejs' else ("⚙️" if b.get('runtime') == 'cpp' else "🔥"))
        keyboard.append([InlineKeyboardButton(f"{s_icon} {rt_icon} {b['name'][:22]}", callback_data=f"manage_{b['id']}")])

    await update.message.reply_text("📊 *Mashaariicdaada iyo Xaaladooda:*", reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

# =====================================================================
#  DOCUMENT UPLOAD & MULTI-RUNTIME BUILD PIPELINE
# =====================================================================

async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.user_data.get('auth'):
        return

    uid = str(update.effective_user.id)
    if not context.user_data.get('ready_for_upload'):
        await update.message.reply_text("⚠️ Fadlan marka hore qor /newhosting si aad u furto soo rarista faylka.")
        return

    doc = update.message.document
    file_name = doc.file_name or "project_file"
    ext = os.path.splitext(file_name)[1].lower()

    allowed_exts = ['.py', '.js', '.mjs', '.cpp', '.cxx', '.zip', '.sh', '.json', '.txt']
    if ext not in allowed_exts:
        await update.message.reply_text(f"❌ Nooca faylkan ({ext}) lama taageero. Fadlan soo dir `.py`, `.js`, `.cpp`, ama `.zip`.", parse_mode='Markdown')
        return

    msg = await update.message.reply_text("📥 *Faylka waa la soo dejinayaa waxaana bilaabanaya Build Pipeline...*", parse_mode='Markdown')

    try:
        bot_id = str(int(time.time() * 1000))
        project_dir = os.path.abspath(os.path.join(BASE_PROJECT_DIR, f"user_{uid}_{bot_id}"))
        os.makedirs(project_dir, exist_ok=True)
        file_path = os.path.join(project_dir, file_name)

        tg_file = await context.bot.get_file(doc.file_id)
        await tg_file.download_to_drive(file_path)

        # ZIP extraction if zip
        if ext == '.zip':
            await msg.edit_text("📦 *ZIP Archive waa la furayaa (Extracting)...*", parse_mode='Markdown')
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(project_dir)

        # Detect runtime & commands
        runtime, entrypoint, build_cmd, run_cmd = detect_runtime(project_dir if ext == '.zip' else file_path)

        # Auto-install Python imports if single py file
        failed_pkgs = []
        if ext == '.py':
            failed_pkgs = scan_and_install_python_imports(file_path)

        # Execute build if required
        build_log = os.path.join(project_dir, "build.log")
        build_success = True
        if build_cmd:
            await msg.edit_text(f"⚙️ *Dhisidda mashruuca (Building)...*\n`{build_cmd}`", parse_mode='Markdown')
            build_success = execute_build(project_dir, build_cmd, build_log)

        bot_name = os.path.splitext(file_name)[0]
        bot_data = {
            "id": bot_id,
            "user_id": uid,
            "name": bot_name[:30],
            "runtime": runtime,
            "file": file_name,
            "path": file_path,
            "entrypoint": entrypoint,
            "build_cmd": build_cmd,
            "run_cmd": run_cmd,
            "pid": None,
            "status": "Stopped" if build_success else "Build Error",
            "uploaded_at": datetime.now().isoformat()
        }

        db_save_bot(bot_data)
        context.user_data['ready_for_upload'] = False

        status_text = "✅ *Mashruucu si guul leh ayaa loo diyaarshay!*" if build_success else "⚠️ *Build-ka khalad baa ka dhacay. Fiiri build logs.*"
        reply = (
            f"{status_text}\n\n"
            f"📁 *Magaca:* `{bot_name}`\n"
            f"⚡ *Runtime:* `{runtime.upper()}`\n"
            f"🚀 *Run Command:* `{run_cmd}`\n\n"
            "Guji /status si aad hadda u kiciso (Start)!"
        )
        if failed_pkgs:
            reply += f"\n\n⚠️ *Xirmooyinka aan la rakibin:* `{', '.join(failed_pkgs)}`"

        await msg.edit_text(reply, parse_mode='Markdown')

    except Exception as e:
        logger.error(f"Error handling document: {e}")
        await msg.edit_text(f"❌ Khalad ayaa dhacay: `{str(e)}`", parse_mode='Markdown')

# =====================================================================
#  BUTTON CALLBACK ACTIONS
# =====================================================================

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    data = query.data
    uid = str(query.from_user.id)
    await query.answer()

    bots = db_get_user_bots(uid)

    if data == "back_to_list":
        keyboard = []
        for b in bots:
            alive = is_pid_alive(b.get('pid'))
            s = "🟢" if alive else "🔴"
            rt_icon = "🐍" if b.get('runtime') == 'python' else ("🟨" if b.get('runtime') == 'nodejs' else ("⚙️" if b.get('runtime') == 'cpp' else "🔥"))
            keyboard.append([InlineKeyboardButton(f"{s} {rt_icon} {b['name'][:22]}", callback_data=f"manage_{b['id']}")])
        await query.edit_message_text("📊 *Mashaariicdaada:*", reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
        return

    if data.startswith('manage_'):
        b_id = data[7:]
        bot = next((b for b in bots if b['id'] == b_id), None)
        if not bot:
            await query.edit_message_text("⚠️ Mashruucan lama helin.")
            return

        alive = is_pid_alive(bot.get('pid'))
        status_str = "🟢 Online" if alive else "🔴 Offline"

        text = (
            f"⚙️ *MAAMULKA: {bot['name']}*\n"
            f"-----------------------------------\n"
            f"⚡ Runtime: `{bot.get('runtime', 'python').upper()}`\n"
            f"📁 File: `{bot['file']}`\n"
            f"🏃 Run: `{bot.get('run_cmd')}`\n"
            f"📊 Xaaladda: {status_str}\n"
            f"🔢 PID: `{bot.get('pid') or 'None'}`\n"
            f"-----------------------------------\n"
        )
        keyboard = [
            [
                InlineKeyboardButton("▶️ Start", callback_data=f"start_{b_id}"),
                InlineKeyboardButton("⏹ Stop", callback_data=f"stop_{b_id}"),
                InlineKeyboardButton("🔄 Restart", callback_data=f"restart_{b_id}")
            ],
            [
                InlineKeyboardButton("📋 Live Logs", callback_data=f"logs_{b_id}"),
                InlineKeyboardButton("🔨 Build Logs", callback_data=f"buildlogs_{b_id}"),
                InlineKeyboardButton("🗑 Delete", callback_data=f"del_{b_id}")
            ],
            [
                InlineKeyboardButton("🔙 Dib u laabo", callback_data="back_to_list")
            ]
        ]
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')
        return

    for action in ['start', 'stop', 'restart', 'logs', 'buildlogs', 'del']:
        if data.startswith(f"{action}_"):
            b_id = data[len(action)+1:]
            bot = next((b for b in bots if b['id'] == b_id), None)
            if not bot:
                return

            if action == 'start':
                if is_pid_alive(bot.get('pid')):
                    await query.edit_message_text("⚠️ Mashruucu mar hore ayuu shaqaynayaa.")
                    return
                try:
                    p = launch_process(bot)
                    db_update_bot_pid_status(b_id, p.pid, 'Running')
                    await query.edit_message_text(f"🚀 *{bot['name']}* waa la kiciyey!\nPID: `{p.pid}`", parse_mode='Markdown')
                except Exception as e:
                    await query.edit_message_text(f"❌ Khalad kicin: `{e}`", parse_mode='Markdown')

            elif action == 'stop':
                if is_pid_alive(bot.get('pid')):
                    try:
                        os.kill(bot['pid'], signal.SIGTERM)
                    except Exception:
                        pass
                db_update_bot_pid_status(b_id, None, 'Stopped')
                await query.edit_message_text(f"⏹ *{bot['name']}* waa la joojiyey.", parse_mode='Markdown')

            elif action == 'restart':
                if is_pid_alive(bot.get('pid')):
                    try:
                        os.kill(bot['pid'], signal.SIGTERM)
                    except Exception:
                        pass
                    await asyncio.sleep(1)
                try:
                    p = launch_process(bot)
                    db_update_bot_pid_status(b_id, p.pid, 'Running')
                    await query.edit_message_text(f"🔄 *{bot['name']}* dib ayaa loo kiciyey!\nPID: `{p.pid}`", parse_mode='Markdown')
                except Exception as e:
                    await query.edit_message_text(f"❌ Khalad restart: `{e}`", parse_mode='Markdown')

            elif action == 'logs':
                ud = os.path.dirname(bot['path'])
                log_p = os.path.join(ud, "out.log")
                err_p = os.path.join(ud, "err.log")
                content = ""
                if os.path.exists(log_p):
                    with open(log_p, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()[-15:]
                        content += "".join(lines)
                if os.path.exists(err_p) and os.path.getsize(err_p) > 0:
                    with open(err_p, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()[-10:]
                        if lines:
                            content += "\n[ERRORS]:\n" + "".join(lines)

                if not content:
                    content = "Wax logs ah laguma hayo wali."
                keyboard = [[InlineKeyboardButton("🔙 Dib", callback_data=f"manage_{b_id}")]]
                await query.edit_message_text(f"📋 *Live Logs ({bot['name']}):*\n```\n{content[-3500:]}\n```", reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

            elif action == 'buildlogs':
                ud = os.path.dirname(bot['path'])
                b_log = os.path.join(ud, "build.log")
                content = "Wax build logs ah lama hayo."
                if os.path.exists(b_log):
                    with open(b_log, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()[-3500:]
                keyboard = [[InlineKeyboardButton("🔙 Dib", callback_data=f"manage_{b_id}")]]
                await query.edit_message_text(f"🔨 *Build Logs ({bot['name']}):*\n```\n{content}\n```", reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

            elif action == 'del':
                if is_pid_alive(bot.get('pid')):
                    try:
                        os.kill(bot['pid'], signal.SIGKILL)
                    except Exception:
                        pass
                ud = os.path.dirname(bot['path'])
                if os.path.exists(ud):
                    try:
                        shutil.rmtree(ud)
                    except Exception:
                        pass
                db_delete_bot(b_id)
                await query.edit_message_text("🗑 Mashruuca waa laga tirtiray nidaamka.", parse_mode='Markdown')
            return

# =====================================================================
#  24/7 AUTO RECOVERY WATCHDOG
# =====================================================================

async def monitor_24_7(context: ContextTypes.DEFAULT_TYPE):
    for bot in db_get_all_bots():
        if bot.get('status') == 'Running' and not is_pid_alive(bot.get('pid')):
            try:
                p = launch_process(bot)
                db_update_bot_pid_status(bot['id'], p.pid, 'Running')
                logger.info(f"Auto-recovered {bot['name']} (PID: {p.pid})")
            except Exception as e:
                logger.error(f"Auto-recovery failed for {bot['name']}: {e}")

# =====================================================================
#  MAIN ENTRYPOINT
# =====================================================================

def main():
    os.makedirs(BASE_PROJECT_DIR, exist_ok=True)
    app = Application.builder().token(TOKEN).build()
    app.job_queue.run_repeating(monitor_24_7, interval=15, first=5)

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("newhosting", new_hosting))
    app.add_handler(CommandHandler("status", status))
    app.add_handler(CallbackQueryHandler(button_handler))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_password))

    print("=" * 65)
    print("  🚀 HOSTING PRO ENTERPRISE v25.0 - ONLINE & READY")
    print(f"  Telegram Bot: https://t.me/{(TOKEN.split(':')[0])}")
    print("  Runtimes: Python 🐍 | Node.js 🟨 | C++ ⚙️ | Polyglot 🔥")
    print("=" * 65)
    app.run_polling(drop_pending_updates=True)

if __name__ == '__main__':
    main()
