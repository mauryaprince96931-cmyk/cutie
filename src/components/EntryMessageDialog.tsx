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
  const [localEntry, setLocalEntry] = React.useState(entryMessage);

  useEffect(() => {
    if (open) {
      playSound('panel');
      setLocalEntry(entryMessage);
    }
  }, [open, entryMessage]);

  const handleSave = () => {
    setEntryMessage(localEntry);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[450px] rounded-[24px] border-black/5 bg-white p-8 shadow-xl"
      >
        <DialogTitle className="text-xl font-semibold text-text-dark tracking-tight">Entry Screen</DialogTitle>
        <div className="space-y-6 pt-6">
          <div className="space-y-4 bg-bg-soft/40 p-5 rounded-2xl border border-black/5">
            <h3 className="font-bold text-sm text-text-dark/80 uppercase tracking-widest">Main Greeting</h3>
            <p className="text-xs text-muted-foreground">The first text they will see when opening the web app.</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Main Title</Label>
                <Input 
                  value={localEntry.title}
                  onChange={(e) => setLocalEntry({ ...localEntry, title: e.target.value })}
                  className="bg-white border-0 shadow-sm text-md font-semibold h-10 rounded-xl"
                  placeholder="e.g., Hey cutie! 💖"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subtitle / Description</Label>
                <Textarea 
                  value={localEntry.subtitle}
                  onChange={(e) => setLocalEntry({ ...localEntry, subtitle: e.target.value })}
                  className="bg-white border-0 shadow-sm text-sm rounded-xl min-h-[100px]"
                  placeholder="e.g., I made something just for you... 🥺"
                />
              </div>
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
