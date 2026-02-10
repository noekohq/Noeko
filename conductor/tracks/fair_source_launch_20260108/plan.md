# Plan: Prepare for Fair-Source Launch

This plan outlines the tasks required to prepare the Noeko application for a public, fair-source launch.

## Phase 1: Self-Hosting and Public Visibility Preparation

### Tasks
- [ ] Task: Create a comprehensive `SELF_HOSTING.md` guide.
- [ ] Task: Refactor configuration to be fully environment variable-driven and update `.env.example`.
- [ ] Task: Create a production-ready `docker-compose.yml` for a simple, single-command setup.
- [ ] Task: Review and clean up the codebase, removing internal-only comments and dead code.
- [ ] Task: Add a `LICENSE` file.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Self-Hosting and Public Visibility Preparation' (Protocol in workflow.md)

## Phase 2: Business Model Implementation and Feature Gating

### Tasks
- [ ] Task: Implement a license key validation mechanism.
- [ ] Task: Create a `/api/license/status` endpoint for license validation.
- [ ] Task: Implement feature gating for real-time collaboration features.
- [ ] Task: Implement feature gating for team/enterprise features.
- [ ] Task: Add UI elements to indicate paid features and provide an upgrade path.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Business Model Implementation and Feature Gating' (Protocol in workflow.md)

## Phase 3: Lemonsqueezy Integration

### Tasks
- [ ] Task: Create a UI page or modal to direct users to the Lemonsqueezy checkout.
- [ ] Task: Create a `/api/webhooks/lemonsqueezy` webhook endpoint to receive license key information.
- [ ] Task: Implement the webhook handler to securely store and associate license keys.
- [ ] Task: Integrate the `/api/license/status` endpoint with the Lemonsqueezy API for license validation.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Lemonsqueezy Integration' (Protocol in workflow.md)
