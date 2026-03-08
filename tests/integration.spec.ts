import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { test, expect } from "@playwright/test";

type CliResult = {
  output: string;
  error: string;
  exitCode: number | null;
};

const SESSION = `test-${process.pid}`;
const REPO_ROOT = path.join(__dirname, "..");

async function runCli(...args: string[]): Promise<CliResult> {
  const cliPath = path.join(REPO_ROOT, "playwright-cli.js");

  return new Promise<CliResult>((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const childProcess = spawn(
      process.execPath,
      [cliPath, `--session=${SESSION}`, ...args],
      {
        env: {
          ...process.env,
          PLAYWRIGHT_MCP_CONFIG: path.join(
            REPO_ROOT,
            "tests/fixtures/.playwright/cli.config.json",
          ),
        },
        cwd: REPO_ROOT,
        timeout: 30000,
      },
    );

    childProcess.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    childProcess.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    childProcess.on("close", (code) => {
      resolve({
        output: stdout.trim(),
        error: stderr.trim(),
        exitCode: code,
      });
    });

    childProcess.on("error", reject);
  });
}

// read the snapshot file referenced in CLI output (e.g. "- File: .playwright-cli/snapshot-1.yml")
function readSnapshotFile(output: string): string {
  const match = output.match(/File:\s*(.+\.yml)/);
  if (!match) return output;
  const filePath = path.join(REPO_ROOT, match[1]);
  if (!fs.existsSync(filePath)) return output;
  return fs.readFileSync(filePath, "utf-8");
}

test.afterAll(async () => {
  // ensure the daemon is stopped even if tests fail partway through
  await runCli("close").catch(() => {});
});

test("snapshot returns page content", async () => {
  const result = await runCli("snapshot");
  expect(result.exitCode).toBe(0);
  const content = readSnapshotFile(result.output);
  expect(content).toContain("hello from electron");
});

test("screenshot writes a file", async () => {
  const result = await runCli("screenshot");
  expect(result.exitCode).toBe(0);
  expect(result.output).toContain(".playwright-cli");
  expect(result.output).toContain(".png");
});

test("snapshot contains interactive elements", async () => {
  const result = await runCli("snapshot");
  expect(result.exitCode).toBe(0);
  const content = readSnapshotFile(result.output);
  expect(content).toContain("submit");
  expect(content).toContain("enter name");
});

test("electron_evaluate runs in main process", async () => {
  const result = await runCli(
    "electron_evaluate",
    "electron => electron.app.getName()",
  );
  expect(result.exitCode).toBe(0);
  expect(result.output).toBeTruthy();
});

test("electron_windows lists windows", async () => {
  const result = await runCli("electron_windows");
  expect(result.exitCode).toBe(0);
  expect(result.output).toContain("hello from electron");
});

test("close shuts down cleanly", async () => {
  const result = await runCli("close");
  expect(result.exitCode).toBe(0);
});
