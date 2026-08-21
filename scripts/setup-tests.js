#!/usr/bin/env node

/**
 * Test setup script for DeepLX
 * Helps set up the testing environment and resolve common issues
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = "reset") {
  console.log(colorize(message, color));
}

function logHeader(message) {
  console.log("\n" + colorize("=".repeat(60), "cyan"));
  console.log(colorize(message.toUpperCase(), "bright"));
  console.log(colorize("=".repeat(60), "cyan") + "\n");
}

function runCommand(command, description, options = {}) {
  log(`🔄 ${description}...`, "blue");
  try {
    const output = execSync(command, {
      stdio: options.silent ? "pipe" : "inherit",
      encoding: "utf8",
      ...options,
    });
    log(`✅ ${description} completed`, "green");
    return { success: true, output };
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, "red");
    return { success: false, error };
  }
}

function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);

  if (majorVersion < 18) {
    log(
      `⚠️  Node.js ${nodeVersion} detected. Node.js 18+ is recommended.`,
      "yellow"
    );
    return false;
  }

  log(`✅ Node.js ${nodeVersion} is compatible`, "green");
  return true;
}

function checkPackageJson() {
  if (!fs.existsSync("package.json")) {
    log("❌ package.json not found. Are you in the repository root?", "red");
    return false;
  }

  try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    if (!pkg.scripts || !pkg.scripts.test) {
      log("⚠️  No test script found in package.json", "yellow");
      return false;
    }

    log("✅ package.json looks good", "green");
    return true;
  } catch (error) {
    log(`❌ Error reading package.json: ${error.message}`, "red");
    return false;
  }
}

function cleanInstall() {
  log("🧹 Cleaning up old installations...", "blue");

  // Remove node_modules and lock files
  const toRemove = ["node_modules", "package-lock.json", "yarn.lock"];

  toRemove.forEach((item) => {
    if (fs.existsSync(item)) {
      log(`Removing ${item}...`, "yellow");
      if (item === "node_modules") {
        runCommand(`rm -rf ${item}`, `Remove ${item}`, { silent: true });
      } else {
        fs.unlinkSync(item);
      }
    }
  });

  log("✅ Cleanup completed", "green");
}

function installDependencies() {
  log("📦 Installing dependencies...", "blue");

  // Try npm install first
  const result = runCommand("npm install", "Install dependencies");

  if (!result.success) {
    log("⚠️  npm install failed, trying with --legacy-peer-deps...", "yellow");
    const legacyResult = runCommand(
      "npm install --legacy-peer-deps",
      "Install with legacy peer deps"
    );

    if (!legacyResult.success) {
      log(
        "❌ Installation failed. Please check the error messages above.",
        "red"
      );
      return false;
    }
  }

  return true;
}

function verifyInstallation() {
  log("🔍 Verifying installation...", "blue");

  // Check if node_modules exists
  if (!fs.existsSync("node_modules")) {
    log("❌ node_modules directory not found", "red");
    return false;
  }

  // Check if key dependencies are installed
  const keyDeps = ["jest", "typescript", "@cloudflare/workers-types"];

  for (const dep of keyDeps) {
    const depPath = path.join("node_modules", dep);
    if (!fs.existsSync(depPath)) {
      log(`❌ ${dep} not found in node_modules`, "red");
      return false;
    }
  }

  log("✅ Installation verified", "green");
  return true;
}

function runSampleTest() {
  log("🧪 Running a sample test...", "blue");

  const result = runCommand("npm run lint", "TypeScript compilation check");

  if (!result.success) {
    log(
      "⚠️  TypeScript compilation has issues. Tests may not work properly.",
      "yellow"
    );
    return false;
  }

  return true;
}

function main() {
  logHeader("DeepLX Test Environment Setup");

  log(
    "This script will help you set up the testing environment for DeepLX.",
    "cyan"
  );
  log(
    "It will clean up any existing installations and reinstall dependencies.\n",
    "cyan"
  );

  // Check prerequisites
  if (!checkNodeVersion()) {
    log("Please upgrade to Node.js 18 or higher and try again.", "red");
    process.exit(1);
  }

  if (!checkPackageJson()) {
    log(
      "Please run this script from the DeepLX repository root directory.",
      "red"
    );
    process.exit(1);
  }

  // Clean and install
  cleanInstall();

  if (!installDependencies()) {
    log("\n❌ Setup failed during dependency installation.", "red");
    log("Please check the error messages above and try again.", "yellow");
    process.exit(1);
  }

  if (!verifyInstallation()) {
    log("\n❌ Setup failed during verification.", "red");
    process.exit(1);
  }

  if (!runSampleTest()) {
    log(
      "\n⚠️  Setup completed but there may be issues with the code.",
      "yellow"
    );
  }

  // Success message
  logHeader("Setup Complete!");

  log("🎉 Test environment setup completed successfully!", "green");
  log("\nYou can now run tests using:", "bright");
  log("  npm test                 # Run all tests", "cyan");
  log("  npm run test:unit        # Run unit tests only", "cyan");
  log("  npm run test:coverage    # Run tests with coverage", "cyan");
  log("  npm run test:watch       # Run tests in watch mode", "cyan");

  log("\nFor more information, see TESTING.md", "blue");
}

if (require.main === module) {
  main();
}

module.exports = {
  checkNodeVersion,
  checkPackageJson,
  cleanInstall,
  installDependencies,
  verifyInstallation,
};
