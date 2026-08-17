/**
 * ATS Network Monitor PWA — v3
 * Auth: PIN-based admin + QR/URL client portal (no Microsoft login)
 * Data: Static JSON files published by agent to GitHub Pages
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { DATA_BASE_URL, ADMIN_PIN_HASH, CLIENT_DOCS, CLIENT_SYNC } from "./dataConfig";
import Splash from "./Splash";

// ─────────────────────────────────────────────────────────────
// Data fetch helpers (static JSON from GitHub Pages)
// ─────────────────────────────────────────────────────────────

async function fetchJSON(url) {
  const res = await fetch(url + "?t=" + Date.now()); // bust cache
  if (!res.ok) throw new Error(`Fetch error: ${res.status} ${url}`);
  return res.json();
}

async function fetchClients() {
  return fetchJSON(`${DATA_BASE_URL}/clients.json`);
}

async function fetchClientData(clientCode) {
  return fetchJSON(`${DATA_BASE_URL}/${clientCode}.json`);
}

// SHA-256 via Web Crypto API
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─────────────────────────────────────────────────────────────
// PIN Login Screen
// ─────────────────────────────────────────────────────────────

function PinLogin({ onSuccess, qrMode }) {
  const [pin, setPin]         = useState("");
  const [error, setError]     = useState("");
  const [shake, setShake]     = useState(false);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pin.trim()) return;
    setChecking(true);
    setError("");
    try {
      const hash = await sha256(pin.trim());
      if (hash === ADMIN_PIN_HASH) {
        onSuccess({ role: "admin" });
      } else {
        setError("Incorrect access code");
        setShake(true);
        setPin("");
        setTimeout(() => setShake(false), 600);
        setTimeout(() => setError(""), 3000);
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #060d1a 0%, #0f172a 50%, #0a1628 100%)",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Ambient glow orb */}
      <div style={{
        position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, #1d4ed822 0%, transparent 70%)",
        pointerEvents: "none",
      }}/>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            src="/ats-network-monitor/ats-logo.png"
            alt="ATS"
            style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover",
              boxShadow: "0 0 40px #3b82f644, 0 0 80px #3b82f622", border: "2px solid #1d4ed844" }}
            onError={e => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
          <div style={{
            display: "none", width: 80, height: 80, borderRadius: "50%",
            background: "#1d4ed8", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: "#fff",
            boxShadow: "0 0 40px #3b82f644",
          }}>ATS</div>
        </div>

        <div style={{ marginTop: 16, fontSize: 22, fontWeight: 700, color: "#f1f5f9",
          letterSpacing: 2, textTransform: "uppercase" }}>
          ATS Network Monitor
        </div>
        <div style={{ color: "#334155", fontSize: 11, letterSpacing: 3,
          textTransform: "uppercase", marginTop: 4 }}>
          All Technical Solutions
        </div>
      </div>

      {/* Access panel */}
      <div style={{
        background: "#0f172a", border: "1px solid #1e293b",
        borderRadius: 16, padding: "32px 40px", width: 320,
        boxShadow: "0 20px 60px #00000066, 0 0 0 1px #1d4ed811",
        animation: shake ? "shake 0.5s ease" : "none",
      }}>
        <div style={{ color: "#475569", fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: 2, marginBottom: 20,
          textAlign: "center" }}>
          Admin Access
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Access code"
            autoComplete="off"
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#1e293b", border: "1px solid #334155",
              borderRadius: 8, padding: "12px 14px",
              color: "#f1f5f9", fontSize: 16, outline: "none",
              letterSpacing: "0.2em",
              transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = "#3b82f6"}
            onBlur={e => e.target.style.borderColor = "#334155"}
          />

          {error && (
            <div style={{ color: "#ef4444", fontSize: 12, textAlign: "center",
              marginTop: 8, opacity: error ? 1 : 0, transition: "opacity 0.3s" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={checking || !pin}
            style={{
              width: "100%", marginTop: 16,
              background: "linear-gradient(135deg, #1d4ed8, #0ea5e9)",
              border: "none", borderRadius: 8, padding: "12px 0",
              color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: checking || !pin ? "default" : "pointer",
              opacity: checking || !pin ? 0.5 : 1,
              boxShadow: "0 0 20px #0ea5e933",
              transition: "opacity 0.15s",
              letterSpacing: 1, textTransform: "uppercase",
            }}
          >
            {checking ? "Verifying…" : "Access"}
          </button>
        </form>
      </div>

      <div style={{ marginTop: 32, color: "#1e293b", fontSize: 11,
        textAlign: "center", letterSpacing: 1 }}>
        Client portal access via QR code
        <br/>
        <a href="https://allteks.com" target="_blank" rel="noreferrer"
          style={{ color: "#1e293b", textDecoration: "none" }}>allteks.com</a>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SVG Device Icons
// ─────────────────────────────────────────────────────────────

const DeviceIcon = ({ type, size = 36, color = "#94a3b8" }) => {
  const s = size;
  const icons = {
    Router: (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="14" fill="none" stroke={color} strokeWidth="2.5"/>
        <circle cx="20" cy="20" r="4" fill={color}/>
        <line x1="20" y1="6" x2="20" y2="34" stroke={color} strokeWidth="1.5" strokeDasharray="3,2"/>
        <line x1="6" y1="20" x2="34" y2="20" stroke={color} strokeWidth="1.5" strokeDasharray="3,2"/>
        <path d="M9 9 L31 31 M31 9 L9 31" stroke={color} strokeWidth="1" opacity="0.4" strokeDasharray="2,3"/>
      </svg>
    ),
    Firewall: (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <path d="M20 4 L34 11 L34 22 C34 30 20 37 20 37 C20 37 6 30 6 22 L6 11 Z" fill="none" stroke={color} strokeWidth="2.5"/>
        <path d="M14 20 L18 24 L26 16" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    Switch: (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <rect x="4" y="13" width="32" height="14" rx="3" fill="none" stroke={color} strokeWidth="2.5"/>
        {[10,15,20,25,30].map(x => (
          <g key={x}>
            <rect x={x-2} y="19" width="4" height="5" rx="1" fill={color} opacity="0.7"/>
            <line x1={x} y1="13" x2={x} y2="8" stroke={color} strokeWidth="1.5"/>
          </g>
        ))}
      </svg>
    ),
    Server: (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <rect x="6" y="5" width="28" height="9" rx="2" fill="none" stroke={color} strokeWidth="2"/>
        <rect x="6" y="16" width="28" height="9" rx="2" fill="none" stroke={color} strokeWidth="2"/>
        <rect x="6" y="27" width="28" height="9" rx="2" fill="none" stroke={color} strokeWidth="2"/>
        <circle cx="29" cy="9.5" r="2" fill={color} opacity="0.8"/>
        <circle cx="29" cy="20.5" r="2" fill={color} opacity="0.8"/>
        <circle cx="29" cy="31.5" r="2" fill={color} opacity="0.8"/>
        <rect x="10" y="7.5" width="12" height="4" rx="1" fill={color} opacity="0.3"/>
      </svg>
    ),
    "NAS/TrueNAS": (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <rect x="8" y="4" width="24" height="32" rx="3" fill="none" stroke={color} strokeWidth="2.5"/>
        {[10,17,24,31].map(y => (
          <rect key={y} x="12" y={y} width="16" height="5" rx="1" fill="none" stroke={color} strokeWidth="1.5"/>
        ))}
        <circle cx="24" cy="12.5" r="1.5" fill={color} opacity="0.8"/>
        <circle cx="24" cy="19.5" r="1.5" fill={color} opacity="0.8"/>
      </svg>
    ),
    Workstation: (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <rect x="4" y="5" width="32" height="22" rx="3" fill="none" stroke={color} strokeWidth="2.5"/>
        <line x1="13" y1="27" x2="10" y2="35" stroke={color} strokeWidth="2"/>
        <line x1="27" y1="27" x2="30" y2="35" stroke={color} strokeWidth="2"/>
        <line x1="8" y1="35" x2="32" y2="35" stroke={color} strokeWidth="2"/>
        <rect x="8" y="9" width="24" height="14" rx="1" fill={color} opacity="0.15"/>
      </svg>
    ),
    Printer: (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <rect x="6" y="14" width="28" height="16" rx="3" fill="none" stroke={color} strokeWidth="2.5"/>
        <rect x="10" y="5" width="20" height="9" rx="1" fill="none" stroke={color} strokeWidth="2"/>
        <rect x="10" y="25" width="20" height="10" rx="1" fill="none" stroke={color} strokeWidth="2"/>
        <circle cx="29" cy="20" r="2.5" fill={color} opacity="0.8"/>
        <line x1="12" y1="28" x2="24" y2="28" stroke={color} strokeWidth="1.5"/>
        <line x1="12" y1="31" x2="20" y2="31" stroke={color} strokeWidth="1.5"/>
      </svg>
    ),
    WAP: (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <path d="M8 22 Q20 10 32 22" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M13 27 Q20 19 27 27" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="20" cy="32" r="3" fill={color}/>
        <line x1="20" y1="32" x2="20" y2="37" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    "Camera/NVR": (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <rect x="4" y="12" width="22" height="16" rx="3" fill="none" stroke={color} strokeWidth="2.5"/>
        <path d="M26 17 L36 12 L36 28 L26 23 Z" fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
        <circle cx="14" cy="20" r="4" fill="none" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    UPS: (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <rect x="8" y="6" width="24" height="32" rx="3" fill="none" stroke={color} strokeWidth="2.5"/>
        <rect x="14" y="3" width="12" height="5" rx="2" fill="none" stroke={color} strokeWidth="2"/>
        <path d="M22 16 L17 22 L20 22 L18 30 L23 24 L20 24 Z" fill={color} opacity="0.9"/>
      </svg>
    ),
    "RPi/Portal": (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <rect x="6" y="8" width="28" height="24" rx="2" fill="none" stroke={color} strokeWidth="2.5"/>
        <rect x="10" y="3" width="4" height="5" rx="1" fill={color} opacity="0.7"/>
        <rect x="26" y="3" width="4" height="5" rx="1" fill={color} opacity="0.7"/>
        <rect x="10" y="32" width="4" height="5" rx="1" fill={color} opacity="0.7"/>
        <rect x="26" y="32" width="4" height="5" rx="1" fill={color} opacity="0.7"/>
        <circle cx="20" cy="20" r="6" fill="none" stroke={color} strokeWidth="2"/>
        <circle cx="20" cy="20" r="2" fill={color}/>
      </svg>
    ),
    Other: (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <rect x="8" y="8" width="24" height="24" rx="4" fill="none" stroke={color} strokeWidth="2.5"/>
        <circle cx="20" cy="20" r="4" fill={color} opacity="0.6"/>
        <line x1="20" y1="8" x2="20" y2="13" stroke={color} strokeWidth="2"/>
        <line x1="20" y1="27" x2="20" y2="32" stroke={color} strokeWidth="2"/>
        <line x1="8" y1="20" x2="13" y2="20" stroke={color} strokeWidth="2"/>
        <line x1="27" y1="20" x2="32" y2="20" stroke={color} strokeWidth="2"/>
      </svg>
    ),
  };
  return icons[type] || icons.Other;
};

// ─────────────────────────────────────────────────────────────
// Status + Topology helpers (unchanged from v2)
// ─────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  Online:      "#22c55e",
  Offline:     "#ef4444",
  Degraded:    "#f59e0b",
  Unknown:     "#94a3b8",
  Maintenance: "#818cf8",
};

const TIER = {
  Router: 0, Firewall: 0,
  Switch: 1, WAP: 1,
  "NAS/TrueNAS": 2, Server: 2,
  Workstation: 3, Printer: 3, "Camera/NVR": 3, UPS: 3, "RPi/Portal": 3, Other: 3,
};

function guessDeviceType(d, gatewayIP) {
  if (d.DeviceType && d.DeviceType !== "Other") return d.DeviceType;
  const name = (d.Title || "").toLowerCase();
  const ip   = d.IPAddress || "";
  if (ip === gatewayIP)                          return "Router";
  if (/rtr|router|gw|gateway/.test(name))        return "Router";
  if (/fw|firewall|pfsense|opnsense/.test(name)) return "Firewall";
  if (/sw|switch|swt/.test(name))                return "Switch";
  if (/ap|wap|wifi|wireless/.test(name))         return "WAP";
  if (/nas|truenas|storage/.test(name))          return "NAS/TrueNAS";
  if (/srv|server|dc|rdp/.test(name))            return "Server";
  if (/pi|rpi|portal/.test(name))                return "RPi/Portal";
  if (/prn|print|hpe|hp.*t/.test(name))         return "Printer";
  if (/cam|nvr|ipcam/.test(name))                return "Camera/NVR";
  if (/ups|apc/.test(name))                      return "UPS";
  return "Other";
}

const NODE_W = 82, NODE_H = 88;
const TIER_LABELS = ["Gateway / Firewall", "Core (Switches / WAPs)", "Infrastructure (Servers / NAS)", "Endpoints"];
const TIER_COLORS = ["#3b82f6", "#8b5cf6", "#0ea5e9", "#475569"];

function buildTopologyLayout(devices, gatewayIP) {
  const tiers = [[], [], [], []];
  devices.forEach(d => {
    const type = guessDeviceType(d, gatewayIP);
    const t = TIER[type] ?? 3;
    tiers[t].push({ ...d, _resolvedType: type, tier: t });
  });
  if (!tiers[0].length && tiers[3].length) {
    const gw = tiers[3].find(d => d.IPAddress === gatewayIP) || tiers[3][0];
    if (gw) { tiers[3] = tiers[3].filter(d => d !== gw); tiers[0].push({ ...gw, _resolvedType: "Router", tier: 0 }); }
  }
  const CANVAS_W = 740;
  const positioned = {};
  tiers.forEach((tier, ti) => {
    if (!tier.length) return;
    const y = 24 + ti * 130;
    const slotW = NODE_W + 24;
    const totalW = tier.length * slotW;
    const startX = Math.max(16, (CANVAS_W - totalW) / 2);
    tier.forEach((d, i) => {
      const key = d.IPAddress || d.Title;
      positioned[key] = { ...d, x: startX + i * slotW, y, tier: ti };
    });
  });
  return Object.values(positioned);
}

function getConnections(positioned, gatewayIP) {
  const lines = [];
  const byKey = {};
  positioned.forEach(d => { byKey[d.IPAddress || d.Title] = d; });
  const tier0 = positioned.filter(d => d.tier === 0);
  const tier1 = positioned.filter(d => d.tier === 1);
  const gateway = tier0.find(d => d.IPAddress === gatewayIP) || tier0[0];
  positioned.forEach(d => {
    if (d.ParentDevice && byKey[d.ParentDevice]) { lines.push({ from: byKey[d.ParentDevice], to: d }); return; }
    if (d.tier === 0) return;
    if (d.tier === 1 && gateway) lines.push({ from: gateway, to: d });
    else if (d.tier >= 2) { const parent = tier1[0] || gateway; if (parent) lines.push({ from: parent, to: d }); }
  });
  return lines;
}

// ─────────────────────────────────────────────────────────────
// Hover Tooltip
// ─────────────────────────────────────────────────────────────

function HoverTooltip({ device, x, y }) {
  if (!device) return null;
  const statusColor = STATUS_COLOR[device.Status] || STATUS_COLOR.Unknown;
  return (
    <div style={{
      position: "fixed", left: x + 12, top: y - 10, zIndex: 200,
      background: "#0f172a", border: `1px solid ${statusColor}66`,
      borderRadius: 8, padding: "8px 12px", pointerEvents: "none",
      boxShadow: `0 4px 20px #00000088, 0 0 12px ${statusColor}22`,
      minWidth: 180, maxWidth: 240,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, display: "inline-block", flexShrink: 0 }}/>
        <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 12 }}>{device.Title}</span>
      </div>
      {[
        ["IP",       device.IPAddress],
        ["Type",     device._resolvedType || device.DeviceType],
        ["Ping",     device.ResponseMsAvg ? `${device.ResponseMsAvg} ms` : null],
        ["Uptime",   device.UptimePct7d ? `${device.UptimePct7d}%` : null],
        ["Firmware", device.FirmwareVer],
        ["Last seen",device.LastSeen ? new Date(device.LastSeen).toLocaleTimeString() : null],
      ].filter(([,v]) => v).map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "1px 0" }}>
          <span style={{ color: "#475569" }}>{k}</span>
          <span style={{ color: "#94a3b8", marginLeft: 8 }}>{v}</span>
        </div>
      ))}
      <div style={{ marginTop: 6, fontSize: 10, color: "#334155" }}>Click for details</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Topology Map
// ─────────────────────────────────────────────────────────────

function TopologyMap({ devices, gatewayIP, onSelectDevice }) {
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!devices.length) return (
    <div style={{ color: "#475569", textAlign: "center", paddingTop: 80, fontSize: 13 }}>
      No devices yet — run the agent with --discover to populate.
    </div>
  );

  const positioned = buildTopologyLayout(devices, gatewayIP);
  const connections = getConnections(positioned, gatewayIP);
  const maxY = (positioned.length ? Math.max(...positioned.map(d => d.y)) : 0) + NODE_H + 40;
  const activeTiers = [...new Set(positioned.map(d => d.tier))].sort();

  return (
    <div
      style={{ width: "100%", overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 220px)", position: "relative" }}
      onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
    >
      <div style={{ position: "relative", minWidth: 760, height: maxY }}>
        {activeTiers.map(ti => {
          const tierDevices = positioned.filter(d => d.tier === ti);
          if (!tierDevices.length) return null;
          const minY = Math.min(...tierDevices.map(d => d.y)) - 14;
          const maxTY = Math.max(...tierDevices.map(d => d.y)) + NODE_H + 10;
          return (
            <div key={ti} style={{
              position: "absolute", left: 0, right: 0,
              top: minY, height: maxTY - minY,
              background: `${TIER_COLORS[ti]}06`,
              borderTop: `1px solid ${TIER_COLORS[ti]}22`,
              borderBottom: `1px solid ${TIER_COLORS[ti]}11`,
            }}>
              <span style={{ position: "absolute", left: 8, top: 4, fontSize: 9,
                color: `${TIER_COLORS[ti]}66`, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 1 }}>
                {TIER_LABELS[ti]}
              </span>
            </div>
          );
        })}

        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: maxY, pointerEvents: "none" }}>
          {connections.map((c, i) => {
            const x1 = c.from.x + NODE_W / 2, y1 = c.from.y + NODE_H - 4;
            const x2 = c.to.x + NODE_W / 2,   y2 = c.to.y + 4;
            const mid = (y1 + y2) / 2;
            const isOffline = c.to.Status === "Offline";
            const isCore = c.from.tier === 0 && c.to.tier <= 1;
            return (
              <g key={i}>
                {isCore && !isOffline && (
                  <path d={`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`}
                    fill="none" stroke="#3b82f633" strokeWidth={6} />
                )}
                <path d={`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`}
                  fill="none"
                  stroke={isOffline ? "#ef444455" : isCore ? "#3b82f688" : "#33415577"}
                  strokeWidth={isCore ? 2 : 1.5}
                  strokeDasharray={isOffline ? "5,4" : "none"} />
              </g>
            );
          })}
        </svg>

        {positioned.map((d) => {
          const statusColor = STATUS_COLOR[d.Status] || STATUS_COLOR.Unknown;
          const isGW = d.IPAddress === gatewayIP;
          const isHovered = hovered === (d.IPAddress || d.Title);
          const resolvedType = d._resolvedType || d.DeviceType || "Other";
          return (
            <button key={d.IPAddress || d.Title}
              onClick={() => onSelectDevice(d)}
              onMouseEnter={() => setHovered(d.IPAddress || d.Title)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: "absolute", left: d.x, top: d.y,
                width: NODE_W, height: NODE_H,
                background: isHovered ? "#273548" : "#1e293b",
                border: `2px solid ${isGW ? "#3b82f6" : isHovered ? statusColor : statusColor + "66"}`,
                borderRadius: 10, cursor: "pointer",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 3, padding: "6px 4px 4px",
                boxShadow: isHovered ? `0 0 16px ${statusColor}55`
                  : d.Status === "Offline" ? `0 0 8px ${STATUS_COLOR.Offline}33`
                  : isGW ? "0 0 14px #3b82f633" : "none",
                transform: isHovered ? "translateY(-2px)" : "none",
                transition: "all 0.15s ease", zIndex: isHovered ? 10 : 1,
              }}
            >
              <DeviceIcon type={resolvedType} size={32}
                color={d.Status === "Offline" ? "#ef4444" : isHovered ? "#c0d8f0" : "#7a9bb8"} />
              <span style={{ fontSize: 9, color: isHovered ? "#cbd5e1" : "#64748b",
                textAlign: "center", maxWidth: 74, lineHeight: 1.3,
                wordBreak: "break-all", transition: "color 0.15s" }}>
                {d.Title && d.Title !== d.IPAddress ? d.Title : resolvedType}
              </span>
              <span style={{ fontSize: 8, color: "#475569" }}>{d.IPAddress}</span>
              <span style={{ display: "inline-block", width: 7, height: 7,
                borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
            </button>
          );
        })}
      </div>

      {hovered && (
        <HoverTooltip
          device={positioned.find(d => (d.IPAddress || d.Title) === hovered)}
          x={mousePos.x} y={mousePos.y}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Device Drawer (no file browser — no SharePoint auth needed)
// ─────────────────────────────────────────────────────────────

function DeviceDrawer({ device, onClose }) {
  if (!device) return null;
  const statusColor = STATUS_COLOR[device.Status] || STATUS_COLOR.Unknown;

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, width: 300,
      background: "#0f172a", borderLeft: "1px solid #1e293b",
      overflowY: "auto", zIndex: 100, padding: 16,
      boxShadow: "-8px 0 30px #00000077",
    }}>
      <button onClick={onClose} style={{
        float: "right", background: "none", border: "none",
        color: "#475569", fontSize: 20, cursor: "pointer", padding: 0,
      }}>✕</button>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <DeviceIcon type={device._resolvedType || device.DeviceType || "Other"} size={44} color={statusColor} />
        <div>
          <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 15 }}>{device.Title}</div>
          <div style={{ color: "#475569", fontSize: 11 }}>{device._resolvedType || device.DeviceType}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, display: "inline-block" }}/>
            <span style={{ color: statusColor, fontSize: 12 }}>{device.Status}</span>
          </div>
        </div>
      </div>

      {[
        ["IP Address",   device.IPAddress],
        ["MAC",          device.MACAddress],
        ["Manufacturer", device.Manufacturer],
        ["Model",        device.Model],
        ["Firmware",     device.FirmwareVer],
        ["Serial",       device.SerialNumber],
        ["Ping avg",     device.ResponseMsAvg ? `${device.ResponseMsAvg} ms` : null],
        ["Uptime 7d",    device.UptimePct7d ? `${device.UptimePct7d}%` : null],
        ["Last seen",    device.LastSeen ? new Date(device.LastSeen).toLocaleString() : null],
        ["Last backup",  device.LastBackup ? new Date(device.LastBackup).toLocaleString() : null],
        ["SSH user",     device.SSHUser],
      ].filter(([,v]) => v).map(([label, value]) => (
        <div key={label} style={{
          display: "flex", justifyContent: "space-between",
          padding: "5px 0", borderBottom: "1px solid #1e293b", fontSize: 12,
        }}>
          <span style={{ color: "#475569" }}>{label}</span>
          <span style={{ color: "#cbd5e1", textAlign: "right", maxWidth: 170 }}>{value}</span>
        </div>
      ))}

      {device.Notes && (
        <div style={{ margin: "12px 0", padding: 8, background: "#1e293b", borderRadius: 6,
          fontSize: 11, color: "#64748b", whiteSpace: "pre-wrap" }}>
          {device.Notes}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Alert Feed
// ─────────────────────────────────────────────────────────────

function AlertFeed({ events }) {
  return (
    <div style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
      {events.length === 0 && <div style={{ color: "#334155", fontSize: 12, padding: 8 }}>No recent events.</div>}
      {events.slice(0, 100).map((e, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10,
          padding: "8px 0", borderBottom: "1px solid #1e293b", fontSize: 12 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>
            {e.EventType === "StatusChange" && e.NewStatus === "Offline" ? "🔴" :
             e.EventType === "StatusChange" && e.NewStatus === "Online"  ? "🟢" :
             e.EventType === "BackupSuccess" ? "✅" :
             e.EventType === "BackupFailed"  ? "❌" :
             e.EventType === "NewDevice"     ? "🆕" : "ℹ️"}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.Title}</div>
            {e.Details && <div style={{ color: "#475569", fontSize: 10, marginTop: 2 }}>{e.Details.slice(0, 80)}</div>}
          </div>
          <span style={{ color: "#334155", whiteSpace: "nowrap", fontSize: 10, flexShrink: 0 }}>
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
  const [splashDone, setSplashDone]     = useState(false);
  const [authed, setAuthed]             = useState(false);   // admin PIN passed
  const [qrMode, setQrMode]             = useState(false);   // client URL portal
  const [urlParams, setUrlParams]       = useState(null);

  const [clients, setClients]           = useState([]);
  const [selectedClient, setSelected]   = useState(null);
  const [clientData, setClientData]     = useState(null);
  const [devices, setDevices]           = useState([]);
  const [events, setEvents]             = useState([]);
  const [selectedDevice, setDevice]     = useState(null);
  const [loading, setLoading]           = useState(false);
  const [fetchError, setFetchError]     = useState(null);
  const [lastRefresh, setLastRefresh]   = useState(null);
  const [tab, setTab]                   = useState("topology");

  // ── Parse QR URL params on mount (?c=CLIENTCODE&k=PORTALKEY) ────────────
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get("c"), k = p.get("k");
    if (c) {
      setQrMode(true);
      setUrlParams({ code: c.toUpperCase(), key: k || "" });
    }
  }, []);

  // ── QR mode: load client data directly (no PIN needed) ──────────────────
  useEffect(() => {
    if (!qrMode || !urlParams || !splashDone) return;
    loadClientDataByCode(urlParams.code, urlParams.key);
  }, [qrMode, urlParams, splashDone]);

  // ── Admin mode: load clients list after PIN auth ─────────────────────────
  useEffect(() => {
    if (!authed || qrMode) return;
    fetchClients()
      .then(data => setClients(Array.isArray(data) ? data : []))
      .catch(e => console.warn("clients.json fetch failed:", e));
  }, [authed]);

  // ── Load data for selected client (admin sidebar click) ─────────────────
  useEffect(() => {
    if (selectedClient && authed) loadClientDataByCode(selectedClient, null);
  }, [selectedClient]);

  // ── Auto-refresh every 60 s ──────────────────────────────────────────────
  useEffect(() => {
    if (!selectedClient && !qrMode) return;
    const t = setInterval(() => {
      const code = qrMode ? urlParams?.code : selectedClient;
      const key  = qrMode ? urlParams?.key  : null;
      if (code) loadClientDataByCode(code, key);
    }, 60000);
    return () => clearInterval(t);
  }, [selectedClient, qrMode, urlParams]);

  async function loadClientDataByCode(code, portalKey) {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await fetchClientData(code);
      // Validate portal key for QR mode
      if (qrMode && portalKey && data.client?.PortalKey && data.client.PortalKey !== portalKey) {
        setFetchError("Invalid portal key.");
        return;
      }
      setClientData(data.client || null);
      setDevices(Array.isArray(data.devices) ? data.devices : []);
      setEvents(Array.isArray(data.events)
        ? [...data.events].sort((a, b) => new Date(b.EventTime) - new Date(a.EventTime))
        : []);
      if (!qrMode) setSelected(code);
      setLastRefresh(new Date());
    } catch (e) {
      setFetchError("Could not load data. Agent may not have published yet.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const online  = devices.filter(d => d.Status === "Online").length;
  const offline = devices.filter(d => d.Status === "Offline").length;
  const alerts  = events.filter(e => !e.IsResolved).length;
  const gatewayIP = clientData?.GatewayIP || "";

  // ── Splash ───────────────────────────────────────────────────────────────
  if (!splashDone) return <Splash onDone={() => setSplashDone(true)} />;

  // ── QR mode: skip PIN if URL is valid, show spinner while loading ────────
  if (qrMode && !clientData && !fetchError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0f172a", fontFamily: "system-ui,sans-serif" }}>
        {loading
          ? <div style={{ color: "#334155", fontSize: 13 }}>Loading portal…</div>
          : fetchError
          ? <div style={{ color: "#ef4444", fontSize: 13 }}>{fetchError}</div>
          : null}
      </div>
    );
  }

  // ── Admin: show PIN login if not yet authed ──────────────────────────────
  if (!qrMode && !authed) {
    return <PinLogin onSuccess={() => setAuthed(true)} qrMode={false} />;
  }

  // ── Main dashboard ───────────────────────────────────────────────────────
  const showSidebar = !qrMode && authed;
  const clientName  = clientData?.Title || (qrMode ? urlParams?.code : selectedClient) || "";

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9",
      fontFamily: "system-ui,sans-serif", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b",
        padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <img src="/ats-network-monitor/ats-logo.png" alt="ATS"
          style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
          onError={e => e.target.style.display="none"}/>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>ATS Network Monitor</span>
        {clientData?.LogoUrl && (
          <>
            <div style={{ width: 1, height: 20, background: "#1e293b", margin: "0 4px" }}/>
            <img src={clientData.LogoUrl} alt="Client"
              style={{ height: 28, objectFit: "contain", borderRadius: 4 }}
              onError={e => e.target.style.display="none"}/>
          </>
        )}
        <div style={{ flex: 1 }}/>
        {lastRefresh && (
          <span style={{ color: "#334155", fontSize: 11 }}>
            ↻ {lastRefresh.toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={() => {
            const code = qrMode ? urlParams?.code : selectedClient;
            const key  = qrMode ? urlParams?.key  : null;
            if (code) loadClientDataByCode(code, key);
          }}
          style={{ background: "#1e293b", border: "none", color: "#64748b",
            borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12 }}>
          Refresh
        </button>
        {!qrMode && authed && (
          <button
            onClick={() => { setAuthed(false); setClients([]); setSelected(null); setClientData(null); }}
            style={{ background: "none", border: "1px solid #1e293b", color: "#475569",
              borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>
            Lock
          </button>
        )}
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar — admin only */}
        {showSidebar && (
          <div style={{ width: 190, background: "#0a0f1a", borderRight: "1px solid #1e293b",
            overflowY: "auto", flexShrink: 0 }}>
            <div style={{ padding: "10px 12px 4px", color: "#334155", fontSize: 10,
              fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>Clients</div>
            {clients.length === 0 && (
              <div                 style={{ padding: "8px 12px", color: "#1e293b", fontSize: 12 }}>
                No clients yet
              </div>
            )}
            {clients.map(c => (
              <button key={c.ClientCode}
                onClick={() => { setSelected(c.ClientCode); setDevice(null); loadClientDataByCode(c.ClientCode, null); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "9px 12px", cursor: "pointer", fontSize: 13, lineHeight: 1.4,
                  background: selectedClient === c.ClientCode ? "#1e293b" : "transparent",
                  border: "none",
                  borderLeft: selectedClient === c.ClientCode ? "3px solid #3b82f6" : "3px solid transparent",
                  color: selectedClient === c.ClientCode ? "#f1f5f9" : "#64748b",
                }}>
                {c.Title || c.ClientCode}
                <div style={{ fontSize: 10, color: "#334155" }}>{c.ClientCode}</div>
              </button>
            ))}

            {/* Admin tools section */}
            <div style={{ padding: "16px 12px 4px", color: "#334155", fontSize: 10,
              fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 8,
              borderTop: "1px solid #1e293b" }}>Admin Tools</div>
            <a href="https://sdausa.sharepoint.com/sites/ATSNetMonitor/Lists/VPN_Users"
              target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px", fontSize: 12, color: "#94a3b8",
                textDecoration: "none", borderLeft: "3px solid transparent" }}
              onMouseOver={e => e.currentTarget.style.color="#f1f5f9"}
              onMouseOut={e => e.currentTarget.style.color="#94a3b8"}>
              🔒 VPN Users
            </a>
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {fetchError && (
            <div style={{ background: "#1e293b", border: "1px solid #ef444433",
              borderRadius: 8, padding: "10px 14px", marginBottom: 14,
              color: "#ef4444", fontSize: 12 }}>
              {fetchError}
            </div>
          )}

          {!clientData && !loading && !fetchError ? (
            <div style={{ color: "#1e293b", textAlign: "center", paddingTop: 100, fontSize: 13 }}>
              {qrMode ? "Loading portal…" : "← Select a client"}
            </div>
          ) : loading && !clientData ? (
            <div style={{ color: "#334155", textAlign: "center", paddingTop: 100 }}>Loading...</div>
          ) : clientData ? (
            <>
              {clientData.QuickLinksJson && (() => {
                try {
                  const links = JSON.parse(clientData.QuickLinksJson);
                  if (!links.length) return null;
                  return (
                    <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                      {links.map((l, i) => (
                        <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{
                          display: "flex", alignItems: "center", gap: 6,
                          background: "#1e293b", border: "1px solid #334155",
                          borderRadius: 8, padding: "7px 14px",
                          color: "#60a5fa", textDecoration: "none",
                          fontSize: 13, fontWeight: 600, transition: "border-color 0.15s",
                        }}
                          onMouseEnter={e => e.currentTarget.style.borderColor="#3b82f6"}
                          onMouseLeave={e => e.currentTarget.style.borderColor="#334155"}
                        >
                          <span style={{ fontSize: 16 }}>{l.icon || "🔗"}</span>
                          {l.name}
                        </a>
                      ))}
                    </div>
                  );
                } catch { return null; }
              })()}

              {/* Remote Agent download — from SP mesh-agent column */}
              {(clientData?.["mesh-agent"] || clientData?.["mesh_x002d_agent"]) && (() => {
                const raw = clientData["mesh-agent"] || clientData["mesh_x002d_agent"];
                const url = (raw && typeof raw === "object") ? (raw.Url || raw.url || "") : (raw || "");
                if (!url) return null;
                return (
                  <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ color: "#334155", fontSize: 10, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: 1.5, marginRight: 2 }}>Remote</span>
                    <a href={url} target="_blank" rel="noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: "#1e293b", border: "1px solid #334155",
                        borderRadius: 8, padding: "7px 14px",
                        color: "#94a3b8", textDecoration: "none",
                        fontSize: 13, fontWeight: 600, transition: "border-color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor="#22c55e"}
                      onMouseLeave={e => e.currentTarget.style.borderColor="#334155"}
                    >
                      <span style={{ fontSize: 16 }}>🖥️</span>
                      Remote Agent
                    </a>
                  </div>
                );
              })()}

              {/* LaserSync — server-side Syncthing UI (ATS portal standard).
                  Data-driven: shows when the client has a SharePoint SyncUrl
                  field, or a CLIENT_SYNC code-config fallback. */}
              {(() => {
                const sp = clientData?.SyncUrl || clientData?.["Sync_x0020_Url"] || clientData?.syncUrl;
                const spUrl = (sp && typeof sp === "object") ? (sp.Url || sp.url || "") : (sp || "");
                const fallback = CLIENT_SYNC[clientData?.ClientCode];
                const url  = spUrl || fallback?.url || "";
                const name = clientData?.SyncLabel || fallback?.name || "LaserSync";
                if (!url) return null;
                return (
                  <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ color: "#334155", fontSize: 10, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: 1.5, marginRight: 2 }}>Sync</span>
                    <a href={url} target="_blank" rel="noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: "#1e293b", border: "1px solid #334155",
                        borderRadius: 8, padding: "7px 14px",
                        color: "#94a3b8", textDecoration: "none",
                        fontSize: 13, fontWeight: 600, transition: "border-color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor="#22c55e"}
                      onMouseLeave={e => e.currentTarget.style.borderColor="#334155"}
                    >
                      <span style={{ fontSize: 16 }}>🔄</span>
                      {name}
                    </a>
                  </div>
                );
              })()}

              {/* Docs section — from CLIENT_DOCS config (per-client static files) */}
              {(CLIENT_DOCS[clientData?.ClientCode] || []).length > 0 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ color: "#334155", fontSize: 10, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: 1.5, marginRight: 2 }}>Docs</span>
                  {CLIENT_DOCS[clientData.ClientCode].map((doc, i) => (
                    <a key={i}
                      href={import.meta.env.BASE_URL + doc.file}
                      target="_blank" rel="noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: "#1e293b", border: "1px solid #334155",
                        borderRadius: 8, padding: "7px 14px",
                        color: "#94a3b8", textDecoration: "none",
                        fontSize: 13, fontWeight: 600, transition: "border-color 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor="#3b82f6"}
                      onMouseLeave={e => e.currentTarget.style.borderColor="#334155"}
                    >
                      <span style={{ fontSize: 16 }}>{doc.icon}</span>
                      {doc.name}
                    </a>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { label: "Online",  value: online,  color: "#22c55e" },
                  { label: "Offline", value: offline, color: offline > 0 ? "#ef4444" : "#334155" },
                  { label: "Total",   value: devices.length, color: "#475569" },
                  { label: "Alerts",  value: alerts,  color: alerts > 0 ? "#f59e0b" : "#334155" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#1e293b", borderRadius: 8,
                    padding: "8px 18px", border: "1px solid #334155" }}>
                    <div style={{ color: s.color, fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ color: "#475569", fontSize: 10, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
                {clientData.updated && (
                  <div style={{ background: "#1e293b", borderRadius: 8,
                    padding: "8px 18px", border: "1px solid #334155" }}>
                    <div style={{ color: "#334155", fontSize: 10, marginBottom: 2 }}>Last scan</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>
                      {new Date(clientData.updated).toLocaleTimeString()}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                             {[["topology","🗺  Topology"], ["alerts","🔔 Alerts"]].map(([t, label]) => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    background: tab === t ? "#3b82f6" : "#1e293b",
                    border: "none", color: tab === t ? "#fff" : "#475569",
                    borderRadius: 6, padding: "5px 16px", cursor: "pointer", fontSize: 13,
                  }}>{label}</button>
                ))}
              </div>

              <div style={{ background: "#1e293b", borderRadius: 10, padding: 12, border: "1px solid #334155" }}>
                {tab === "topology"
                  ? <TopologyMap devices={devices} gatewayIP={gatewayIP} onSelectDevice={setDevice} />
                  : <AlertFeed events={events} />
                }
              </div>
            </>
          ) : null}
        </div>
      </div>

      {selectedDevice && (
        <DeviceDrawer device={selectedDevice} onClose={() => setDevice(null)} />
      )}

      {qrMode && (
        <div style={{ background: "#0a0f1a", borderTop: "1px solid #1e293b",
          padding: "6px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#1e293b", fontSize: 10, letterSpacing: 1 }}>Powered by ATS</span>
          <a href="https://allteks.com" target="_blank" rel="noreferrer"
            style={{ color: "#1e293b", fontSize: 10, textDecoration: "none" }}>allteks.com</a>
        </div>
      )}
    </div>
  );
}

