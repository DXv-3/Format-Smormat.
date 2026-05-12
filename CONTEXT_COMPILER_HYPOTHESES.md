# Startup Hypotheses: Context Compiler + RepoGraph

## Top 7 "Kill the Company" Hypotheses (Riskiest Assumptions)
1. **The "Agent Ignorance" Problem is Severe (Problem):** Coding agents fail primarily due to lack of structured context, not lack of intelligence. If models get 1M+ context windows and solve this natively within 6 months by just slurping the repo, this product is dead.
2. **Format Viability (Solution):** LLM agents actually perform measurably better when fed structured AST/Graph JSON + markdown contracts vs. raw codebase dumps.
3. **CI Interception (Solution):** Teams want to block agent PRs in CI if they lack evidence/evals, rather than just having humans review them.
4. **Local/Privacy Mandate (Security):** Teams will only adopt a RepoGraph tool if it runs entirely locally/in-CI without exposing IP to third-party graph servers.
5. **Willingness to Pay (Pricing):** Engineering managers will pay $49+/mo to manage "Agent Context" as a distinct category from AI models themselves.
6. **Workflow Friction (Activation):** Developers are willing to maintain or at least init `AGENTS.md` and `CONSTRAINTS.md` files; it isn't seen as "too much configuration."
7. **Platform Dominance (Defensibility):** We can establish `AGENTS.md` and the RepoGraph format as a standard before Microsoft/GitHub or Anthropic bake it directly into their own repos/agents.

---

## 20 Falsifiable Hypotheses

### Problem
**H1: Agent Regression Frequency**
*   **Hypothesis statement:** AI coding agents frequently break cross-file dependencies and generate regressions because they lack global repository knowledge.
*   **Assumptions:** Current context window implementations are insufficient or too noisy.
*   **Success metric + threshold:** >60% of surveyed eng leads say AI agents cause regressions requiring human cleanup at least 1x/week.
*   **Fastest test (≤14 days):** Run a targeted poll/survey on Twitter and AI Developer Slack communities (e.g., Latent Space, LangChain).
*   **Sample size:** 50 engineering leads.
*   **Expected cost:** $100.
*   **Decision rule:** If <40% report this issue, pivot to checking if the problem is localized to specific agent tools.

**H2: Prompt Engineering Time Waste**
*   **Hypothesis statement:** Developers spend more than 3 hours a week manually assembling context (copy-pasting files, explaining architecture) for their AI agents.
*   **Success metric + threshold:** >50% of interviewed devs report spending >3 hrs/week gathering context.
*   **Fastest test:** 10 user interviews with Cursor/Claude users.
*   **Sample size:** 10 users.
*   **Decision rule:** If devs spend <1 hr, pivot emphasis to CI gating over CLI context gathering.

### ICP (Ideal Customer Profile)
**H3: AI-Native Startups are Early Adopters**
*   **Hypothesis statement:** AI-native startups (Series A/B) using autonomous agents daily will adopt this much faster than traditional enterprises.
*   **Success metric + threshold:** 20% conversion from cold email to demo booked for AI startups vs <5% for traditional tech.
*   **Fastest test:** Send 100 cold emails to AI startup CTOs; 100 to traditional SaaS CTOs.
*   **Expected cost:** $50 (email tools).
*   **Decision rule:** Pivot ICP targeting based on the highest converting segment.

**H4: Platform/DevEx Leads hold the budget**
*   **Hypothesis statement:** Platform/Infra leads will champion the GitHub App to enforce agent discipline across the org.
*   **Success metric + threshold:** >3 active pilot agreements from Platform leads within 14 days.
*   **Fastest test:** Direct messages on LinkedIn to DevEx/Platform leads offering a "CI gate for AI slop".
*   **Decision rule:** If zero pilots, adjust messaging to target ICs directly (bottom-up only).

### Solution
**H5: Graph + Markdown reduces Hallucinations**
*   **Hypothesis statement:** Providing an agent with a RepoGraph + `CONSTRAINTS.md` reduces the failure rate of a complex multi-file refactor.
*   **Success metric + threshold:** The contextualized agent passes a synthetic refactoring test >80% of the time, vs <40% for the baseline un-contextualized agent.
*   **Fastest test:** Build a Python script that runs Claude 3.5 Sonnet against 5 popular open-source repos with and without a manually generated RepoGraph + constraints.
*   **Expected cost:** $20 in API credits.
*   **Decision rule:** If accuracy doesn't double, the graph format is flawed or LLMs inherently ignore it. Pivot solution format.

**H6: AI CI Gating Works**
*   **Hypothesis statement:** A GitHub app that automatically rejects PRs missing required eval/impact evidence will increase overall merge speed.
*   **Success metric + threshold:** PR approval rate for agent-generated code increases by 30% when gated.
*   **Fastest test:** Manually act as the "GitHub App" in a friendly team's repo for a week, rejecting agent PRs without evidence.
*   **Decision rule:** If devs complain it blocks them unfairly, the gate must be relaxed or automated better.

### Activation
**H7: 5-Minute CLI Setup**
*   **Hypothesis statement:** Developers can install the CLI, run `context-compiler init`, and generate their first pack in under 5 minutes without consulting docs.
*   **Success metric + threshold:** >70% of beta testers successfully generate a pack in <5 minutes.
*   **Fastest test:** Usability testing session with an MVP CLI.
*   **Decision rule:** If >1 fails, fix onboarding UX before general release.

**H8: Zero-Config GitHub App**
*   **Hypothesis statement:** Teams will install the GitHub app if it requires zero YAML configuration initially (auto-detects `AGENTS.md`).
*   **Success metric + threshold:** 50% of teams that visit the install page complete the installation.
*   **Fastest test:** Fake "Install" landing page that tracks clicks vs visits.
*   **Decision rule:** If conversion <20%, simplify the value prop or reduce perceived risk.

### Retention
**H9: Weekly Habit Formation**
*   **Hypothesis statement:** CLI users will regenerate the context pack at least 3 times per week to keep their agents updated.
*   **Success metric + threshold:** >40% of WAU (Weekly Active Users) run the CLI command 3+ times a week.
*   **Fastest test:** Distribute a private beta CLI with basic telemetry to 10 users and monitor for 14 days.
*   **Decision rule:** If regeneration is low, need to build auto-sync via file-watching or CI.

**H10: Mandated Usage**
*   **Hypothesis statement:** After a 14-day trial, engineering managers will enforce the context-compiler in their team's workflow.
*   **Success metric + threshold:** 2 out of 3 pilot teams put the tool in their official onboarding docs or CI pipeline.
*   **Fastest test:** Run a concierge pilot with 3 teams.
*   **Decision rule:** If 0 teams mandate it, it's a nice-to-have, not a painkiller.

### Pricing
**H11: $49/mo Individual Willingness to Pay**
*   **Hypothesis statement:** Lead developers/architects will pay $49/mo out of pocket (or expense it) for the CLI+App combo to save time on agent babysitting.
*   **Success metric + threshold:** 5% conversion rate on a pricing page "Buy Now" button.
*   **Fastest test:** Fake door smoke test (Pricing page -> Stripe checkout -> "Out of Beta Soon").
*   **Decision rule:** If <2% convert, test lower price ($20) or shift entirely to team sales.

**H12: CI Gate as Premium Feature**
*   **Hypothesis statement:** Teams will pay $199/mo specifically for the GitHub CI enforcement; the CLI context mapping is seen as a free commodity.
*   **Success metric + threshold:** On the pricing page, the $199/mo "Team" tier gets 3x more clicks than the $49/mo "Pro" tier.
*   **Fastest test:** A/B test pricing page feature matrices.
*   **Decision rule:** If CLI gets more clicks, make the GitHub app a free add-on and charge for graph computation.

### Distribution
**H13: "Agent PR Fails" Marketing**
*   **Hypothesis statement:** Content highlighting disastrous agent PR failures will drive high-intent traffic.
*   **Success metric + threshold:** Twitter/LinkedIn posts showing failed vs solved PRs achieve <$0.50 CPC.
*   **Fastest test:** Publish a blog post + thread: "How Claude Code ruined our Friday, and how we fixed it with AGENTS.md."
*   **Decision rule:** If engagement is low, pivot to enterprise-focused "ROI/Speed" marketing.

**H14: VS Code Extension as Trojan Horse**
*   **Hypothesis statement:** Distributing the context compiler via a free VS Code extension will drive 50% more adoption than a raw npm CLI.
*   **Success metric + threshold:** VS Code extension gets 100 installs in week 1.
*   **Fastest test:** Build a dummy VS Code extension that wraps the CLI.
*   **Decision rule:** If <20 installs, stick to CLI for power users.

**H15: Integration Partnerships**
*   **Hypothesis statement:** Integrating directly as an MCP (Model Context Protocol) server will automatically pull users from Claude Desktop.
*   **Success metric + threshold:** Being listed in the MCP directory drives 10 signups/day.
*   **Fastest test:** Build a barebones MCP wrapper for the context compiler and submit it.
*   **Decision rule:** Pivot to Symphony/Cursor specific plugins if MCP yields zero traffic.

### Defensibility
**H16: AI Schema Lock-in**
*   **Hypothesis statement:** If we establish the JSON schema for `AGENTS.md` and RepoGraph, agent frameworks will adopt it as a standard, locking out competitors.
*   **Success metric + threshold:** 2 open-source agent frameworks (e.g., AutoCodeRover, OpenHands) accept a PR to natively parse our schema.
*   **Fastest test:** Draft the schema and submit PRs to 2 major OSS agent projects.
*   **Decision rule:** If rejected, defensibility must come from the GitHub app workflow, not the data format.

### Security/Compliance
**H17: The Local Exec Mandate**
*   **Hypothesis statement:** Teams will refuse to use the tool if the RepoGraph generation requires sending their AST/Codebase to our cloud.
*   **Success metric + threshold:** >80% of interviewed target users state local-only processing is a hard requirement.
*   **Fastest test:** Directly ask 10 prospective customers: "Do you require this to run locally/in your VPC?"
*   **Decision rule:** If true, architect the CLI to rely on purely local Tree-sitter parsing and local processing. No centralized SaaS graph DB.

### Why Now
**H18: The Autonomous Era Shift**
*   **Hypothesis statement:** The pain of context curation is exploding *now* because tools are shifting from autocompletion (Copilot) to autonomous execution (Symphony/Claude Code).
*   **Success metric + threshold:** Google Trends / GitHub searches for "AI Agent CI" and "Model Context Protocol" show >200% MoM growth.
*   **Fastest test:** SEO and keyword volume research.
*   **Decision rule:** If search volume is flat, market education will be very expensive.

---

## 2-Week Experiment Plan (1 Engineer)

**Goal:** Validate H1, H5, H11, and H17 (Is it a real problem? Does our format fix it? Will they pay? Must it be local?).

**Week 1: Problem & Solution Validation**
*   **Mon-Tue:** Build a quick Python/Node script (the "Evaluator") that uses Tree-sitter to parse a repo into a raw JSON graph.
*   **Wed-Thu:** Run the Evaluator against Claude 3.5 Sonnet on 5 known GitHub issues in an open-source project. Compare success rates of (Prompt + Graph + `AGENTS.md`) vs (Prompt only). *(Tests H5)*
*   **Fri:** Draft a "Show HN" style post or Twitter thread outlining the data: "Agents fail 60% of the time without AST context. Here is the open standard we made." *(Prepares for H1/H13)*.

**Week 2: Demand & Security Validation**
*   **Mon:** Launch a Carrd/Webflow landing page explaining "Context Compiler + RepoGraph. $49/mo." Include a Strip checkout button that captures intent (fake door). *(Tests H11)*.
*   **Tue:** Publish the content (Twitter/HN/Reddit). Monitor traffic and signups.
*   **Wed-Thu:** Reach out to 15 people who signed up or commented. Conduct 15-minute interviews. Ask the critical question: *"Would you use this if we sent your repo graph to our cloud to optimize it, or does it HAVE to be an entirely local CLI?"* *(Tests H17)*.
*   **Fri:** Analyze data.
    *   If the LLM didn't perform better -> Pivot the core tech format.
    *   If no one clicked $49 -> Pivot pricing/ICP.
    *   If everyone demands local -> Commit to a local CLI + GitHub App architecture.
