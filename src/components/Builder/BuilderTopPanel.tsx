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

export const BuilderTopPanel = ({ onExport, onImport, onOpenIntro, onOpenEndings, saveStatus }: Omit<BuilderTopPanelProps, 'validationErrors'>) => {
  const { mode } = useAppContext();
  
  if (mode !== 'builder') return null;

  return (
    <div className="bg-white/90 backdrop-blur-md p-5 rounded-[32px] shadow-soft sticky top-4 z-10 border border-white/50 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onExport} className="rounded-full text-xs font-bold text-muted-foreground h-9"><Download className="w-4 h-4 mr-2" /> Export</Button>
          <div className="relative">
            <input type="file" accept=".json" onChange={onImport} className="absolute inset-0 opacity-0 cursor-pointer" />
            <Button variant="ghost" className="rounded-full text-xs font-bold text-muted-foreground h-9"><Upload className="w-4 h-4 mr-2" /> Import</Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-center">
          <Button variant="ghost" onClick={onOpenIntro} className="rounded-full text-xs font-bold text-muted-foreground h-9"><Sparkles className="w-4 h-4 mr-2" /> Intro</Button>
          <Button variant="ghost" onClick={onOpenEndings} className="rounded-full text-xs font-bold text-muted-foreground h-9"><Heart className="w-4 h-4 mr-2" /> Endings</Button>
        </div>

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
    </div>
  );
};
