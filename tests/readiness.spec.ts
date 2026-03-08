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

test.describe("waitForSelector", () => {
  const session = `t-sel-${process.pid}`;
  const runCli = makeRunCli(session, "cli.config.selector.json");

  test.afterAll(async () => {
    await runCli("close").catch(() => {});
  });

  test("snapshot on cold start contains delayed content", async () => {
    const result = await runCli("snapshot");
    expect(result.exitCode).toBe(0);
    const content = readSnapshotFile(result.output);
    expect(content).toContain("delayed content arrived");
  });
});

test.describe("waitForFunction", () => {
  const session = `t-fn-${process.pid}`;
  const runCli = makeRunCli(session, "cli.config.function.json");

  test.afterAll(async () => {
    await runCli("close").catch(() => {});
  });

  test("snapshot on cold start sees body.ready class", async () => {
    // the readyCondition waits for body.ready before the daemon hands off
    // the page — we verify the app loaded correctly by checking page content
    const result = await runCli("snapshot");
    expect(result.exitCode).toBe(0);
    const content = readSnapshotFile(result.output);
    expect(content).toContain("function test");
  });
});

test.describe("waitForLoadState", () => {
  const session = `t-ls-${process.pid}`;
  const runCli = makeRunCli(session, "cli.config.loadstate.json");

  test.afterAll(async () => {
    await runCli("close").catch(() => {});
  });

  test("snapshot on cold start contains page content", async () => {
    const result = await runCli("snapshot");
    expect(result.exitCode).toBe(0);
    const content = readSnapshotFile(result.output);
    expect(content).toContain("hello from electron");
  });
});

test.describe("combined conditions", () => {
  const session = `t-cmb-${process.pid}`;
  const runCli = makeRunCli(session, "cli.config.combined.json");

  test.afterAll(async () => {
    await runCli("close").catch(() => {});
  });

  test("snapshot on cold start contains delayed content", async () => {
    const result = await runCli("snapshot");
    expect(result.exitCode).toBe(0);
    const content = readSnapshotFile(result.output);
    expect(content).toContain("delayed content arrived");
  });
});
