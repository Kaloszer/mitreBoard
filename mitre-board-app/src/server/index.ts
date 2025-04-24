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
let ruleCounts: Record<string, number> = {};
// Store detailed rule info for API endpoints
interface SimpleRuleInfo {
  id: string;
  title: string;
  description: string;
}
let rulesByTechniqueId: Record<string, SimpleRuleInfo[]> = {};
let ruleContentPathById: Record<string, string> = {};

// --- Command Line Argument Parsing ---
program
  .version('0.0.1')
  .description('MITRE ATT&CK Board Server')
  .requiredOption('-d, --directory <path>', 'Path to the directory containing YAML analytic rules')
  .parse(process.argv);

const options = program.opts();
const rulesDirectoryPath = path.resolve(options.directory); // Resolve to absolute path

// Validate if the directory exists
if (!fs.existsSync(rulesDirectoryPath) || !fs.lstatSync(rulesDirectoryPath).isDirectory()) {
  console.error(`Error: Directory not found or is not a directory: ${rulesDirectoryPath}`);
  process.exit(1);
}

console.log(`Using rules directory: ${rulesDirectoryPath}`);

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

function parseRuleFiles(directoryPath: string): {
    counts: Record<string, number>;
    rulesByTechnique: Record<string, SimpleRuleInfo[]>;
    contentPaths: Record<string, string>;
} {
    console.log(`Parsing YAML rules from ${directoryPath}...`);
    const counts: Record<string, number> = {};
    const rulesByTechnique: Record<string, SimpleRuleInfo[]> = {};
    const contentPaths: Record<string, string> = {};
    const yamlFiles = getAllFiles(directoryPath).filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));

    console.log(`Found ${yamlFiles.length} YAML files.`);

    for (const filePath of yamlFiles) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const doc = YAML.parse(fileContent) as RuleYaml | null; // Parse YAML

            if (doc && doc.id) { // Ensure rule has an ID
                const ruleId = doc.id.trim();
                const ruleInfo: SimpleRuleInfo = {
                    id: ruleId,
                    // Prefer title, fallback to name, then to ID if neither exists
                    title: (doc.title ?? doc.name ?? ruleId).trim(),
                    description: (doc.description ?? 'No description available.').trim(),
                };

                // Store content path
                contentPaths[ruleId] = filePath;

                // Process tactics for counts
                if (Array.isArray(doc.tactics)) {
                    doc.tactics.forEach(tacticId => {
                        if (typeof tacticId === 'string' && tacticId.trim()) {
                            const key = tacticId.trim();
                            counts[key] = (counts[key] ?? 0) + 1;
                        }
                    });
                }

                // Process techniques for counts and details
                if (Array.isArray(doc.relevantTechniques)) {
                    doc.relevantTechniques.forEach(techniqueId => {
                         if (typeof techniqueId === 'string' && techniqueId.trim()) {
                            const key = techniqueId.trim();
                            counts[key] = (counts[key] ?? 0) + 1;

                            // Add rule info to the technique's list
                            if (!rulesByTechnique[key]) {
                                rulesByTechnique[key] = [];
                            }
                            // Avoid adding duplicate rule IDs for the same technique
                            if (!rulesByTechnique[key].some(r => r.id === ruleId)) {
                                rulesByTechnique[key].push(ruleInfo);
                            }
                         }
                    });
                }
            } else if (doc) {
                console.warn(`Skipping rule file ${filePath}: Missing 'id' field.`);
            }
        } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
        }
    }

    console.log(`Finished parsing rules. Found counts for ${Object.keys(counts).length} unique IDs.`);
    console.log(`Stored details for ${Object.keys(contentPaths).length} rules.`);
    return { counts, rulesByTechnique, contentPaths };
}

// --- Server Startup Logic ---
async function startServer() {
    try {
        mitreDataStore = await loadMitreData();
        // Parse rules and store all necessary data structures
        const parsedRules = parseRuleFiles(rulesDirectoryPath);
        ruleCounts = parsedRules.counts;
        rulesByTechniqueId = parsedRules.rulesByTechnique;
        ruleContentPathById = parsedRules.contentPaths;

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

            if (url.pathname === '/api/rule-counts') {
               return new Response(JSON.stringify(ruleCounts), {
                  headers: { 'Content-Type': 'application/json' },
                });
            }

            if (url.pathname === '/api/rules') {
                const techniqueId = url.searchParams.get('techniqueId');
                if (!techniqueId) {
                    return new Response("Missing 'techniqueId' query parameter", { status: 400 });
                }
                const rules = rulesByTechniqueId[techniqueId] ?? []; // Default to empty array
                return new Response(JSON.stringify(rules), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (url.pathname === '/api/rule-content') {
                const ruleId = url.searchParams.get('ruleId');
                if (!ruleId) {
                    return new Response("Missing 'ruleId' query parameter", { status: 400 });
                }
                const filePath = ruleContentPathById[ruleId];
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
