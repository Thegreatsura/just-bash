import { describe, expect, it } from "vitest";
import { BashEnv } from "./BashEnv.js";

describe("exec options", () => {
  describe("per-exec env", () => {
    it("should use env vars for single execution", async () => {
      const env = new BashEnv();
      const result = await env.exec("echo $FOO", { env: { FOO: "bar" } });
      expect(result.stdout).toBe("bar\n");
    });

    it("should not persist env vars after execution", async () => {
      const env = new BashEnv();
      await env.exec("echo $FOO", { env: { FOO: "bar" } });
      const result = await env.exec("echo $FOO");
      expect(result.stdout).toBe("\n"); // FOO should not be set
    });

    it("should merge with existing env vars", async () => {
      const env = new BashEnv({ env: { EXISTING: "value" } });
      const result = await env.exec("echo $EXISTING $NEW", {
        env: { NEW: "added" },
      });
      expect(result.stdout).toBe("value added\n");
    });

    it("should override existing env vars temporarily", async () => {
      const env = new BashEnv({ env: { VAR: "original" } });

      // Override temporarily
      const result1 = await env.exec("echo $VAR", { env: { VAR: "override" } });
      expect(result1.stdout).toBe("override\n");

      // Original should be restored
      const result2 = await env.exec("echo $VAR");
      expect(result2.stdout).toBe("original\n");
    });

    it("should work with multiple env vars", async () => {
      const env = new BashEnv();
      const result = await env.exec("echo $A $B $C", {
        env: { A: "1", B: "2", C: "3" },
      });
      expect(result.stdout).toBe("1 2 3\n");
    });

    it("should handle env vars with special characters", async () => {
      const env = new BashEnv();
      const result = await env.exec('echo "$MSG"', {
        env: { MSG: "hello world" },
      });
      expect(result.stdout).toBe("hello world\n");
    });
  });

  describe("per-exec cwd", () => {
    it("should use cwd for single execution", async () => {
      const env = new BashEnv({ files: { "/tmp/test/file.txt": "content" } });
      const result = await env.exec("pwd", { cwd: "/tmp/test" });
      expect(result.stdout).toBe("/tmp/test\n");
    });

    it("should not persist cwd after execution", async () => {
      const env = new BashEnv({
        files: { "/tmp/test/file.txt": "content" },
        cwd: "/",
      });
      await env.exec("pwd", { cwd: "/tmp/test" });
      const result = await env.exec("pwd");
      expect(result.stdout).toBe("/\n");
    });

    it("should resolve relative paths from per-exec cwd", async () => {
      const env = new BashEnv({
        files: { "/project/src/main.ts": "console.log('hi')" },
      });
      const result = await env.exec("cat main.ts", { cwd: "/project/src" });
      expect(result.stdout).toBe("console.log('hi')");
    });
  });

  describe("combined options", () => {
    it("should handle both env and cwd together", async () => {
      const env = new BashEnv({
        files: { "/app/config": "config file" },
        cwd: "/",
      });
      const result = await env.exec('echo "$PWD: $APP_ENV"', {
        cwd: "/app",
        env: { APP_ENV: "production" },
      });
      expect(result.stdout).toBe("/app: production\n");
    });

    it("should restore both env and cwd after execution", async () => {
      const env = new BashEnv({
        files: { "/app/config": "config" },
        cwd: "/",
        env: { MODE: "dev" },
      });

      await env.exec("echo $MODE", { cwd: "/app", env: { MODE: "prod" } });

      const cwdResult = await env.exec("pwd");
      expect(cwdResult.stdout).toBe("/\n");

      const envResult = await env.exec("echo $MODE");
      expect(envResult.stdout).toBe("dev\n");
    });
  });

  describe("error handling", () => {
    it("should restore state even on command error", async () => {
      const env = new BashEnv({ env: { VAR: "original" } });
      await env.exec("nonexistent_command", { env: { VAR: "temp" } });
      const result = await env.exec("echo $VAR");
      expect(result.stdout).toBe("original\n");
    });

    it("should restore state even on parse error", async () => {
      const env = new BashEnv({ env: { VAR: "original" } });
      await env.exec("echo ${", { env: { VAR: "temp" } });
      const result = await env.exec("echo $VAR");
      expect(result.stdout).toBe("original\n");
    });
  });

  describe("concurrent execution", () => {
    it("concurrent exec with different env options should be isolated", async () => {
      const env = new BashEnv({ env: { SHARED: "original" } });

      // Run two commands concurrently with different per-exec env
      const [result1, result2] = await Promise.all([
        env.exec("echo $VAR", { env: { VAR: "A" } }),
        env.exec("echo $VAR", { env: { VAR: "B" } }),
      ]);

      // Each should see their own VAR value (isolated state)
      expect(result1.stdout.trim()).toBe("A");
      expect(result2.stdout.trim()).toBe("B");
    });

    it("state should not be modified by concurrent exec with options", async () => {
      const env = new BashEnv({ env: { ORIGINAL: "value" } });

      await Promise.all([
        env.exec("echo $A", { env: { A: "1" } }),
        env.exec("echo $B", { env: { B: "2" } }),
      ]);

      // Original state should be unchanged
      expect(env.getEnv().ORIGINAL).toBe("value");
      // Temp vars should not persist (isolated state was used)
      expect(env.getEnv().A).toBeUndefined();
      expect(env.getEnv().B).toBeUndefined();
    });

    it("concurrent exec should each see shared original env", async () => {
      const env = new BashEnv({ env: { SHARED: "original" } });

      const [result1, result2] = await Promise.all([
        env.exec("echo $SHARED $VAR", { env: { VAR: "A" } }),
        env.exec("echo $SHARED $VAR", { env: { VAR: "B" } }),
      ]);

      // Both should see the shared original value plus their own
      expect(result1.stdout.trim()).toBe("original A");
      expect(result2.stdout.trim()).toBe("original B");
    });

    it("concurrent exec without options should share state", async () => {
      const env = new BashEnv({ env: { COUNTER: "0" } });

      // Without per-exec options, state is shared (as expected)
      // These run sequentially due to async/await nature anyway
      const results = await Promise.all([
        env.exec("echo start"),
        env.exec("echo end"),
      ]);

      expect(results[0].stdout.trim()).toBe("start");
      expect(results[1].stdout.trim()).toBe("end");
    });
  });

  describe("environment restoration verification", () => {
    it("should restore env using getEnv() after per-exec env", async () => {
      const env = new BashEnv({ env: { ORIGINAL: "value" } });

      // Verify initial state
      expect(env.getEnv().ORIGINAL).toBe("value");
      expect(env.getEnv().TEMP_VAR).toBeUndefined();

      // Run with per-exec env
      await env.exec("echo $TEMP_VAR", { env: { TEMP_VAR: "temporary" } });

      // Verify state is restored
      expect(env.getEnv().ORIGINAL).toBe("value");
      expect(env.getEnv().TEMP_VAR).toBeUndefined();
    });

    it("should restore overridden vars using getEnv()", async () => {
      const env = new BashEnv({ env: { VAR: "original" } });

      expect(env.getEnv().VAR).toBe("original");

      await env.exec("echo $VAR", { env: { VAR: "overridden" } });

      expect(env.getEnv().VAR).toBe("original");
    });

    it("should restore cwd using getCwd() after per-exec cwd", async () => {
      const env = new BashEnv({
        cwd: "/home",
        files: { "/tmp/file": "content" },
      });

      expect(env.getCwd()).toBe("/home");

      await env.exec("pwd", { cwd: "/tmp" });

      expect(env.getCwd()).toBe("/home");
    });

    it("should not leak command-set variables when using per-exec env", async () => {
      const env = new BashEnv({ env: { KEEP: "keep" } });

      // Command sets a new variable, but we're using per-exec env
      await env.exec("export NEW_VAR=created", { env: { TEMP: "temp" } });

      // NEW_VAR should not exist because env was restored
      expect(env.getEnv().NEW_VAR).toBeUndefined();
      expect(env.getEnv().TEMP).toBeUndefined();
      expect(env.getEnv().KEEP).toBe("keep");
    });

    it("should not leak command modifications to existing vars", async () => {
      const env = new BashEnv({ env: { VAR: "original" } });

      // Command modifies VAR, but we're using per-exec env
      await env.exec("export VAR=modified", { env: { OTHER: "other" } });

      // VAR should be restored to original
      expect(env.getEnv().VAR).toBe("original");
    });
  });
});
