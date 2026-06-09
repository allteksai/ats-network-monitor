/**
 * ATS Network Monitor PWA
 * =======================
 * React SPA — topology map, device drawer, file vault, alert feed.
 * Auth: MSAL (Azure AD / M365) — uses your existing login.
 * Host: GitHub Pages (free) or any static host.
 *
 * Install:
 *   npm create vite@latest pwa -- --template react
 *   npm install @azure/msal-browser @azure/msal-react
 *   Copy this file over src/App.jsx
 *   Update src/authConfig.js with your CLIENT_ID and TENANT_ID
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest, graphConfig, SP_CONFIG } from "./authConfig";

// ─────────────────────────────────────────────────────────────
// Graph API helpers
// ─────────────────────────────────────────────────────────────

async function callGraph(instance, accounts, url) {
  const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${response.accessToken}` },
  });
  if (!res.ok) throw new Error(`Graph error: ${res.status}`);
  return res.json();
}

async function getSpItems(instance, accounts, listName, filter = "") {
  const site = SP_CONFIG.siteId;
  let url = `https://graph.microsoft.com/v1.0/sites/${site}/lists/${listName}/items?expand=fields&$top=500`;
  if (filter) url += `&$filter=${encodeURIComponent(filter)}`;
  const items = [];
  while (url) {
    const data = await callGraph(instance, accounts, url);
    items.push(...(data.value || []));
    url = data["@odata.nextLink"] || null;
  }
  return items.map((i) => i.fields);
}

// ─────────────────────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  Online:      "#22c55e",
  Offline:     "#ef4444",
  Degraded:    "#f59e0b",
  Unknown:     "#94a3b8",
  Maintenance: "#818cf8",
};

function StatusDot({ status, size = 10 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: STATUS_COLOR[status] || STATUS_COLOR.Unknown,
        flexShrink: 0,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Topology canvas
// ─────────────────────────────────────────────────────────────

const DEVICE_ICONS = {
  Router:       "📡",
  Switch:       "🔀",
  Firewall:     "🛡",
  "NAS/TrueNAS":"🗄",
  Server:       "🖥",
  Workstation:  "💻",
  "RPi/Portal": "🍓",
  Printer:      "🖨",
  WAP:          "📶",
  "Camera/NVR": "📷",
  UPS:          "🔋",
  Other:        "🔌",
};

function TopologyMap({ devices, onSelectDevice }) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  // Auto-arrange devices that have no TopoX/Y
  const positioned = devices.map((d, i) => ({
    ...d,
    x: d.TopoX || 80 + (i % 5) * 130,
    y: d.TopoY || 60 + Math.floor(i / 5) * 100,
  }));

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: 300,
        background: "var(--bg-secondary, #1e293b)",
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid var(--border, #334155)",
      }}
    >
      {/* Connection lines (parent → child) */}
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        {positioned.map((d) => {
          if (!d.ParentDevice) return null;
          const parent = positioned.find((p) => p.Title === d.ParentDevice);
          if (!parent) return null;
          return (
            <line
              key={`${parent.Title}-${d.Title}`}
              x1={parent.x + 18} y1={parent.y + 18}
              x2={d.x + 18}      y2={d.y + 18}
              stroke="#475569" strokeWidth={1.5} strokeDasharray="4,3"
            />
          );
        })}
      </svg>

      {/* Device nodes */}
      {positioned.map((d) => (
        <button
          key={d.Title}
          onClick={() => onSelectDevice(d)}
          title={`${d.Title} — ${d.IPAddress} — ${d.Status}`}
          style={{
            position: "absolute",
            left: d.x,
            top: d.y,
            background: "var(--bg-primary, #0f172a)",
            border: `2px solid ${STATUS_COLOR[d.Status] || "#475569"}`,
            borderRadius: 8,
            padding: "4px 8px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            minWidth: 60,
            boxShadow: d.Status === "Offline" ? `0 0 8px ${STATUS_COLOR.Offline}66` : "none",
          }}
        >
          <span style={{ fontSize: 20 }}>{DEVICE_ICONS[d.DeviceType] || "🔌"}</span>
          <span style={{ fontSize: 9, color: "#94a3b8", maxWidth: 70, textAlign: "center", lineHeight: 1.2 }}>
            {d.Title}
          </span>
          <StatusDot status={d.Status} size={8} />
        </button>
      ))}

      {devices.length === 0 && (
        <div style={{ color: "#475569", textAlign: "center", paddingTop: 100, fontSize: 13 }}>
          No devices for this client yet.<br />Run the agent with --discover to auto-populate.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Device detail drawer
// ─────────────────────────────────────────────────────────────

function DeviceDrawer({ device, onClose, instance, accounts }) {
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  useEffect(() => {
    if (!device) return;
    setLoadingFiles(true);
    const folder = `${SP_CONFIG.docLibName}/${device.ClientCode}/${device.Title}`;
    const url = `https://graph.microsoft.com/v1.0/sites/${SP_CONFIG.siteId}/drive/root:/${folder}:/children`;
    callGraph(instance, accounts, url)
      .then((d) => setFiles(d.value || []))
      .catch(() => setFiles([]))
      .finally(() => setLoadingFiles(false));
  }, [device]);

  if (!device) return null;

  const uptimeColor = (pct) => pct >= 99 ? "#22c55e" : pct >= 95 ? "#f59e0b" : "#ef4444";

  return (
    <div
      style={{
        position: "fixed", right: 0, top: 0, bottom: 0, width: 320,
        background: "var(--bg-primary, #0f172a)",
        borderLeft: "1px solid var(--border, #334155)",
        overflowY: "auto", zIndex: 100, padding: 16,
        boxShadow: "-4px 0 20px #00000066",
      }}
    >
      <button
        onClick={onClose}
        style={{ float: "right", background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}
      >✕</button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 32 }}>{DEVICE_ICONS[device.DeviceType] || "🔌"}</span>
        <div>
          <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 16 }}>{device.Title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <StatusDot status={device.Status} />
            <span style={{ color: STATUS_COLOR[device.Status], fontSize: 12 }}>{device.Status}</span>
          </div>
        </div>
      </div>

      {/* Details grid */}
      {[
        ["Type",     device.DeviceType],
        ["IP",       device.IPAddress],
        ["MAC",      device.MACAddress],
        ["Hostname", device.Title],
        ["Firmware", device.FirmwareVer],
        ["Mfr",      device.Manufacturer],
        ["Model",    device.Model],
        ["Serial",   device.SerialNumber],
        ["Ping",     device.ResponseMsAvg ? `${device.ResponseMsAvg} ms avg` : "—"],
        ["Uptime 7d",device.UptimePct7d ? (
          <span style={{ color: uptimeColor(device.UptimePct7d) }}>{device.UptimePct7d}%</span>
        ) : "—"],
        ["Last seen",device.LastSeen ? new Date(device.LastSeen).toLocaleString() : "—"],
        ["Last bkp", device.LastBackup ? new Date(device.LastBackup).toLocaleString() : "Never"],
      ].map(([label, value]) => value ? (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #1e293b", fontSize: 12 }}>
          <span style={{ color: "#64748b" }}>{label}</span>
          <span style={{ color: "#cbd5e1", textAlign: "right", maxWidth: 180 }}>{value}</span>
        </div>
      ) : null)}

      {/* Notes / Pi-hole */}
      {device.Notes && (
        <div style={{ marginTop: 12, padding: 8, background: "#1e293b", borderRadius: 6, fontSize: 11, color: "#94a3b8", whiteSpace: "pre-wrap" }}>
          {device.Notes}
        </div>
      )}

      {/* File vault */}
      <div style={{ marginTop: 16 }}>
        <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>📁 Config Files & Firmware</div>
        {loadingFiles ? (
          <div style={{ color: "#475569", fontSize: 12 }}>Loading...</div>
        ) : files.length === 0 ? (
          <div style={{ color: "#475569", fontSize: 12 }}>No files yet — run backup to populate.</div>
        ) : (
          files.map((f) => (
            <a
              key={f.id}
              href={f.webUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 6, marginBottom: 4,
                background: "#1e293b", textDecoration: "none",
                color: "#60a5fa", fontSize: 12,
              }}
            >
              📄 {f.name}
              <span style={{ color: "#475569", marginLeft: "auto", fontSize: 10 }}>
                {new Date(f.createdDateTime).toLocaleDateString()}
              </span>
            </a>
          ))
        )}
      </div>

      {/* Tags */}
      {device.Tags && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {device.Tags.split(",").map((t) => (
            <span key={t} style={{ background: "#1e293b", color: "#94a3b8", borderRadius: 4, padding: "2px 6px", fontSize: 10 }}>
              {t.trim()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Alert feed
// ─────────────────────────────────────────────────────────────

function AlertFeed({ events }) {
  return (
    <div style={{ maxHeight: 220, overflowY: "auto" }}>
      {events.length === 0 && (
        <div style={{ color: "#475569", fontSize: 12, padding: 8 }}>No recent events.</div>
      )}
      {events.slice(0, 50).map((e, i) => (
        <div
          key={i}
          style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            padding: "6px 0", borderBottom: "1px solid #1e293b", fontSize: 12,
          }}
        >
          <span>{e.EventType === "StatusChange" && e.NewStatus === "Offline" ? "🔴" :
                 e.EventType === "StatusChange" && e.NewStatus === "Online"  ? "🟢" :
                 e.EventType === "BackupSuccess" ? "✅" :
                 e.EventType === "BackupFailed"  ? "❌" :
                 e.EventType === "NewDevice"     ? "🆕" : "ℹ️"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#cbd5e1" }}>{e.Title}</div>
            {e.Details && <div style={{ color: "#64748b", fontSize: 10, marginTop: 1 }}>{e.Details.slice(0, 80)}</div>}
          </div>
          <span style={{ color: "#475569", whiteSpace: "nowrap", fontSize: 10 }}>
            {e.EventTime ? new Date(e.EventTime).toLocaleString() : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────

export default function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [clients, setClients]         = useState([]);
  const [selectedClient, setSelected] = useState(null);
  const [devices, setDevices]         = useState([]);
  const [events, setEvents]           = useState([]);
  const [selectedDevice, setDevice]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [tab, setTab]                 = useState("topology"); // topology | alerts

  // Load client list on login
  useEffect(() => {
    if (!isAuthenticated) return;
    getSpItems(instance, accounts, SP_CONFIG.listClients, "fields/IsActive eq 1")
      .then(setClients)
      .catch(console.error);
  }, [isAuthenticated]);

  // Load devices + events when client selected
  const loadClientData = useCallback(async (clientCode) => {
    setLoading(true);
    try {
      const [devs, evts] = await Promise.all([
        getSpItems(instance, accounts, SP_CONFIG.listDevices, `fields/ClientCode eq '${clientCode}'`),
        getSpItems(instance, accounts, SP_CONFIG.listEvents,  `fields/ClientCode eq '${clientCode}'`),
      ]);
      setDevices(devs);
      setEvents(evts.sort((a, b) => new Date(b.EventTime) - new Date(a.EventTime)));
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [instance, accounts]);

  useEffect(() => {
    if (selectedClient) loadClientData(selectedClient);
  }, [selectedClient]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!selectedClient) return;
    const interval = setInterval(() => loadClientData(selectedClient), 60000);
    return () => clearInterval(interval);
  }, [selectedClient, loadClientData]);

  // Summary counts
  const online      = devices.filter((d) => d.Status === "Online").length;
  const offline     = devices.filter((d) => d.Status === "Offline").length;
  const unresolvedE = events.filter((e) => !e.IsResolved).length;

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#f1f5f9" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>ATS Network Monitor</div>
        <div style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>All Technical Solutions</div>
        <button
          onClick={() => instance.loginPopup(loginRequest)}
          style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 15, cursor: "pointer" }}
        >
          Sign in with Microsoft
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#1e293b", borderBottom: "1px solid #334155", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20 }}>🔧</span>
        <span style={{ fontWeight: 700, fontSize: 16 }}>ATS Network Monitor</span>
        <div style={{ flex: 1 }} />
        {lastRefresh && (
          <span style={{ color: "#475569", fontSize: 11 }}>↻ {lastRefresh.toLocaleTimeString()}</span>
        )}
        <button
          onClick={() => selectedClient && loadClientData(selectedClient)}
          style={{ background: "#334155", border: "none", color: "#94a3b8", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}
        >
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 52px)" }}>
        {/* Sidebar — client list */}
        <div style={{ width: 200, background: "#1e293b", borderRight: "1px solid #334155", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ padding: "10px 12px", color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
            Clients
          </div>
          {clients.map((c) => (
            <button
              key={c.ClientCode}
              onClick={() => { setSelected(c.ClientCode); setDevice(null); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "8px 12px", background: selectedClient === c.ClientCode ? "#334155" : "transparent",
                border: "none", color: selectedClient === c.ClientCode ? "#f1f5f9" : "#94a3b8",
                cursor: "pointer", fontSize: 13,
                borderLeft: selectedClient === c.ClientCode ? "3px solid #3b82f6" : "3px solid transparent",
              }}
            >
              {c.Title}
              <div style={{ fontSize: 10, color: "#475569" }}>{c.ClientCode}</div>
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {!selectedClient ? (
            <div style={{ color: "#475569", textAlign: "center", paddingTop: 80 }}>← Select a client</div>
          ) : loading ? (
            <div style={{ color: "#475569", textAlign: "center", paddingTop: 80 }}>Loading...</div>
          ) : (
            <>
              {/* Status bar */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { label: "Online",   value: online,      color: "#22c55e" },
                  { label: "Offline",  value: offline,     color: "#ef4444" },
                  { label: "Total",    value: devices.length, color: "#94a3b8" },
                  { label: "Open Alerts", value: unresolvedE, color: unresolvedE > 0 ? "#f59e0b" : "#22c55e" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "#1e293b", borderRadius: 8, padding: "8px 16px", border: "1px solid #334155" }}>
                    <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                    <div style={{ color: "#64748b", fontSize: 11 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                {["topology", "alerts"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      background: tab === t ? "#3b82f6" : "#1e293b",
                      border: "none", color: tab === t ? "#fff" : "#64748b",
                      borderRadius: 6, padding: "5px 14px", cursor: "pointer", fontSize: 13,
                    }}
                  >
                    {t === "topology" ? "🗺  Topology" : "🔔 Alerts"}
                  </button>
                ))}
              </div>

              {tab === "topology" && (
                <TopologyMap devices={devices} onSelectDevice={setDevice} />
              )}

              {tab === "alerts" && (
                <div style={{ background: "#1e293b", borderRadius: 10, padding: 12, border: "1px solid #334155" }}>
                  <AlertFeed events={events} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Device drawer */}
      {selectedDevice && (
        <DeviceDrawer
          device={selectedDevice}
          onClose={() => setDevice(null)}
          instance={instance}
          accounts={accounts}
        />
      )}
    </div>
  );
}
