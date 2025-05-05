import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Code, List, ArrowLeft, Loader2, AlertTriangle, Copy, Eye, EyeOff } from 'lucide-react'; // Added Eye, EyeOff
import { MitreBoardHeader } from './components/MitreBoardHeader';
import { MitreBoardControls } from './components/MitreBoardControls';
import { TacticCard } from './components/TacticCard';
import { InactiveRulesExplorer } from './components/InactiveRulesExplorer'; // Import the new component

// Type definitions
interface Technique {
  id: string;
  name: string;
  description?: string;
  external_references: { external_id: string; url?: string }[];
  subTechniques?: Technique[];
}

interface Tactic {
  id: string;
  name: string;
  description?: string;
  external_references: { external_id: string; url?: string }[];
  techniques: Technique[];
}

interface MitreData {
  tactics: Tactic[];
}

function App() {
  const [mitreData, setMitreData] = useState<MitreData | null>(null);
  const [ruleCounts, setRuleCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [selectedTechniqueForRules, setSelectedTechniqueForRules] = useState<{ id: string; name: string } | null>(null);
  const [rulesForSelectedTechnique, setRulesForSelectedTechnique] = useState<
    Array<{ id: string; title: string; description: string }> | null
  >(null);
  const [selectedRule, setSelectedRule] = useState<{ id: string; title: string; description: string } | null>(null);
  const [selectedRuleContent, setSelectedRuleContent] = useState<string | null>(null);
  const [ruleLoadingState, setRuleLoadingState] = useState<'idle' | 'loadingList' | 'loadingContent' | 'error'>('idle');
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [showOnlyMissingTechniques, setShowOnlyMissingTechniques] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'board' | 'inactiveExplorer'>('board'); // State for view switching

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const [mitreRes, countsRes] = await Promise.all([
          fetch('/api/mitre-data'),
          fetch('/api/rule-counts'),
        ]);

        if (!mitreRes.ok) throw new Error(`Failed to fetch MITRE data: ${mitreRes.statusText}`);
        if (!countsRes.ok) throw new Error(`Failed to fetch rule counts: ${countsRes.statusText}`);

        const mitreJson: MitreData = await mitreRes.json();
        const countsJson: Record<string, number> = await countsRes.json();

        setMitreData(mitreJson);
        setRuleCounts(countsJson);
        console.log("DEBUG: Fetched rule counts:", countsJson);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Utility functions
  const getExternalId = (item: Tactic | Technique): string => {
    return item.external_references?.[0]?.external_id ?? item.id;
  };

  const getTacticRuleCount = (tactic: Tactic): number => {
    return tactic.techniques.reduce((total, technique) => {
      const techId = getExternalId(technique);
      return total + (ruleCounts[techId] ?? 0);
    }, 0);
  };

  // Rule modal handlers
  const fetchRulesForTechnique = useCallback(async (techniqueId: string) => {
    setRuleLoadingState('loadingList');
    setRuleError(null);
    setRulesForSelectedTechnique(null);
    setSelectedRule(null);
    setSelectedRuleContent(null);
    try {
      // Fetch actual rules from the backend API
      const response = await fetch(`/api/rules?techniqueId=${encodeURIComponent(techniqueId)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch rules: ${response.status} ${response.statusText}`);
      }
      const rulesData: Array<{ id: string; title: string; description: string }> = await response.json();
      setRulesForSelectedTechnique(rulesData);
      setRuleLoadingState('idle');
    } catch (err) {
      console.error("Fetch rules error:", err);
      const message = err instanceof Error ? err.message : "An unknown error occurred fetching rules";
      setRuleError(message);
      setRuleLoadingState('error');
    }
  }, []);

  const fetchRuleContent = useCallback(async (ruleId: string) => {
    setRuleLoadingState('loadingContent');
    setRuleError(null);
    setSelectedRuleContent(null);
    try {
      // Fetch actual rule content (raw YAML/text) from the backend API
      const response = await fetch(`/api/rule-content?ruleId=${encodeURIComponent(ruleId)}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch rule content: ${response.status} ${response.statusText} - ${errorText}`);
      }
      const content = await response.text();
      setSelectedRuleContent(content);
      setRuleLoadingState('idle');
    } catch (err) {
      console.error("Fetch rule content error:", err);
      const message = err instanceof Error ? err.message : "An unknown error occurred fetching rule content";
      setRuleError(message);
      setRuleLoadingState('error');
    }
  }, []);

  const handleViewRulesClick = (technique: Technique) => {
    // Always use getExternalId to ensure the correct MITRE ID is used
    const techId = getExternalId(technique);
    console.log("DEBUG: handleViewRulesClick - Technique:", technique, "Resolved ID:", techId);
    setSelectedTechniqueForRules({ id: techId, name: technique.name });
    setIsRuleModalOpen(true);
    fetchRulesForTechnique(techId);
  };

  const handleRuleClick = (rule: { id: string; title: string; description: string }) => {
    setSelectedRule(rule);
    fetchRuleContent(rule.id);
  };

  const handleBackToList = () => {
    setSelectedRule(null);
    setSelectedRuleContent(null);
    setRuleLoadingState('idle');
    setRuleError(null);
  };

  const handleModalOpenChange = (open: boolean) => {
    setIsRuleModalOpen(open);
    if (!open) {
      setSelectedTechniqueForRules(null);
      setRulesForSelectedTechnique(null);
      setSelectedRule(null);
      setSelectedRuleContent(null);
      setRuleLoadingState('idle');
      setRuleError(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log("Copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy text: ", err);
     });
   };
 
   // Function to handle exporting missing techniques
   const handleExportMissingTechniques = () => {
     if (!mitreData) return;
 
     const missingTechniques: Array<{
       TacticName: string;
       TacticNumber: string;
       TechniqueNumber: string;
       TechniqueTitle: string;
     }> = [];
 
     mitreData.tactics.forEach(tactic => {
       const tacticId = getExternalId(tactic);
       tactic.techniques.forEach(technique => {
         // Only include base techniques (not sub-techniques) for export
         if (!technique.id.includes('.')) {
            const techId = getExternalId(technique);
            if ((ruleCounts[techId] ?? 0) === 0) {
              missingTechniques.push({
                TacticName: tactic.name,
                TacticNumber: tacticId,
                TechniqueNumber: techId,
                TechniqueTitle: technique.name,
              });
            }
         }
       });
     });
 
     if (missingTechniques.length === 0) {
       alert("No missing techniques (with 0 rules) found to export.");
       return;
     }
 
     // Create CSV content
     const header = "TacticName,TacticNumber,TechniqueNumber,TechniqueTitle";
     const rows = missingTechniques.map(t =>
       // Ensure proper CSV quoting
       `"${t.TacticName.replace(/"/g, '""')}","${t.TacticNumber.replace(/"/g, '""')}","${t.TechniqueNumber.replace(/"/g, '""')}","${t.TechniqueTitle.replace(/"/g, '""')}"`
     );
     const csvContent = [header, ...rows].join("\n");
 
     // Create and trigger download
     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
     const link = document.createElement("a");
     if (link.download !== undefined) { // Feature detection
       const url = URL.createObjectURL(blob);
       link.setAttribute("href", url);
       link.setAttribute("download", "missing_mitre_techniques.csv");
       link.style.visibility = 'hidden';
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       URL.revokeObjectURL(url);
     } else {
       alert("CSV export is not supported in this browser.");
     }
   };
 
   // JSX
   return (
     <div className="min-h-screen bg-slate-950 text-foreground p-4 md:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto">
         {/* Pass view state and toggle function to header */}
         <MitreBoardHeader
           currentView={currentView}
           onToggleView={() => {
             console.log('Toggling view...'); // Add console log
             setCurrentView(prev => prev === 'board' ? 'inactiveExplorer' : 'board');
           }}
         />

         {/* Conditional Rendering based on currentView */}
        {currentView === 'board' && (
          <>
            {/* Add Controls Section */}
            {!isLoading && !error && mitreData && (
            <MitreBoardControls
              showOnlyMissing={showOnlyMissingTechniques}
              onShowOnlyMissingChange={setShowOnlyMissingTechniques}
              onExportClick={handleExportMissingTechniques} // Connect export function
            />
         )}

        {isLoading && (
          <div className="flex items-center justify-center h-80">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
              <p className="text-muted-foreground">Loading MITRE data...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-8 bg-destructive/10 border border-destructive rounded-lg shadow text-center">
            <p className="text-destructive font-medium">Error loading data: {error}</p>
            <Button
              variant="destructive"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !error && mitreData && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {/* Apply filtering based on showOnlyMissingTechniques state */}
             {(showOnlyMissingTechniques
               ? mitreData.tactics
                   .map(tactic => ({
                     ...tactic,
                     // Filter techniques: only base techniques with 0 rules
                     techniques: tactic.techniques.filter(technique =>
                       !technique.id.includes('.') && (ruleCounts[getExternalId(technique)] ?? 0) === 0
                     ),
                   }))
                   // Filter tactics: only those with remaining techniques
                   .filter(tactic => tactic.techniques.length > 0)
               : mitreData.tactics // If not filtering, use original data
             ).map((tactic) => (
               <TacticCard
                 key={getExternalId(tactic)}
                tactic={tactic}
                ruleCounts={ruleCounts}
                getExternalId={getExternalId}
                getTacticRuleCount={getTacticRuleCount}
                onViewRulesClick={handleViewRulesClick}
              />
            ))}
          </div>
        )}
          </>
        )}

        {currentView === 'inactiveExplorer' && (
          <InactiveRulesExplorer />
        )}

      </div>

      {/* Keep Rule Modal outside the conditional view rendering if it needs to be shared or triggered from both views */}
      {/* TODO: Re-evaluate if modal logic needs adjustment for inactive rules */}
      <Dialog open={isRuleModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] flex flex-col bg-slate-900 border shadow-lg">
          <DialogHeader className="pr-16 relative">
            <DialogTitle className="text-xl font-medium flex items-center gap-2">
              {selectedRule ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 mr-2 text-muted-foreground hover:text-foreground"
                    onClick={handleBackToList}
                  >
                    <ArrowLeft size={18} />
                  </Button>
                  <Code size={18} className="text-slate-100" />
                  <span className="truncate text-slate-100">Rule: {selectedRule?.title ?? 'N/A'}</span>
                  <span className="text-sm text-slate-400 ml-2">({selectedRule?.id ?? 'N/A'})</span>
                </>
              ) : (
                <>
                  <List size={18} className="text-slate-100" />
                  <span className="text-slate-100">Rules for Technique: {selectedTechniqueForRules?.name ?? 'N/A'}</span>
                  <span className="text-sm text-slate-400 ml-2">({selectedTechniqueForRules?.id ?? 'N/A'})</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 flex-1 overflow-y-auto pr-2">
            {ruleLoadingState === 'error' && ruleError && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-center">
                <AlertTriangle className="mx-auto mb-2 text-destructive" size={24} />
                <p className="text-destructive font-medium mb-1">Error Loading Rules</p>
                <p className="text-sm text-destructive/80">{ruleError}</p>
              </div>
            )}

            {selectedRule && (
              <>
                {ruleLoadingState === 'loadingContent' && (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                {ruleLoadingState !== 'loadingContent' && selectedRuleContent && (
                  <div className="relative group">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground opacity-50 group-hover:opacity-100 transition-opacity"
                      onClick={() => selectedRuleContent && copyToClipboard(selectedRuleContent)}
                      aria-label="Copy rule content"
                      disabled={!selectedRuleContent}
                    >
                      <Copy size={16} />
                    </Button>
                    <pre className="bg-slate-800 p-4 rounded-md text-sm text-slate-100 whitespace-pre-wrap break-words font-mono max-h-[65vh] overflow-auto">
                      {selectedRuleContent}
                    </pre>
                  </div>
                )}
                {ruleLoadingState !== 'loadingContent' && !selectedRuleContent && ruleLoadingState !== 'error' && (
                  <p className="text-center text-muted-foreground italic">Rule content not available.</p>
                )}
              </>
            )}

            {!selectedRule && (
              <>
                {ruleLoadingState === 'loadingList' && (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                {ruleLoadingState !== 'loadingList' && rulesForSelectedTechnique && rulesForSelectedTechnique.length > 0 && (
                  <div className="space-y-2 bg-slate-800 text-slate-100 p-4 rounded-md border border-border">
                    {rulesForSelectedTechnique?.map((rule) => (
                      <button
                        key={rule.id}
                        onClick={() => handleRuleClick(rule)}
                        className="w-full text-left p-3 rounded-md bg-background hover:bg-muted transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
                      >
                        <p className="font-medium text-slate-100 truncate">
                          {rule.title ?? rule.id}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {`${rule.description ?? 'No description available.'} - ${rule.id}`}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {ruleLoadingState !== 'loadingList' && rulesForSelectedTechnique?.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                    <List size={32} className="mb-2" />
                    <p>No rules found for this technique.</p>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="pt-3 mt-auto">
            {(!selectedRule || rulesForSelectedTechnique?.length === 0) && (
              <DialogClose asChild>
                <Button variant="outline" className="text-slate-100">Close</Button>
              </DialogClose>
            )}
            {selectedRule && (
              <Button
                variant="outline"
                onClick={handleBackToList}
                className="text-slate-100"
              >
                <ArrowLeft size={16} className="mr-2" /> Back to List
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
