import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.join(process.cwd(), 'src');
const TEST_DIR = path.join(process.cwd(), 'src/__tests__/auto-generated');

// Folders to exclude from auto-generation (already manually tested or irrelevant)
const EXCLUDE_DIRS = new Set(['__tests__', 'fonts', 'styles', 'types', '.next']);
const EXCLUDE_FILES = new Set(['layout.tsx', 'error.tsx', 'loading.tsx', 'not-found.tsx', 'middleware.ts', 'globals.css']);

function getGenerator(filePath) {
  const ext = path.extname(filePath);
  const relPath = path.relative(SRC_DIR, filePath).replaceAll('\\', '/');
  const importPath = `@/${relPath.replace(/\.(ts|tsx)$/, '')}`;
  const helperPath = `@/__tests__/smoke-test-helper`;

  if (ext === '.tsx') {
    return `import { describe, it } from "vitest";
import * as Module from "${importPath}";
import { smokeTestReact } from "${helperPath}";

describe("Smoke: ${relPath}", () => {
  it("renders", () => smokeTestReact(Module, "${relPath}"));
});
`;
  } else {
    return `import { describe, it } from "vitest";
import { smokeTestModule } from "${helperPath}";

describe("Smoke: ${relPath}", () => {
  it("imports", () => smokeTestModule("${importPath}"));
});
`;
  }
}

function walk(dir, currentTestDir) {
  if (!fs.existsSync(dir)) return;
  
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (EXCLUDE_DIRS.has(file)) continue;
      walk(fullPath, path.join(currentTestDir, file));
      continue;
    }

    if (EXCLUDE_FILES.has(file) || !/\.(ts|tsx)$/.test(file) || /\.(test|d)\.ts(x?)$/.test(file)) {
      continue;
    }

    const outPath = path.join(currentTestDir, file.replace(/\.(ts|tsx)$/, '.test.$1'));
    if (!fs.existsSync(currentTestDir)) fs.mkdirSync(currentTestDir, { recursive: true });
    fs.writeFileSync(outPath, getGenerator(fullPath));
  }
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    console.log("Cleaned:", TEST_DIR);
  }
}

console.log("Starting test generation...");
cleanup();
walk(SRC_DIR, TEST_DIR);
console.log("Generation complete.");
