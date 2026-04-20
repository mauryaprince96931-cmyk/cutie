import { Statement, Ending, ValidationError } from '@/types';

export function getErrors(statements: Statement[], endings: Ending[] = []): ValidationError[] {
  const errors: ValidationError[] = [];
  const statementIds = new Set(statements.map(s => s.id));
  const endingIds = new Set(endings.map(e => e.id));

  statements.forEach(s => {
    // Check question
    if (!s.text || s.text.trim() === "") {
      errors.push({ statementId: s.id, field: 'text', message: 'Empty question' });
    }

    const hasCorrectOption = s.options.some(o => o.isCorrect);
    if (!hasCorrectOption && s.options.length > 0) {
      errors.push({ statementId: s.id, field: 'options', message: 'No correct option — quiz cannot progress' });
    }

    // Check options
    s.options.forEach(opt => {
      if (!opt.text || opt.text.trim() === "") {
        errors.push({
          statementId: s.id,
          optionId: opt.id,
          field: 'optionText',
          message: 'Empty option'
        });
      }

      if (opt.nextId && !statementIds.has(opt.nextId)) {
        errors.push({ statementId: s.id, optionId: opt.id, field: 'nextId', message: 'Links to deleted question', type: 'error' });
      }

      if (opt.endingId && !endingIds.has(opt.endingId)) {
        errors.push({ statementId: s.id, optionId: opt.id, field: 'endingId', message: 'Links to deleted ending', type: 'error' });
      }

      if (opt.camoEnabled && (!opt.camoOption || !opt.camoOption.text || opt.camoOption.text.trim() === "")) {
        errors.push({
          statementId: s.id,
          optionId: opt.id,
          field: 'camoOption',
          message: 'Camo enabled with no transformed text'
        });
      }
    });
  });

  return errors;
}
