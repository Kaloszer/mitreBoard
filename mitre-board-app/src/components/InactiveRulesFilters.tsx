import type { Dispatch, SetStateAction } from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Filter, FilterX } from 'lucide-react'; // Import icons for the button

interface InactiveRulesFiltersProps {
  showOnlyEffective: boolean;
  onShowOnlyEffectiveChange: Dispatch<SetStateAction<boolean>>;
}

export function InactiveRulesFilters({
  showOnlyEffective,
  onShowOnlyEffectiveChange,
}: Readonly<InactiveRulesFiltersProps>) {

  const buttonText = showOnlyEffective ? "Show All Rules" : "Show Effective Only";
  const ButtonIcon = showOnlyEffective ? FilterX : Filter;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onShowOnlyEffectiveChange(!showOnlyEffective)}
            className="text-slate-200 border-slate-600 hover:bg-slate-700 hover:text-white"
          >
            <ButtonIcon className="mr-2 h-4 w-4" />
            {buttonText}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-slate-100 border border-slate-700 max-w-xs text-xs p-2">
          <p>
            {showOnlyEffective
              ? "Click to show all inactive rules, including those that don't add new coverage."
              : "Click to show only rules that provide additional coverage (positive gain) for at least one Tactic, Technique, or Sub-technique that currently has zero coverage."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
