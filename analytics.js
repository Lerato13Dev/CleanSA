/* =========================================================================
   CleanSA — Phase 2: Advanced Analytics
   -------------------------------------------------------------------------
   CleanScore + environmental hotspots + dashboard trends + impact tracking,
   plus an inert (clearly non-functional) accounts/roles stub for Phase 3.

   Reads report data through the same read-only bridge as reports.js
   (`window.CleanSAData`). Adds its own layer group to the *existing*
   Leaflet map instance rather than creating a second map.

   Sections:
     1. CleanScore model (documented, transparent)
     2. Hotspot detection
     3. Dashboard rendering (KPIs, charts, hotspot table, impact)
     4. Map hotspot layer (toggleable)
     5. Accounts/roles stub (Phase 3 — inert)
     6. Wiring / init
   ========================================================================= */

(function () {
  "use strict";

  function data() { return window.CleanSAData; }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }

  let dashCharts = [];
  let hotspotLayer = null;
  let hotspotsVisible = false;

  /* =======================================================================
     1. CLEANSCORE MODEL
     A transparent, explainable 0–100 score per location.
       CleanScore = 0.35 × Severity + 0.25 × Persistence + 0.25 × Volume + 0.15 × Age
     Every subscore is normalised 0–100 with a documented cap. Verification
     is deliberately excluded from the score — it affects how much you should
     trust the data, not how much environmental pressure it represents.
  ========================================================================= */

  const SEVERITY_WEIGHT = { Low: 1, Medium: 2, High: 3, Critical: 4 };
  const WEIGHTS = { severity: 0.35, persistence: 0.25, volume: 0.25, age: 0.15 };
  const VOLUME_CAP = 6;   // 6+ reports at one location = max volume score
  const AGE_CAP_DAYS = 45; // 45+ days outstanding (avg) = max age score

  function daysSince(iso) { return (Date.now() - new Date(iso).getTime()) / 86400000; }

  function computeLocationMetrics(rows) {
    const byCity = {};
    rows.forEach((r) => {
      const key = r.city + "||" + r.province;
      if (!byCity[key]) byCity[key] = { city: r.city, province: r.province, reports: [] };
      byCity[key].reports.push(r);
    });

    return Object.values(byCity).map((loc) => {
      const reports = loc.reports;
      const count = reports.length;
      const unresolved = reports.filter((r) => r.status !== "Resolved");
      const resolvedCount = count - unresolved.length;
      const verifiedCount = reports.filter((r) => r.verified).length;

      const avgSeverityWeight = reports.reduce((s, r) => s + (SEVERITY_WEIGHT[r.severity] || 1), 0) / count;
      const severityScore = clamp(((avgSeverityWeight - 1) / 3) * 100);

      const persistenceScore = clamp((unresolved.length / count) * 100);

      const volumeScore = clamp((count / VOLUME_CAP) * 100);

      const avgAgeUnresolvedDays = unresolved.length
        ? unresolved.reduce((s, r) => s + daysSince(r.timestamp), 0) / unresolved.length
        : 0;
      const ageScore = clamp((avgAgeUnresolvedDays / AGE_CAP_DAYS) * 100);

      const weighted = {
        severity: severityScore * WEIGHTS.severity,
        persistence: persistenceScore * WEIGHTS.persistence,
        volume: volumeScore * WEIGHTS.volume,
        age: ageScore * WEIGHTS.age
      };
      const cleanScore = Math.round(weighted.severity + weighted.persistence + weighted.volume + weighted.age);

      const avgLat = reports.reduce((s, r) => s + r.latitude, 0) / count;
      const avgLng = reports.reduce((s, r) => s + r.longitude, 0) / count;

      const byWaste = {};
      reports.forEach((r) => { byWaste[r.wasteType] = (byWaste[r.wasteType] || 0) + 1; });
      const topWasteType = Object.entries(byWaste).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

      const lastReported = reports.reduce((latest, r) => (new Date(r.timestamp) > new Date(latest) ? r.timestamp : latest), reports[0].timestamp);

      return {
        city: loc.city, province: loc.province, count, reports,
        resolvedCount, unresolvedCount: unresolved.length, verifiedCount,
        resolvedRate: Math.round((resolvedCount / count) * 100),
        topWasteType, lastReported, avgLat, avgLng,
        subscores: { severityScore: Math.round(severityScore), persistenceScore: Math.round(persistenceScore), volumeScore: Math.round(volumeScore), ageScore: Math.round(ageScore) },
        weighted, cleanScore, riskLevel: riskLevelFor(cleanScore),
        trend: computeTrend(reports)
      };
    });
  }

  function clamp(n) { return Math.max(0, Math.min(100, n)); }

  function riskLevelFor(score) {
    if (score >= 75) return "Critical";
    if (score >= 50) return "High";
    if (score >= 25) return "Moderate";
    return "Low";
  }

  function explainScore(loc) {
    const contributions = [
      { label: "severity", value: loc.weighted.severity, text: `average severity is elevated at this location` },
      { label: "persistence", value: loc.weighted.persistence, text: `${loc.subscores.persistenceScore}% of reports here remain unresolved` },
      { label: "volume", value: loc.weighted.volume, text: `${loc.count} report${loc.count === 1 ? "" : "s"} recorded here` },
      { label: "age", value: loc.weighted.age, text: `unresolved reports have been outstanding for a while` }
    ].sort((a, b) => b.value - a.value);
    return `Driven mainly by ${contributions[0].label} — ${contributions[0].text}.`;
  }

  // Simple, honest rule-based trend: compares the last 14 days to the
  // 14 days before that. Not a prediction — just a same-location comparison.
  function computeTrend(reports) {
    const oldestAgeDays = Math.max(...reports.map((r) => daysSince(r.timestamp)));
    if (oldestAgeDays < 14) return "Insufficient history";
    const last14 = reports.filter((r) => daysSince(r.timestamp) <= 14).length;
    const prev14 = reports.filter((r) => daysSince(r.timestamp) > 14 && daysSince(r.timestamp) <= 28).length;
    if (last14 > prev14) return "Increasing";
    if (last14 < prev14) return "Decreasing";
    return "Stable";
  }

  /* =======================================================================
     2. HOTSPOT DETECTION
  ========================================================================= */

  function getHotspots(rows, minCount) {
    return computeLocationMetrics(rows)
      .filter((loc) => loc.count >= (minCount || 2))
      .sort((a, b) => b.cleanScore - a.cleanScore);
  }

  /* =======================================================================
     3. DASHBOARD RENDERING
  ========================================================================= */

  function destroyDashCharts() { dashCharts.forEach((c) => c.destroy()); dashCharts = []; }

  function renderDashboard() {
    const rows = data().getAllReports();
    destroyDashCharts();

    // Each section is independent — if one throws (e.g. a future data edge
    // case), it's logged and skipped rather than silently taking every
    // other section down with it.
    const sections = [
      ["KPIs", () => renderKpis(rows)],
      ["trend charts", () => renderTrendCharts(rows)],
      ["hotspot table", () => renderHotspotTable(rows)],
      ["impact", () => renderImpact(rows)]
    ];
    sections.forEach(([name, fn]) => {
      try { fn(); } catch (err) { console.error(`[CleanSA dashboard] ${name} failed to render:`, err); }
    });
  }

  function renderKpis(rows) {
    const total = rows.length;
    const verified = rows.filter((r) => r.verified).length;
    const resolved = rows.filter((r) => r.status === "Resolved").length;
    const outstanding = total - resolved;
    const highSeverity = rows.filter((r) => r.severity === "High" || r.severity === "Critical").length;
    const hotspots = getHotspots(rows, 2);
    const avgScore = hotspots.length ? Math.round(hotspots.reduce((s, h) => s + h.cleanScore, 0) / hotspots.length) : 0;

    const kpis = [
      { label: "Total reports", value: total },
      { label: "Verified", value: verified },
      { label: "Resolved", value: resolved },
      { label: "Outstanding", value: outstanding },
      { label: "High / Critical", value: highSeverity },
      { label: "Active hotspots", value: hotspots.length },
      { label: "Avg. hotspot score", value: hotspots.length ? avgScore : "—" }
    ];
    $("#dashboardKpis").innerHTML = kpis.map((k) => `
      <div class="kpi-card"><strong>${k.value}</strong><span>${k.label}</span></div>
    `).join("");
  }

  function renderTrendCharts(rows) {
    if (!window.Chart) return;
    const byMonth = {};
    rows.forEach((r) => {
      const d = new Date(r.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    const monthKeys = Object.keys(byMonth).sort();

    const byProvince = {};
    rows.forEach((r) => { byProvince[r.province] = (byProvince[r.province] || 0) + 1; });

    dashCharts.push(new Chart($("#dashTrendChart"), {
      type: "line",
      data: { labels: monthKeys, datasets: [{ label: "Reports", data: monthKeys.map((k) => byMonth[k]), borderColor: "#1F6B45", backgroundColor: "rgba(31,107,69,0.12)", fill: true, tension: 0.3 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: "Reports over time" }, legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    }));

    dashCharts.push(new Chart($("#dashProvinceChart"), {
      type: "bar",
      data: { labels: Object.keys(byProvince), datasets: [{ data: Object.values(byProvince), backgroundColor: "#C99A3B" }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: "Reports by province" }, legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    }));
  }

  function renderHotspotTable(rows) {
    const hotspots = getHotspots(rows, 2);
    const body = $("#hotspotTableBody");
    $("#hotspotEmptyHint").hidden = hotspots.length > 0;

    body.innerHTML = hotspots.slice(0, 10).map((h) => `
      <tr>
        <td><strong>${data().escapeHTML(h.city)}</strong><br><span class="hint">${data().escapeHTML(h.province)}</span></td>
        <td>${h.cleanScore}</td>
        <td><span class="risk-badge risk-${h.riskLevel.toLowerCase()}">${h.riskLevel}</span></td>
        <td>${h.count}</td>
        <td>${h.resolvedRate}%</td>
        <td>${data().escapeHTML(h.topWasteType)}</td>
        <td><span class="trend-badge">${h.trend}</span></td>
      </tr>
    `).join("");
  }

  function renderImpact(rows) {
    const resolved = rows.filter((r) => r.status === "Resolved");
    const withImpact = resolved.filter((r) => r.impact);
    const totals = withImpact.reduce((acc, r) => ({
      wasteKg: acc.wasteKg + (r.impact.wasteKg || 0),
      volunteers: acc.volunteers + (r.impact.volunteers || 0),
      hours: acc.hours + (r.impact.hours || 0)
    }), { wasteKg: 0, volunteers: 0, hours: 0 });

    const cards = [
      { label: "Waste removed", value: withImpact.length ? `${totals.wasteKg} kg` : "Data unavailable" },
      { label: "Volunteers involved", value: withImpact.length ? totals.volunteers : "Data unavailable" },
      { label: "Cleanup hours", value: withImpact.length ? totals.hours : "Data unavailable" },
      { label: "Cleanups with recorded impact", value: `${withImpact.length} of ${resolved.length} resolved` }
    ];
    $("#impactKpis").innerHTML = cards.map((c) => `
      <div class="impact-card-kpi"><strong>${c.value}</strong><span>${c.label}</span></div>
    `).join("");
  }

  /* =======================================================================
     4. MAP HOTSPOT LAYER (toggleable, added to the existing Leaflet map)
  ========================================================================= */

  function riskColor(level) {
    return { Low: "#4CA772", Moderate: "#C99A3B", High: "#B0472B", Critical: "#8C2E1B" }[level] || "#5E6B63";
  }

  function toggleHotspotLayer() {
    hotspotsVisible = !hotspotsVisible;
    applyHotspotLayerState();
  }

  function applyHotspotLayerState() {
    const map = data().getMapInstance();
    if (!map || !window.L) return;
    const btn = $("#hotspotToggleBtn");
    btn?.setAttribute("aria-pressed", String(hotspotsVisible));
    btn?.classList.toggle("active", hotspotsVisible);

    if (hotspotLayer) { map.removeLayer(hotspotLayer); hotspotLayer = null; }
    if (!hotspotsVisible) return;

    const hotspots = getHotspots(data().getAllReports(), 2);
    hotspotLayer = L.layerGroup();
    hotspots.forEach((h) => {
      const radius = 10 + (h.cleanScore / 100) * 22;
      const circle = L.circleMarker([h.avgLat, h.avgLng], {
        radius, color: "#fff", weight: 2, fillColor: riskColor(h.riskLevel), fillOpacity: 0.55
      });
      circle.bindPopup(`
        <div class="popup-card">
          <h4>${data().escapeHTML(h.city)}, ${data().escapeHTML(h.province)}</h4>
          <p>CleanScore <strong>${h.cleanScore}</strong> — ${h.riskLevel} risk</p>
          <p>${h.count} reports · ${h.resolvedRate}% resolved</p>
          <p class="hint">${explainScore(h)}</p>
        </div>
      `);
      hotspotLayer.addLayer(circle);
    });
    hotspotLayer.addTo(map);

    if (hotspots.length === 0) data().showToast("No hotspots yet — locations need 2+ reports to qualify");
  }

  /* =======================================================================
     5. ACCOUNTS / ROLES STUB (Phase 3 — clearly inert)
     No authentication exists in this prototype. This is a documentation
     surface, not a login form — it never claims to sign anyone in.
  ========================================================================= */

  function wireRolesStub() {
    const modal = $("#rolesModal");
    const open = () => { modal.hidden = false; document.body.style.overflow = "hidden"; if (window.lucide) window.lucide.createIcons(); };
    const close = () => { modal.hidden = true; document.body.style.overflow = ""; };

    $("#signInBtn")?.addEventListener("click", open);
    $("#mobileSignInBtn")?.addEventListener("click", () => { $("#mobileMenu").hidden = true; open(); });
    $("#rolesCloseBtn")?.addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) close(); });
  }

  /* =======================================================================
     6. WIRING / INIT
  ========================================================================= */

  function init() {
    if (!window.CleanSAData) { setTimeout(init, 50); return; }

    // Wire everything up *before* the first render attempt, so that even if
    // something unexpected throws during that first render, later data
    // updates (which use this same event) still reach a working listener.
    wireRolesStub();
    $("#hotspotToggleBtn")?.addEventListener("click", toggleHotspotLayer);
    document.addEventListener("cleansa:reportsChanged", () => {
      renderDashboard();
      applyHotspotLayerState(); // rebuild the map layer in place if it's on
    });

    renderDashboard();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
