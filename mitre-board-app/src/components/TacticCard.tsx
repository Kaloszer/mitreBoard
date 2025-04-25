import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TechniqueItem } from './TechniqueItem';

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
  onViewRulesClick: (technique: Technique) => void; // Pass this down
}

export function TacticCard({
  tactic,
  ruleCounts,
  getExternalId,
  getTacticRuleCount,
  onViewRulesClick
}: Readonly<TacticCardProps>) {
  const tacticId = getExternalId(tactic);
  const totalRules = getTacticRuleCount(tactic);

  return (
    <Card key={tacticId} className="relative overflow-hidden shadow-md border border-border">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.05] via-transparent to-primary/[0.05]" />
      <div className="relative">
      <CardHeader className="p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-100">
            {tactic.name}
            <span className="block text-xs text-slate-400 mt-0.5"> 
              {tacticId}
            </span>
          </CardTitle>
          <div className="flex items-center bg-muted px-2 py-1 rounded-full">
            <span className="text-xs text-slate-100 mr-1.5">Rules:</span> 
            <span className="text-sm font-medium text-slate-400">{totalRules}</span> 
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3 overflow-y-auto max-h-[400px] relative">
        {tactic.techniques.map((technique) => (
          <TechniqueItem
            key={getExternalId(technique)}
            technique={technique}
            ruleCounts={ruleCounts}
            getExternalId={getExternalId}
            onViewRulesClick={onViewRulesClick}
          />
        ))}
      </CardContent>
      </div>
    </Card>
  );
}
