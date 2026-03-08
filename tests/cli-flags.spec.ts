import path from "path";
import { spawn } from "child_process";
import { test, expect } from "@playwright/test";

type CliResult = {
  output: string;
  error: string;
  exitCode: number | null;
};

const REPO_ROOT = path.join(__dirname, "..");

async function runCli(...args: string[]): Promise<CliResult> {
  const cliPath = path.join(REPO_ROOT, "playwright-cli.js");

  return new Promise<CliResult>((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const childProcess = spawn(process.execPath, [cliPath, ...args], {
      cwd: REPO_ROOT,
      timeout: 5000,
    });

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

test("--version prints the package version", async () => {
  const result = await runCli("--version");
  expect(result.exitCode).toBe(0);
  const pkg = require(path.join(REPO_ROOT, "package.json"));
  expect(result.output).toBe(pkg.version);
});

test("-v prints the package version", async () => {
  const result = await runCli("-v");
  expect(result.exitCode).toBe(0);
  const pkg = require(path.join(REPO_ROOT, "package.json"));
  expect(result.output).toBe(pkg.version);
});

test("--help shows usage text", async () => {
  const result = await runCli("--help");
  expect(result.exitCode).toBe(0);
  expect(result.output).toContain("electron-playwright-cli");
});

test("no command exits with an error", async () => {
  const result = await runCli();
  expect(result.exitCode).toBe(1);
  expect(result.error).toContain("No command specified");
});
