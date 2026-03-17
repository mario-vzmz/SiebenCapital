const { execSync } = require('child_process');

function runAgent(focus, prompts, model) {
  const promptStr = prompts.replace(/"/g, '\\"');
  try {
    const cmd = `node "$HOME/.gemini/get-shit-done/bin/gsd-tools.cjs" agent run gsd-codebase-mapper "${model}" "${promptStr}"`;
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Agent ${focus} failed:`, e.message);
  }
}

const args = process.argv.slice(2);
const focus = args[0];
const model = args[1] || 'haiku';

const prompts = {
  tech: "Focus: tech\n\nAnalyze this codebase for technology stack and external integrations.\n\nWrite these documents to .planning/codebase/:\n- STACK.md - Languages, runtime, frameworks, dependencies, configuration\n- INTEGRATIONS.md - External APIs, databases, auth providers, webhooks\n\nExplore thoroughly. Write documents directly using templates. Return confirmation only.",
  arch: "Focus: arch\n\nAnalyze this codebase architecture and directory structure.\n\nWrite these documents to .planning/codebase/:\n- ARCHITECTURE.md - Pattern, layers, data flow, abstractions, entry points\n- STRUCTURE.md - Directory layout, key locations, naming conventions\n\nExplore thoroughly. Write documents directly using templates. Return confirmation only.",
  quality: "Focus: quality\n\nAnalyze this codebase for coding conventions and testing patterns.\n\nWrite these documents to .planning/codebase/:\n- CONVENTIONS.md - Code style, naming, patterns, error handling\n- TESTING.md - Framework, structure, mocking, coverage\n\nExplore thoroughly. Write documents directly using templates. Return confirmation only.",
  concerns: "Focus: concerns\n\nAnalyze this codebase for technical debt, known issues, and areas of concern.\n\nWrite this document to .planning/codebase/:\n- CONCERNS.md - Tech debt, bugs, security, performance, fragile areas\n\nExplore thoroughly. Write document directly using template. Return confirmation only."
};

if (prompts[focus]) {
  console.log(`Starting ${focus} mapper...`);
  runAgent(focus, prompts[focus], model);
}
