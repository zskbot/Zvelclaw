export function reviewTask(task) {
  const description = task.description.trim();
  const issues = [];
  if (description.length < 8) issues.push('Task description is too short.');
  if (/\b(password|secret|token|api[_ -]?key)\b/i.test(description)) issues.push('Credential-related work requires explicit security review.');
  return { approved: issues.length === 0, issues, reviewer: 'zvelclaw-basic-review' };
}
