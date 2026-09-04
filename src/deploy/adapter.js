export function deploymentPlan(task) {
  return {
    provider: process.env.ZVELCLAW_DEPLOY_PROVIDER ?? 'github-actions',
    environment: process.env.ZVELCLAW_DEPLOY_ENV ?? 'production',
    taskId: task.id
  };
}
