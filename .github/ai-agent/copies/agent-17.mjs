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
Company mission: make revenue and sales for GODFREY TRADING PTY LTD.
- Every task should move toward paid products or services and real sales.
- Every paid offer should accept Nexus coins (NXS) as a payment option, alongside normal payment (card/PayPal/Stripe). Price in AUD, with the NXS amount shown.
- Only take on work you can fully complete in writing in one response: code, sales copy, pricing, offers, scripts, listings, emails, plans, checklists.
- Never claim you sold, sent, posted, published or got paid for anything. Never invent sales numbers. Put anything only the owner can do (publish, list, send, sign up, accept payment) under "Owner actions".
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
  // Your own key for a service you choose (optional). Otherwise: private model running inside this GitHub runner.
  if (env.AI_API_KEY) return { url: (env.AI_API_BASE || "").replace(/\/$/, "") + "/chat/completions", key: env.AI_API_KEY, model: env.AGENT_MODEL };
  return { url: "http://localhost:11434/v1/chat/completions", key: null, model: env.AGENT_MODEL || "qwen2.5:3b", local: true };
}
const SETUP_MSG = "The private AI model did not start. Check the \"Start private AI model\" step in the Actions log.";
async function llm(user, maxTokens = 2500) {
  const p = provider();
  if (p.free) { const gap = 16000 - (Date.now() - (globalThis.__lastCall || 0)); if (gap > 0) await sleep(gap); globalThis.__lastCall = Date.now(); }
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(p.url, {
      method: "POST",
      headers: p.key ? { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      body: JSON.stringify({ model: p.model, max_tokens: maxTokens, ...(p.local ? { options: { num_ctx: 8192 } } : {}), temperature: 0.3, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }] }),
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
  let ctx = `Repository: ${REPO}\nFiles (${files.length}):\n${files.slice(0, 150).join("\n")}${files.length > 300 ? "\n..." : ""}\n`;
  if (readme) ctx += `\n--- ${readme} ---\n${fs.readFileSync(readme, "utf8").slice(0, 4000)}\n`;
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

if (mode === "daily") {
  // Leader's daily shift: revenue-focused work plan for all 20 specialists, procedures, workflows, revenue tracker, daily log.
  const today = new Date(Date.now() + 11 * 3600e3).toISOString().slice(0, 10); // Sydney date
  const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "");
  const sop = read("ops/PROCEDURES.md"), wf = read("ops/WORKFLOWS.md"), rev = read("ops/REVENUE.md");
  const prev = fs.existsSync("ops/daily") ? fs.readdirSync("ops/daily").sort().slice(-1)[0] : null;
  const [issues, commits] = await Promise.all([
    gh(`/repos/${REPO}/issues?state=open&per_page=30`).catch(() => []),
    gh(`/repos/${REPO}/commits?per_page=10`).catch(() => []),
  ]);
  const state = `Date: ${today}\nOpen issues:\n${issues.filter((i) => !/^(Daily work log|Weekly AI agent report)/.test(i.title)).map((i) => `#${i.number} ${i.title}`).join("\n") || "none"}\nRecent commits:\n${commits.map((c) => c.commit.message.split("\n")[0]).join("\n") || "none"}\nRevenue tracker:\n${rev.slice(0, 5000) || "none yet"}\nYesterday's log:\n${prev ? read("ops/daily/" + prev).slice(0, 3000) : "none (first day)"}\nCurrent procedures:\n${sop.slice(0, 2000) || "none yet"}`;
  const raw = await llm(`${repoContext()}\n\n${state}\n\nAs Leader, write today's REVENUE work plan. Give every one of the 20 specialists one concrete task they can fully finish today as a written deliverable (code, offer, price list, sales page copy, outreach script, marketplace listing text, email, checkout or "pay with Nexus coins" code, invoice template, revenue report). Focus on paid products and services that can be built from this repository and the company's other products, sales, and accepting Nexus coins as payment. Match each task to the specialist's occupation. No one may be idle. Build on yesterday; don't repeat finished work. Reply ONLY with a JSON array of 20 strings, in team order.`, 2500);
  let subs; try { subs = JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1)); } catch { subs = []; }
  subs = subs.slice(0, 20); while (subs.length < 20) subs.push(`As the ${ROLES.copies[subs.length].title}, deliver one ready-to-use asset today that helps sell a paid product or service from this repository (with a Nexus coin payment option).`);
  fs.mkdirSync("swarm", { recursive: true });
  fs.writeFileSync("swarm/plan.json", JSON.stringify({ task: `Daily revenue work plan for ${today} in ${REPO}`, subs }, null, 2));
  for (let i = 0; i < 20; i++) {
    const n = String(i + 1).padStart(2, "0");
    try { execSync(`node .github/ai-agent/copies/agent-${n}.mjs worker ${i}`, { stdio: "inherit", env }); }
    catch { fs.mkdirSync("swarm-out", { recursive: true }); fs.writeFileSync(`swarm-out/worker-${n}.md`, `### ${i + 1}. ${ROLES.copies[i].title}\n**Task:** ${subs[i]}\n\n_Not completed today (model limit or error). Carry over to tomorrow._\n`); }
  }
  const parts = fs.readdirSync("swarm-out").sort().map((f) => fs.readFileSync(`swarm-out/${f}`, "utf8"));
  const all = parts.join("\n---\n").slice(0, 50000);
  const summary = await llm(`Today's specialist results for ${REPO}:\n\n${all}\n\nAs Leader, write the daily report: 1) what got done toward revenue, 2) a table of the 20 specialists with task and status (done / carry over), 3) "Owner actions today": a short checklist of things only the owner can do to turn today's work into money (publish, list, send, set up payment), 4) blockers, 5) tomorrow's revenue priorities.`, 3000);
  const ownerSales = (rev.match(/## Actual sales \(owner fills in\)[\s\S]*?(?=\n## |$)/) || ["## Actual sales (owner fills in)\n\n| Date | Product | Paid in (AUD / NXS) | Amount | Notes |\n|---|---|---|---|---|\n"])[0];
  const newRev = await llm(`Current revenue tracker:\n${rev.slice(0, 10000) || "none"}\n\nToday's results:\n${all.slice(0, 20000)}\n\nAs Leader, write the updated REVENUE.md with these sections: "## Offers" (table: product/service, price AUD, price in NXS, payment options, sales channel, status: idea/ready/live, owner action needed), "## Sales pipeline" (leads/partners and next step), "## Revenue targets" (weekly and monthly targets), "## Next revenue actions". Do NOT include an Actual sales section; it is added separately. Never invent sales. Output only markdown.`, 3500);
  const newSop = await llm(`Current standard operating procedures (may be empty):\n${sop.slice(0, 12000)}\n\nToday's results:\n${all.slice(0, 20000)}\n\nAs Leader, write the full, updated PROCEDURES.md: numbered standard operating procedures (purpose, who does it, steps, checks) for how this team plans work, builds paid offers, prices them in AUD and NXS, makes sales, accepts Nexus coin payments, reviews, tests, deploys, documents and reports revenue. Keep what still applies, improve from today. Plain simple language. Output only markdown.`, 4000);
  const newWf = await llm(`Current workflows (may be empty):\n${wf.slice(0, 8000)}\n\nToday's results:\n${all.slice(0, 15000)}\n\nAs Leader, write the full, updated WORKFLOWS.md: step-by-step workflows showing how work moves between the 20 specialists from idea to paid sale (for example: Research Analyst -> Product Manager -> Financial Analyst (pricing) -> Software Engineer -> QA Tester -> Content Creator -> Marketing Strategist -> Sales & Partnerships Lead -> Customer Support Lead). Include the daily routine and a hand-off table. Output only markdown.`, 3000);
  fs.mkdirSync("ops/daily", { recursive: true });
  fs.writeFileSync(`ops/daily/${today}.md`, `# Daily work log: ${today}\n\n${summary}\n\n## Specialist deliverables\n\n${parts.join("\n")}\n`);
  fs.writeFileSync("ops/REVENUE.md", `${newRev}\n\n${ownerSales.trim()}\n`);
  fs.writeFileSync("ops/PROCEDURES.md", newSop + "\n");
  fs.writeFileSync("ops/WORKFLOWS.md", newWf + "\n");
  try {
    execSync(`git config user.name "nexus-ai-leader[bot]" && git config user.email "41898282+github-actions[bot]@users.noreply.github.com" && git add ops && git commit -qm "Leader daily shift ${today}: revenue plan, procedures, workflows" && git push -q`, { stdio: "inherit" });
  } catch (e) { console.log("Commit skipped:", e.message); }
  const title = "Daily work log";
  let log = issues.find((i) => i.title === title);
  if (!log) log = await gh(`/repos/${REPO}/issues`, "POST", { title, body: "The Leader posts each day's revenue work plan and results here. Full files are in the `ops/` folder.\n\n<sub>Nexus Universal AI Agent</sub>" });
  await comment(log.number, `## ${today}\n\n${summary.slice(0, 60000)}\n\nFull log: \`ops/daily/${today}.md\` · Revenue: \`ops/REVENUE.md\` · Procedures: \`ops/PROCEDURES.md\` · Workflows: \`ops/WORKFLOWS.md\``);
}

} catch (e) {
  if (e.message === "Model unavailable after retries") {
    console.log(SETUP_MSG);
    if (event.issue && mode !== "worker") await comment(event.issue.number, SETUP_MSG);
    process.exitCode = 1;
  } else throw e;
}
