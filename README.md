# electron-playwright-cli

A fork of [playwright-cli](https://github.com/microsoft/playwright-cli) that adds Electron desktop app support. All standard Playwright CLI commands work, plus Electron-specific ones for interacting with the main process and listing windows.

## Install

```bash
npm install -g electron-playwright-cli playwright
```

`playwright` is a peer dependency and must be installed alongside.

## Configuration

Create `.playwright/cli.config.json` in your project root:

```json
{
  "browser": {
    "launchOptions": {
      "args": ["path/to/your/main.js"]
    }
  }
}
```

The `args` array is passed to Electron. Point it at your app's main process entry point.

The daemon shuts down automatically when the Electron app closes (via `close` or the app exiting on its own). The next command spawns a fresh daemon that reads the current config from disk, so config changes take effect immediately — no need to manually kill the daemon.

Optional launch options:
- `executablePath`: path to the Electron binary (defaults to the one in node_modules)
- `cwd`: working directory for the Electron process
- `env`: additional environment variables
- `timeout`: launch timeout in milliseconds

### App readiness

By default, the CLI waits for the `load` event and a paint frame before accepting commands. For apps with async rendering (React, etc.), the first screenshot may still capture a blank page. Use `readyCondition` to tell the CLI when your app is actually ready:

```json
{
  "browser": {
    "launchOptions": {
      "args": ["main.js"]
    },
    "readyCondition": {
      "waitForSelector": "[data-testid='app-ready']",
      "timeout": 10000
    }
  }
}
```

Available options (all optional, can be combined):

| Option | Type | Description |
|---|---|---|
| `waitForSelector` | CSS selector | Waits for the element to be visible |
| `waitForFunction` | JS expression | Waits for the expression to return truthy (e.g. `"document.fonts.ready"`) |
| `waitForLoadState` | `"load"` \| `"domcontentloaded"` \| `"networkidle"` | Waits for the specified load state |
| `timeout` | number (ms) | Timeout for all conditions (default: 10000) |

A double `requestAnimationFrame` paint wait always runs after any conditions, ensuring pixels are rendered before the first command.

## Usage

```bash
# take a snapshot of the running app
electron-playwright-cli snapshot

# interact with elements using refs from the snapshot
electron-playwright-cli click e15
electron-playwright-cli fill e3 "hello world"
electron-playwright-cli type "search query"
electron-playwright-cli press Enter

# take a screenshot
electron-playwright-cli screenshot --filename=app.png

# evaluate in the electron main process
electron-playwright-cli electron_evaluate "electron => electron.app.getName()"

# list all electron windows
electron-playwright-cli electron_windows
```

All standard commands from playwright-cli are available: `goto`, `snapshot`, `click`, `fill`, `type`, `press`, `screenshot`, `tab-list`, `tab-select`, `cookie-list`, `localstorage-get`, `route`, `console`, `network`, `tracing-start`, `tracing-stop`, `run-code`, and more. See the [skill reference](skills/playwright-cli/SKILL.md) for the full command list.

## How it works

electron-playwright-cli replaces the standard browser launch flow with a custom daemon that composes Playwright's internal `BrowserServerBackend` with an `ElectronContextFactory`. When you run a command, the CLI client spawns (or connects to) a background daemon process that launches your Electron app via `playwright._electron.launch()`, registers Electron-specific tools (like `electron_evaluate` and `electron_windows`) into Playwright's tool registry, and exposes the full Playwright CLI command surface over a Unix socket using newline-delimited JSON.

## Install as Agent Skill

```bash
npx skills add spacecake-labs/electron-playwright-cli
```

Works with Claude Code, Cursor, Codex, and [40+ other agents](https://skills.sh).

## try [spacecake](https://spacecake.ai) — the best interface for claude code

## Upstream

This project is a fork of [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli), licensed under Apache-2.0.

## License

Apache-2.0
