#!/usr/bin/env node

/**
 * Test runner script for DeepLX
 * Provides enhanced test execution with reporting and analysis
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ANSI color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
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

function logSection(message) {
  console.log("\n" + colorize("-".repeat(40), "blue"));
  console.log(colorize(message, "bright"));
  console.log(colorize("-".repeat(40), "blue"));
}

function runCommand(command, description) {
  logSection(description);
  try {
    const startTime = Date.now();
    const output = execSync(command, {
      stdio: "inherit",
      encoding: "utf8",
    });
    const duration = Date.now() - startTime;
    log(`✅ ${description} completed in ${duration}ms`, "green");
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, "red");
    console.error(error.message);
    return false;
  }
}

function checkTestFiles() {
  const testDirs = ["tests/lib", "tests/integration", "tests/performance"];
  let totalTests = 0;

  logSection("Test File Analysis");

  testDirs.forEach((dir) => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".test.ts"));
      log(`${dir}: ${files.length} test files`, "cyan");
      totalTests += files.length;
    }
  });

  log(`Total test files: ${totalTests}`, "bright");
  return totalTests > 0;
}

function generateTestReport() {
  logSection("Generating Test Report");

  const reportData = {
    timestamp: new Date().toISOString(),
    testSuite: "DeepLX Translation API",
    environment: process.env.NODE_ENV || "test",
    nodeVersion: process.version,
  };

  const reportPath = path.join("coverage", "test-report.json");

  try {
    if (!fs.existsSync("coverage")) {
      fs.mkdirSync("coverage", { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    log(`Test report generated: ${reportPath}`, "green");
  } catch (error) {
    log(`Failed to generate test report: ${error.message}`, "red");
  }
}

function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || "all";

  logHeader("DeepLX Test Suite Runner");

  // Check if test files exist
  if (!checkTestFiles()) {
    log("No test files found!", "red");
    process.exit(1);
  }

  let success = true;

  // Run different test suites based on argument
  switch (testType) {
    case "unit":
      success = runCommand("npm run test:unit", "Unit Tests");
      break;

    case "integration":
      success = runCommand("npm run test:integration", "Integration Tests");
      break;

    case "performance":
      success = runCommand("npm run test:performance", "Performance Tests");
      break;

    case "coverage":
      success = runCommand("npm run test:coverage", "Coverage Tests");
      break;

    case "ci":
      success = runCommand("npm run test:ci", "CI Tests");
      break;

    case "all":
    default:
      // Run all test suites
      success = runCommand("npm run lint", "Type Checking") && success;
      success = runCommand("npm run test:unit", "Unit Tests") && success;
      success =
        runCommand("npm run test:integration", "Integration Tests") && success;
      success =
        runCommand("npm run test:performance", "Performance Tests") && success;
      success =
        runCommand("npm run test:coverage", "Coverage Report") && success;
      break;
  }

  // Generate test report
  generateTestReport();

  // Final status
  logHeader("Test Suite Summary");

  if (success) {
    log("🎉 All tests passed successfully!", "green");
    log("The DeepLX translation service is ready for deployment.", "bright");
  } else {
    log("💥 Some tests failed!", "red");
    log("Please review the test output and fix any issues.", "yellow");
    process.exit(1);
  }
}

// Handle command line arguments
if (require.main === module) {
  main();
}

module.exports = { runCommand, checkTestFiles, generateTestReport };
