import { Statement, ValidationError } from '@/types';

export function getErrors(statements: Statement[]): ValidationError[] {
  const errors: ValidationError[] = [];

  statements.forEach(s => {
    // Check question
    if (!s.text || s.text.trim() === "") {
      errors.push({ statementId: s.id, field: 'text', message: 'Empty question' });
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
    });
  });

  return errors;
}
