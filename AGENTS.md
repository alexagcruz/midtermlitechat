# Repository Workflow

Use this workflow for application work:

**STUDY => PLAN => EXECUTE PLAN => RENDEZVOUS => SYNC DOCS**

Do not skip a stage. Do not implement the application during STUDY or PLAN.
Keep important project intent and human decisions in repository documentation,
not only in conversation.

## STUDY

Before creating a study, run:

```sh
date +%s
```

Write the study to `doc/study/{unix_timestamp}_{topic}.md`, using the timestamp
from that command. Study the requested outcome before implementation. Analyze:

- Requirements and testable outcomes.
- Feasibility, architecture, and technology choices.
- Major choices, alternatives, and tradeoffs.
- Constraints, risks, and assumptions.
- Testing and validation needs.
- Exogenous inputs that the codebase cannot provide.
- Decisions that need human input or approval.

Recommend an appropriate technology stack and architecture. Explain why each
major choice fits the requirements. Prefer established technologies with strong
automated testing support unless the requirements justify another choice. Avoid
unnecessary complexity. Do not silently make major choices when meaningful
tradeoffs require human judgment. Ask for required external inputs before they
become blockers. Never invent unavailable inputs.

Do not change application code during STUDY. Commit the completed study in a
scoped `docs:` Conventional Commit.

## PLAN

Before creating a plan, run:

```sh
date +%s
```

Write the plan to `doc/plan/{unix_timestamp}_{topic}.md`, using the timestamp
from that command. Base it on the approved study and the current repository.
Structure it as an executable and editable checklist. Include:

- Implementation tasks.
- Automated tests and validation.
- Runtime checks.
- Reproducibility.
- Documentation updates.
- Acceptance criteria.

Put unresolved decisions that need human input in a prominent `OPEN QUESTIONS`
section. Do not implement during planning. Commit the completed plan in a
scoped `docs:` Conventional Commit.

## EXECUTE PLAN

- Read the approved plan before execution.
- Check Git status before execution. Do not overwrite or discard existing work.
- Normally create a feature branch for the work.
- Execute the approved checklist and update it as work is completed.
- Use automated tests as feedback during implementation.
- Continue until the plan is complete or a genuine external blocker requires
  human input.
- Use appropriately scoped Conventional Commits.
- Do not ask the human to implement code that the coding harness can implement.
- Express implementation intent through outcomes, constraints, interfaces,
  acceptance criteria, and tests. Do not micromanage unnecessary details.

## RENDEZVOUS

- Verify the implementation against the approved plan.
- Run all relevant automated tests.
- Confirm that the application is in a workable state.
- Resolve integration problems where appropriate.
- Merge the completed feature branch into `main`.
- Report test results, the current branch, Git status, and remaining limitations.

## SYNC DOCS

After rendezvous, update `doc/wiki/` so the living documentation reflects the
actual current state of the codebase. Document only functionality that exists.
Include accurate setup and runtime instructions. Record noteworthy or
unintuitive behavior in `doc/wiki/footguns/`.

## TECHNOLOGY AND ARCHITECTURE DECISIONS

During STUDY, recommend a technology stack and architecture that fit the
requested outcome. Explain the reasons for each major choice, reasonable
alternatives, and important tradeoffs. Prefer established technologies with
strong automated testing support unless the requirements justify otherwise.
Avoid unnecessary complexity. Identify major decisions that need human approval
before implementation. Record approved decisions and their reasoning in
project documentation.

## TESTING

Treat automated testing as an important part of implementation. Define important
behavior through testable outcomes, not unnecessary implementation details.
Where appropriate, include tests for major user flows, business rules,
validation, and important failure cases. Run relevant tests during execution
and before rendezvous. Code alone does not show that important behavior is
complete.

## EXOGENOUS INPUTS

Clearly identify every required input that cannot be created inside the
codebase. This can include API keys, credentials, accounts, external services,
proprietary or domain information, datasets, and required assets. Never invent
unavailable inputs. Ask the human for required external inputs before they
become a blocker.

## REPRODUCIBILITY

Keep the repository reproducible from a fresh clone:

- Declare dependencies with the standard dependency declaration mechanism for
  the selected stack.
- Do not assume packages installed in the current CodeRange environment exist
  elsewhere.
- Do not depend on untracked local state.
- Do not commit secrets or API keys.
- Check that required project files are not accidentally excluded by
  `.gitignore`.
- Document exact installation, configuration, migration, initialization,
  seed-data, testing, and startup commands.
- Before submission, verify the project from a fresh clone.

## CODERANGE

Applications that must accept CodeRange external requests must bind to
`0.0.0.0` and the required port. Account for the CodeRange forwarded-host
environment when applicable. A successful localhost check does not prove that
the application works through CodeRange.

## VERSION CONTROL

Use Git throughout the project. Scope meaningful changes into clean Conventional
Commits. Use prefixes such as `feat:`, `fix:`, `docs:`, `test:`, `refactor:`,
`build:`, and `chore:`. Do not combine unrelated changes in one commit.

- Use `TODO.md` as the editable file-based todo list where appropriate.
- Treat `doc/canonical/` as authoritative human-approved project information.
- Use `doc/memory/` for project memory when needed.
- Use `doc/roadmap/` for roadmap material.

## REMOTE VERSION CONTROL

When `origin` is configured and authentication is available, push completed,
committed workflow changes to the remote repository. After RENDEZVOUS and SYNC
DOCS, ensure the completed work is committed and push `main`. Push again after
later completed corrective changes. Never assume a local commit exists on the
remote. Verify local and remote state before claiming that GitHub is current.
Report whether pushes succeed.

## API CREDENTIALS AND SECRETS

- Treat all LiteChat proxy/API credentials as exogenous secret inputs.
- Never hardcode credentials in application source code.
- Never place actual credential values in `AGENTS.md`, study documents, plans,
  README files, tests, logs, seed data, or other tracked files.
- Never commit credentials to Git.
- Use environment variables or another approved runtime-secret mechanism.
- Ensure local secret files such as `.env` are excluded by `.gitignore`.
- Documentation may state required environment-variable names but must never
  contain their values.
- Never print or expose secret values while verifying configuration.

## DOCUMENTATION STYLE

Use ASD-STE100 as the base documentation style. Preserve important nuance when
that style alone would not communicate it accurately.
