// mitre-board-app/src/server/types.ts

export interface GitHubRuleSourceConfig {
  name: string;
  description: string;
  enabled: boolean;
  type: 'github';
  repoOwner: string;
  repoName: string;
  basePath: string; // e.g., "Solutions"
  ruleFolderNames: string[]; // e.g., ["Analytics Rules", "Analytic Rules"]
  parserType: string; // For future extensibility if parsing logic differs
}

export interface FetchedRuleFile {
  path: string; // Full path within the repo, e.g., "Solutions/Microsoft Entra ID/Analytic Rules/myrule.yaml"
  content: string;
  sourceName: string; // From GitHubRuleSourceConfig.name
}

// For future extensibility: parser registry type
export type RuleParserFunction = (content: string, sourceName: string) => RuleYaml | null;

export interface RuleYaml {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  tactics?: string[];
  relevantTechniques?: string[];
  // Add other fields as needed
}
