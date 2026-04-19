import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, Sparkles, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/store/AppContext';
import { ValidationError } from '@/types';

interface BuilderTopPanelProps {
  validationErrors: ValidationError[];
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenIntro: () => void;
  onOpenEndings: () => void;
  saveStatus?: string;
}

export const BuilderTopPanel = ({ onExport, onImport, onOpenIntro, onOpenEndings, saveStatus, validationErrors }: BuilderTopPanelProps) => {
  const { mode } = useAppContext();
  
  if (mode !== 'builder') return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-3 bg-white/70 backdrop-blur-md rounded-2xl shadow-sm max-w-full overflow-hidden sticky top-4 z-10 border border-white/50">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Button variant="ghost" onClick={onExport} className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl whitespace-nowrap shrink-0 min-w-[90px] max-w-[140px] overflow-hidden text-ellipsis bg-pink-50 hover:bg-pink-100"><Download className="w-4 h-4" /> <span className="truncate">Export</span></Button>
        <div className="relative">
          <input type="file" accept=".json" onChange={onImport} className="absolute inset-0 opacity-0 cursor-pointer" />
          <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl whitespace-nowrap shrink-0 min-w-[90px] max-w-[140px] overflow-hidden text-ellipsis bg-pink-50 hover:bg-pink-100"><Upload className="w-4 h-4" /> <span className="truncate">Import</span></Button>
        </div>
        <Button variant="ghost" onClick={onOpenIntro} className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl whitespace-nowrap shrink-0 min-w-[90px] max-w-[140px] overflow-hidden text-ellipsis bg-pink-50 hover:bg-pink-100"><Sparkles className="w-4 h-4" /> <span className="truncate">Intro</span></Button>
        <Button variant="ghost" onClick={onOpenEndings} className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl whitespace-nowrap shrink-0 min-w-[90px] max-w-[140px] overflow-hidden text-ellipsis bg-pink-50 hover:bg-pink-100"><Heart className="w-4 h-4" /> <span className="truncate">Endings</span></Button>
      </div>

      {validationErrors && validationErrors.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-100 text-red-700 text-sm font-bold shadow-sm whitespace-nowrap shrink-0">
          {validationErrors.length} Errors ⚠️
        </div>
      )}

      {saveStatus && (
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-widest transition-colors",
            saveStatus === 'Saving...' ? "text-accent animate-pulse" : "text-highlight"
          )}>
            {saveStatus}
          </span>
        </div>
      )}
    </div>
  );
};
