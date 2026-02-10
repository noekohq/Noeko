# Project Workflow

## Guiding Principles

1.  **GitHub is Strategy, Plan is Tactics:** The GitHub Project (Owner: `noekohq`) is the source of truth for *what* we work on. The local `plan.md` is the source of truth for the implementation steps of the active issue.
2.  **Context is Explicit:** We do not rely on implicit session memory. All relevant file paths and architectural context must be explicitly listed in `plan.md` before coding begins.
3.  **Functionality First, Polish Second:** We solve the engineering problem completely before moving to the "Noeko Polish" phase to address UX, aesthetics, and QoL.
4.  **The Tech Stack is Deliberate:** Changes to the tech stack must be documented in `tech-stack.md` *before* implementation.
5.  **Comprehensive Testing:** Prioritize manual testing, and future end-to-end and API testing to ensure functionality and quality.
6.  **Non-Interactive & CI-Aware:** Prefer non-interactive commands. Use `CI=true` for watch-mode tools.

## GitHub Project Structure (Default)

*Note: GitHub integration is the default. If the user explicitly opts out for a session, skip `gh` commands but maintain local `plan.md` discipline.*

### Status Definitions
* **📥 Inbox:** Idle ideas. Do not touch.
* **🎯 Backlog:** Ready for development. **Source of new work.**
* **⚡️ In Progress:** Currently active.
* **✨ Testing & QA:** Development complete, awaiting review.
* **✅ Done:** Complete.

### Priority & Complexity
* **Priority:** P0 - Critical, P1 - Strategic, P2 - Polish, P3 - Experiment
* **Complexity:** XS - Quick Hit, S - Small, M - Medium, L - Epic.

---

## Task Workflow

### Phase 1: Selection, Context & Sync

**Trigger:** You are starting a session.

1.  **Check Existing Work:**
    * **Action:** Check `plan.md` for unfinished tasks.
    * **Decision:** If incomplete, **RESUME** at Phase 2 or 3.
    * **Decision:** If empty/done, proceed to step 2.

2.  **Fetch Backlog (GitHub):**
    * Use `gh` CLI to identify work in **Backlog**.
    * *Filter:* Sorted by `Target Date` or `Priority` (P0 -> P3).
    * *Large Issues:* If Size L or sub-issues exist, plan to break `plan.md` into distinct implementation phases.

3.  **Select & Sync:**
    * Confirm Issue ID with user.
    * Move GitHub Issue to **In Progress**.

4.  **Initialize Plan & Link:**
    * Create/Reset `plan.md`.
    * **Header:** Add GitHub Issue Link/ID.
    * **Structure:** Create `## Context` and `## Implementation Tasks`.

5.  **Context Assembly (Agent-Led):**
    * **Action:** Analyze requirements and codebase.
    * **Action:** Draft `## Context` (Target files + Key concepts).
    * **Review:** Ask user: "Does this context cover the requirements?"
    * **Refine:** Update `plan.md` before coding.

### Phase 2: Functional Execution Loop

**Goal:** Make it work. Ignore "pixel-perfect" details for now.

1.  **Select Task:** Pick next `[ ]` task in `plan.md`.
2.  **Mark In Progress:** Update to `[~]`.
3.  **Implement & Test:**
    * Write code focused on logic and core behavior.
    * **CRITICAL:** Verify functionality manually.
4.  **Commit Code:**
    * Stage & Commit (Conventional Commits).
5.  **Attach Task Summary (Git Notes):**
    * `git notes add -m "<Summary>" <hash>`
6.  **Update Plan:** Mark `[x]` and append short hash.
7.  **Loop:** Repeat until all *functional* tasks are done.

### Phase 3: The "Noeko Polish"

**Trigger:** All functional tasks are complete.
**Goal:** Make it beautiful. Focus on Reliability, QoL, UX, and Aesthetics.

1.  **Initiate Polish Phase:**
    * **Action:** Create a new heading in `plan.md`: `### Phase 3: Polish`.
    * **Prompt:** "Functionality is complete. I am ready for the Noeko Polish phase. Please guide me on UI refinements, transitions, copy tweaks, or UX improvements."

2.  **Collaborative Refinement (Human-Led):**
    * **Aesthetics:** Adjust spacing, typography, colors to match "Vibe".
    * **Reliability:** Add error boundaries, graceful failure states.
    * **QoL:** Add loading skeletons, optimisitic UI, tooltips, keyboard navigation.
    * **Motion:** Add transitions/animations.

3.  **Execute Polish Tasks:**
    * Add specific polish tasks to `plan.md`.
    * Execute, Commit, and Verify (same as Phase 2).

### Phase 4: Completion & Checkpoint

**Trigger:** Functionality AND Polish are verified.

1.  **Verify Scope:** Match work to Issue requirements.
2.  **Automated Testing:** Run full suite (ensure Polish didn't break Logic).
3.  **Manual Verification Plan:**
    * Generate step-by-step plan.
    * **PAUSE** for user confirmation ("Does this meet expectations?").
4.  **Create Checkpoint Commit:**
    * `conductor(checkpoint): Complete Issue #<ID>`.
5.  **Attach Final Report:**
    * Attach full report via `git notes`.
6.  **Update GitHub (Post-Confirmation):**
    * Move to **Testing & QA**.
    * Comment concise summary:
        ```text
        **Status Update: Ready for QA**
        - Feature implemented & Verified.
        - "Noeko Polish" applied (UX/UI refined).
        - Tests passed.
        - Checkpoint: <Hash>
        ```
7.  **Announce:** Ready for next task.

---

## Quality Gates

Before marking *any* task complete:
- [ ] Automated tests pass
- [ ] Manual testing verified
- [ ] Code follows `code_styleguides/`
- [ ] No linting errors
- [ ] Types are safe
- [ ] Commit messages follow Conventional Commits

## Development Commands

### Setup
```bash
bun install
