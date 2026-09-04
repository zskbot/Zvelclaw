export function githubPlan(task) {
  const branch = `zvelclaw/${task.id}`;
  return {
    provider: 'github',
    branch,
    commitMessage: `feat: ${task.description}`,
    pullRequest: { title: `Zvelclaw: ${task.description}`, base: 'main' }
  };
}

export function githubReady() {
  return Boolean(process.env.GITHUB_TOKEN);
}
