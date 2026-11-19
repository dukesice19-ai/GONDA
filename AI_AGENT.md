# Nexus Universal AI Agent

This repository has the Nexus Universal AI Agent. It's the same agent in every GODFREY TRADING PTY LTD repository. It runs by itself on GitHub Actions. It needs one free AI key (see Setup).

## What it can do
Write and fix code, review code, plan projects, research, write docs, help with deployment, check security, and suggest product and growth ideas.

## How to use it
| You do this | The agent does this |
|---|---|
| Open a new issue | Replies with an answer or plan |
| Comment `/agent <your request>` | Replies in the issue |
| Comment `/agent swarm <big task>` | Splits the task across **20 parallel workers**, then posts one combined answer |
| Actions tab -> Nexus AI Agent -> Run workflow | Runs any task (tick "swarm" for 20 workers) and posts the result as a new issue |
| Nothing | Every Monday at 9am Sydney time it updates the "Weekly AI agent report" issue |

Only you and your collaborators can trigger it with `/agent`. Strangers can't use it.

## Setup (one time, free)
1. Get a free key from Groq (console.groq.com) or Cerebras (cloud.cerebras.ai). Both are among the fastest AI services.
2. In this repo, go to Settings -> Secrets and variables -> Actions -> New repository secret.
3. Name it `GROQ_API_KEY` (or `CEREBRAS_API_KEY`) and paste the key.

Any other OpenAI-compatible service works too: add the secret `AI_API_KEY` and the variable `AI_API_BASE`.

## Files
- `.github/workflows/ai-agent.yml`: when it runs
- `.github/ai-agent/agent.mjs`: the main agent
- `.github/ai-agent/copies/agent-01.mjs` to `agent-20.mjs`: 20 identical copies, which run as the 20 swarm workers
