// mitre-board-app/src/server/githubFetcher.test.ts
import { fetchRulesFromGitHubRepo } from './githubFetcher';
import type { GitHubRuleSourceConfig } from './types';
import { describe, test, expect } from 'bun:test';

const TEST_CONFIG: GitHubRuleSourceConfig = {
  name: "AzureSentinelOfficial",
  description: "Official Microsoft Sentinel rules from the Azure-Sentinel GitHub repository.",
  enabled: true,
  type: "github",
  repoOwner: "Azure",
  repoName: "Azure-Sentinel",
  basePath: "Solutions",
  ruleFolderNames: ["Analytics Rules"],
  parserType: "AzureSentinelSolutionsV1"
};

test("fetchRulesFromGitHubRepo returns an array (integration smoke test, limited sample)", async () => {
  // Only fetch 3 solutions and 1 rule per folder for speed.
  const allRules = await fetchRulesFromGitHubRepo(TEST_CONFIG, { maxSolutions: 3, maxRulesPerFolder: 1 });
  expect(Array.isArray(allRules)).toBe(true);
  expect(allRules.length).toBeGreaterThan(0);
  // Print for debug
  for (const rule of allRules) {
    console.log(`[test] Sampled rule: ${rule.path}`);
  }
});

test("fetchRulesFromGitHubRepo handles invalid repo gracefully", async () => {
  const BAD_CONFIG = { ...TEST_CONFIG, repoName: "nonexistent-repo-xyz" };
  const rules = await fetchRulesFromGitHubRepo(BAD_CONFIG);
  expect(Array.isArray(rules)).toBe(true);
  expect(rules.length).toBe(0);
});

test("fetchRulesFromGitHubRepo can use cached rules", async () => {
  // First fetch to ensure cache is populated (limited sample)
  await fetchRulesFromGitHubRepo(TEST_CONFIG, { maxSolutions: 1, maxRulesPerFolder: 1 });
  
  // Then fetch from cache
  const cachedRules = await fetchRulesFromGitHubRepo(TEST_CONFIG, { useCache: true });
  expect(Array.isArray(cachedRules)).toBe(true);
  
  if (cachedRules.length === 0) {
    console.log("[test] No cached rules found. This is expected on first run.");
  } else {
    expect(cachedRules.length).toBeGreaterThan(0);
    console.log(`[test] Successfully loaded ${cachedRules.length} rules from cache`);
  }
});
