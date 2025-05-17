// mitre-board-app/src/server/githubFetcher.ts
import type { GitHubRuleSourceConfig, FetchedRuleFile, RuleParserFunction } from './types';
import path from 'path';
import fs from 'fs';
const fsp = fs.promises;

const GITHUB_API_BASE_URL = 'https://api.github.com/repos';
const GITHUB_PAT = process.env.GITHUB_PAT;

// Parser registry for extensibility
const parserRegistry: Record<string, RuleParserFunction> = {
  AzureSentinelSolutionsV1: (content, sourceName) => {
    try {
      // Use YAML parser here if needed, fallback to JSON.parse for demo
      // In real use, import YAML and parse
      // const doc = YAML.parse(content) as any;
      // For now, just return null (parsing is handled elsewhere)
      return null;
    } catch {
      return null;
    }
  },
  // Add more parser types here as needed
};

async function getGitHubApiResponse(url: string): Promise<any> {
  const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
  if (GITHUB_PAT) {
    headers['Authorization'] = `Bearer ${GITHUB_PAT}`;
  }
  console.debug(`[githubFetcher] Fetching URL: ${url}`);
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[githubFetcher] GitHub API error for URL: ${url}`);
    console.error(`[githubFetcher] Status: ${response.status} ${response.statusText}`);
    console.error(`[githubFetcher] Response body: ${errorBody}`);
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText} - ${url} - ${errorBody}`);
  }
  console.debug(`[githubFetcher] Success: ${url}`);
  return response.json();
}

async function getRawFileContent(downloadUrl: string): Promise<string> {
  const headers: HeadersInit = {};
  if (GITHUB_PAT) {
    headers['Authorization'] = `Bearer ${GITHUB_PAT}`;
  }
  console.debug(`[githubFetcher] Downloading raw file: ${downloadUrl}`);
  const response = await fetch(downloadUrl, { headers });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[githubFetcher] Failed to download file: ${downloadUrl}`);
    console.error(`[githubFetcher] Status: ${response.status} ${response.statusText}`);
    console.error(`[githubFetcher] Response body: ${errorBody}`);
    throw new Error(`Failed to download file content: ${response.status} ${response.statusText} - ${downloadUrl}`);
  }
  console.debug(`[githubFetcher] Success downloading file: ${downloadUrl}`);
  return response.text();
}

/**
 * Load rules from the local cache directory
 */
async function loadRulesFromCache(sourceName: string): Promise<FetchedRuleFile[]> {
  const cacheDir = path.resolve(__dirname, '../../.github-rule-cache', sourceName);
  console.log(`[githubFetcher] Loading rules from cache: ${cacheDir}`);
  
  try {
    if (!fs.existsSync(cacheDir)) {
      console.log(`[githubFetcher] Cache directory does not exist: ${cacheDir}`);
      return [];
    }

    const rules: FetchedRuleFile[] = [];
    
    // Walk the directory tree recursively to find all cached rule files
    async function scanDirectory(dir: string): Promise<void> {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
          try {
            const content = await fsp.readFile(fullPath, 'utf8');
            // Calculate the relative path as it would appear in GitHub
            const relativePath = path.relative(
              path.join(cacheDir), 
              fullPath
            );
            rules.push({
              path: relativePath,
              content,
              sourceName
            });
          } catch (err) {
            console.warn(`[githubFetcher] Error reading cached file ${fullPath}: ${err}`);
          }
        }
      }
    }
    
    await scanDirectory(cacheDir);
    console.log(`[githubFetcher] Loaded ${rules.length} rules from cache for ${sourceName}`);
    return rules;
  } catch (err) {
    console.error(`[githubFetcher] Error loading rules from cache: ${err}`);
    return [];
  }
}

async function findRuleFilesInPathRecursive(
  owner: string,
  repo: string,
  currentPath: string,
  sourceName: string,
  depth = 0
): Promise<FetchedRuleFile[]> {
  if (depth > 10) {
    console.warn(`Max recursion depth reached for ${currentPath} in ${owner}/${repo}`);
    return [];
  }

  let fetchedFiles: FetchedRuleFile[] = [];
  try {
    const apiUrl = `${GITHUB_API_BASE_URL}/${owner}/${repo}/contents/${currentPath}`;
    console.debug(`[githubFetcher] Listing contents: ${apiUrl}`);
    const items = await getGitHubApiResponse(apiUrl);

    // Parallel fetch for files and directories
    const filePromises: Promise<FetchedRuleFile | null>[] = [];
    const dirPromises: Promise<FetchedRuleFile[]>[] = [];

    for (const item of items) {
      if (item.type === 'file' && (item.name.endsWith('.yaml') || item.name.endsWith('.yml'))) {
        if (item.download_url) {
          filePromises.push(
            getRawFileContent(item.download_url)
              .then(content => {
                // Save to disk for caching
                const cacheDir = path.resolve(
                  __dirname,
                  '../../.github-rule-cache',
                  sourceName,
                  path.dirname(item.path)
                );
                const cachePath = path.join(cacheDir, path.basename(item.path));
                return fsp.mkdir(cacheDir, { recursive: true })
                  .then(() => fsp.writeFile(cachePath, content, 'utf8'))
                  .then(() => ({ path: item.path, content, sourceName }));
              })
              .catch(err => {
                console.warn(`Failed to fetch file: ${item.path} - ${err}`);
                return null;
              })
          );
        } else {
          console.warn(`No download_url for file: ${item.path} in ${owner}/${repo}`);
        }
      } else if (item.type === 'dir') {
        dirPromises.push(findRuleFilesInPathRecursive(owner, repo, item.path, sourceName, depth + 1));
      }
    }

    const fileResults = await Promise.all(filePromises);
    const dirResults = await Promise.all(dirPromises);

    fetchedFiles = [
      ...fileResults.filter(Boolean) as FetchedRuleFile[],
      ...dirResults.flat()
    ];
  } catch (error) {
    console.warn(`Error listing or processing path ${currentPath} in ${owner}/${repo}:`, (error as Error).message);
  }
  return fetchedFiles;
}

export async function fetchRulesFromGitHubRepo(
  config: GitHubRuleSourceConfig,
  opts?: { 
    maxSolutions?: number; 
    maxRulesPerFolder?: number;
    useCache?: boolean;
    preferCache?: boolean; // <-- new option
  }
): Promise<FetchedRuleFile[]> {
  console.log(`Fetching rules for '${config.name}' from ${config.repoOwner}/${config.repoName}, base path: ${config.basePath}`);

  // Use cache if the option is enabled
  if (opts?.useCache) {
    console.log(`[githubFetcher] Using cached rules for ${config.name}`);
    return loadRulesFromCache(config.name);
  }

  // Prefer cache if available and non-empty
  if (opts?.preferCache) {
    const cached = await loadRulesFromCache(config.name);
    if (cached.length > 0) {
      console.log(`[githubFetcher] preferCache: Loaded ${cached.length} rules from cache for ${config.name}`);
      return cached;
    }
    console.log(`[githubFetcher] preferCache: No cache found or cache empty for ${config.name}, fetching from GitHub...`);
  }

  try {
    const solutions = await getGitHubApiResponse(
      `${GITHUB_API_BASE_URL}/${config.repoOwner}/${config.repoName}/contents/${config.basePath}`
    );

    // Collect all promises for parallel execution
    const fetchPromises: Promise<FetchedRuleFile[]>[] = [];
    
    let solutionCount = 0;
    for (const solution of solutions) {
      if (solution.type === 'dir') {
        solutionCount++;
        if (opts?.maxSolutions && solutionCount > opts.maxSolutions) break;
        
        for (const ruleFolderName of config.ruleFolderNames) {
          // Encode each segment for GitHub API
          const ruleFolderPath = [solution.path, ruleFolderName].map(s => s.split('/').map(encodeURIComponent).join('/')).join('/');
          console.log(`  Checking in solution ${solution.name}, rule folder path: ${ruleFolderPath}`);
          
          // Create promise instead of awaiting immediately
          const fetchPromise = findRuleFilesInPathRecursive(config.repoOwner, config.repoName, ruleFolderPath, config.name)
            .then(rules => opts?.maxRulesPerFolder ? rules.slice(0, opts?.maxRulesPerFolder) : rules)
            .catch(folderError => {
              console.warn(`Rule folder ${ruleFolderPath} might not exist or error accessing: ${(folderError as Error).message}`);
              return [] as FetchedRuleFile[];
            });
            
          fetchPromises.push(fetchPromise);
        }
      }
    }
    
    // Execute all promises in parallel and combine results
    const results = await Promise.all(fetchPromises);
    const allRuleFiles = results.flat();

    console.log(`Fetched ${allRuleFiles.length} rule files from '${config.name}'.`);
    return allRuleFiles;
  } catch (error) {
    console.error(`Failed to fetch solutions from ${config.repoOwner}/${config.repoName}/${config.basePath}:`, (error as Error).message);
    return [];
  }
}

export { parserRegistry };
