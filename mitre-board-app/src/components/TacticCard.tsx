import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TechniqueItem } from './TechniqueItem'; // Import the technique component

// Define types for props - mirroring App.tsx structure
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

interface TacticCardProps {
  tactic: Tactic;
  ruleCounts: Record<string, number>;
  getExternalId: (item: Tactic | Technique) => string;
  getTacticRuleCount: (tactic: Tactic) => number;
  // Removed getBackgroundColor, getTextColor props
  onViewRulesClick: (technique: Technique) => void; // Pass this down
}

export function TacticCard({
  tactic,
  ruleCounts,
  getExternalId,
  getTacticRuleCount,
  // Removed getBackgroundColor, getTextColor
  onViewRulesClick
}: TacticCardProps) {
  const tacticId = getExternalId(tactic);
  const totalRules = getTacticRuleCount(tactic);

  return (
    // Use slate-100 for a slightly more visible light gray background, keep shadow
    <Card key={tacticId} className="bg-slate-100 overflow-hidden shadow-md">
      {/* Use standard CardHeader styling - Increased padding */}
      <CardHeader className="p-6">
        <div className="flex items-center justify-between">
          {/* Use standard CardTitle styling */}
          <CardTitle className="text-lg font-semibold">
            {tactic.name}
            {/* Use muted foreground for ID */}
            <span className="block text-xs text-muted-foreground mt-0.5">
              {tacticId}
            </span>
          </CardTitle>
          {/* Total rules badge - Use theme colors */}
          <div className="flex items-center bg-muted px-2 py-1 rounded-full">
            <span className="text-xs text-muted-foreground mr-1.5">Rules:</span>
            <span className="text-sm font-medium text-primary">{totalRules}</span>
          </div>
        </div>
      </CardHeader>
      {/* Use standard CardContent styling - Increased padding and item spacing */}
      <CardContent className="p-4 space-y-3 overflow-y-auto max-h-[400px]">
        {tactic.techniques.map((technique) => (
          <TechniqueItem
            key={getExternalId(technique)}
            technique={technique}
            ruleCounts={ruleCounts}
            getExternalId={getExternalId}
            // Removed getBackgroundColor, getTextColor props from TechniqueItem call
            onViewRulesClick={onViewRulesClick} // Pass handler down
          />
        ))}
      </CardContent>
    </Card>
  );
}
