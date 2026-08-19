# Agent-driven import scripts

Import scripts for real products belong in this directory and must drive the public REST API or MCP surface. The Platform deliberately contains no source-format-specific parser (ADR-0021).

## Required script contract

A committed product import script must:

1. authenticate using a service-account token;
2. create or update entities using stable `custom_id` values;
3. be safe to run repeatedly without creating duplicates;
4. fail on unexpected API validation errors;
5. finish by requesting the reconciliation report and writing it to `reports/`;
6. document the source export location and the target company/project identifiers without committing credentials.

The first product import is intentionally represented by a reviewed, runnable script rather than an opaque agent transcript. Add product-specific scripts under this directory when the source export and target identifiers are available.
