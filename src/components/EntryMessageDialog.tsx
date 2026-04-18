import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { playSound } from '../lib/sound';

interface EntryMessage {
  title: string;
  subtitle: string;
}

interface EntryMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryMessage: EntryMessage;
  setEntryMessage: (entryMessage: EntryMessage) => void;
}

export const EntryMessageDialog: React.FC<EntryMessageDialogProps> = ({
  open,
  onOpenChange,
  entryMessage,
  setEntryMessage,
}) => {

  useEffect(() => {
    if (open) playSound('panel');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[450px] rounded-[32px] border-none bg-white p-8 shadow-soft"
      >
        <DialogTitle className="text-2xl font-heading font-extrabold text-[#5A3E3B]">Entry Screen Settings 💖</DialogTitle>
        <div className="space-y-6 pt-6">
          <div className="space-y-4 bg-primary/5 p-5 rounded-2xl border border-primary/20">
            <h3 className="font-bold text-lg text-primary tracking-tight">Main Greeting</h3>
            <p className="text-xs text-muted-foreground font-semibold">The first text your cutie will see when opening the app.</p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-widest text-text-dark/60 font-bold">Main Title</Label>
                <Input 
                  value={entryMessage.title}
                  onChange={(e) => setEntryMessage({ ...entryMessage, title: e.target.value })}
                  className="stitched-input text-md font-bold mt-1"
                  placeholder="e.g., Hey cutie! 💖"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-text-dark/60 font-bold">Subtitle / Description</Label>
                <Textarea 
                  value={entryMessage.subtitle}
                  onChange={(e) => setEntryMessage({ ...entryMessage, subtitle: e.target.value })}
                  className="stitched-input text-sm mt-1 min-h-[100px]"
                  placeholder="e.g., I made something just for you... 🥺"
                />
              </div>
            </div>
          </div>
          
          <Button 
            onClick={() => onOpenChange(false)} 
            className="w-full pill-button bg-premium-gradient font-bold h-12"
          >
            Save & Close ✨
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
