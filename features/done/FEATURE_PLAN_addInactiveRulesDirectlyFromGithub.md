# Implementation Plan: Automated Extraction of Analytical Rules from GitHub

## 1. Project Setup & Dependencies

*   **[Implemented]** Add `inquirer` dependency for user prompts during server startup.

## 2. Configuration for Rule Sources

*   **[Implemented]** Create a configuration file to define GitHub rule sources.
*   **[Implemented]** Define TypeScript types for this configuration.

## 3. Core GitHub Fetching Logic

*   **[Implemented]** Implement a module to fetch rule files from a configured GitHub repository.
*   **[Implemented]** Local cache for fetched rules.
*   **[Implemented]** Option to prefer cache for development speed.

## 4. Modifying Server Startup and Rule Processing in `server/index.ts`

*   **[Implemented]** Update `server/index.ts` to integrate the new fetching logic.
*   **[Implemented]** Namespaces GitHub rule IDs to avoid collisions.
*   **[Implemented]** Serves rule content from memory (GitHub) or disk (local).
*   **[Implemented]** `/api/inactive-rule-sources` endpoint for UI to show sources.
*   **[Implemented]** Inactive rules now include `sourceName` for UI indication.

## 5. Testing and Refinement

*   **[Implemented]** Manual and automated testing.
*   **[Implemented]** Error handling for missing/invalid config and GitHub errors.
*   **[Implemented]** Automated tests for GitHub fetching and caching.

## Future Considerations (Post-MVP)

*   **[Partially Implemented]** Parser extensibility: Parser registry is present, but only a stub. Extend as needed for new formats.
*   **[Not Implemented]** Advanced caching (ETags, last-modified, persistent cache).
*   **[Not Implemented]** UI enhancements: runtime refresh, selective download from multiple sources.

---

**Summary:**  
All core backend functionality described in the plan is implemented and tested.  
Parser extensibility is stubbed and ready for future use.  
UI can now show rule source and available sources via API.