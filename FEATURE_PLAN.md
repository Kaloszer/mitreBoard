# Feature: Inactive Rule Explorer

This document tracks the implementation plan for the Inactive Rule Explorer feature.

## Overall Goal

Create a new section in the application to browse analytic rules that are not currently active ("inactive rules"). This section should allow users to filter and sort these rules based on the MITRE ATT&CK tactics/techniques they cover, especially focusing on those that would improve coverage for "underserved" areas based on the currently active rules.

## Implementation Plan

### Backend (`server/index.ts`)

-   [X] **Add CLI Argument:** Introduce a `-dn` or `--directory-not-implemented` argument using `commander` for the inactive rules path.
-   [X] **Parse Inactive Rules:** Read and parse YAML files from the `-dn` directory. Store results separately (e.g., `inactiveRulesData`).
-   [X] **Calculate Satisfaction Counts:** For each inactive rule, calculate the count of tactics, techniques (base), and sub-techniques covered.
-   [X] **New API Endpoint (`/api/inactive-rules`):** Create an endpoint to return details of inactive rules, including the satisfaction counts.
-   [X] **Update Rule Content Endpoint (`/api/rule-content`):** Modify to search both active and inactive rule paths.

### Frontend

-   [X] **Routing/Navigation:** Add navigation to the new "Inactive Rules" page (e.g., link in `MitreBoardHeader.tsx`). Manage view state.
-   [X] **New Component (`InactiveRulesExplorer.tsx`):**
    -   [X] Fetch data from `/api/inactive-rules`, `/api/rule-counts`.
    -   [X] Manage state for data, filters, and selected "candidate" rules.
    -   [ ] Manage state for sorting.
-   [X] **Filtering Component (`InactiveRulesFilters.tsx`):**
    -   [X] Create number input fields for Tactic, Technique, and Sub-technique coverage thresholds.
-   [X] **Table Component (`InactiveRulesTable.tsx`):**
    -   [X] Display inactive rules with columns: Checkbox, Name, Tactics, Techniques, Satisfies (T/T/S).
    -   [X] Implement default sorting (Satisfies descending).
    -   [ ] Implement interactive sorting.
    -   [X] Handle checkbox changes to update the candidate set.
-   [X] **Filtering Logic (in `InactiveRulesExplorer.tsx`):**
    -   [X] Calculate current coverage (Active + Candidates).
    -   [X] Filter table display based on coverage thresholds.
-   [X] **Rule Content Viewing:** Adapt/reuse modal to view inactive rule content via `/api/rule-content`.
