// Nexus Universal AI Agent - identical in every repository.
// Copyright (c) 2026 GODFREY TRADING PTY LTD
// No dependencies. Runs on Node 20 inside GitHub Actions.
import fs from "node:fs";
import { execSync } from "node:child_process";

const env = process.env;
const REPO = env.GITHUB_REPOSITORY;
const GH = "https://api.github.com";
const ghHeaders = { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
const event = env.GITHUB_EVENT_PATH && fs.existsSync(env.GITHUB_EVENT_PATH) ? JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, "utf8")) : {};
const mode = process.argv[2] || "reply";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ROLES = JSON.parse(fs.readFileSync(new URL(import.meta.url.includes("/copies/") ? "../roles.json" : "./roles.json", import.meta.url), "utf8"));
const myNum = (import.meta.url.match(/agent-(\d\d)\.mjs$/) || [])[1];
let ROLE = myNum ? ROLES.copies[Number(myNum) - 1] : ROLES.lead;
const roleLine = (r) => `Your occupation: ${r.title} (${r.category} department). Focus: ${r.focus}`;
const roster = ROLES.copies.map((r, i) => `${i + 1}. ${r.title} [${r.category}] (/agent ${r.key})`).join("\n");

const BASE_SYSTEM = `You are the Nexus Universal AI Agent for GODFREY TRADING PTY LTD, installed in the GitHub repository ${REPO}.
You are one identical, versatile, comprehensive agent. You can act as:
- Software engineer: write, explain, debug and review code in any language; propose exact file changes as diffs.
- Architect and planner: break goals into clear step-by-step plans with priorities and checklists.
- Researcher and analyst: compare options, explain trade-offs, summarise data.
- Technical writer: READMEs, manuals, guides, release notes, in plain simple language.
- DevOps helper: GitHub Actions, GitHub Pages, Vercel, Docker, deployment fixes.
- Security reviewer: spot secrets, unsafe code and risky settings.
- Product and growth helper: ideas, roadmaps, content plans, user stories.
- Project manager: turn issues into tasks, estimate effort, track progress.
Rules:
- Use simple, direct language. Be thorough but skip filler.
- Use the repository context you are given; say clearly when something is missing or unknown. Never invent files or facts.
- Prefer concrete output: code blocks, checklists, tables.
- When useful, end with "Suggested next steps" (max 5).
- Never reveal secrets or tokens. Never promise investment returns or coin prices; no market manipulation advice.
Your team (20 specialists led by the Leader):
${roster}`;
let SYSTEM = BASE_SYSTEM + "\n" + roleLine(ROLE);
function useRole(r) { ROLE = r; SYSTEM = BASE_SYSTEM + "\n" + roleLine(r); }

// ---------- model call (GitHub Models free by default; Groq/Cerebras optional for speed) ----------
function provider() {
  if (env.AI_API_KEY) return { url: (env.AI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "") + "/chat/completions", key: env.AI_API_KEY, model: env.AGENT_MODEL || "gpt-4.1-mini" };
  if (env.CEREBRAS_API_KEY) return { url: "https://api.cerebras.ai/v1/chat/completions", key: env.CEREBRAS_API_KEY, model: env.AGENT_MODEL || "llama-3.3-70b" };
  if (env.GROQ_API_KEY) return { url: "https://api.groq.com/openai/v1/chat/completions", key: env.GROQ_API_KEY, model: env.AGENT_MODEL || "llama-3.3-70b-versatile" };
  return null;
}
const SETUP_MSG = "The Nexus AI Agent needs one free AI key to work. Add a repository secret named `GROQ_API_KEY` (free at console.groq.com) or `CEREBRAS_API_KEY` (free at cloud.cerebras.ai) under Settings -> Secrets and variables -> Actions. See AI_AGENT.md.";
async function llm(user, maxTokens = 2500) {
  const p = provider();
  if (!p) throw new Error("NO_KEY");
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(p.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: p.model, max_tokens: maxTokens, temperature: 0.3, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }] }),
    });
    const text = await res.text();
    if (res.ok) { try { return JSON.parse(text).choices[0].message.content.trim(); } catch { console.log("Unexpected reply:", text.slice(0, 200)); } }
    else console.log(`Model call failed (${res.status}): ${text.slice(0, 200)}`);
    if (res.ok || (res.status !== 429 && res.status < 500)) { if (!res.ok) break; }
    const wait = Number(res.headers.get("retry-after")) * 1000 || 5000 * 2 ** attempt;
    await sleep(Math.min(wait, 60000));
  }
  throw new Error("Model unavailable after retries");
}

// ---------- GitHub helpers ----------
async function gh(path, method = "GET", body) {
  const res = await fetch(GH + path, { method, headers: ghHeaders, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`GitHub ${method} ${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}
const comment = (n, body) => gh(`/repos/${REPO}/issues/${n}/comments`, "POST", { body: body + "\n\n<sub>Nexus Universal AI Agent</sub>" });

// ---------- repository context ----------
function repoContext(question = "") {
  let files = [];
  try { files = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean); } catch {}
  const readme = files.find((f) => /^readme(\.md)?$/i.test(f));
  let ctx = `Repository: ${REPO}\nFiles (${files.length}):\n${files.slice(0, 300).join("\n")}${files.length > 300 ? "\n..." : ""}\n`;
  if (readme) ctx += `\n--- ${readme} ---\n${fs.readFileSync(readme, "utf8").slice(0, 6000)}\n`;
  const q = question.toLowerCase();
  const mentioned = files.filter((f) => q.includes(f.toLowerCase()) || q.includes(f.split("/").pop().toLowerCase())).slice(0, 6);
  for (const f of mentioned) { try { ctx += `\n--- ${f} ---\n${fs.readFileSync(f, "utf8").slice(0, 8000)}\n`; } catch {} }
  return ctx;
}
async function threadText() {
  const issue = event.issue;
  if (!issue) return env.AGENT_TASK || "";
  let t = `Issue #${issue.number}: ${issue.title}\n${issue.body || ""}\n`;
  const cs = await gh(`/repos/${REPO}/issues/${issue.number}/comments?per_page=30`);
  for (const c of cs) t += `\n[${c.user.login}]: ${c.body}`;
  return t;
}
async function deliver(title, body) {
  if (event.issue) return comment(event.issue.number, body);
  const i = await gh(`/repos/${REPO}/issues`, "POST", { title, body: body + "\n\n<sub>Nexus Universal AI Agent</sub>" });
  console.log("Created issue", i.html_url);
}

try {
// ---------- modes ----------
if (mode === "reply") {
  const thread = await threadText();
  const cmd = (event.comment?.body || "").match(/^\/agent\s+(\w+)/);
  const picked = cmd && ROLES.copies.find((r) => r.key === cmd[1].toLowerCase());
  if (picked) useRole(picked);
  const answer = await llm(`${repoContext(thread)}\n\n=== Conversation / task ===\n${thread}\n\nRespond to the latest request.`);
  await deliver(`Agent: ${(env.AGENT_TASK || "task").slice(0, 60)}`, `**${ROLE.title}** (${ROLE.category})\n\n${answer}`);
}

if (mode === "plan") {
  const thread = await threadText();
  const raw = await llm(`${repoContext(thread)}\n\n=== Task ===\n${thread}\n\nWrite exactly 20 sub-tasks, one for each specialist in the team list, in the same order (1 = ${ROLES.copies[0].title} ... 20 = ${ROLES.copies[19].title}). Each sub-task must fit that occupation. Reply ONLY with a JSON array of 20 strings.`, 2000);
  let subs; try { subs = JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1)); } catch { subs = []; }
  subs = subs.slice(0, 20); while (subs.length < 20) subs.push(`As the ${ROLES.copies[subs.length].title}, cover your part of the task.`);
  fs.mkdirSync("swarm", { recursive: true });
  fs.writeFileSync("swarm/plan.json", JSON.stringify({ task: thread, subs }, null, 2));
  fs.appendFileSync(env.GITHUB_OUTPUT, `indexes=${JSON.stringify([...Array(20).keys()])}\n`);
}

if (mode === "worker") {
  const i = Number(process.argv[3]);
  const { task, subs } = JSON.parse(fs.readFileSync("swarm/plan.json", "utf8"));
  const out = await llm(`${repoContext(task + subs[i])}\n\n=== Overall task ===\n${task}\n\n=== Your sub-task as ${ROLE.title} (specialist ${i + 1} of 20) ===\n${subs[i]}\n\nDo only your sub-task, thoroughly.`, 1500);
  fs.mkdirSync("swarm-out", { recursive: true });
  fs.writeFileSync(`swarm-out/worker-${String(i + 1).padStart(2, "0")}.md`, `### ${i + 1}. ${ROLE.title} (${ROLE.category})\n**Task:** ${subs[i]}\n\n${out}\n`);
}

if (mode === "combine") {
  const { task } = JSON.parse(fs.readFileSync("swarm/plan.json", "utf8"));
  const parts = fs.readdirSync("swarm-out", { recursive: true }).filter((f) => String(f).endsWith(".md")).sort()
    .map((f) => fs.readFileSync(`swarm-out/${f}`, "utf8"));
  const summary = await llm(`Task:\n${task}\n\n20 specialists produced these results:\n\n${parts.join("\n---\n").slice(0, 60000)}\n\nMerge them into one clear, complete final answer. Remove duplicates, fix conflicts, keep all useful detail, end with Suggested next steps.`, 4000);
  await deliver(`Agent swarm: ${(env.AGENT_TASK || "task").slice(0, 50)}`, `## Final answer from the Leader (20 specialists combined)\n\n${summary}\n\n<details><summary>All 20 specialist results</summary>\n\n${parts.join("\n").slice(0, 55000)}\n</details>`);
}

if (mode === "report") {
  const [issues, commits] = await Promise.all([
    gh(`/repos/${REPO}/issues?state=open&per_page=30`),
    gh(`/repos/${REPO}/commits?per_page=15`).catch(() => []),
  ]);
  const data = `Open issues:\n${issues.filter((i) => !i.title.startsWith("Weekly AI agent report")).map((i) => `#${i.number} ${i.title}`).join("\n") || "none"}\n\nRecent commits:\n${commits.map((c) => `${c.commit.author.date.slice(0, 10)} ${c.commit.message.split("\n")[0]}`).join("\n") || "none"}`;
  const body = await llm(`${repoContext()}\n\n${data}\n\nWrite this week's short repository report: status, what changed, risks, and the top 5 improvements to make next.`);
  const title = "Weekly AI agent report";
  const existing = issues.find((i) => i.title === title);
  const full = `_Updated ${new Date().toISOString().slice(0, 10)}_\n\n${body}\n\n<sub>Nexus Universal AI Agent</sub>`;
  if (existing) await gh(`/repos/${REPO}/issues/${existing.number}`, "PATCH", { body: full });
  else await gh(`/repos/${REPO}/issues`, "POST", { title, body: full });
}

} catch (e) {
  if (e.message === "NO_KEY") {
    console.log(SETUP_MSG);
    if (event.issue && mode !== "worker") await comment(event.issue.number, SETUP_MSG);
    process.exitCode = 1;
  } else throw e;
}
