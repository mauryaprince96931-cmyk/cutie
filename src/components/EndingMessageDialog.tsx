import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { playSound } from '../lib/sound';

interface Ending {
  id: string;
  title: string;
  subtitle: string;
}

interface EndingMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ending: { title: string; subtitle: string };
  setEnding: (ending: { title: string; subtitle: string }) => void;
  endings: Ending[];
  setEndings: (endings: Ending[]) => void;
}

export const EndingMessageDialog: React.FC<EndingMessageDialogProps> = ({
  open,
  onOpenChange,
  ending,
  setEnding,
  endings,
  setEndings,
}) => {
  const [localEnding, setLocalEnding] = useState(ending);
  const [localEndings, setLocalEndings] = useState(endings);

  useEffect(() => {
    if (open) {
      playSound('panel');
      setLocalEnding(ending);
      setLocalEndings(endings);
    }
  }, [open, ending, endings]);

  const addEnding = () => {
    const newEnding: Ending = {
      id: `end-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: "Another Happy Ending 🌸",
      subtitle: "You unlocked a special sequence!"
    };
    setLocalEndings([...localEndings, newEnding]);
  };

  const updateEnding = (id: string, updates: Partial<Ending>) => {
    setLocalEndings(localEndings.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEnding = (id: string) => {
    setLocalEndings(localEndings.filter(e => e.id !== id));
  };

  const handleSave = () => {
    setEnding(localEnding);
    setEndings(localEndings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[550px] rounded-[24px] border-black/5 bg-white p-8 shadow-xl max-h-[85vh] overflow-y-auto custom-scrollbar"
        style={{ willChange: 'transform, opacity' }}
      >
        <DialogTitle className="text-xl font-semibold text-text-dark tracking-tight">Endings Manager</DialogTitle>
        <div className="space-y-8 pt-6">
          
          <div className="space-y-4 bg-bg-soft/40 p-5 rounded-2xl border border-black/5">
            <h3 className="font-bold text-sm text-text-dark/80 uppercase tracking-widest">Global Fallback Ending</h3>
            <p className="text-xs text-muted-foreground">Shows when an option's 'Next' is set to 'Ending 🏁' and no specific ending is selected.</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Main Message</Label>
                <Input 
                  value={localEnding.title}
                  onChange={(e) => setLocalEnding({ ...localEnding, title: e.target.value })}
                  className="bg-white border-0 shadow-sm text-md font-semibold h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Optional Sub Message</Label>
                <Textarea 
                  value={localEnding.subtitle}
                  onChange={(e) => setLocalEnding({ ...localEnding, subtitle: e.target.value })}
                  className="bg-white border-0 shadow-sm text-sm rounded-xl min-h-[80px]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-dark/80 uppercase tracking-widest">Custom Endings</h3>
               <Button onClick={addEnding} size="sm" className="h-8 text-xs font-bold bg-primary text-white rounded-lg shadow-sm hover:brightness-105">
                <Plus className="w-3 h-3 mr-1" /> Add Ending
               </Button>
            </div>
            
            <div className="space-y-4">
              {localEndings.length === 0 && (
                <div className="text-center py-8 border border-dashed border-black/10 rounded-2xl bg-black/[0.01] text-muted-foreground text-xs font-medium">
                  No custom endings yet.
                </div>
              )}
              {localEndings.map((e, index) => (
                <div key={e.id} className="relative bg-white border border-black/5 rounded-2xl p-4 shadow-sm group hover:border-primary/20 transition-all">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteEnding(e.id)}
                    className="absolute top-2 right-2 w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-full"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <div className="space-y-3 pr-8">
                     <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Title (Ending #{index + 1})</Label>
                      <Input 
                        value={e.title}
                        onChange={(ev) => updateEnding(e.id, { title: ev.target.value })}
                        className="h-9 text-sm font-semibold border-black/5 bg-bg-soft/30 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Subtitle</Label>
                      <Input 
                        value={e.subtitle}
                        onChange={(ev) => updateEnding(e.id, { subtitle: ev.target.value })}
                        className="h-9 text-xs border-black/5 bg-bg-soft/30 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            className="w-full primary-btn font-bold h-12 rounded-[16px]"
          >
            Save All Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
