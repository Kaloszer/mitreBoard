import { program } from 'commander';
import path from 'path';
import fs from 'fs';
import YAML from 'yaml'; // Import YAML parser

// --- Types ---
interface MitreObject {
  id: string;
  type: string;
  name: string;
  description?: string;
  external_references: { external_id: string; url?: string }[];
  kill_chain_phases?: { kill_chain_name: string; phase_name: string }[];
  x_mitre_is_subtechnique?: boolean;
  x_mitre_shortname?: string; // For tactics
  // Add other relevant fields if needed
}

interface Technique extends MitreObject {
  subTechniques: Technique[];
  tacticShortnames: string[];
}

interface Tactic extends MitreObject {
  techniques: Technique[];
}

interface MitreData {
  tactics: Tactic[];
  techniquesById: Record<string, Technique>;
  tacticsById: Record<string, Tactic>;
}

// --- Constants ---
const MITRE_ENTERPRISE_ATTACK_URL = "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json";

// --- Data Store ---
let mitreDataStore: MitreData | null = null;

// Active rules data
let activeRuleCounts: Record<string, number> = {};
interface SimpleRuleInfo {
  id: string;
  title: string;
  description: string;
}
let activeRulesByTechniqueId: Record<string, SimpleRuleInfo[]> = {};
let activeRuleContentPathById: Record<string, string> = {};

// Inactive rules data
interface InactiveRuleDetails extends SimpleRuleInfo {
    tactics: string[];
    techniques: string[]; // Includes sub-techniques like Txxxx.xxx
    satisfies: {
        tactics: number;
        techniques: number; // Base techniques only (Txxxx)
        subTechniques: number; // Sub-techniques only (Txxxx.xxx)
    };
}
let inactiveRulesData: InactiveRuleDetails[] = [];
let inactiveRuleContentPathById: Record<string, string> = {};

// --- Command Line Argument Parsing ---
program
  .version('0.0.1')
  .description('MITRE ATT&CK Board Server')
  .requiredOption('-d, --directory <path>', 'Path to the directory containing ACTIVE YAML analytic rules')
  .option('-n, --directory-not-implemented <path>', 'Path to the directory containing NOT IMPLEMENTED YAML analytic rules') // Changed -dn to -n
  .parse(process.argv);

const options = program.opts();
const activeRulesDirectoryPath = path.resolve(options.directory); // Resolve to absolute path
const inactiveRulesDirectoryPath = options.directoryNotImplemented ? path.resolve(options.directoryNotImplemented) : null; // Resolve if provided

// Validate active rules directory
if (!fs.existsSync(activeRulesDirectoryPath) || !fs.lstatSync(activeRulesDirectoryPath).isDirectory()) {
  console.error(`Error: Active rules directory not found or is not a directory: ${activeRulesDirectoryPath}`);
  process.exit(1);
}
console.log(`Using active rules directory: ${activeRulesDirectoryPath}`);

// Validate inactive rules directory if provided
if (inactiveRulesDirectoryPath) {
  if (!fs.existsSync(inactiveRulesDirectoryPath) || !fs.lstatSync(inactiveRulesDirectoryPath).isDirectory()) {
    console.error(`Error: Inactive rules directory not found or is not a directory: ${inactiveRulesDirectoryPath}`);
    process.exit(1);
  }
  console.log(`Using inactive rules directory: ${inactiveRulesDirectoryPath}`);
} else {
  console.log('No inactive rules directory provided.');
}

// --- Server Setup ---
const port = process.env.PORT ?? 3000; // Default to port 3000

console.log(`Starting server on port ${port}...`);

// --- MITRE Data Loading ---
async function loadMitreData(): Promise<MitreData> {
  console.log("Fetching MITRE ATT&CK data...");
  try {
    const response = await fetch(MITRE_ENTERPRISE_ATTACK_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch MITRE data: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("Processing MITRE data...");

    const objects = data.objects as MitreObject[];
    const tacticsById: Record<string, Tactic> = {};
    const techniquesById: Record<string, Technique> = {};
    const allTechniques: Technique[] = [];

    // 1. Process Tactics
    for (const obj of objects) {
      if (obj.type === 'x-mitre-tactic' && obj.external_references?.[0]?.external_id) {
        const tactic: Tactic = {
          ...obj,
          techniques: [],
        };
        tacticsById[obj.external_references[0].external_id] = tactic;
      }
    }

    // 2. Process Techniques (including sub-techniques)
    for (const obj of objects) {
      if (obj.type === 'attack-pattern' && obj.external_references?.[0]?.external_id) {
         const tacticShortnames = obj.kill_chain_phases
          ?.filter(kc => kc.kill_chain_name === 'mitre-attack') // Ensure correct kill chain
          .map(kc => kc.phase_name) ?? [];

        const technique: Technique = {
          ...obj,
          subTechniques: [],
          tacticShortnames: tacticShortnames,
        };
        techniquesById[obj.external_references[0].external_id] = technique;
        allTechniques.push(technique);
      }
    }

     // 3. Link Sub-techniques to Techniques and Techniques to Tactics
    for (const technique of allTechniques) {
        const externalId = technique.external_references[0].external_id;
        if (technique.x_mitre_is_subtechnique && externalId.includes('.')) {
            const parentId = externalId.split('.')[0];
            if (techniquesById[parentId]) {
                techniquesById[parentId].subTechniques.push(technique);
            } else {
                 console.warn(`Parent technique ${parentId} not found for sub-technique ${externalId}`);
            }
        } else {
             // Link non-subtechnique to tactics
            for (const shortname of technique.tacticShortnames) {
                 const tactic = Object.values(tacticsById).find(t => t.x_mitre_shortname === shortname);
                 if (tactic) {
                     tactic.techniques.push(technique);
                 } else {
                      console.warn(`Tactic with shortname ${shortname} not found for technique ${externalId}`);
                 }
            }
        }
    }

    // Sort techniques within tactics and sub-techniques within techniques
    Object.values(tacticsById).forEach(tactic => {
        tactic.techniques.sort((a, b) => a.name.localeCompare(b.name));
    });
     Object.values(techniquesById).forEach(technique => {
        technique.subTechniques.sort((a, b) => a.name.localeCompare(b.name));
    });

    const sortedTactics = Object.values(tacticsById).sort((a, b) => a.name.localeCompare(b.name)); // Or sort by a defined order if needed

    console.log(`MITRE data processed: ${sortedTactics.length} tactics, ${allTechniques.length} techniques/sub-techniques.`);
    return { tactics: sortedTactics, techniquesById, tacticsById };

  } catch (error) {
    console.error("Error loading MITRE data:", error);
    throw error; // Re-throw to prevent server start if data loading fails
  }
}

// --- YAML Rule Parsing ---
interface RuleYaml {
    id: string; // Expect rule ID in the YAML
    title?: string; // Optional title
    name?: string; // Alternative for title
    description?: string;
    tactics?: string[];
    relevantTechniques?: string[];
    // other fields are ignored for now
}

// Helper function to recursively get all files in a directory
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dirPath);

    files.forEach(function(file) {
      const fullPath = path.join(dirPath, file);
      try {
        if (fs.statSync(fullPath).isDirectory()) {
          arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
          arrayOfFiles.push(fullPath);
        }
      } catch (err) {
        console.warn(`Skipping ${fullPath}: Cannot access file/directory (${err instanceof Error ? err.message : err})`);
      }
    });
  } catch (err) {
     console.error(`Error reading directory ${dirPath}: ${err instanceof Error ? err.message : err}`);
  }

  return arrayOfFiles;
}

// Updated return type to include raw rule data for further processing
function parseRuleFiles(directoryPath: string): {
    rawRules: RuleYaml[];
    contentPaths: Record<string, string>;
} {
    console.log(`Parsing YAML rules from ${directoryPath}...`);
    const rawRules: RuleYaml[] = [];
    const contentPaths: Record<string, string> = {};
    // Keep track of seen IDs and their file paths during parsing
    const seenIdsMap = new Map<string, string>();
    const duplicateInfo: { id: string, files: string[] }[] = [];

    const yamlFiles = getAllFiles(directoryPath).filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
    console.log(`Found ${yamlFiles.length} YAML files.`);

    for (const filePath of yamlFiles) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const doc = YAML.parse(fileContent) as RuleYaml | null;

            if (doc && doc.id) {
                const ruleId = doc.id.trim();
                const normalizedRule = { // Normalize here
                    ...doc,
                    id: ruleId,
                    title: (doc.title ?? doc.name ?? ruleId).trim(),
                    description: (doc.description ?? 'No description available.').trim(),
                    tactics: (doc.tactics ?? []).map(t => typeof t === 'string' ? t.trim() : '').filter(Boolean),
                    relevantTechniques: (doc.relevantTechniques ?? []).map(t => typeof t === 'string' ? t.trim() : '').filter(Boolean),
                };

                // Check for duplicates
                if (seenIdsMap.has(ruleId)) {
                    const existingPath = seenIdsMap.get(ruleId)!;
                    console.warn(`Duplicate rule ID '${ruleId}' found!`);
                    console.warn(`  - Existing: ${existingPath}`);
                    console.warn(`  - Current:  ${filePath}`);
                    // Store duplicate info for reporting later
                    let entry = duplicateInfo.find(d => d.id === ruleId);
                    if (!entry) {
                        entry = { id: ruleId, files: [existingPath] };
                        duplicateInfo.push(entry);
                    }
                    if (!entry.files.includes(filePath)) {
                         entry.files.push(filePath);
                    }
                    // *** Decision: Skip subsequent duplicates to prevent React errors ***
                    // You could alternatively throw an error here to force fixing the source files.
                    console.warn(`  - Skipping rule from: ${filePath}`);
                    continue; // Skip adding this duplicate rule to rawRules
                }

                // If not a duplicate, add it
                seenIdsMap.set(ruleId, filePath);
                rawRules.push(normalizedRule);
                contentPaths[ruleId] = filePath;

            } else if (doc) {
                console.warn(`Skipping rule file ${filePath}: Missing 'id' field.`);
            }
        } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
        }
    }

    // Report all duplicates at the end
    if (duplicateInfo.length > 0) {
         console.error(`--------------------------------------------------`);
         console.error(`ERROR: Found ${duplicateInfo.length} rule IDs with duplicate definitions in ${directoryPath}:`);
         duplicateInfo.forEach(dup => {
             console.error(`  - ID: '${dup.id}' found in files:`);
             dup.files.forEach(f => console.error(`    * ${f}`));
         });
         console.error(`--------------------------------------------------`);
         // Optionally: process.exit(1) or throw new Error("Duplicate rule IDs found");
     }


    console.log(`Finished parsing ${directoryPath}. Found ${rawRules.length + duplicateInfo.reduce((sum, d) => sum + d.files.length - 1, 0)} rules initially, kept ${rawRules.length} unique rules.`);
    console.log(`Stored content paths for ${Object.keys(contentPaths).length} rules.`);
    return { rawRules, contentPaths }; // rawRules now only contains unique IDs
}

// Function to process parsed rules into the required data structures
function processActiveRules(parsedData: { rawRules: RuleYaml[], contentPaths: Record<string, string> }) {
    const counts: Record<string, number> = {};
    const rulesByTechnique: Record<string, SimpleRuleInfo[]> = {};

    for (const rule of parsedData.rawRules) {
        const ruleInfo: SimpleRuleInfo = {
            id: rule.id,
            title: rule.title ?? rule.id,
            description: rule.description ?? '',
        };

        // Process tactics for counts
        rule.tactics?.forEach(tacticId => {
            counts[tacticId] = (counts[tacticId] ?? 0) + 1;
        });

        // Process techniques for counts and details
        rule.relevantTechniques?.forEach(techniqueId => {
            counts[techniqueId] = (counts[techniqueId] ?? 0) + 1;

            // Add rule info to the technique's list
            if (!rulesByTechnique[techniqueId]) {
                rulesByTechnique[techniqueId] = [];
            }
            if (!rulesByTechnique[techniqueId].some(r => r.id === rule.id)) {
                rulesByTechnique[techniqueId].push(ruleInfo);
            }
        });
    }
    activeRuleCounts = counts;
    activeRulesByTechniqueId = rulesByTechnique;
    activeRuleContentPathById = parsedData.contentPaths;
    console.log(`Processed active rules: Counts for ${Object.keys(activeRuleCounts).length} IDs, details for ${Object.keys(activeRulesByTechniqueId).length} techniques.`);
}

// Function to process inactive rules and calculate satisfaction counts
function processInactiveRules(parsedData: { rawRules: RuleYaml[], contentPaths: Record<string, string> }) {
    const processedRules: InactiveRuleDetails[] = [];

    for (const rule of parsedData.rawRules) {
        const techniques = rule.relevantTechniques ?? [];
        let techniqueCount = 0;
        let subTechniqueCount = 0;

        techniques.forEach(techId => {
            if (techId.includes('.')) {
                subTechniqueCount++;
            } else {
                techniqueCount++;
            }
        });

        processedRules.push({
            id: rule.id,
            title: rule.title ?? rule.id,
            description: rule.description ?? '',
            tactics: rule.tactics ?? [],
            techniques: techniques,
            satisfies: {
                tactics: (rule.tactics ?? []).length,
                techniques: techniqueCount,
                subTechniques: subTechniqueCount,
            }
        });
    }
    inactiveRulesData = processedRules;
    inactiveRuleContentPathById = parsedData.contentPaths;
    console.log(`Processed ${inactiveRulesData.length} inactive rules.`);
}

// --- Server Startup Logic ---
async function startServer() {
    try {
        mitreDataStore = await loadMitreData();

        // Parse and process ACTIVE rules
        const parsedActiveRules = parseRuleFiles(activeRulesDirectoryPath);
        processActiveRules(parsedActiveRules);

        // Parse and process INACTIVE rules (if directory provided)
        if (inactiveRulesDirectoryPath) {
            const parsedInactiveRules = parseRuleFiles(inactiveRulesDirectoryPath);
            processInactiveRules(parsedInactiveRules);
        }

        const server = Bun.serve({
          port: port,
          async fetch(req) {
            const url = new URL(req.url);
            console.log(`[Request] ${req.method} ${url.pathname}${url.search}`); // Log query params too

            // --- API Endpoints ---
            if (url.pathname === '/api/mitre-data') {
              if (mitreDataStore) {
                return new Response(JSON.stringify(mitreDataStore), {
                  headers: { 'Content-Type': 'application/json' },
                });
              } else {
                return new Response("MITRE data not loaded yet.", { status: 503 });
              }
            }

            // Returns counts for ACTIVE rules only (for the main board)
            if (url.pathname === '/api/rule-counts') {
               return new Response(JSON.stringify(activeRuleCounts), {
                  headers: { 'Content-Type': 'application/json' },
                });
            }

            // Returns details for ACTIVE rules associated with a technique
            if (url.pathname === '/api/rules') {
                const techniqueId = url.searchParams.get('techniqueId');
                if (!techniqueId) {
                    return new Response("Missing 'techniqueId' query parameter", { status: 400 });
                }
                const rules = activeRulesByTechniqueId[techniqueId] ?? []; // Default to empty array
                return new Response(JSON.stringify(rules), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            // Returns the processed data for INACTIVE rules
            if (url.pathname === '/api/inactive-rules') {
                return new Response(JSON.stringify(inactiveRulesData), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            // Returns content for ANY rule (active or inactive) by ID
            if (url.pathname === '/api/rule-content') {
                const ruleId = url.searchParams.get('ruleId');
                if (!ruleId) {
                    return new Response("Missing 'ruleId' query parameter", { status: 400 });
                }
                // Check both active and inactive paths
                const filePath = activeRuleContentPathById[ruleId] ?? inactiveRuleContentPathById[ruleId];
                if (!filePath) {
                    return new Response(`Rule content not found for ID: ${ruleId}`, { status: 404 });
                }
                try {
                    const file = Bun.file(filePath);
                    const exists = await file.exists();
                    if (!exists) {
                         console.error(`File path found for rule ${ruleId}, but file does not exist: ${filePath}`);
                         return new Response(`Rule content file not found for ID: ${ruleId}`, { status: 404 });
                    }
                    // Return raw YAML content
                    return new Response(file, {
                        headers: { 'Content-Type': 'text/yaml' }, // Indicate YAML content type
                    });
                } catch (err) {
                    console.error(`Error reading rule content file ${filePath} for rule ${ruleId}:`, err);
                    return new Response("Error reading rule content", { status: 500 });
                }
            }

            // --- Static File Serving ---
            try {
                let filePath = '';
                // Assume the executable is run from the project root (mitre-board-app)
                const projectRoot = process.cwd();

                if (url.pathname === '/') {
                    // Resolve path relative to the current working directory
                    filePath = path.resolve(projectRoot, 'public/index.html');
                } else if (url.pathname.startsWith('/dist/')) {
                    // Resolve path relative to executable/script directory
                    const requestedFile = url.pathname.substring('/dist/'.length);
                    // Basic security check: prevent path traversal
                    if (requestedFile.includes('..')) {
                        return new Response("Forbidden", { status: 403 });
                    }
                    filePath = path.resolve(projectRoot, 'dist', requestedFile);
                }
                // Add handling for other static assets in public if needed
                // else {
                //     const requestedFile = url.pathname.substring(1); // Remove leading '/'
                //     if (!requestedFile.includes('..')) { // Basic security check
                //         filePath = path.join(projectRoot, 'public', requestedFile);
                //     }
                // }


                console.log(`  [Static] Attempting to serve: ${url.pathname}`);
                console.log(`  [Static] Calculated filePath: ${filePath}`);

                if (filePath) {
                    const exists = await Bun.file(filePath).exists(); // Use Bun.file().exists() for async check
                    console.log(`  [Static] File exists? ${exists}`);
                    if (exists) {
                        const file = Bun.file(filePath);
                        // Determine content type based on extension (basic example)
                        let contentType = 'text/plain';
                        if (filePath.endsWith('.html')) contentType = 'text/html';
                        else if (filePath.endsWith('.css')) contentType = 'text/css';
                        else if (filePath.endsWith('.js')) contentType = 'application/javascript';
                        else if (filePath.endsWith('.json')) contentType = 'application/json';
                        else if (filePath.endsWith('.png')) contentType = 'image/png';
                        else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
                        else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';
                        // Add more types as needed

                        return new Response(file, {
                            headers: { 'Content-Type': contentType }
                        });
                    }
                }
            } catch (e) {
                 console.error(`Error serving static file ${url.pathname}:`, e);
                 // Fall through to 404 if file serving fails
            }

            // If no API endpoint or static file matched, return 404
            return new Response("Not Found", { status: 404 });
          },
          error(error) {
            console.error("Server error:", error);
            return new Response("Internal Server Error", { status: 500 });
          },
        });

        console.log(`Server listening on http://localhost:${server.port}`);

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();
