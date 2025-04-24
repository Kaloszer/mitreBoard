import React from 'react';
import { cn } from "@/lib/utils";
// Button and List icon are no longer needed here
// import { Button } from "@/components/ui/button";
// import { List } from 'lucide-react';

// Define types for props - mirroring App.tsx structure initially
interface Technique {
  id: string;
  name: string;
  description?: string;
  external_references: { external_id: string; url?: string }[];
  // SubTechniques are not nested further in this component
}

interface SubTechniqueItemProps {
  subTechnique: Technique;
  ruleCount: number;
  getExternalId: (item: Technique) => string;
  // Removed getBackgroundColor, getTextColor props
  onViewRulesClick: (technique: Technique) => void;
}

// Define color logic locally (using only dark theme classes)
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
  return { bg: "bg-muted", text: "text-muted-foreground" }; // Fallback uses theme variables
};

export function SubTechniqueItem({
  subTechnique,
  ruleCount,
  getExternalId,
  // Removed getBackgroundColor, getTextColor
  onViewRulesClick
}: Readonly<SubTechniqueItemProps>) {
  const subId = getExternalId(subTechnique);
  console.log(`DEBUG: SubTechniqueItem - ID: ${subId}, Count: ${ruleCount}`); // DEBUG: Log ID and count
  // Calculate colors locally
  const { bg: subBgColor, text: subTextColor } = getSubTechniqueColors(ruleCount);

  return (
    // Added pl-4 for indentation
    <div key={subId} className={cn(
        "flex justify-between items-center text-xs p-2 pl-4 rounded-sm border transition-colors duration-150",
        subBgColor, // Background based on count
        "border-border/40" // Lighter border for sub-techniques
    )}>
      {/* Sub-technique Name and ID */}
      <div className="flex-1 mr-1 min-w-0"> {/* Added min-w-0 */}
        <p className={cn("truncate", subTextColor)}>{subTechnique.name}</p>
        <p className={cn("block opacity-70 truncate", subTextColor)}>{subId}</p>
      </div>
      {/* Rule Count Badge (Clickable) */}
      <button
        disabled={ruleCount === 0}
        onClick={() => ruleCount > 0 && onViewRulesClick(subTechnique)}
        aria-label={ruleCount > 0 ? `View ${ruleCount} rules for ${subTechnique.name}` : `No rules for ${subTechnique.name}`}
        className={cn(
          "flex-shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-medium border transition-colors",
          // Theme-aware styling for the badge - Changed text-primary to text-slate-100 and text-muted-foreground to text-slate-400
          ruleCount > 0
            ? "bg-primary/10 border-primary/30 text-slate-100 cursor-pointer hover:bg-primary/20" // Changed text-primary to text-slate-100
            : "bg-muted border-border text-slate-400 cursor-not-allowed", // Changed text-muted-foreground to text-slate-400
          // Focus styles
          "focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0" // Adjusted focus ring for smaller size
        )}
      >
        {ruleCount}
      </button>
      {/* Removed the hover List button */}
    </div>
  );
}
