#!/usr/bin/env node
"use strict";

// electron daemon — launched by playwright-cli.js as a subprocess.
// assembles a playwright CLI daemon with electron browser support.
//
// receives CLI args:
//   --daemon=<socketPath>     unix socket path to listen on
//   --config=<configFile>     optional path to config JSON file
//   --user-data-dir=<path>    optional user data directory

const fs = require("fs");
const path = require("path");

const playwrightDir = path.dirname(require.resolve("playwright/package.json"));

function resolveInternal(relativePath) {
  return path.join(playwrightDir, relativePath);
}

// --- import playwright internals via absolute paths ---

const { BrowserServerBackend } = require(
  resolveInternal("lib/mcp/browser/browserServerBackend.js"),
);
const { resolveConfig } = require(resolveInternal("lib/mcp/browser/config.js"));
const { startMcpDaemonServer } = require(
  resolveInternal("lib/mcp/terminal/daemon.js"),
);
const { browserTools } = require(resolveInternal("lib/mcp/browser/tools.js"));
const { commands } = require(resolveInternal("lib/mcp/terminal/commands.js"));
const { z } = require("playwright-core/lib/mcpBundle");

// --- import our electron extensions ---

const { ElectronContextFactory } = require("./electron-context-factory");
const electronTools = require("./electron-tools");

// --- parse CLI args ---

const args = require("minimist")(process.argv.slice(2));
const socketPath = args.daemon;
if (!socketPath) {
  console.error("--daemon=<socketPath> is required");
  process.exit(1);
}

async function main() {
  // load config file if provided
  let userConfig = {};
  if (args.config && fs.existsSync(args.config)) {
    userConfig = JSON.parse(fs.readFileSync(args.config, "utf-8"));
  }

  // set user data dir if provided
  if (args["user-data-dir"]) {
    userConfig.browser = userConfig.browser || {};
    userConfig.browser.userDataDir = args["user-data-dir"];
  }

  // electron uses file: protocol — without this, Context._setupBrowserContext
  // calls _setAllowedProtocols which blocks file: URLs
  userConfig.allowUnrestrictedFileAccess = true;

  // resolve full config by merging with playwright defaults
  const config = await resolveConfig(userConfig);

  // apply daemon-mode overrides (matches program.js daemon setup)
  config.outputDir = path.join(process.cwd(), ".playwright-cli");
  config.outputMode = "file";
  config.codegen = "none";
  config.snapshot.mode = "full";
  config.capabilities = ["core", "internal", "tracing", "pdf", "vision"];

  // register electron tools into the global browserTools array.
  // BrowserServerBackend's constructor calls filteredTools(config) which
  // reads from this same array reference, so pushing here ensures
  // electron tools are included.
  browserTools.push(...electronTools);

  // register electron CLI commands so the daemon's parseCliCommand can
  // dispatch them. the commands object is shared by reference with daemon.js.
  commands["electron_evaluate"] = {
    name: "electron_evaluate",
    description: "execute JavaScript in the Electron main process",
    args: z.object({
      expression: z
        .string()
        .describe('JS expression, e.g. "electron => electron.app.getName()"'),
    }),
    toolName: "electron_evaluate",
    toolParams: ({ expression }) => ({ expression }),
  };
  commands["electron_windows"] = {
    name: "electron_windows",
    description: "list all open Electron windows",
    args: z.object({}),
    toolName: "electron_windows",
    toolParams: () => ({}),
  };

  // create the backend factory
  const factory = new ElectronContextFactory(config);
  const serverBackendFactory = {
    create: () => new BrowserServerBackend(config, factory),
  };

  // start listening on the unix socket
  const resolvedPath = await startMcpDaemonServer(
    socketPath,
    serverBackendFactory,
  );
  console.error(`Electron daemon listening on ${resolvedPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
