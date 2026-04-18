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

  useEffect(() => {
    if (open) playSound('panel');
  }, [open]);

  const addEnding = () => {
    const newEnding: Ending = {
      id: `end-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: "Another Happy Ending 🌸",
      subtitle: "You unlocked a special sequence!"
    };
    setEndings([...endings, newEnding]);
  };

  const updateEnding = (id: string, updates: Partial<Ending>) => {
    setEndings(endings.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEnding = (id: string) => {
    setEndings(endings.filter(e => e.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[550px] rounded-[32px] border-none bg-white p-8 shadow-soft max-h-[85vh] overflow-y-auto custom-scrollbar"
        style={{ willChange: 'transform, opacity' }}
      >
        <DialogTitle className="text-2xl font-heading font-extrabold text-[#5A3E3B]">Endings Manager 💖</DialogTitle>
        <div className="space-y-8 pt-6">
          
          <div className="space-y-4 bg-primary/5 p-5 rounded-2xl border border-primary/20">
            <h3 className="font-bold text-lg text-primary tracking-tight">Global Fallback Ending</h3>
            <p className="text-xs text-muted-foreground font-semibold">Shows when an option's 'Next' is set to 'End 🏁' and no specific ending is selected.</p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-widest text-text-dark/60 font-bold">Main Message</Label>
                <Input 
                  value={ending.title}
                  onChange={(e) => setEnding({ ...ending, title: e.target.value })}
                  className="stitched-input text-md font-bold mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-text-dark/60 font-bold">Optional Sub Message</Label>
                <Textarea 
                  value={ending.subtitle}
                  onChange={(e) => setEnding({ ...ending, subtitle: e.target.value })}
                  className="stitched-input text-sm mt-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-accent tracking-tight">Custom Endings</h3>
               <Button onClick={addEnding} size="sm" className="h-8 text-xs font-bold bg-premium-gradient rounded-full">
                <Plus className="w-3 h-3 mr-1" /> Add Ending
               </Button>
            </div>
            
            <div className="space-y-4">
              {endings.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-secondary rounded-2xl bg-secondary/10 text-muted-foreground text-sm font-semibold">
                  No custom endings yet. Create one! ✨
                </div>
              )}
              {endings.map((e, index) => (
                <div key={e.id} className="relative bg-white border border-secondary/50 rounded-2xl p-4 shadow-sm group hover:border-accent/30 transition-all">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteEnding(e.id)}
                    className="absolute top-2 right-2 w-7 h-7 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-full"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <div className="space-y-3 pr-8">
                     <div>
                      <Label className="text-[10px] uppercase tracking-widest text-text-dark/60 font-bold">Title (Ending #{index + 1})</Label>
                      <Input 
                        value={e.title}
                        onChange={(ev) => updateEnding(e.id, { title: ev.target.value })}
                        className="h-8 text-sm font-bold border-secondary/30 bg-secondary/5 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-widest text-text-dark/60 font-bold">Subtitle</Label>
                      <Input 
                        value={e.subtitle}
                        onChange={(ev) => updateEnding(e.id, { subtitle: ev.target.value })}
                        className="h-8 text-xs border-secondary/30 bg-secondary/5 mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};
