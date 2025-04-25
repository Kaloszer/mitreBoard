import React from 'react';
import { cn } from "@/lib/utils";

interface Technique {
  id: string;
  name: string;
  description?: string;
  external_references: { external_id: string; url?: string }[];
}

interface SubTechniqueItemProps {
  subTechnique: Technique;
  ruleCount: number;
  getExternalId: (item: Technique) => string;
  onViewRulesClick: (technique: Technique) => void;
}

const getSubTechniqueColors = (count: number): { bg: string; text: string } => {
  if (count === 0) return {
    bg: "bg-gray-800/30",
    text: "text-gray-300"
  };
  if (count >= 1 && count <= 2) return {
    bg: "bg-amber-950/80",
    text: "text-amber-200"
  };
  if (count >= 3 && count <= 4) return {
    bg: "bg-sky-950/80",
    text: "text-sky-200"
  };
  if (count >= 5) return {
    bg: "bg-blue-950/80",
    text: "text-blue-200"
  };
  return { bg: "bg-muted", text: "text-muted-foreground" };
};

export function SubTechniqueItem({
  subTechnique,
  ruleCount,
  getExternalId,
  onViewRulesClick
}: Readonly<SubTechniqueItemProps>) {
  const subId = getExternalId(subTechnique);
  console.log(`DEBUG: SubTechniqueItem - ID: ${subId}, Count: ${ruleCount}`);
  const { bg: subBgColor, text: subTextColor } = getSubTechniqueColors(ruleCount);

  return (
    <div key={subId} className={cn(
        "flex justify-between items-center text-xs p-2 pl-4 rounded-sm border transition-colors duration-150",
        subBgColor,
        "border-border/40"
    )}>
      <div className="flex-1 mr-1 min-w-0">
        <p className={cn("truncate", subTextColor)}>{subTechnique.name}</p>
        <p className={cn("block opacity-70 truncate", subTextColor)}>{subId}</p>
      </div>
      <button
        disabled={ruleCount === 0}
        onClick={() => ruleCount > 0 && onViewRulesClick(subTechnique)}
        aria-label={ruleCount > 0 ? `View ${ruleCount} rules for ${subTechnique.name}` : `No rules for ${subTechnique.name}`}
        className={cn(
          "flex-shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-medium border transition-colors",
          ruleCount > 0
            ? "bg-primary/10 border-primary/30 text-slate-100 cursor-pointer hover:bg-primary/20"
            : "bg-muted border-border text-slate-400 cursor-not-allowed",
          "focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0"
        )}
      >
        {ruleCount}
      </button>
    </div>
  );
}
