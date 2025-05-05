import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, AlertTriangle, Code, Copy, X } from 'lucide-react'; // Added Code, Copy, X
import { InactiveRulesFilters } from './InactiveRulesFilters';
import { InactiveRulesTable } from './InactiveRulesTable';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Import Dialog components

// Type matching the backend API response for /api/inactive-rules
// Keep this consistent or move to a shared types file
interface InactiveRuleDetails {
  id: string;
  title: string;
  description: string;
  tactics: string[];
  techniques: string[]; // Includes sub-techniques like Txxxx.xxx
  satisfies: {
    tactics: number;
    techniques: number; // Base techniques only (Txxxx)
    subTechniques: number; // Sub-techniques only (Txxxx.xxx)
  };
}

// TODO: Define types for MitreData and ActiveRuleCounts if not already shared
// For now, using simple Records
type ActiveRuleCounts = Record<string, number>;
type MitreData = any; // Replace with actual type later if needed

export function InactiveRulesExplorer() {
  const [inactiveRules, setInactiveRules] = useState<InactiveRuleDetails[]>([]);
  const [activeRuleCounts, setActiveRuleCounts] = useState<ActiveRuleCounts>({});
  const [mitreData, setMitreData] = useState<MitreData | null>(null); // Needed for context? Maybe not directly here.
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set()); // For checkboxes in table

  // State for filters (thresholds)
  const [filterThresholds, setFilterThresholds] = useState({
    tactics: 0,
    techniques: 0,
    subTechniques: 0,
  });

  // State for Rule Content Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedRuleForContent, setSelectedRuleForContent] = useState<InactiveRuleDetails | null>(null);
  const [ruleContent, setRuleContent] = useState<string | null>(null);
  const [contentLoadingState, setContentLoadingState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [contentError, setContentError] = useState<string | null>(null);

  // TODO: Add state for sorting

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [inactiveRes, countsRes /*, mitreRes */] = await Promise.all([
        fetch('/api/inactive-rules'),
        fetch('/api/rule-counts'),
        // fetch('/api/mitre-data'), // Fetch MITRE data if needed for context/linking
      ]);

      if (!inactiveRes.ok) throw new Error(`Failed to fetch inactive rules: ${inactiveRes.statusText}`);
      if (!countsRes.ok) throw new Error(`Failed to fetch active rule counts: ${countsRes.statusText}`);
      // if (!mitreRes.ok) throw new Error(`Failed to fetch MITRE data: ${mitreRes.statusText}`);

      const inactiveJson: InactiveRuleDetails[] = await inactiveRes.json();
      const countsJson: ActiveRuleCounts = await countsRes.json();
      // const mitreJson: MitreData = await mitreRes.json();

      setInactiveRules(inactiveJson);
      setActiveRuleCounts(countsJson);
      // setMitreData(mitreJson);

      console.log("DEBUG: Fetched Inactive Rules:", inactiveJson);
      console.log("DEBUG: Fetched Active Rule Counts:", countsJson);

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
    // Re-calculate coverage whenever selection changes
  }, []);

  // --- Modal Logic ---
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
      // Reset modal state on close
      setSelectedRuleForContent(null);
      setRuleContent(null);
      setContentLoadingState('idle');
      setContentError(null);
    }
  };

   const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log("Copied to clipboard!");
      // TODO: Add visual feedback (e.g., toast notification)
    }).catch(err => {
      console.error("Failed to copy text: ", err);
     });
   };
  // --- End Modal Logic ---


  // Calculate current coverage based on active rules + selected inactive rules
  const currentCoverage = useMemo(() => {
    const coverage = { ...activeRuleCounts }; // Start with active counts
    const selectedInactiveRules = inactiveRules.filter(rule => selectedRuleIds.has(rule.id));

    selectedInactiveRules.forEach(rule => {
      rule.tactics.forEach(tacticId => {
        coverage[tacticId] = (coverage[tacticId] ?? 0) + 1;
      });
      rule.techniques.forEach(techniqueId => {
        coverage[techniqueId] = (coverage[techniqueId] ?? 0) + 1;
        // Also increment parent technique count if it's a sub-technique
        if (techniqueId.includes('.')) {
          const parentId = techniqueId.split('.')[0];
          coverage[parentId] = (coverage[parentId] ?? 0) + 1;
        }
      });
    });
    // console.log("DEBUG: Calculated Current Coverage:", coverage);
    return coverage;
  }, [activeRuleCounts, selectedRuleIds, inactiveRules]);


  // Filter inactive rules based on thresholds and current coverage
  const filteredRules = useMemo(() => {
    // If all thresholds are 0, show all rules (no filtering needed)
    if (filterThresholds.tactics === 0 && filterThresholds.techniques === 0 && filterThresholds.subTechniques === 0) {
      return inactiveRules;
    }

    return inactiveRules.filter(rule => {
      // Check if the rule covers any tactic below the threshold
      const coversUnsatisfiedTactic = rule.tactics.some(tacticId =>
        (currentCoverage[tacticId] ?? 0) < filterThresholds.tactics
      );
      if (coversUnsatisfiedTactic) return true;

      // Check if the rule covers any technique/sub-technique below the threshold
      const coversUnsatisfiedTechnique = rule.techniques.some(techniqueId => {
        const isSub = techniqueId.includes('.');
        const threshold = isSub ? filterThresholds.subTechniques : filterThresholds.techniques;
        return (currentCoverage[techniqueId] ?? 0) < threshold;
      });
      if (coversUnsatisfiedTechnique) return true;

      return false; // Rule doesn't cover any unsatisfied items
    });
  }, [inactiveRules, currentCoverage, filterThresholds]);


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
          {/* Correctly pass props to a single instance */}
          <InactiveRulesFilters
            thresholds={filterThresholds}
            onChange={setFilterThresholds}
          />
          <InactiveRulesTable
            rules={filteredRules}
            selectedRuleIds={selectedRuleIds}
            onRuleSelectionChange={handleRuleSelectionChange}
            onViewContentClick={handleViewContentClick} // Pass handler to table
            // TODO: Pass sorting state and handlers
          />
        </>
      )}

      {/* Rule Content Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] flex flex-col bg-slate-900 border shadow-lg">
          <DialogHeader className="pr-16 relative">
            <DialogTitle className="text-xl font-medium flex items-center gap-2">
              <Code size={18} className="text-slate-100" />
              <span className="truncate text-slate-100">Rule: {selectedRuleForContent?.title ?? 'N/A'}</span>
              <span className="text-sm text-slate-400 ml-2">({selectedRuleForContent?.id ?? 'N/A'})</span>
            </DialogTitle>
             {/* Explicit close button */}
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
            {contentLoadingState === 'idle' && !ruleContent && ( // Removed redundant check
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
