export function evaluateGate({ task, review }) {
  if (!task.description.trim()) return { passed: false, reason: 'Task is empty.' };
  if (!review.approved) return { passed: false, reason: review.issues.join(' ') };
  return { passed: true, reason: 'All deterministic gates passed.' };
}
