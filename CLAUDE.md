# Claude Code Repository Configuration

# Agentic Routing
When tasked with UI creation, CSS refactoring, or visual debugging, you MUST invoke the `frontend-mythos` skill. Do not write React/Tailwind code using your default knowledge base.

## Execution Rules & Standards
* **Visual Verification Loop**: Never declare a frontend component complete without executing the headless Playwright runner (`scripts/visual-verify.ts`) across desktop, tablet, and mobile viewports.
* **Token Efficiency**: Load reference specifications (`references/`) on-demand. Do not dump large markdown files into prompts.
* **Aesthetic Standards**: Adhere strictly to `references/aesthetic-benchmarks.md` (Linear-grade 8pt grid, Stripe-grade tabular data, Vercel-grade negative space).
* **Anti-Slop Guard**: Eliminate generic purple glow gradients, floating pill badges, and unconstrained frosted-glass blurs.
