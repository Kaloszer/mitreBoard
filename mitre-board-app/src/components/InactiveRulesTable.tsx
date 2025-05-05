import React from 'react';
import { Checkbox } from "@/components/ui/checkbox"; // Assuming Checkbox component exists
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Assuming Table components exist

// TODO: Import the actual InactiveRuleDetails type from server/index.ts or a shared types file
interface InactiveRuleDetails {
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

interface InactiveRulesTableProps {
  rules: InactiveRuleDetails[];
  selectedRuleIds: Set<string>;
  onRuleSelectionChange: (ruleId: string, isSelected: boolean) => void;
  onViewContentClick: (rule: InactiveRuleDetails) => void; // Add prop for viewing content
  // TODO: Add props for sorting state and handlers
}

export function InactiveRulesTable({
  rules,
  selectedRuleIds,
  onRuleSelectionChange,
  onViewContentClick, // Destructure new prop
}: InactiveRulesTableProps) {

  // TODO: Implement sorting logic based on props

  const sortedRules = [...rules].sort((a, b) => {
    // Default sort: descending by total satisfies count
    const totalA = a.satisfies.tactics + a.satisfies.techniques + a.satisfies.subTechniques;
    const totalB = b.satisfies.tactics + b.satisfies.techniques + b.satisfies.subTechniques;
    return totalB - totalA;
  });

  return (
    <div className="rounded-lg border border-slate-700 overflow-hidden">
      <Table className="bg-slate-800 text-slate-100">
        <TableHeader className="bg-slate-700/50">
          <TableRow className="border-slate-700 hover:bg-slate-700/50">
            <TableHead className="w-[50px] px-4"> {/* Checkbox */}
              {/* TODO: Add select all checkbox? */}
            </TableHead>
            <TableHead className="px-4">Name</TableHead> {/* TODO: Add sorting */}
            <TableHead className="px-4">Tactics</TableHead>
            <TableHead className="px-4">Techniques</TableHead>
            <TableHead className="px-4 text-center">Satisfies (T/T/S)</TableHead> {/* TODO: Add sorting */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRules.length === 0 && (
            <TableRow className="border-slate-700">
              <TableCell colSpan={5} className="h-24 text-center text-slate-400 italic">
                No inactive rules found matching the criteria.
              </TableCell>
            </TableRow>
          )}
          {sortedRules.map((rule) => (
            <TableRow
              key={rule.id}
              className="border-slate-700 hover:bg-slate-700/30"
              data-state={selectedRuleIds.has(rule.id) ? 'selected' : undefined}
            >
              <TableCell className="px-4 align-top pt-3">
                <Checkbox
                  checked={selectedRuleIds.has(rule.id)}
                  onCheckedChange={(checked) => onRuleSelectionChange(rule.id, !!checked)}
                  aria-label={`Select rule ${rule.title}`}
                  className="border-slate-500 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
              </TableCell>
              <TableCell className="font-medium px-4 py-3 align-top">
                 {/* Make title clickable */}
                 <button
                    onClick={() => onViewContentClick(rule)}
                    className="text-left hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 py-0.5 -ml-1"
                 >
                    <div className="text-slate-100">{rule.title}</div>
                 </button>
                <div className="text-xs text-slate-400 mt-1 line-clamp-2">{rule.description}</div>
              </TableCell>
              <TableCell className="text-xs px-4 py-3 align-top">
                {rule.tactics.join(', ') || '-'}
              </TableCell>
              <TableCell className="text-xs px-4 py-3 align-top">
                 {/* TODO: Maybe format this better? */}
                {rule.techniques.join(', ') || '-'}
              </TableCell>
              <TableCell className="text-center px-4 py-3 align-top">
                {`${rule.satisfies.tactics}/${rule.satisfies.techniques}/${rule.satisfies.subTechniques}`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
