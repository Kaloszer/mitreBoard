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

// Define color logic locally (same as in TechniqueItem)
const getSubTechniqueColors = (count: number): { bg: string; text: string } => {
  if (count === 0) return { bg: "bg-slate-200 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400" }; // Changed light mode 0-rule bg
  if (count >= 1 && count <= 2) return { bg: "bg-yellow-100 dark:bg-yellow-900", text: "text-yellow-900 dark:text-yellow-100" };
  if (count >= 3 && count <= 4) return { bg: "bg-sky-100 dark:bg-sky-900", text: "text-sky-900 dark:text-sky-100" };
  if (count >= 5) return { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-900 dark:text-blue-100" };
  return { bg: "bg-muted", text: "text-muted-foreground" }; // Fallback
};

export function SubTechniqueItem({
  subTechnique,
  ruleCount,
  getExternalId,
  // Removed getBackgroundColor, getTextColor
  onViewRulesClick
}: SubTechniqueItemProps) {
  const subId = getExternalId(subTechnique);
  console.log(`DEBUG: SubTechniqueItem - ID: ${subId}, Count: ${ruleCount}`); // DEBUG: Log ID and count
  // Calculate colors locally
  const { bg: subBgColor, text: subTextColor } = getSubTechniqueColors(ruleCount);

  return (
    // Added pl-4 for indentation
    <div key={subId} className={cn(
        "flex justify-between items-center text-xs p-1.5 pl-4 rounded-sm border transition-colors duration-150",
        subBgColor, // Background based on count
        "border" // Always apply border class
        // Removed group class
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
          // Theme-aware styling for the badge
          ruleCount > 0
            ? "bg-primary/10 border-primary/30 text-primary cursor-pointer hover:bg-primary/20"
            : "bg-muted border-border text-muted-foreground cursor-not-allowed",
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
