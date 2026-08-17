/**
 * ATS Network Monitor — Static Data Config
 * PWA reads JSON files published by the agent to GitHub Pages.
 * No Microsoft login required.
 */

// Base URL where agent writes data files (gh-pages branch /data/ directory)
export const DATA_BASE_URL =
  "https://raw.githubusercontent.com/allteksai/ats-network-monitor/gh-pages/data";

// SHA-256 hash of the admin access code.
// Default code: ATS2026
// To change: run  echo -n 'newcode' | sha256sum  and paste the result here.
export const ADMIN_PIN_HASH =
  "2b010c093c20e083340a6c5f74e164a63d62fadbddfc63ad33ea58cfdf30f7ef";

// Per-client document links (files live in pwa/public/docs/, served from gh-pages).
// Will be superseded by DocsJson SharePoint column once that's added.
export const CLIENT_DOCS = {
  CAVO: [
    { name: "Drive Replacement Guide", icon: "📄", file: "docs/CAVO_Drive_Replacement.pdf" },
    { name: "VPN Setup Guide", icon: "🔒", file: "docs/CAVO_VPN_Setup.pdf" },
  ],
  AMBIT: [
    { name: "VPN Setup Guide", icon: "🔒", file: "docs/AMBIT_VPN_Setup.pdf" },
  ],
};

// ─────────────────────────────────────────────────────────────
// LaserSync — Syncthing failover UI chip (ATS portal standard)
// ─────────────────────────────────────────────────────────────
// Any client running a local file-sync / CNC failover machine gets a
// "LaserSync" chip that opens the SERVER-SIDE Syncthing web UI (on the
// client's NAS), reachable over the client LAN or VPN.
//
// Preferred source is a per-client SharePoint `SyncUrl` column (data-driven,
// no rebuild needed to onboard a new client). This map is the code-level
// fallback / default and is what enables CAVO today.
//
//   url  = server-side Syncthing web UI (NOT the shop PC's localhost:8384)
//   name = chip label (defaults to "LaserSync")
export const CLIENT_SYNC = {
  CAVO: {
    name: "LaserSync",
    // Syncthing app web UI on CAVO-FN002 (10.1.4.51).
    // ⚠️ CONFIRM THE PORT: TrueNAS → Apps → Syncthing → "Web Portal" button
    //    shows the real host port. 8384 is Syncthing's default; TrueNAS SCALE
    //    often maps the app to a different host port — replace if so.
    url: "http://10.1.4.51:20910/",
  },
};
