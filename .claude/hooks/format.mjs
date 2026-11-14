// PostToolUse hook: format the file Claude just edited with the project's Prettier.
// It does nothing until Prettier is installed, and it never blocks the edit.
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname } from 'node:path';

const SUPPORTED = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css', '.json', '.md', '.html']);

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const file = input?.tool_input?.file_path;
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const prettier = join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
  if (file && SUPPORTED.has(extname(file).toLowerCase()) && existsSync(file) && existsSync(prettier)) {
    execFileSync(process.execPath, [prettier, '--write', '--ignore-unknown', file], { stdio: 'ignore', cwd: root });
  }
} catch {
  // Formatting is best effort; never fail the tool call.
}
process.exit(0);
