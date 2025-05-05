import React, { useMemo } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, TrendingUp } from "lucide-react"; // Import TrendingUp
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface InactiveRuleDetails {
  id: string;
  title: string;
  description: string;
  tactics: string[];
  techniques: string[];
  satisfies: {
    tactics: number;
    techniques: number;
    subTechniques: number;
  };
}

// Add 'incrementalGain' to SortableColumn
export type SortableColumn = 'name' | 'satisfies' | 'incrementalGain';
export type SortDirection = 'asc' | 'desc';

// Define the shape of the incremental gain object
interface IncrementalGain {
    tactics: number;
    techniques: number;
    subTechniques: number;
}

interface InactiveRulesTableProps {
  rules: InactiveRuleDetails[];
  selectedRuleIds: Set<string>;
  ruleEffectiveness: Record<string, boolean>;
  incrementalGainMap: Record<string, IncrementalGain>; // Add prop for the gain map
  onRuleSelectionChange: (ruleId: string, isSelected: boolean) => void;
  onViewContentClick: (rule: InactiveRuleDetails) => void;
  sortColumn: SortableColumn | null;
  sortDirection: SortDirection;
  onSortChange: (column: SortableColumn) => void;
}

// Helper function for text truncation
const truncateText = (text: string | undefined | null, maxLength: number): string => {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export function InactiveRulesTable({
  rules,
  selectedRuleIds,
  ruleEffectiveness,
  incrementalGainMap, // Destructure the new prop
  onRuleSelectionChange,
  onViewContentClick,
  sortColumn,
  sortDirection,
  onSortChange,
}: Readonly<InactiveRulesTableProps>) {

  const sortedRules = useMemo(() => {
      const sorted = [...rules];
      // If a sort column is explicitly selected by the user, use it
      if (sortColumn) {
          sorted.sort((a, b) => {
              let comparison = 0;
              if (sortColumn === 'name') {
                  comparison = a.title.localeCompare(b.title);
              } else if (sortColumn === 'satisfies') {
                  const totalA = a.satisfies.tactics + a.satisfies.techniques + a.satisfies.subTechniques;
                  const totalB = b.satisfies.tactics + b.satisfies.techniques + b.satisfies.subTechniques;
                  comparison = totalA - totalB; // Descending by default
              } else if (sortColumn === 'incrementalGain') {
                  const gainA = incrementalGainMap[a.id] ?? { tactics: 0, techniques: 0, subTechniques: 0 };
                  const gainB = incrementalGainMap[b.id] ?? { tactics: 0, techniques: 0, subTechniques: 0 };
                  const totalGainA = gainA.tactics + gainA.techniques + gainA.subTechniques;
                  const totalGainB = gainB.tactics + gainB.techniques + gainB.subTechniques;
                   // Primary sort: total gain
                  if (totalGainA !== totalGainB) {
                      comparison = totalGainA - totalGainB; // Descending by default
                  } else {
                     // Secondary sort (tie-breaker): total satisfies
                     const totalSatisfiesA = a.satisfies.tactics + a.satisfies.techniques + a.satisfies.subTechniques;
                     const totalSatisfiesB = b.satisfies.tactics + b.satisfies.techniques + b.satisfies.subTechniques;
                     comparison = totalSatisfiesA - totalSatisfiesB; // Descending
                  }
              }

              // Apply direction (descending for satisfies/gain, ascending for name by default)
              const defaultDesc = sortColumn === 'satisfies' || sortColumn === 'incrementalGain';
              const directionMultiplier = sortDirection === (defaultDesc ? 'desc' : 'asc') ? -1 : 1;

              return comparison * directionMultiplier;
          });
      }
      // If no sort column is selected (null), the default sort applied in
      // InactiveRulesExplorer's useMemo (which already considers gain) is used.
      // No extra sorting needed here in that case.
      return sorted;
  // Depend on incrementalGainMap as well
  }, [rules, sortColumn, sortDirection, incrementalGainMap]);

  const renderSortIcon = (column: SortableColumn) => {
    const isActive = sortColumn === column;
    // Potentially add visual indication of asc/desc if needed later
    // For now, just show active state clearly
    return (
        <ArrowUpDown
            className={cn(
                "ml-1.5 h-4 w-4 shrink-0 transition-opacity", // Added transition
                isActive ? "opacity-100" : "opacity-30"
            )}
            strokeWidth={1.5} // Make icon slightly thinner
        />
    );
  };


  const MAX_CHARS = 100; // Define max characters for truncation

  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded-lg border border-slate-700 overflow-x-auto">
        {/* Increased min-width */}
        <Table className="bg-slate-800 text-slate-100 table-fixed w-full min-w-[950px]">
          <TableHeader className="bg-slate-700/50 sticky top-0 z-10"> {/* Make header sticky */}
            <TableRow className="border-b border-slate-700 hover:bg-slate-700/50">
              {/* Checkbox - Fixed width */}
              <TableHead className="w-[50px] px-4"> </TableHead>
              {/* Name Header - Adjusted width */}
              <TableHead className="px-4 cursor-pointer hover:bg-slate-600/50 w-[30%]" onClick={() => onSortChange('name')}>
                <div className="flex items-center">
                  Name / Description
                  {renderSortIcon('name')}
                </div>
              </TableHead>
              {/* Tactics Header - Fixed width */}
              <TableHead className="px-4 w-[12%]">Tactics</TableHead>
              {/* Techniques Header - Adjusted width */}
              <TableHead className="px-4 w-[23%]">Techniques</TableHead>
              {/* Satisfies Header - Fixed width */}
              <TableHead className="px-4 text-center cursor-pointer hover:bg-slate-600/50 w-[15%]" onClick={() => onSortChange('satisfies')}>
                 <div className="flex items-center justify-center">
                   Satisfies (T/T/S)
                   {renderSortIcon('satisfies')}
                 </div>
              </TableHead>
              {/* NEW Incremental Gain Header - Fixed width */}
              <TableHead className="px-4 text-center cursor-pointer hover:bg-slate-600/50 w-[15%]" onClick={() => onSortChange('incrementalGain')}>
                 <div className="flex items-center justify-center">
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <span className="flex items-center cursor-help"> {/* Wrap icon and text, add cursor */}
                           <TrendingUp size={14} className="mr-1.5 text-emerald-400 shrink-0" /> {/* Add Icon */}
                           Gain (T/T/S)
                       </span>
                     </TooltipTrigger>
                     <TooltipContent className="bg-slate-900 text-slate-100 border border-slate-700 max-w-xs text-xs p-2">
                       <p>Additional Tactics/Techniques/Sub-techniques that meet their minimum threshold if this rule is enabled (based on current filters).</p>
                     </TooltipContent>
                   </Tooltip>
                   {renderSortIcon('incrementalGain')}
                 </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRules.length === 0 && (
              <TableRow className="border-slate-700">
                <TableCell colSpan={6} className="h-24 text-center text-slate-400 italic"> {/* Updated colSpan */}
                  No inactive rules found matching the criteria.
                </TableCell>
              </TableRow>
            )}
            {sortedRules.map((rule) => {
              const isEffective = ruleEffectiveness[rule.id] ?? true;
              // Get incremental gain for this rule
              const gain = incrementalGainMap[rule.id] ?? { tactics: 0, techniques: 0, subTechniques: 0 };
              const totalGain = gain.tactics + gain.techniques + gain.subTechniques;

              const truncatedTitle = truncateText(rule.title, MAX_CHARS);
              const truncatedDescription = truncateText(rule.description, MAX_CHARS);
              const truncatedTactics = truncateText(rule.tactics.join(', '), MAX_CHARS);
              const truncatedTechniques = truncateText(rule.techniques.join(', '), MAX_CHARS);

              return (
                <TableRow
                  key={rule.id} // Key remains the same
                  className={cn(
                    "border-b border-slate-700 hover:bg-slate-700/30 transition-colors duration-100", // Added border-b here
                    !isEffective && "opacity-60", // Removed text-slate-400 from row level
                    selectedRuleIds.has(rule.id) ? 'bg-slate-700/50' : '' // Explicit selected style
                  )}
                  // data-state={selectedRuleIds.has(rule.id) ? 'selected' : undefined} // Can remove if using explicit bg class
                >
                  {/* Checkbox Cell */}
                  <TableCell className="px-4 align-top pt-3">
                    <Checkbox
                      checked={selectedRuleIds.has(rule.id)}
                      onCheckedChange={(checked) => onRuleSelectionChange(rule.id, !!checked)}
                      aria-label={`Select rule ${rule.title}`}
                      className={cn("border-slate-500 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", !isEffective && "opacity-50")}
                    />
                  </TableCell>
                  {/* Name/Description Cell */}
                   <TableCell className="font-medium px-4 py-3 align-top overflow-hidden">
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <button
                           onClick={() => onViewContentClick(rule)}
                           className={cn(
                               "text-left hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 py-0.5 -ml-1 block w-full truncate",
                               !isEffective && "hover:text-slate-300" // Adjust hover color when ineffective
                           )}
                         >
                           <div className={cn("text-slate-100 truncate", !isEffective && "text-slate-400")}>{truncatedTitle}</div>
                         </button>
                       </TooltipTrigger>
                       {rule.title && rule.title.length > MAX_CHARS && (
                         <TooltipContent className="bg-slate-900 text-slate-100 border border-slate-700 max-w-md">
                           <p>{rule.title}</p>
                         </TooltipContent>
                       )}
                     </Tooltip>
                     <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn("text-xs text-slate-400 mt-1 truncate", !isEffective && "text-slate-500")}>{truncatedDescription}</div>
                        </TooltipTrigger>
                        {rule.description && rule.description.length > MAX_CHARS && (
                          <TooltipContent className="bg-slate-900 text-slate-100 border border-slate-700 max-w-md">
                            <p>{rule.description}</p>
                          </TooltipContent>
                        )}
                     </Tooltip>
                   </TableCell>
                  {/* Tactics Cell */}
                  <TableCell className={cn("text-xs px-4 py-3 align-top overflow-hidden", !isEffective && "text-slate-500")}>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <span className="block truncate">{truncatedTactics || '-'}</span>
                       </TooltipTrigger>
                       {rule.tactics.join(', ').length > MAX_CHARS && (
                         <TooltipContent className="bg-slate-900 text-slate-100 border border-slate-700 max-w-md">
                           <p>{rule.tactics.join(', ')}</p>
                         </TooltipContent>
                       )}
                     </Tooltip>
                  </TableCell>
                  {/* Techniques Cell */}
                  <TableCell className={cn("text-xs px-4 py-3 align-top overflow-hidden", !isEffective && "text-slate-500")}>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <span className="block truncate">{truncatedTechniques || '-'}</span>
                       </TooltipTrigger>
                       {rule.techniques.join(', ').length > MAX_CHARS && (
                         <TooltipContent className="bg-slate-900 text-slate-100 border border-slate-700 max-w-md">
                           <p>{rule.techniques.join(', ')}</p>
                         </TooltipContent>
                       )}
                     </Tooltip>
                  </TableCell>
                  {/* Satisfies Cell */}
                  <TableCell className={cn("text-center px-4 py-3 align-top", !isEffective && "text-slate-500")}>
                    {`${rule.satisfies.tactics}/${rule.satisfies.techniques}/${rule.satisfies.subTechniques}`}
                  </TableCell>
                  {/* NEW Incremental Gain Cell */}
                  <TableCell
                      className={cn(
                          "text-center px-4 py-3 align-top font-medium",
                          totalGain > 0 ? "text-emerald-400" : (isEffective ? "text-slate-500" : "text-slate-600") // Dim further if ineffective
                      )}
                  >
                    {`${gain.tactics}/${gain.techniques}/${gain.subTechniques}`}
                  </TableCell>
                </TableRow>
              )})}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}