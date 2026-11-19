# Nexus Universal AI Agent

This repository has the Nexus Universal AI Agent. It's the same agent in every GODFREY TRADING PTY LTD repository. It runs by itself on GitHub Actions. It needs one free AI key (see Setup).

## What it can do
Write and fix code, review code, plan projects, research, write docs, help with deployment, check security, and suggest product and growth ideas.

## The team: 1 Leader + 20 specialists

The **Leader** (`agent.mjs`) handles normal requests, splits big jobs across the team and merges the results.

| # | Occupation | Department | Ask them directly |
|---|---|---|---|
| 01 | Software Engineer | Engineering | `/agent engineer` |
| 02 | Code Reviewer | Engineering | `/agent reviewer` |
| 03 | QA Tester | Engineering | `/agent tester` |
| 04 | Performance Engineer | Engineering | `/agent performance` |
| 05 | DevOps Engineer | Infrastructure & Security | `/agent devops` |
| 06 | Cloud Architect | Infrastructure & Security | `/agent cloud` |
| 07 | Security Analyst | Infrastructure & Security | `/agent security` |
| 08 | Data Engineer | Infrastructure & Security | `/agent data` |
| 09 | Product Manager | Design & Product | `/agent product` |
| 10 | UX/UI Designer | Design & Product | `/agent designer` |
| 11 | Technical Writer | Design & Product | `/agent writer` |
| 12 | Accessibility Specialist | Design & Product | `/agent accessibility` |
| 13 | Marketing Strategist | Business & Growth | `/agent marketing` |
| 14 | Content Creator | Business & Growth | `/agent content` |
| 15 | Sales & Partnerships Lead | Business & Growth | `/agent sales` |
| 16 | Financial Analyst | Business & Growth | `/agent finance` |
| 17 | Project Manager | Operations & Research | `/agent pm` |
| 18 | Research Analyst | Operations & Research | `/agent research` |
| 19 | Legal & Compliance Advisor | Operations & Research | `/agent legal` |
| 20 | Customer Support Lead | Operations & Research | `/agent support` |

Each specialist is a copy of the same agent (`copies/agent-01.mjs` to `agent-20.mjs`) with its own occupation, set in `.github/ai-agent/roles.json`. Edit that file to change jobs.

## The Leader's daily revenue shift (8am Sydney, every day)
The team's main focus is **revenue and sales**: paid products and services, with **Nexus coins (NXS) accepted as payment**.

1. The Leader checks the repo, the revenue tracker and yesterday's log.
2. It writes today's revenue work plan and gives **every one of the 20 specialists a task they can fully finish**: offers, prices (AUD + NXS), sales pages, outreach scripts, listings, and "pay with Nexus coins" checkout code. No one sits idle.
3. It runs all 20 specialists.
4. It updates:
   - `ops/REVENUE.md`: offers, prices, sales pipeline, targets and next actions. **You fill in the "Actual sales" table yourself.** The agents never invent sales.
   - `ops/PROCEDURES.md`: standard operating procedures
   - `ops/WORKFLOWS.md`: how work moves from idea to paid sale
   - `ops/daily/<date>.md`: the full day's work
5. It posts a summary in the **Daily work log** issue, including **Owner actions today**: the few steps only you can do, such as publishing, listing or setting up payment.

To start a shift right now: Actions -> Nexus AI Agent -> Run workflow -> type `daily` as the task.

## How to use it
| You do this | The agent does this |
|---|---|
| Open a new issue | Replies with an answer or plan |
| Comment `/agent <your request>` | The Leader replies in the issue |
| Comment `/agent security <request>` (or any key below) | That specialist replies |
| Comment `/agent swarm <big task>` | The Leader gives one part to each of the **20 specialists**, then posts one combined answer |
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
- `.github/ai-agent/agent.mjs`: the Leader
- `.github/ai-agent/roles.json`: everyone's occupations
- `.github/ai-agent/copies/agent-01.mjs` to `agent-20.mjs`: the 20 specialists
