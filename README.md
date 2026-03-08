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

Optional launch options:
- `executablePath`: path to the Electron binary (defaults to the one in node_modules)
- `cwd`: working directory for the Electron process
- `env`: additional environment variables
- `timeout`: launch timeout in milliseconds

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

## Upstream

This project is a fork of [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli), licensed under Apache-2.0.

## License

Apache-2.0
