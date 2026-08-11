# Contributing

## Development Workflow

1. **Pick up or create an issue.** All work starts from a GitHub Issue.
2. **Create a feature branch** from `main`: `git checkout -b feat/issue-number-short-description`
3. **Implement the change** following the engineering and style guides.
4. **Write tests** for the changed behavior. Every bug fix should include a regression test.
5. **Run validation:** `npm run typecheck && npm run lint && npm run format:check && npm test`
6. **Push and create a pull request.**
7. **Address review feedback.** CI must pass before merge.
8. **Squash-merge** into `main`.

## Branching Strategy

- `main` — the single source of truth. Always deployable.
- Feature branches: `feat/<description>`
- Bug fix branches: `fix/<description>`
- Documentation branches: `docs/<description>`
- Architecture/refactor branches: `refactor/<description>`
- Branches are short-lived. Merge within a few days; if a branch lives longer than a week, break it into smaller pieces.

## Commit Conventions

Commits should be small, focused, and meaningful. Commit messages follow a lightweight form of Conventional Commits:

```
type(scope): short description

Optional longer description explaining the why, not the what.
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`, `style`

Scopes: domain entity or module name, e.g., `feat(tracking): add bulk property addition`

## Pull Request Rules

- PR title and description must explain what the change does and why.
- PRs must link to the GitHub Issue they address.
- PRs that change architecture must reference the relevant ADR.
- PRs that add dependencies must justify them in the description.
- CI must pass (typecheck, lint, format check, tests).
- At least one review is required for changes to architecture, domain entities, or security-sensitive code.
- The author merges their own PR after approval — do not merge someone else's PR without explicit permission.

## Review Expectations

Reviewers check for:

- Architectural consistency: does the change respect layer boundaries?
- Correctness: does it do what it says it does?
- Testing: are the right things tested at the right level?
- Style: does it follow the style guide?
- Documentation: are docs updated if behavior or architecture changed?
- Performance: is there an obvious performance problem?
- Security: is there an obvious security problem?
- Accessibility: does new UI meet accessibility requirements?

## Testing Expectations

- Domain logic: unit tests for all business rules and invariants.
- Application use cases: unit or integration tests, with mocked ports.
- Infrastructure adapters: integration tests against real services (test database, local S3).
- API endpoints: integration tests for validation, auth, and behavior.
- UI components: test meaningful behavior (interactions, states), not internal structure.
- E2E: critical user journeys (create project, publish version, view in read-only mode).
- Bug fixes include a regression test.
- Tests are run in CI on every PR and every push to `main`.

## Documentation Expectations

- Documentation is version-controlled and reviewed like code.
- Update docs in the same PR when behavior or architecture changes.
- Link related ADRs, issues, and PRs in commit messages and PR descriptions.
- If a domain entity changes, update `docs/product/glossary.md`.
- If an architectural decision is made, create or update an ADR in `docs/adr/`.
- Do not duplicate information across documents — cross-reference instead.

## Dependency / Change Policy

- Adding a dependency requires justification in the PR description following the policy in [`ENGINEERING_GUIDE.md`](ENGINEERING_GUIDE.md).
- Removing a dependency is encouraged when it is no longer used.
- Upgrading dependencies is done in dedicated PRs, not bundled with feature work.