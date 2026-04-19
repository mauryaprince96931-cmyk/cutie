import { Statement, ValidationError } from '@/types';

export function getErrors(statements: Statement[]): ValidationError[] {
  const errors: ValidationError[] = [];

  statements.forEach((q) => {
    // Check question
    if (!q.text || q.text.trim() === "") {
      errors.push({ statementId: q.id, field: 'text', message: 'Empty question' });
    }

    // Check options
    q.options.forEach((opt) => {
      if (!opt.text || opt.text.trim() === "") {
        errors.push({
          statementId: q.id,
          optionId: opt.id,
          field: 'optionText',
          message: 'Empty option'
        });
      }
    });
  });

  return errors;
}
