#!/usr/bin/env node
"use strict";

// playwright CLI wrapper that adds electron support.
// re-implements the terminal client with shorter socket paths
// (macOS unix socket limit is 104 bytes) and spawns our electron
// daemon which composes playwright internals directly.

const crypto = require("crypto");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const cp = require("child_process");

// --- socket path computation (uses tmpdir for short paths) ---

const installationHash = crypto
  .createHash("sha1")
  .update(require.resolve("playwright/package.json"))
  .digest("hex")
  .substring(0, 16);

function daemonSocketDir() {
  const socketsDir = path.join(os.tmpdir(), "playwright-cli");
  return path.join(socketsDir, installationHash);
}

function daemonSocketPath(sessionName) {
  if (os.platform() === "win32")
    return `\\\\.\\pipe\\${installationHash}-${sessionName}.sock`;
  const socketPath = path.join(daemonSocketDir(), `${sessionName}.sock`);
  if (Buffer.byteLength(socketPath) > 104)
    throw new Error(
      `Socket path too long (${Buffer.byteLength(socketPath)} bytes, max 104). Use a shorter --session name.`,
    );
  return socketPath;
}

// --- socket session (newline-delimited JSON protocol) ---

class SocketSession {
  constructor(socket) {
    this._nextId = 1;
    this._callbacks = new Map();
    this._pendingBuffers = [];
    this._socket = socket;

    socket.on("data", (buf) => this._onData(buf));
    socket.on("close", () => this.dispose());
    socket.on("error", () => {});
  }

  async runCliCommand(args) {
    return this._send("runCliCommand", { args });
  }

  async _send(method, params = {}) {
    const id = this._nextId++;
    const msg = JSON.stringify({ id, method, params }) + "\n";
    await new Promise((resolve, reject) => {
      this._socket.write(msg, (err) => (err ? reject(err) : resolve()));
    });
    return new Promise((resolve, reject) => {
      this._callbacks.set(id, { resolve, reject });
    });
  }

  dispose() {
    for (const cb of this._callbacks.values()) cb.reject(new Error("Disposed"));
    this._callbacks.clear();
    this._socket.destroy();
  }

  _onData(buffer) {
    let end = buffer.indexOf("\n");
    if (end === -1) {
      this._pendingBuffers.push(buffer);
      return;
    }
    this._pendingBuffers.push(buffer.slice(0, end));
    this._dispatch(Buffer.concat(this._pendingBuffers).toString());
    let start = end + 1;
    end = buffer.indexOf("\n", start);
    while (end !== -1) {
      this._dispatch(buffer.toString(undefined, start, end));
      start = end + 1;
      end = buffer.indexOf("\n", start);
    }
    this._pendingBuffers = [buffer.slice(start)];
  }

  _dispatch(message) {
    let obj;
    try {
      obj = JSON.parse(message);
    } catch {
      console.error("Failed to parse daemon message:", message);
      return;
    }
    if (obj.id && this._callbacks.has(obj.id)) {
      const cb = this._callbacks.get(obj.id);
      this._callbacks.delete(obj.id);
      if (obj.error) cb.reject(new Error(obj.error));
      else cb.resolve(obj.result);
    }
  }
}

// --- daemon management ---

async function socketExists(socketPath) {
  try {
    const stat = await fs.promises.stat(socketPath);
    return stat?.isSocket();
  } catch {
    return false;
  }
}

async function connectToSocket(socketPath) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath, () => resolve(socket));
    socket.on("error", reject);
  });
}

async function connectToDaemon(sessionName) {
  const socketPath = daemonSocketPath(sessionName);

  // try to connect to existing daemon.
  // on Windows, named pipes aren't detected by stat().isSocket(),
  // so we always attempt a direct connection.
  if (os.platform() === "win32" || (await socketExists(socketPath))) {
    try {
      const socket = await connectToSocket(socketPath);
      return new SocketSession(socket);
    } catch {
      if (os.platform() !== "win32")
        await fs.promises.unlink(socketPath).catch(() => {});
    }
  }

  // ensure socket directory exists
  await fs.promises.mkdir(daemonSocketDir(), { recursive: true });

  // spawn the electron daemon
  const daemonScript = path.resolve(
    __dirname,
    "playwright-electron",
    "electron-daemon.js",
  );
  const userDataDir = path.resolve(
    daemonSocketDir(),
    `${sessionName}-user-data`,
  );

  const args = [
    daemonScript,
    `--daemon=${socketPath}`,
    `--user-data-dir=${userDataDir}`,
  ];

  // auto-inject config file if available
  const configFile =
    process.env.PLAYWRIGHT_MCP_CONFIG ||
    path.resolve(process.cwd(), ".playwright", "cli.config.json");
  if (fs.existsSync(configFile)) args.push(`--config=${configFile}`);

  const stderrLog = path.join(daemonSocketDir(), `${sessionName}-stderr.log`);
  const stderrFd = fs.openSync(stderrLog, "w");
  const child = cp.spawn(process.execPath, args, {
    detached: true,
    stdio: ["ignore", "ignore", stderrFd],
    cwd: process.cwd(),
  });
  child.unref();
  fs.closeSync(stderrFd);

  // retry connection
  const maxRetries = 50;
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((r) => setTimeout(r, 100));
    try {
      const socket = await connectToSocket(socketPath);
      return new SocketSession(socket);
    } catch (e) {
      if (e.code !== "ENOENT" && e.code !== "ECONNREFUSED") throw e;
    }
  }
  let detail = "";
  try {
    detail = fs.readFileSync(stderrLog, "utf-8").trim();
  } catch {}
  throw new Error(
    `Failed to connect to daemon at ${socketPath} after ${maxRetries * 100}ms` +
      (detail ? `\nDaemon stderr:\n${detail}` : ""),
  );
}

// --- main ---

async function main() {
  const argv = process.argv.slice(2);
  const args = require("minimist")(argv);

  if (args.version || args.v) {
    const pkg = require("./package.json");
    console.log(pkg.version);
    process.exit(0);
  }

  // load help from playwright's terminal CLI
  const playwrightDir = path.dirname(
    require.resolve("playwright/package.json"),
  );
  let help;
  try {
    help = require(path.join(playwrightDir, "lib/mcp/terminal/help.json"));
  } catch {
    help = {
      commands: {},
      global: "electron-playwright-cli <command> [options]",
    };
  }

  const commandName = args._[0];

  if (args.help || args.h) {
    if (help.commands[commandName]) {
      console.log(help.commands[commandName]);
    } else {
      console.log(
        "electron-playwright-cli - run playwright mcp commands for electron apps\n",
      );
      console.log(help.global);
    }
    process.exit(0);
  }

  if (!commandName) {
    console.error("No command specified.\n");
    console.log(help.global);
    process.exit(1);
  }

  const sessionName =
    args.session || process.env.PLAYWRIGHT_CLI_SESSION || "default";
  const session = await connectToDaemon(sessionName);
  const result = await session.runCliCommand(args);
  console.log(result);
  session.dispose();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
