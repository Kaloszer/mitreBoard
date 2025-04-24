import React from 'react';
import { cn } from "@/lib/utils";
// Button and List icon are no longer needed here if the count itself is the trigger
// import { Button } from "@/components/ui/button";
// import { List } from 'lucide-react';
import { SubTechniqueItem } from './SubTechniqueItem'; // Import the sub-technique component

// Define types for props - mirroring App.tsx structure
interface Technique {
  id: string;
  name: string;
  description?: string;
  external_references: { external_id: string; url?: string }[];
  subTechniques?: Technique[];
}

interface TechniqueItemProps {
  technique: Technique;
  ruleCounts: Record<string, number>;
  getExternalId: (item: Technique) => string;
  // Removed getBackgroundColor, getTextColor props
  onViewRulesClick: (technique: Technique) => void;
}

// Define color logic locally (using only dark theme classes)
const getTechniqueColors = (count: number): { bg: string; text: string } => {
  if (count === 0) return {
    bg: "bg-gray-800/50",
    text: "text-gray-300"
  };
  if (count >= 1 && count <= 2) return {
    bg: "bg-amber-950",
    text: "text-amber-200"
  };
  if (count >= 3 && count <= 4) return {
    bg: "bg-sky-950",
    text: "text-sky-200"
  };
  if (count >= 5) return {
    bg: "bg-blue-950",
    text: "text-blue-200"
  };
  return { bg: "bg-muted", text: "text-muted-foreground" }; // Fallback uses theme variables
};


export function TechniqueItem({
  technique,
  ruleCounts,
  getExternalId,
  // Removed getBackgroundColor, getTextColor
  onViewRulesClick
}: Readonly<TechniqueItemProps>) {
  const techId = getExternalId(technique);
  const techCount = ruleCounts[techId] ?? 0;
  console.log(`DEBUG: TechniqueItem - ID: ${techId}, Count: ${techCount}`); // DEBUG: Log ID and count
  const hasSubTechniques = technique.subTechniques && technique.subTechniques.length > 0;
  // Calculate colors locally
  const { bg: bgColorClass, text: textColorClass } = getTechniqueColors(techCount);
  console.log(`DEBUG: TechniqueItem - ID: ${techId}, Count: ${techCount}, Calculated BG: ${bgColorClass}, Calculated Text: ${textColorClass}`); // DEBUG: Log calculated classes


  return (
    <div
      key={techId}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-md border transition-colors duration-150",
        bgColorClass, // Background based on count
        "border" // Always apply border class
        // Removed group class as hover effect is removed
      )}
    >
      <div className="flex justify-between items-start gap-2">
        {/* Technique Name and ID */}
        <div className="flex-1 mr-2 min-w-0"> {/* Added min-w-0 for better truncation */}
          <p className={cn("font-medium truncate", textColorClass)}>{technique.name}</p>
          <p className={cn("block text-xs opacity-80 mt-0.5 truncate", textColorClass)}>{techId}</p>
        </div>
        {/* Rule Count Badge (Clickable) */}
        <button
          disabled={techCount === 0}
          onClick={() => techCount > 0 && onViewRulesClick(technique)}
          aria-label={techCount > 0 ? `View ${techCount} rules for ${technique.name}` : `No rules for ${technique.name}`}
          className={cn(
            "flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium border transition-colors",
            // Theme-aware styling for the badge - Changed text-primary to text-slate-100 and text-muted-foreground to text-slate-400
            techCount > 0
              ? "bg-primary/10 border-primary/30 text-slate-100 cursor-pointer hover:bg-primary/20" // Changed text-primary to text-slate-100
              : "bg-muted border-border text-slate-400 cursor-not-allowed", // Changed text-muted-foreground to text-slate-400
            // Focus styles
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          )}
        >
          {techCount}
        </button>
        {/* Removed the hover List button */}
      </div>

      {/* Render Sub-techniques */}
      {hasSubTechniques && (
        // Use theme border color
        <div className="mt-2 pt-2 border-t border-border/60 space-y-1.5">
          {/* Use theme text color */}
          <p className={cn("text-xs font-semibold mb-1 opacity-90", textColorClass)}>Sub-techniques:</p>
          {technique.subTechniques?.map((sub) => {
            const subId = getExternalId(sub);
            const subCount = ruleCounts[subId] ?? 0;
            return (
              <SubTechniqueItem
                key={subId}
                subTechnique={sub}
                ruleCount={subCount} // Pass the specific count for this sub-technique
                getExternalId={getExternalId}
                // Removed getBackgroundColor, getTextColor props from SubTechniqueItem call
                onViewRulesClick={onViewRulesClick} // Pass the handler down
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
