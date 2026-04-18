import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';
import { Statement, Option, ValidationError } from '@/types';
import { SortableItem } from '@/components/SortableItem';

interface QuestionBlockProps {
  statement: Statement;
  index: number;
  errors: ValidationError[];
  onUpdate: (id: string, updates: Partial<Statement>) => void;
  onDelete: (id: string) => void;
  onUpdateOption: (statementId: string, optionId: string, updates: Partial<Option>) => void;
  onDeleteOption: (statementId: string, optionId: string) => void;
  onAddOption: (statementId: string) => void;
}

export const QuestionBlock = ({ statement, index, errors, onUpdate, onDelete, onUpdateOption, onDeleteOption, onAddOption }: QuestionBlockProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const statementErrors = errors.filter(e => e.statementId === statement.id);
  const hasError = statementErrors.some(e => e.type !== 'warning');
  const hasWarning = statementErrors.some(e => e.type === 'warning');
  
  const isTerminal = !statement.options.some(opt => opt.nextId || opt.endingId);

  return (
    <SortableItem id={statement.id}>
      <Card className={`scrapbook-card relative overflow-hidden ${hasError ? 'border-accent' : hasWarning ? 'border-primary' : ''}`} id={`statement-${statement.id}`}>
        <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-3">
             <Button variant="ghost" size="icon" className="w-6 h-6">
                 {isExpanded ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
             </Button>
            <span className="bg-primary/20 text-accent px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                #{index + 1}
                {hasError && <AlertCircle className="w-3 h-3 text-accent" />}
                {isTerminal && !hasError && <span className="text-primary font-bold">🔚 End Node</span>}
            </span>
            <CardTitle className="text-xl font-heading font-extrabold text-text-dark">Question</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(statement.id); }} className="text-muted-foreground hover:text-accent rounded-full"><Trash2 className="w-5 h-5" /></Button>
        </CardHeader>
        {isExpanded && (
          <CardContent className="space-y-6">
            <Textarea 
              value={statement.text}
              onChange={(e) => onUpdate(statement.id, { text: e.target.value })}
              className={`stitched-input min-h-[100px] text-lg font-bold ${statementErrors.some(e => e.field === 'text') ? 'border-accent' : ''}`}
              placeholder="Question text..."
            />
            {/* Options would be here - omitted for brevity */}
          </CardContent>
        )}
      </Card>
    </SortableItem>
  );
};
