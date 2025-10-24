/**
 * Start Form Module - Issue #28
 * Form validation and submission logic
 */

export type StartFormData = {
  name: string;
  email: string;
  company?: string;
  agreedToTerms: boolean;
};

export type ValidationError = { field: string; message: string };
export type ValidationResult = { isValid: boolean; errors: ValidationError[] };

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateStartForm(data: StartFormData): ValidationResult {
  const errors: ValidationError[] = [];
  if (!data.name?.trim()) errors.push({ field: "name", message: "氏名は必須です" });
  if (!data.email?.trim()) errors.push({ field: "email", message: "メールアドレスは必須です" });
  else if (!isValidEmail(data.email)) errors.push({ field: "email", message: "有効なメールアドレスを入力してください" });
  if (!data.agreedToTerms) errors.push({ field: "agreedToTerms", message: "利用規約への同意が必要です" });
  return { isValid: errors.length === 0, errors };
}

export async function submitStartForm(data: StartFormData) {
  const validation = validateStartForm(data);
  if (!validation.isValid) return { success: false, error: validation.errors.map(e => e.message).join(", ") };
  return { success: true, sessionId: `sess_${Date.now()}`, token: `token_${Date.now()}` };
}
