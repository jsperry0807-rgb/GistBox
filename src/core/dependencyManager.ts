import fs from "fs-extra";
import path from "path";
import os from "os";
import crypto from "crypto";
import { execa } from "execa";
import inquirer from "inquirer";
import { builtinModules } from "module";

const TEMP_DIR = path.join(os.homedir(), ".mycli", "temp");

interface DepsInstallResult {
  nodeModulesPath: string;
  cleanup: () => Promise<void>;
}

interface SandboxResult {
  sandboxDir: string;
  scriptPath: string;
  nodeModulesPath: string;
  cleanup: () => Promise<void>;
}

export class DependencyManager {
  private getDependencyHash(scriptPath: string, deps: string[]): string {
    const hash = crypto.createHash("md5");
    hash.update(scriptPath);
    deps.sort().forEach((d) => hash.update(d));
    return hash.digest("hex");
  }

  /**
   * Simple parser to extract required module names from a Node.js script.
   * Looks for `require('module')` and `import ... from 'module'` statements.
   * This is not perfect but works for most common cases.
   */
  parseDependencies(scriptContent: string): string[] {
    const deps = new Set<string>();

    // Match require('...') or require("...")
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = requireRegex.exec(scriptContent)) !== null) {
      const dep = match[1];
      if (dep) deps.add(dep);
    }

    // Match import ... from '...'
    const importFromRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = importFromRegex.exec(scriptContent)) !== null) {
      const dep = match[1];
      if (dep) deps.add(dep);
    }

    // Match import '...'
    const importDirectRegex = /import\s+['"]([^'"]+)['"]/g;
    while ((match = importDirectRegex.exec(scriptContent)) !== null) {
      const dep = match[1];
      if (dep) deps.add(dep);
    }

    // Filter out Node.js core modules and relative paths
    return Array.from(deps).filter(
      (dep) =>
        !dep.startsWith(".") &&
        !dep.startsWith("/") &&
        !builtinModules.includes(dep),
    );
  }

  /**
   * Detect if a script uses ES module syntax (import/export).
   */
  detectModuleType(scriptContent: string): "esm" | "cjs" {
    // Check for import/export statements
    const hasImportExport =
      /^\s*import\s+.*\s+from\s*['"]|^\s*export\s+(default\s+)?[a-z{]|import\s*\(/im.test(
        scriptContent,
      );
    return hasImportExport ? "esm" : "cjs";
  }

  /**
   * Ask user for permission to install dependencies.
   */
  async confirmInstall(deps: string[]): Promise<boolean> {
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `This gist requires the following dependencies: ${deps.join(", ")}. Install them in a temporary sandbox?`,
        default: true,
      },
    ]);
    return confirm;
  }

  /**
   * Install dependencies in a temporary directory and return the path to node_modules.
   */
  async installDependencies(
    scriptPath: string,
    deps: string[],
  ): Promise<DepsInstallResult> {
    const hash = this.getDependencyHash(scriptPath, deps);
    const installDir = path.join(TEMP_DIR, hash);
    const nodeModulesPath = path.join(installDir, "node_modules");

    // Check if already installed
    if (await fs.pathExists(nodeModulesPath)) {
      return {
        nodeModulesPath,
        cleanup: () => fs.remove(installDir),
      };
    }

    // Create fresh directory
    await fs.ensureDir(installDir);

    // Generate package.json
    const pkgJson = {
      name: "gist-deps",
      version: "1.0.0",
      private: true,
      dependencies: Object.fromEntries(deps.map((d) => [d, "latest"])),
    };
    await fs.writeJSON(path.join(installDir, "package.json"), pkgJson, {
      spaces: 2,
    });

    // Run npm install
    try {
      await execa("npm", ["install"], { cwd: installDir, stdio: "inherit" });
    } catch (error) {
      await fs.remove(installDir);
      throw new Error(`Failed to install dependencies: ${error}`);
    }

    return {
      nodeModulesPath,
      cleanup: () => fs.remove(installDir),
    };
  }

  /**
   * Create a sandbox for a script: copies script, installs dependencies, sets up package.json.
   */
  async createSandbox(
    originalScriptPath: string,
    deps: string[],
  ): Promise<SandboxResult> {
    const scriptContent = await fs.readFile(originalScriptPath, "utf-8");
    const moduleType = this.detectModuleType(scriptContent);
    const hash = this.getDependencyHash(originalScriptPath, deps);
    const sandboxDir = path.join(TEMP_DIR, hash);
    const nodeModulesPath = path.join(sandboxDir, "node_modules");
    const scriptFileName = path.basename(originalScriptPath);
    const scriptPath = path.join(sandboxDir, scriptFileName);

    // If sandbox already exists and has the script, reuse it
    if (await fs.pathExists(scriptPath)) {
      return {
        sandboxDir,
        scriptPath,
        nodeModulesPath,
        cleanup: () => fs.remove(sandboxDir),
      };
    }

    // Create fresh directory
    await fs.ensureDir(sandboxDir);

    // Copy script
    await fs.copy(originalScriptPath, scriptPath);

    // Generate package.json with correct module type
    const pkgJson: any = {
      name: "gist-sandbox",
      version: "1.0.0",
      private: true,
    };
    if (moduleType === "esm") {
      pkgJson.type = "module";
    }
    if (deps.length > 0) {
      pkgJson.dependencies = Object.fromEntries(deps.map((d) => [d, "latest"]));
    }
    await fs.writeJSON(path.join(sandboxDir, "package.json"), pkgJson, {
      spaces: 2,
    });

    // Install dependencies if any
    if (deps.length > 0) {
      try {
        await execa("npm", ["install"], { cwd: sandboxDir, stdio: "inherit" });
      } catch (error) {
        await fs.remove(sandboxDir);
        throw new Error(`Failed to install dependencies: ${error}`);
      }
    }

    return {
      sandboxDir,
      scriptPath,
      nodeModulesPath,
      cleanup: () => fs.remove(sandboxDir),
    };
  }
}
