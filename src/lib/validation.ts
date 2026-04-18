import { Statement } from '@/types';

export interface ValidationError {
  statementId: string;
  optionId?: string;
  field: string;
  message: string;
  type?: 'error' | 'warning';
}

export function getErrors(statements: Statement[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const statementIds = new Set(statements.map(s => s.id));

  statements.forEach(s => {
    if (!s.text.trim()) {
      errors.push({ statementId: s.id, field: 'text', message: 'Empty question' });
    }

    const hasOutgoing = s.options.some(opt => opt.nextId || opt.endingId);

    s.options.forEach(opt => {
      if (!opt.text.trim()) {
        errors.push({
          statementId: s.id,
          optionId: opt.id,
          field: 'optionText',
          message: 'Empty option'
        });
      }

      if (!opt.nextId && !opt.endingId) {
        if (hasOutgoing) {
          errors.push({
            statementId: s.id,
            optionId: opt.id,
            field: 'nextId',
            message: 'Missing next question or ending'
          });
        } else {
          // It's a terminal node, add a warning instead of error
          errors.push({
            statementId: s.id,
            optionId: opt.id,
            field: 'nextId',
            message: 'This path ends here',
            type: 'warning'
          });
        }
      } else if (opt.nextId && !statementIds.has(opt.nextId)) {
        errors.push({
          statementId: s.id,
          optionId: opt.id,
          field: 'nextId',
          message: 'Broken link'
        });
      }
    });
  });

  return errors;
}
