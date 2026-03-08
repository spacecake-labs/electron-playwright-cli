import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { test, expect } from "@playwright/test";

type CliResult = {
  output: string;
  error: string;
  exitCode: number | null;
};

const REPO_ROOT = path.join(__dirname, "..");

function readSnapshotFile(output: string): string {
  const match = output.match(/File:\s*(.+\.yml)/);
  if (!match) return output;
  const filePath = path.join(REPO_ROOT, match[1]);
  if (!fs.existsSync(filePath)) return output;
  return fs.readFileSync(filePath, "utf-8");
}

function makeRunCli(session: string, configFile: string) {
  return async function runCli(...args: string[]): Promise<CliResult> {
    const cliPath = path.join(REPO_ROOT, "playwright-cli.js");

    return new Promise<CliResult>((resolve, reject) => {
      let stdout = "";
      let stderr = "";

      const childProcess = spawn(
        process.execPath,
        [cliPath, `--session=${session}`, ...args],
        {
          env: {
            ...process.env,
            PLAYWRIGHT_MCP_CONFIG: path.join(
              REPO_ROOT,
              `tests/fixtures/.playwright/${configFile}`,
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
        if (code !== 0 && stderr) {
          console.error(`CLI stderr (exit ${code}):`, stderr.trim());
        }
        resolve({
          output: stdout.trim(),
          error: stderr.trim(),
          exitCode: code,
        });
      });

      childProcess.on("error", reject);
    });
  };
}

test.describe("daemon restart", () => {
  const session = `t-life-${process.pid}`;
  const runCli = makeRunCli(session, "cli.config.json");

  test.afterAll(async () => {
    await runCli("close").catch(() => {});
  });

  test("snapshot works after close", async () => {
    // start daemon + electron app, take a snapshot
    const result1 = await runCli("snapshot");
    expect(result1.exitCode).toBe(0);
    expect(readSnapshotFile(result1.output)).toContain("hello from electron");

    // close — daemon should exit
    await runCli("close");

    // wait for daemon to fully exit (500ms timeout + buffer)
    await new Promise((r) => setTimeout(r, 1500));

    // fresh daemon should spawn and snapshot should work
    const result2 = await runCli("snapshot");
    expect(result2.exitCode).toBe(0);
    expect(readSnapshotFile(result2.output)).toContain("hello from electron");
  });
});

test.describe("config reload", () => {
  const session = `t-cfg-${process.pid}`;

  test.afterAll(async () => {
    const runCli = makeRunCli(session, "cli.config.json");
    await runCli("close").catch(() => {});
  });

  test("new config takes effect after close", async () => {
    const runWithDefault = makeRunCli(session, "cli.config.json");
    const runWithFunction = makeRunCli(session, "cli.config.function.json");

    // start with default config — main.js shows "hello from electron"
    const result1 = await runWithDefault("snapshot");
    expect(result1.exitCode).toBe(0);
    expect(readSnapshotFile(result1.output)).toContain("hello from electron");

    // close — daemon exits, releasing the session
    await runWithDefault("close");

    // wait for daemon to fully exit
    await new Promise((r) => setTimeout(r, 1500));

    // same session, different config — main-delayed-function.js shows "function test"
    // if the old daemon were still alive, it would serve the old app content
    const result2 = await runWithFunction("snapshot");
    expect(result2.exitCode).toBe(0);
    expect(readSnapshotFile(result2.output)).toContain("function test");
  });
});
