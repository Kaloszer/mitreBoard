import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, AlertTriangle, Code, Copy, X, Download } from 'lucide-react'; // Added Download icon
import { InactiveRulesFilters } from './InactiveRulesFilters';
import { InactiveRulesTable } from './InactiveRulesTable';
import type { InactiveRuleDetails, SortableColumn, SortDirection } from './InactiveRulesTable';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";


type ActiveRuleCounts = Record<string, number>;


export function InactiveRulesExplorer() {
  const [inactiveRules, setInactiveRules] = useState<InactiveRuleDetails[]>([]);
  const [activeRuleCounts, setActiveRuleCounts] = useState<ActiveRuleCounts>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());


  const [sortColumn, setSortColumn] = useState<SortableColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [showOnlyEffective, setShowOnlyEffective] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedRuleForContent, setSelectedRuleForContent] = useState<InactiveRuleDetails | null>(null);
  const [ruleContent, setRuleContent] = useState<string | null>(null);
  const [contentLoadingState, setContentLoadingState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [contentError, setContentError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [inactiveRes, countsRes] = await Promise.all([
        fetch('/api/inactive-rules'),
        fetch('/api/rule-counts'),
      ]);

      if (!inactiveRes.ok) throw new Error(`Failed to fetch inactive rules: ${inactiveRes.statusText}`);
      if (!countsRes.ok) throw new Error(`Failed to fetch active rule counts: ${countsRes.statusText}`);

      const inactiveJson: InactiveRuleDetails[] = await inactiveRes.json();
      const countsJson: ActiveRuleCounts = await countsRes.json();

      setInactiveRules(inactiveJson);
      setActiveRuleCounts(countsJson);

      console.log("DEBUG: Fetched Inactive Rules:", inactiveJson.length);
      console.log("DEBUG: Fetched Active Rule Counts:", Object.keys(countsJson).length);

    } catch (err) {
      console.error("Inactive Explorer fetch error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRuleSelectionChange = useCallback((ruleId: string, isSelected: boolean) => {
    setSelectedRuleIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(ruleId);
      } else {
        newSet.delete(ruleId);
      }
      return newSet;
    });
  }, []);

  const handleSortChange = useCallback((column: SortableColumn) => {
    setSortColumn(prevColumn => {
      if (prevColumn === column) {
        setSortDirection(prevDirection => prevDirection === 'asc' ? 'desc' : 'asc');
        return prevColumn;
      } else {
        // Default sort direction based on column type
        const defaultDesc = column === 'satisfies' || column === 'incrementalGain';
        setSortDirection(defaultDesc ? 'desc' : 'asc');
        return column;
      }
    });
  }, []);

  // --- Modal Logic (remains the same) ---
  const fetchRuleContent = useCallback(async (ruleId: string) => {
    setContentLoadingState('loading');
    setContentError(null);
    setRuleContent(null);
    try {
      const response = await fetch(`/api/rule-content?ruleId=${encodeURIComponent(ruleId)}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch rule content: ${response.status} ${response.statusText} - ${errorText}`);
      }
      const content = await response.text();
      setRuleContent(content);
      setContentLoadingState('idle');
    } catch (err) {
      console.error("Fetch rule content error:", err);
      const message = err instanceof Error ? err.message : "An unknown error occurred fetching rule content";
      setContentError(message);
      setContentLoadingState('error');
    }
  }, []);

  const handleViewContentClick = useCallback((rule: InactiveRuleDetails) => {
    setSelectedRuleForContent(rule);
    setIsModalOpen(true);
    fetchRuleContent(rule.id);
  }, [fetchRuleContent]);

  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setSelectedRuleForContent(null);
      setRuleContent(null);
      setContentLoadingState('idle');
      setContentError(null);
    }
  };

   const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log("Copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy text: ", err);
     });
   };
  // --- End Modal Logic ---

  // --- CSV Export Logic ---
  const handleExportCsv = useCallback(() => {
    const selectedRules = inactiveRules.filter(rule => selectedRuleIds.has(rule.id));
    if (selectedRules.length === 0) return; // Don't export if nothing is selected

    const csvRows = [
      ['Rule Name', 'Rule ID', 'Gained Tactics', 'Gained Techniques', 'Gained SubTechniques'] // Header row
    ];

    // Calculate coverage *without* any selected rules to determine baseline
    const baselineCoverage = { ...activeRuleCounts };

    selectedRules.forEach(rule => {
      const gainedTactics: string[] = [];
      const gainedTechniques: string[] = [];
      const gainedSubTechniques: string[] = [];

      // Check gain against baseline coverage
      rule.tactics.forEach(tacticId => {
        if ((baselineCoverage[tacticId] ?? 0) === 0) {
          gainedTactics.push(tacticId);
        }
      });
      rule.techniques.forEach(techniqueId => {
        const isSub = techniqueId.includes('.');
        if ((baselineCoverage[techniqueId] ?? 0) === 0) {
          if (isSub) {
            gainedSubTechniques.push(techniqueId);
          } else {
            gainedTechniques.push(techniqueId);
          }
        }
      });

      // Escape commas within fields and wrap in quotes if necessary
      const escapeCsvField = (field: string): string => `"${field.replace(/"/g, '""')}"`;

      csvRows.push([
        escapeCsvField(rule.title),
        escapeCsvField(rule.id),
        escapeCsvField(gainedTactics.join(', ')),
        escapeCsvField(gainedTechniques.join(', ')),
        escapeCsvField(gainedSubTechniques.join(', '))
      ]);
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'selected_mitre_rules_gain.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  }, [inactiveRules, selectedRuleIds, activeRuleCounts]); // Depends on these states


  // Calculate coverage including selected rules (for dynamic gain display in table)
  const currentCoverage = useMemo(() => {
    const coverage = { ...activeRuleCounts }; // Start with initially active rules
    const selectedRules = inactiveRules.filter(rule => selectedRuleIds.has(rule.id));

    selectedRules.forEach(rule => {
      rule.tactics.forEach(tacticId => {
        coverage[tacticId] = (coverage[tacticId] ?? 0) + 1;
      });
      // Important: Count techniques AND their parent techniques if applicable
      rule.techniques.forEach(techniqueId => {
        coverage[techniqueId] = (coverage[techniqueId] ?? 0) + 1;
        // Check if it's a sub-technique (Txxxx.xxx)
        if (techniqueId.includes('.')) {
          const parentId = techniqueId.split('.')[0];
          // Ensure parent exists and avoid double-counting if parent is also listed explicitly
          if (parentId && parentId !== techniqueId) {
             // Check if parent is already counted by this rule or another selected rule
             // This simple increment might overcount parents if multiple subs are selected under one parent.
             // A more robust approach might use Sets to track covered parents.
             // For now, we'll stick to the simpler increment, assuming rule definitions are clean.
             coverage[parentId] = (coverage[parentId] ?? 0) + 1;
          }
        }
      });
    });
    // console.log("DEBUG: Current Coverage (incl. selected):", coverage);
    return coverage;
  }, [activeRuleCounts, selectedRuleIds, inactiveRules]);


 // --- Calculate incremental gain, effectiveness, and apply filters ---
 const { finalRulesToDisplay, ruleEffectivenessMap, incrementalGainMap } = useMemo(() => {
    const effectivenessMap: Record<string, boolean> = {};
    const gainMap: Record<string, { tactics: number; techniques: number; subTechniques: number }> = {};
    let rulesToDisplay: InactiveRuleDetails[] = [];

    let processedRules = [...inactiveRules];

    processedRules.forEach(rule => {
        // Calculate gain based on whether this rule covers something *not* covered by currentCoverage
        let gain = { tactics: 0, techniques: 0, subTechniques: 0 };

        rule.tactics.forEach(tacticId => {
            // Gain if the tactic is NOT covered by the current selection + active rules
            if ((currentCoverage[tacticId] ?? 0) === 0) {
                gain.tactics++;
            }
        });

        rule.techniques.forEach(techniqueId => {
            const isSub = techniqueId.includes('.');
            const counterType = isSub ? 'subTechniques' : 'techniques';
            // Gain if the technique/sub-technique is NOT covered by the current selection + active rules
            if ((currentCoverage[techniqueId] ?? 0) === 0) {
                gain[counterType]++;
            }
        });
        gainMap[rule.id] = gain;

        const totalGain = gain.tactics + gain.techniques + gain.subTechniques;
        const isEffective = totalGain > 0;
        effectivenessMap[rule.id] = isEffective;

    });

    rulesToDisplay = processedRules.filter(rule => !showOnlyEffective || effectivenessMap[rule.id]);


    if (!sortColumn) {
        rulesToDisplay.sort((a, b) => {
           const gainA = gainMap[a.id];
           const gainB = gainMap[b.id];
           const totalGainA = gainA.tactics + gainA.techniques + gainA.subTechniques;
           const totalGainB = gainB.tactics + gainB.techniques + gainB.subTechniques;

           // Primary sort: Descending total gain
           if (totalGainB !== totalGainA) {
             return totalGainB - totalGainA;
           }

           // Secondary sort: Descending total satisfies
           const totalSatisfiesA = a.satisfies.tactics + a.satisfies.techniques + a.satisfies.subTechniques;
           const totalSatisfiesB = b.satisfies.tactics + b.satisfies.techniques + b.satisfies.subTechniques;
           if (totalSatisfiesB !== totalSatisfiesA) {
               return totalSatisfiesB - totalSatisfiesA;
           }

            return a.title.localeCompare(b.title);
        });
    }

    return {
        finalRulesToDisplay: rulesToDisplay,
        ruleEffectivenessMap: effectivenessMap,
        incrementalGainMap: gainMap
    };
  // Dependency array now includes currentCoverage
  }, [inactiveRules, currentCoverage, showOnlyEffective, sortColumn]);


  return (
    <div className="mt-6">
      <h2 className="text-2xl font-semibold mb-4 text-slate-100">Inactive Rule Explorer</h2>

      {isLoading && (
        <div className="flex items-center justify-center h-60">
          <div className="animate-pulse flex flex-col items-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
            <p className="text-muted-foreground">Loading inactive rules...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-6 bg-destructive/10 border border-destructive rounded-lg shadow text-center">
          <AlertTriangle className="mx-auto mb-2 text-destructive" size={24} />
          <p className="text-destructive font-medium mb-1">Error loading data</p>
          <p className="text-sm text-destructive/80 mb-4">{error}</p>
          <Button variant="destructive" onClick={fetchData}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="flex justify-end mb-4"> {/* Container for filters and export button */}
            <InactiveRulesFilters
              showOnlyEffective={showOnlyEffective}
              onShowOnlyEffectiveChange={setShowOnlyEffective}
            />
             <Button
                onClick={handleExportCsv}
                disabled={selectedRuleIds.size === 0}
                variant="outline"
                size="sm"
                className="ml-4 text-slate-100" // Added margin
             >
                <Download className="mr-2 h-4 w-4" />
                Export Selected ({selectedRuleIds.size})
             </Button>
          </div>
          <InactiveRulesTable
            rules={finalRulesToDisplay}
            selectedRuleIds={selectedRuleIds}
            ruleEffectiveness={ruleEffectivenessMap}
            incrementalGainMap={incrementalGainMap} // Pass the gain map
            onRuleSelectionChange={handleRuleSelectionChange}
            onViewContentClick={handleViewContentClick}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />
        </>
      )}

      {/* Rule Content Modal (remains the same) */}
      <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] flex flex-col bg-slate-900 border shadow-lg">
          <DialogHeader className="pr-16 relative">
            <DialogTitle className="text-xl font-medium flex items-center gap-2">
              <Code size={18} className="text-slate-100" />
              <span className="truncate text-slate-100">Rule: {selectedRuleForContent?.title ?? 'N/A'}</span>
              <span className="text-sm text-slate-400 ml-2">({selectedRuleForContent?.id ?? 'N/A'})</span>
            </DialogTitle>
             <DialogClose asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label="Close"
                >
                    <X size={18} />
                </Button>
             </DialogClose>
          </DialogHeader>

          <div className="py-4 flex-1 overflow-y-auto pr-2">
            {contentLoadingState === 'loading' && (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {contentLoadingState === 'error' && contentError && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-center">
                <AlertTriangle className="mx-auto mb-2 text-destructive" size={24} />
                <p className="text-destructive font-medium mb-1">Error Loading Content</p>
                <p className="text-sm text-destructive/80">{contentError}</p>
              </div>
            )}
            {contentLoadingState === 'idle' && ruleContent && (
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground opacity-50 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyToClipboard(ruleContent)}
                  aria-label="Copy rule content"
                >
                  <Copy size={16} />
                </Button>
                <pre className="bg-slate-800 p-4 rounded-md text-sm text-slate-100 whitespace-pre-wrap break-words font-mono max-h-[65vh] overflow-auto">
                  {ruleContent}
               </pre>
             </div>
           )}
            {contentLoadingState === 'idle' && !ruleContent && (
              <p className="text-center text-muted-foreground italic">Rule content not available or empty.</p>
            )}
         </div>

          <DialogFooter className="pt-3 mt-auto">
            <DialogClose asChild>
              <Button variant="outline" className="text-slate-100">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
