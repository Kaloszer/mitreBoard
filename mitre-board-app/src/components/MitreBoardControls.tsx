 import React from 'react';
 import { Button } from "@/components/ui/button";
 import { Download, Filter, FilterX } from 'lucide-react';
 import { cn } from "@/lib/utils";
 
 interface MitreBoardControlsProps {
  showOnlyMissing: boolean;
  onShowOnlyMissingChange: (checked: boolean) => void;
  onExportClick: () => void;
}

export function MitreBoardControls({
  showOnlyMissing,
  onShowOnlyMissingChange,
  onExportClick
 }: Readonly<MitreBoardControlsProps>) {
   return (
     <div className="bg-slate-900 rounded-lg shadow-md border border-border p-4 mb-6 flex flex-col sm:flex-row justify-end items-center gap-3">
       {/* Filter Button */}
       <Button
         variant="outline"
         size="sm"
         onClick={() => onShowOnlyMissingChange(!showOnlyMissing)}
         className={cn(
           "text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-slate-100", // Base style
           showOnlyMissing && "bg-slate-700 border-slate-500 text-white hover:bg-slate-600" // Active style
         )}
         aria-pressed={showOnlyMissing}
       >
         {showOnlyMissing ? (
           <FilterX size={16} className="mr-2" /> // Icon when active
         ) : (
           <Filter size={16} className="mr-2" /> // Icon when inactive
         )}
         Show only missing Techniques
       </Button>
 
       {/* Export Button */}
       <Button
         variant="outline"
         size="sm"
         onClick={onExportClick}
         className="text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-slate-100"
       >
         <Download size={16} className="mr-2" />
         Export Missing Techniques (CSV)
       </Button>
     </div>
   );
 }
