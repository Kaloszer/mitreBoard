import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Thresholds {
  tactics: number;
  techniques: number;
  subTechniques: number;
}

interface InactiveRulesFiltersProps {
  thresholds: Thresholds;
  onChange: (newThresholds: Thresholds) => void;
}

export function InactiveRulesFilters({ thresholds, onChange }: InactiveRulesFiltersProps) {

  const handleInputChange = (key: keyof Thresholds, value: string) => {
    const numValue = parseInt(value, 10);
    // Ensure non-negative integer, default to 0 if invalid
    const validValue = !isNaN(numValue) && numValue >= 0 ? numValue : 0;
    onChange({ ...thresholds, [key]: validValue });
  };

  return (
    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 mb-6 flex flex-wrap gap-4 items-end">
      <h3 className="text-lg font-medium text-slate-200 w-full mb-2">Filter by Minimum Coverage Needed</h3>
      <div className="flex-1 min-w-[120px]">
        <Label htmlFor="tactic-threshold" className="text-sm text-slate-400 mb-1 block">Min Tactics</Label>
        <Input
          id="tactic-threshold"
          type="number"
          min="0"
          placeholder="0"
          value={thresholds.tactics}
          onChange={(e) => handleInputChange('tactics', e.target.value)}
          className="bg-slate-700 border-slate-600 text-slate-100"
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <Label htmlFor="technique-threshold" className="text-sm text-slate-400 mb-1 block">Min Techniques</Label>
        <Input
          id="technique-threshold"
          type="number"
          min="0"
          placeholder="0"
          value={thresholds.techniques}
          onChange={(e) => handleInputChange('techniques', e.target.value)}
          className="bg-slate-700 border-slate-600 text-slate-100"
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <Label htmlFor="subtechnique-threshold" className="text-sm text-slate-400 mb-1 block">Min Sub-Techniques</Label>
        <Input
          id="subtechnique-threshold"
          type="number"
          min="0"
          placeholder="0"
          value={thresholds.subTechniques}
          onChange={(e) => handleInputChange('subTechniques', e.target.value)}
          className="bg-slate-700 border-slate-600 text-slate-100"
        />
      </div>
      {/* Filters apply live as user types */}
    </div>
  );
}
