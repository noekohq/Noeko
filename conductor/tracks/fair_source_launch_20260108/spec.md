# Specification for Fair-Source Launch Preparation

## 1. Overview
This document outlines the specifications for preparing the Noeko application for a public, fair-source launch. The primary goals are to make the application easily self-hostable, solidify the business model by clearly separating free and paid features, and integrate with Lemonsqueezy for payment processing and license management.

## 2. Key Objectives
1.  **Streamlined Self-Hosting:** The self-hosting experience must be simple and well-documented, enabling a moderately technical user to get a personal instance of Noeko running with minimal friction.
2.  **Clear Feature Gating:** The distinction between the free, self-hosted features and the paid, licensed/cloud features must be clearly defined and implemented within the codebase. User freedom for personal use should be preserved.
3.  **Robust Monetization:** Integrate Lemonsqueezy to handle payments, subscriptions, and license key generation/validation for paid features.

## 3. Functional Requirements

### 3.1. Self-Hosting & Public Visibility
-   **Documentation:**
    -   Create a comprehensive `SELF_HOSTING.md` guide. This guide must include:
        -   Prerequisites (e.g., Docker, Node.js/Bun).
        -   Step-by-step setup instructions.
        -   Configuration of environment variables (`.env.example` must be thorough).
        -   Instructions for running the application (development and production mode).
        -   Troubleshooting common issues.
-   **Configuration:**
    -   The application must be fully configurable via environment variables. All hardcoded secrets, API keys, and service URLs must be moved to `.env.example`.
    -   Create a default `docker-compose.yml` for a simple, single-command production setup.
-   **Code Cleanup:**
    -   Review and remove any internal-only comments, dead code, or placeholder files not intended for public view.
    -   Ensure all dependencies are up-to-date and have compatible licenses.
    -   Add a `LICENSE` file (e.g., using a fair-source license like BSL, converted to a permissive license after a certain period).

### 3.2. Business Model & Feature Gating
-   **License-based Feature Activation:**
    -   A mechanism must be implemented to check for a valid license key.
    -   The system should query a new endpoint (e.g., `/api/license/status`) to validate the license.
    -   The absence of a valid license key should result in the application running in "free" mode.
-   **Gated Features:**
    -   The following features will require a valid license key:
        -   **Real-time Collaboration:** All Hocuspocus-related functionality.
        -   **Team/Enterprise Features:** Any features related to multi-user accounts, shared spaces, or team management.
    -   The UI should clearly indicate when a feature is unavailable due to licensing and provide a clear call-to-action to upgrade. This can be a simple, non-intrusive link to the Lemonsqueezy checkout page.
-   **User Freedom:**
    -   All core single-user features (note-taking, semantic search, graph view, etc.) must remain fully functional in the free, self-hosted version without a license. The user should not feel "locked out" of their own data or core functionality.

### 3.3. Lemonsqueezy Integration
-   **Payment Flow:**
    -   Create a new page or modal in the UI that directs users to a Lemonsqueezy checkout page for purchasing a license.
    -   This page should be accessible from the UI elements that indicate a feature is paid.
-   **License Key Handling:**
    -   Upon successful payment, Lemonsqueezy will generate a license key.
    -   A webhook endpoint (`/api/webhooks/lemonsqueezy`) must be created to receive license key information from Lemonsqueezy.
    -   The webhook handler should securely store the license key and associate it with the user's account or instance.
-   **License Validation:**
    -   The `/api/license/status` endpoint will validate the stored license key. This may involve a call to the Lemonsqueezy API to confirm the license is still active.
    -   The backend should provide the license status to the frontend, which will then enable/disable the appropriate features.

## 4. Non-Functional Requirements
-   **Security:** The Lemonsqueezy webhook must be secured and validated to prevent fraudulent requests. License keys should be stored securely.
-   **Performance:** The license check should be fast and not introduce noticeable latency to the application startup or user experience.
-   **User Experience:** The process of upgrading to a paid plan should be smooth and intuitive. The distinction between free and paid features should be clear and not feel like a "bait-and-switch".
