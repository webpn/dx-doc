# UI design review

This directory documents visual decisions made during M1.15 and provides the review checklist for the browser client.

## Review artifacts

Each significant UI change should include:

- the route or screen where the decision is visible;
- screenshots at the supported desktop width and minimum supported width;
- keyboard and focus observations;
- accessibility-tree observations for names, landmarks, errors and status messages;
- component tests for meaningful behavior;
- the relevant Playwright flow when authentication, navigation or server state is involved.

## M1.15 design-review checklist

- [ ] Tokens are used instead of feature-specific visual constants.
- [ ] Components are imported through `@project/design-system`.
- [ ] Loading, empty, validation-error and network-error states are visible and useful.
- [ ] Keyboard navigation and visible focus work without a pointer.
- [ ] Dialogs trap focus and close predictably.
- [ ] Error messages are associated with their fields.
- [ ] Status is not communicated by color alone.
- [ ] Long names and narrow supported widths do not break the layout.
- [ ] Query keys include the relevant company and project scope.
- [ ] The real-instance acceptance path has been exercised.

## Design-decision record

For a non-obvious choice, record:

1. the user problem;
2. the chosen pattern;
3. alternatives considered;
4. accessibility implications;
5. responsive behavior;
6. whether the pattern belongs in the design system or a feature component;
7. the route and test that make it reviewable.

The design-review route is a validation surface, not a replacement for the product screens or the real-instance acceptance test.
