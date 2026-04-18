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
}

export const BuilderTopPanel = ({ onExport, onImport, onOpenIntro, onOpenEndings }: Omit<BuilderTopPanelProps, 'validationErrors'>) => {
  const { mode } = useAppContext();
  
  if (mode !== 'builder') return null;

  return (
    <div className="bg-white/90 backdrop-blur-md p-5 rounded-[32px] shadow-soft sticky top-4 z-10 border border-white/50 space-y-4">
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" onClick={onExport} className="rounded-full text-xs font-bold text-muted-foreground h-9"><Download className="w-4 h-4 mr-2" /> Export</Button>
        <div className="relative">
          <input type="file" accept=".json" onChange={onImport} className="absolute inset-0 opacity-0 cursor-pointer" />
          <Button variant="ghost" className="rounded-full text-xs font-bold text-muted-foreground h-9"><Upload className="w-4 h-4 mr-2" /> Import</Button>
        </div>
        <Button variant="ghost" onClick={onOpenIntro} className="rounded-full text-xs font-bold text-muted-foreground h-9"><Sparkles className="w-4 h-4 mr-2" /> Intro</Button>
        <Button variant="ghost" onClick={onOpenEndings} className="rounded-full text-xs font-bold text-muted-foreground h-9"><Heart className="w-4 h-4 mr-2" /> Endings</Button>
      </div>
    </div>
  );
};
