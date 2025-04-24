import React from 'react';
import { cn } from "@/lib/utils"; // Import cn for combining classes

export function MitreBoardHeader() {
  // Define legend colors using the same classes as TechniqueItem/SubTechniqueItem
  const legendColors = {
    level5: "bg-blue-100 dark:bg-blue-900",
    level34: "bg-sky-100 dark:bg-sky-900",
    level12: "bg-yellow-100 dark:bg-yellow-900",
    level0: "bg-gray-100 dark:bg-gray-800",
  };

  return (
    // Use slate-100 for a slightly more visible light gray background
    <div className="bg-slate-100 rounded-lg shadow-lg border border-border p-4 mb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          {/* Use theme colors for text */}
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            <span className="text-primary">MITRE</span> ATT&CK Board
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualizing tactics, techniques and rule coverage
          </p>
        </div>

        {/* Legend for colors - Use theme colors and increase text size */}
        <div className="flex flex-wrap gap-3 text-sm bg-muted/50 p-2 rounded-md border border-border">
          <div className="flex items-center">
            <span className={cn("inline-block w-4 h-4 rounded-sm mr-1.5", legendColors.level5)}></span>
            <span className="text-foreground">≥5 rules</span>
          </div>
          <div className="flex items-center">
            <span className={cn("inline-block w-4 h-4 rounded-sm mr-1.5", legendColors.level34)}></span>
            <span className="text-foreground">3-4 rules</span>
          </div>
          <div className="flex items-center">
            <span className={cn("inline-block w-4 h-4 rounded-sm mr-1.5", legendColors.level12)}></span>
            <span className="text-foreground">1-2 rules</span>
          </div>
          <div className="flex items-center">
            <span className={cn("inline-block w-4 h-4 rounded-sm mr-1.5", legendColors.level0)}></span>
            <span className="text-foreground">0 rules</span>
          </div>
        </div>
      </div>
    </div>
  );
}
