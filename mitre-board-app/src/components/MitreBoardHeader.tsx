import React from 'react';
// Removed Sun, Moon, Button, useTheme imports
import { cn } from "@/lib/utils"; // Import cn for combining classes

export function MitreBoardHeader() {
  // Removed useTheme hook
  // Define legend colors using only dark mode classes - Removed alpha transparency
  const legendColors = {
    level5: "bg-blue-950", // Removed /40
    level34: "bg-sky-950", // Removed /40
    level12: "bg-amber-950", // Removed /40
    level0: "bg-gray-800", // Changed bg-muted/40 to bg-gray-800 (solid dark gray)
  };

  return (
    // Use only dark mode gradient classes
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-lg shadow-lg border border-border p-4 mb-10 overflow-hidden">
      {/* Use only dark mode gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-primary/10 to-blue-900/10" />
      {/* Main content with relative positioning */}
      <div className="relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Removed flex wrapper for title and button */}
        <div>
          {/* Use only dark mode text colors */}
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="text-white">MITRE</span>
            <span className="text-white"> ATT&CK Board</span>
          </h1>
          <p className="text-gray-300 text-sm mt-1">
            Visualizing tactics, techniques and rule coverage
          </p>
        </div>
        {/* Removed Theme Toggle Button */}

        {/* Legend with dark gradient background */}
        <div className="relative flex flex-wrap gap-3 text-sm p-2 rounded-md border border-border/50 overflow-hidden">
          {/* Dark Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/80" />
          {/* Content */}
          <div className="relative flex flex-wrap gap-3">
            <div className="flex items-center">
              <span className={cn("inline-block w-4 h-4 rounded-sm mr-1.5 border border-border/50 shadow-sm", legendColors.level5)}></span>
              <span className="text-gray-200">≥5 rules</span>
            </div>
            <div className="flex items-center">
              <span className={cn("inline-block w-4 h-4 rounded-sm mr-1.5 border border-border/50 shadow-sm", legendColors.level34)}></span>
              <span className="text-gray-200">3-4 rules</span>
            </div>
            <div className="flex items-center">
              <span className={cn("inline-block w-4 h-4 rounded-sm mr-1.5 border border-border/50 shadow-sm", legendColors.level12)}></span>
              <span className="text-gray-200">1-2 rules</span>
            </div>
            <div className="flex items-center">
              <span className={cn("inline-block w-4 h-4 rounded-sm mr-1.5 border border-border/50 shadow-sm", legendColors.level0)}></span>
              <span className="text-gray-200">0 rules</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
