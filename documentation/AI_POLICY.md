# Noeko's AI Policy

Given the widespread usage of AI tools in software development, it is necessary to set a standard for how contributions are evaluated at Noeko. We do not police the individual workflows of our contributors; this is not a set of rules dictating how you must write your code. We evaluate each contribution on a case-by-case basis, focusing on quality and maintainability rather than the tools used to produce it.

However, because AI has significantly lowered the barrier to entry for generating code, we enforce strict standards around code quality and developer understanding. This is our chosen bottleneck to ensure Noeko grows in a healthy, maintainable way.

## The Explainability Standard

Code is not an automatic asset; it is a liability that we, as maintainers, must take responsibility for and serve to our users. Because of this, we evaluate all pull requests against the **Explainability Standard**.

At a bare minimum, submitted code must be maintainable, secure, and compatible with the existing codebase. While we do not require contributors to preemptively explain every PR, we operate reactively: we reserve the right to ask for clarification on any code submitted. If requested, contributors must be able to clearly explain the code they want to merge into Noeko.

**What constitutes a valid explanation:**
Explainability means being able to articulate the _why_, not just the _what_. Summarizing the syntax is insufficient. A contributor must be able to explain the reasoning behind architectural decisions, performance tradeoffs, and how their changes interact with Noeko's wider architecture.

If a contributor over-delegates to AI—or simply lacks the contextual understanding of the code they are submitting—and cannot properly explain the reasoning behind their implementation, they cannot transfer the responsibility of that code to the maintainers. In these cases, the pull request will be rejected on the grounds of failing the Explainability Standard.

## Non-Technical Contributors

We highly value contributors who want to help improve Noeko. If you lack the technical expertise to fulfill the Explainability Standard, we strongly recommend opening issues to guide development rather than using AI to auto-generate code for pull requests.

This standard applies specifically to code changes. Meaningful contributions in the form of documentation updates, copy adjustments, or other text-based improvements are always welcome and are not bound by the same technical explainability requirements.
