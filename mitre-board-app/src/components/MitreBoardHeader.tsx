import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button"; // Import Button
import { Eye, EyeOff } from 'lucide-react'; // Import icons

interface MitreBoardHeaderProps {
  currentView: 'board' | 'inactiveExplorer';
  onToggleView: () => void;
}

export function MitreBoardHeader({ currentView, onToggleView }: MitreBoardHeaderProps) {
  const legendColors = {
    level5: "bg-blue-950",
    level34: "bg-sky-950",
    level12: "bg-amber-950",
    level0: "bg-gray-800",
  };

  return (
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-lg shadow-lg border border-border p-4 mb-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-primary/10 to-blue-900/10" />
      <div className="relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="text-white">MITRE</span>
            <span className="text-white"> ATT&CK Board</span>
          </h1>
          <p className="text-gray-300 text-sm mt-1">
            Visualizing tactics, techniques and rule coverage
          </p>
        </div>
        <div className="relative flex flex-wrap gap-3 text-sm p-2 rounded-md border border-border/50 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/80" />
          <div className="relative flex flex-wrap gap-3">
            <div className="flex items-center">
              <span className={cn("inline-block w-4 h-4 rounded-sm mr-1.5 border border-border/50", legendColors.level5)}></span>
              <span className="text-gray-200">≥5 rules</span>
            </div>
            <div className="flex items-center">
              <span className={cn("inline-block w-4 h-4 rounded-sm mr-1.5 border border-border/50", legendColors.level34)}></span>
              <span className="text-gray-200">3-4 rules</span>
            </div>
            <div className="flex items-center">
              <span className={cn("inline-block w-4 h-4 rounded-sm mr-1.5 border border-border/50", legendColors.level12)}></span>
              <span className="text-gray-200">1-2 rules</span>
            </div>
            <div className="flex items-center">
              <span className={cn("inline-block w-4 h-4 rounded-sm mr-1.5 border border-border/50", legendColors.level0)}></span>
              <span className="text-gray-200">0 rules</span>
            </div>
          </div> {/* Closes inner legend items div */}
        </div> {/* Closes legend container div */}

        {/* Button is now a direct child of the main flex container */}
        <Button
            variant="outline"
            size="sm"
            onClick={onToggleView}
            className="ml-auto text-slate-200 border-slate-600 hover:bg-slate-700 hover:text-white md:ml-4"
          >
            {currentView === 'board' ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                View Inactive Rules
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                View MITRE Board
              </>
            )}
          </Button>
      </div> {/* Closes main flex row */}
    </div> {/* Closes relative container */}
  </div> // Closes outer div
  );
}
