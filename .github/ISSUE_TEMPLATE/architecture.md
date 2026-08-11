name: Architecture Decision
description: Propose or discuss an architectural decision
title: "arch: "
labels: ["type:architecture"]
body:
  - type: markdown
    attributes:
      value: |
        Use this template to propose an architectural decision that should be recorded as an ADR.
  - type: textarea
    id: context
    attributes:
      label: Context
      description: What is the problem, constraint, or force driving this decision?
    validations:
      required: true
  - type: textarea
    id: proposal
    attributes:
      label: Proposal
      description: What do you propose we do?
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: What other options were considered and why were they rejected?
    validations:
      required: true
  - type: textarea
    id: consequences
    attributes:
      label: Consequences
      description: What becomes easier, harder, or constrained if we adopt this?
  - type: textarea
    id: related
    attributes:
      label: Related ADRs / Issues