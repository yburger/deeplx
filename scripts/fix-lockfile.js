#!/usr/bin/env node

/**
 * Fix package-lock.json sync issues
 * This script helps resolve npm ci failures by regenerating the lock file
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
  console.log("\n" + colorize("=".repeat(50), "cyan"));
  console.log(colorize(message.toUpperCase(), "bright"));
  console.log(colorize("=".repeat(50), "cyan") + "\n");
}

function runCommand(command, description) {
  log(`🔄 ${description}...`, "blue");
  try {
    execSync(command, { stdio: "inherit" });
    log(`✅ ${description} completed`, "green");
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, "red");
    return false;
  }
}

function main() {
  logHeader("Package Lock File Fix");

  log(
    "This script will fix package-lock.json sync issues for CI/CD deployment.",
    "cyan"
  );

  // Check if package.json exists
  if (!fs.existsSync("package.json")) {
    log("❌ package.json not found. Run this from the repository root.", "red");
    process.exit(1);
  }

  // Remove existing lock files
  const lockFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];

  log("🧹 Cleaning up existing lock files...", "blue");
  lockFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      log(`Removing ${file}...`, "yellow");
      fs.unlinkSync(file);
    }
  });

  // Remove node_modules if it exists
  if (fs.existsSync("node_modules")) {
    log("Removing node_modules...", "yellow");
    if (process.platform === "win32") {
      runCommand("rmdir /s /q node_modules", "Remove node_modules (Windows)");
    } else {
      runCommand("rm -rf node_modules", "Remove node_modules");
    }
  }

  // Clear npm cache
  log("🗑️ Clearing npm cache...", "blue");
  runCommand("npm cache clean --force", "Clear npm cache");

  // Install dependencies to generate new lock file
  log("📦 Installing dependencies to generate new lock file...", "blue");
  if (!runCommand("npm install", "Install dependencies")) {
    log("❌ Failed to install dependencies", "red");
    process.exit(1);
  }

  // Verify the installation
  if (!fs.existsSync("package-lock.json")) {
    log("❌ package-lock.json was not generated", "red");
    process.exit(1);
  }

  if (!fs.existsSync("node_modules")) {
    log("❌ node_modules was not created", "red");
    process.exit(1);
  }

  // Test that npm ci would work now
  log("🧪 Testing npm ci compatibility...", "blue");

  // Save current node_modules
  if (fs.existsSync("node_modules_backup")) {
    if (process.platform === "win32") {
      runCommand("rmdir /s /q node_modules_backup", "Remove old backup");
    } else {
      runCommand("rm -rf node_modules_backup", "Remove old backup");
    }
  }

  if (process.platform === "win32") {
    runCommand("move node_modules node_modules_backup", "Backup node_modules");
  } else {
    runCommand("mv node_modules node_modules_backup", "Backup node_modules");
  }

  // Test npm ci
  const ciSuccess = runCommand("npm ci", "Test npm ci");

  if (ciSuccess) {
    log("✅ npm ci test successful!", "green");
    // Remove backup
    if (process.platform === "win32") {
      runCommand("rmdir /s /q node_modules_backup", "Remove backup");
    } else {
      runCommand("rm -rf node_modules_backup", "Remove backup");
    }
  } else {
    log("⚠️ npm ci test failed, restoring backup...", "yellow");
    // Restore backup
    if (fs.existsSync("node_modules")) {
      if (process.platform === "win32") {
        runCommand("rmdir /s /q node_modules", "Remove failed install");
      } else {
        runCommand("rm -rf node_modules", "Remove failed install");
      }
    }

    if (process.platform === "win32") {
      runCommand("move node_modules_backup node_modules", "Restore backup");
    } else {
      runCommand("mv node_modules_backup node_modules", "Restore backup");
    }
  }

  logHeader("Fix Complete");

  if (ciSuccess) {
    log("🎉 Package lock file has been fixed!", "green");
    log(
      "Your repository should now work with npm ci in CI/CD environments.",
      "bright"
    );
    log("\nNext steps:", "cyan");
    log("1. Commit the new package-lock.json file", "blue");
    log("2. Push to trigger CI/CD deployment", "blue");
    log("3. Run tests: npm test", "blue");
  } else {
    log("❌ Could not fix the lock file issue.", "red");
    log("You may need to manually resolve dependency conflicts.", "yellow");
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
