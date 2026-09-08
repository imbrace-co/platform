import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { readdirSync, readFileSync, statSync } from 'fs';

const ROOT_DIR = resolve(__dirname, '..', '..', '..');
const SRC_DIR = resolve(ROOT_DIR, 'src');

/**
 * Recursively collect all files in a directory, skipping __tests__ directories.
 */
function getAllFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      // Skip test directories to avoid self-referencing
      if (entry === '__tests__' || entry === 'tests') continue;
      getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Search for a pattern across all source files in src/, excluding test and documentation files.
 * Returns an array of { file, line } matches.
 */
function grepSrc(pattern: RegExp, excludeFiles: string[] = []): { file: string; line: string }[] {
  const matches: { file: string; line: string }[] = [];
  const allFiles = getAllFiles(SRC_DIR);

  for (const filePath of allFiles) {
    // Skip non-text files
    if (!filePath.match(/\.(ts|js|json|md)$/)) continue;

    // Skip test files
    if (filePath.match(/\.(test|spec)\.(ts|js)$/)) continue;

    // Skip excluded files (MIGRATION_GUIDE.md, README.md)
    const relativePath = filePath.replace(ROOT_DIR + '\\', '').replace(ROOT_DIR + '/', '');
    if (excludeFiles.some(exc => relativePath.includes(exc))) continue;

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      if (pattern.test(line)) {
        matches.push({ file: relativePath, line: line.trim() });
      }
    }
  }

  return matches;
}

describe('Integration: Build and Verification', () => {
  /**
   * Validates: Requirements 13.1
   * The build SHALL exit with code 0.
   */
  it('npm run build exits with code 0', () => {
    // execSync throws if exit code is non-zero
    const result = execSync('npm run build', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    // If we reach here, exit code was 0
    expect(true).toBe(true);
  }, 60_000);

  /**
   * Validates: Requirements 13.5
   * Grep across src/ for removed patterns returns zero matches
   * (excluding MIGRATION_GUIDE.md and README.md).
   */
  it('removed enterprise patterns do not appear in src/', () => {
    const removedPatterns = [
      'ssoProvider',
      'googleSSO',
      'microsoftSSO',
      'azureAdSSO',
      'keycloakSSO',
      'ldapSSO',
      'MarketplaceCustomer',
      'OidcRoleMapping',
      'SocialAuthenticate',
      'signUpAWS',
    ];

    const pattern = new RegExp(removedPatterns.join('|'));
    const excludeFiles = ['MIGRATION_GUIDE.md', 'README.md'];
    const matches = grepSrc(pattern, excludeFiles);

    if (matches.length > 0) {
      const details = matches
        .map(m => `  ${m.file}: ${m.line}`)
        .join('\n');
      expect.fail(
        `Found ${matches.length} match(es) for removed patterns in src/:\n${details}`
      );
    }

    expect(matches).toHaveLength(0);
  });

  /**
   * Validates: Requirements 13.6
   * Grep across src/ for ApiKeyController or api-key.routes returns zero matches.
   */
  it('ApiKeyController and api-key.routes do not appear in src/', () => {
    const pattern = /ApiKeyController|api-key\.routes/;
    const matches = grepSrc(pattern);

    if (matches.length > 0) {
      const details = matches
        .map(m => `  ${m.file}: ${m.line}`)
        .join('\n');
      expect.fail(
        `Found ${matches.length} match(es) for ApiKeyController/api-key.routes in src/:\n${details}`
      );
    }

    expect(matches).toHaveLength(0);
  });

  /**
   * Validates: Requirements 13.7
   * ApiKeyRepository references appear ONLY in expected files.
   */
  it('ApiKeyRepository references appear only in expected files', () => {
    const pattern = /ApiKeyRepository/;
    const matches = grepSrc(pattern);

    const allowedFiles = new Set([
      'src\\domain\\repositories\\IApiKeyRepository.ts',
      'src\\infrastructure\\repositories\\DrizzleApiKeyRepository.ts',
      'src\\shared\\di\\container.ts',
      'src\\interfaces\\http\\controllers\\ThirdPartyTokenController.ts',
      // Also allow forward-slash paths for cross-platform compatibility
      'src/domain/repositories/IApiKeyRepository.ts',
      'src/infrastructure/repositories/DrizzleApiKeyRepository.ts',
      'src/shared/di/container.ts',
      'src/interfaces/http/controllers/ThirdPartyTokenController.ts',
    ]);

    const unexpectedMatches = matches.filter(m => !allowedFiles.has(m.file));

    if (unexpectedMatches.length > 0) {
      const details = unexpectedMatches
        .map(m => `  ${m.file}: ${m.line}`)
        .join('\n');
      expect.fail(
        `Found ApiKeyRepository references in unexpected files:\n${details}\n\nAllowed files: ${[...allowedFiles].filter(f => f.includes('\\')).join(', ')}`
      );
    }

    expect(unexpectedMatches).toHaveLength(0);
  });
});
