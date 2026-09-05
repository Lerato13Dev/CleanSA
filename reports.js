/* =========================================================================
   CleanSA — Reports & Analytics subsystem (Phase 1)
   -------------------------------------------------------------------------
   Reads report data through the small read-only bridge exposed by
   script.js (`window.CleanSAData`). Does not modify or duplicate that
   module's state — this file only ever *reads* reports and renders
   analytics / a PDF from them.

   Sections:
     1. Report type definitions
     2. Builder state
     3. Data helpers (filtering, grouping, stats, recommendations)
     4. Scope UI (changes per report type)
     5. Live preview rendering (numbers + Chart.js charts)
     6. PDF generation (jsPDF)
     7. Wiring / init
   ========================================================================= */

(function () {
  "use strict";

  function data() { return window.CleanSAData; }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  /* =======================================================================
     1. REPORT TYPE DEFINITIONS
  ========================================================================= */

  const REPORT_TYPES = [
    { id: "executive", label: "Executive summary", icon: "layout-dashboard", desc: "A high-level overview across every currently loaded report." },
    { id: "province", label: "Province", icon: "map", desc: "All incidents within one South African province." },
    { id: "location", label: "Location", icon: "map-pin", desc: "All incidents in a specific city or area." },
    { id: "dateRange", label: "Date range", icon: "calendar-range", desc: "Incidents reported between two dates." },
    { id: "cleanup", label: "Cleanup activity", icon: "sparkles", desc: "Reports that are in cleanup or already resolved." },
    { id: "intelligence", label: "Environmental intelligence", icon: "search", desc: "Recurring locations and waste-type patterns in the data." },
    { id: "incident", label: "Single incident", icon: "file-text", desc: "One incident, in full detail." }
  ];

  /* =======================================================================
     2. BUILDER STATE
  ========================================================================= */

  const builder = {
    type: "executive",
    scope: {}, // populated per-type: { province }, { city }, { from, to }, { incidentId }
    filters: { severity: "all", status: "all", wasteType: "all", verified: "all", source: "all" },
    contents: {
      summary: true, charts: true, map: true, list: true, descriptions: false,
      photos: false, cleanup: true, timeline: false, recommendations: true,
      impact: false, aiInsights: false
    }
  };

  let previewCharts = []; // Chart.js instances currently on screen, so we can destroy() before re-render

  /* =======================================================================
     3. DATA HELPERS
  ========================================================================= */

  function uniqueSorted(arr) { return Array.from(new Set(arr)).sort(); }

  function getFilteredDataset() {
    const all = data().getAllReports();
    const { type, scope, filters } = builder;

    let rows = all;

    // Type-specific scope
    if (type === "province" && scope.province && scope.province !== "all") {
      rows = rows.filter((r) => r.province === scope.province);
    }
    if (type === "location" && scope.city && scope.city !== "all") {
      rows = rows.filter((r) => r.city === scope.city);
    }
    if (type === "dateRange" && (scope.from || scope.to)) {
      const from = scope.from ? new Date(scope.from + "T00:00:00").getTime() : -Infinity;
      const to = scope.to ? new Date(scope.to + "T23:59:59").getTime() : Infinity;
      rows = rows.filter((r) => {
        const t = new Date(r.timestamp).getTime();
        return t >= from && t <= to;
      });
    }
    if (type === "cleanup") {
      rows = rows.filter((r) => ["Cleanup Planned", "Cleanup In Progress", "Resolved"].includes(r.status));
      if (scope.province && scope.province !== "all") rows = rows.filter((r) => r.province === scope.province);
    }
    if (type === "intelligence" && scope.province && scope.province !== "all") {
      rows = rows.filter((r) => r.province === scope.province);
    }

    // Shared refine filters (not applied to "incident" type — that's a single record)
    if (type !== "incident") {
      if (filters.severity !== "all") rows = rows.filter((r) => r.severity === filters.severity);
      if (filters.status !== "all") rows = rows.filter((r) => r.status === filters.status);
      if (filters.wasteType !== "all") rows = rows.filter((r) => r.wasteType === filters.wasteType);
      if (filters.verified !== "all") rows = rows.filter((r) => String(r.verified) === filters.verified);
      if (filters.source !== "all") rows = rows.filter((r) => r.source === filters.source);
    }

    return rows;
  }

  function computeStats(rows) {
    const total = rows.length;
    const verified = rows.filter((r) => r.verified).length;
    const resolved = rows.filter((r) => r.status === "Resolved").length;
    const outstanding = total - resolved;
    const highSeverity = rows.filter((r) => r.severity === "High" || r.severity === "Critical").length;

    const bySeverity = groupCount(rows, "severity");
    const byStatus = groupCount(rows, "status");
    const byWasteType = groupCount(rows, "wasteType");
    const byProvince = groupCount(rows, "province");
    const byCity = groupCount(rows, "city");

    return { total, verified, resolved, outstanding, highSeverity, bySeverity, byStatus, byWasteType, byProvince, byCity };
  }

  function groupCount(rows, key) {
    const out = {};
    rows.forEach((r) => { out[r[key]] = (out[r[key]] || 0) + 1; });
    return out;
  }

  function reportsOverTime(rows) {
    const byMonth = {};
    rows.forEach((r) => {
      const d = new Date(r.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    const keys = Object.keys(byMonth).sort();
    return { labels: keys, values: keys.map((k) => byMonth[k]) };
  }

  function recurringLocations(rows, minCount) {
    const byCity = groupCount(rows, "city");
    return Object.entries(byCity)
      .filter(([, count]) => count >= (minCount || 2))
      .sort((a, b) => b[1] - a[1]);
  }

  function buildRecommendations(rows, stats) {
    const recs = [];
    if (stats.total === 0) return ["No reports match the selected scope — widen the filters to generate recommendations."];

    if (stats.bySeverity.Critical) {
      recs.push(`${stats.bySeverity.Critical} critical-severity incident${stats.bySeverity.Critical === 1 ? "" : "s"} in this dataset should be prioritised for immediate attention.`);
    }
    const recurring = recurringLocations(rows, 2);
    if (recurring.length) {
      const [topCity, topCount] = recurring[0];
      recs.push(`${topCity} has ${topCount} reports within this scope — this may be a recurring problem area worth a dedicated visit.`);
    }
    const verificationRate = stats.total ? stats.verified / stats.total : 0;
    if (verificationRate < 0.5) {
      recs.push(`Only ${Math.round(verificationRate * 100)}% of these reports are verified — increasing community or municipal verification would improve data quality.`);
    }
    const resolutionRate = stats.total ? stats.resolved / stats.total : 0;
    if (resolutionRate < 0.3 && stats.total >= 3) {
      recs.push(`Only ${Math.round(resolutionRate * 100)}% of these reports are marked resolved — cleanup capacity in this scope may need to be increased.`);
    }
    const topWaste = Object.entries(stats.byWasteType).sort((a, b) => b[1] - a[1])[0];
    if (topWaste) {
      recs.push(`${topWaste[0]} is the most common waste type in this scope (${topWaste[1]} report${topWaste[1] === 1 ? "" : "s"}) — targeted collection or awareness efforts could help.`);
    }
    if (recs.length === 0) recs.push("No specific concerns stand out in this scope based on the available data.");
    return recs;
  }

  /* =======================================================================
     4. SCOPE UI (changes per report type)
  ========================================================================= */

  function renderTypeGrid() {
    const grid = $("#reportTypeGrid");
    grid.innerHTML = REPORT_TYPES.map((t) => `
      <button type="button" class="report-type-card ${t.id === builder.type ? "active" : ""}" data-type="${t.id}" role="radio" aria-checked="${t.id === builder.type}">
        <i data-lucide="${t.icon}" aria-hidden="true"></i>
        <strong>${t.label}</strong>
        <span>${t.desc}</span>
      </button>
    `).join("");
    grid.querySelectorAll(".report-type-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        builder.type = btn.dataset.type;
        builder.scope = {};
        renderTypeGrid();
        renderScopeControls();
        renderPreview();
      });
    });
    if (window.lucide) window.lucide.createIcons();
  }

  function renderScopeControls() {
    const wrap = $("#builderScope");
    const all = data().getAllReports();
    const provinces = uniqueSorted(all.map((r) => r.province));
    const cities = uniqueSorted(all.map((r) => r.city));

    // Preserve whatever the user has already picked across a re-render
    // (this fires whenever the underlying dataset changes, not just when
    // the user switches report type).
    const prev = {
      province: $("#scopeProvince")?.value,
      city: $("#scopeCity")?.value,
      from: $("#scopeFrom")?.value,
      to: $("#scopeTo")?.value,
      incidentId: $("#scopeIncident")?.value
    };

    let html = "";
    if (builder.type === "province" || builder.type === "cleanup" || builder.type === "intelligence") {
      html = `
        <label for="scopeProvince">Province</label>
        <select id="scopeProvince">
          <option value="all">All provinces</option>
          ${provinces.map((p) => `<option value="${p}">${p}</option>`).join("")}
        </select>`;
    } else if (builder.type === "location") {
      html = `
        <label for="scopeCity">City / area</label>
        <select id="scopeCity">
          <option value="all">All cities</option>
          ${cities.map((c) => `<option value="${c}">${c}</option>`).join("")}
        </select>`;
    } else if (builder.type === "dateRange") {
      html = `
        <div class="date-range-row">
          <div><label for="scopeFrom">From</label><input type="date" id="scopeFrom" /></div>
          <div><label for="scopeTo">To</label><input type="date" id="scopeTo" /></div>
        </div>`;
    } else if (builder.type === "incident") {
      html = `
        <label for="scopeIncident">Incident</label>
        <select id="scopeIncident">
          ${all.map((r) => `<option value="${r.id}">${escapeAttr(r.title)} — ${escapeAttr(r.city)}</option>`).join("")}
        </select>`;
    } else {
      html = `<p class="hint">Uses every report currently loaded in the app.</p>`;
    }
    wrap.innerHTML = html;

    // Restore prior values where the element still exists and the value is still valid
    if ($("#scopeProvince") && prev.province && (prev.province === "all" || provinces.includes(prev.province))) $("#scopeProvince").value = prev.province;
    if ($("#scopeCity") && prev.city && (prev.city === "all" || cities.includes(prev.city))) $("#scopeCity").value = prev.city;
    if ($("#scopeFrom") && prev.from) $("#scopeFrom").value = prev.from;
    if ($("#scopeTo") && prev.to) $("#scopeTo").value = prev.to;
    if ($("#scopeIncident") && prev.incidentId && all.some((r) => r.id === prev.incidentId)) $("#scopeIncident").value = prev.incidentId;

    // wire scope inputs
    const bind = (id, key, transform) => {
      const el = $("#" + id);
      if (!el) return;
      el.addEventListener("change", (e) => {
        builder.scope[key] = transform ? transform(e.target.value) : e.target.value;
        renderPreview();
      });
    };
    bind("scopeProvince", "province");
    bind("scopeCity", "city");
    bind("scopeFrom", "from");
    bind("scopeTo", "to");
    bind("scopeIncident", "incidentId");
    if (builder.type === "incident" && all.length && !builder.scope.incidentId) builder.scope.incidentId = all[0].id;
  }

  function escapeAttr(str) { return String(str || "").replace(/"/g, "&quot;"); }

  function populateWasteTypeFilter() {
    const select = $("#rbWasteType");
    const current = select.value;
    const types = uniqueSorted(data().getAllReports().map((r) => r.wasteType));
    // Keep the "Any waste type" default, replace the rest so this stays
    // in sync once reports finish loading (or a new one is submitted).
    select.querySelectorAll("option:not([value='all'])").forEach((o) => o.remove());
    types.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t; opt.textContent = t;
      select.appendChild(opt);
    });
    if (types.includes(current)) select.value = current;
  }

  function wireRefineFilters() {
    const map = { rbSeverity: "severity", rbStatus: "status", rbWasteType: "wasteType", rbVerified: "verified", rbSource: "source" };
    Object.entries(map).forEach(([id, key]) => {
      $("#" + id).addEventListener("change", (e) => { builder.filters[key] = e.target.value; renderPreview(); });
    });
  }

  function wireContentChecklist() {
    $all("#contentChecklist input[type=checkbox]").forEach((cb) => {
      cb.addEventListener("change", () => { builder.contents[cb.value] = cb.checked; renderPreview(); });
    });
  }

  /* =======================================================================
     5. LIVE PREVIEW
  ========================================================================= */

  function destroyPreviewCharts() {
    previewCharts.forEach((c) => c.destroy());
    previewCharts = [];
  }

  function renderPreview() {
    const preview = $("#builderPreview");
    destroyPreviewCharts();

    if (builder.type === "incident") {
      renderIncidentPreview(preview);
      return;
    }

    const rows = getFilteredDataset();
    const stats = computeStats(rows);

    if (rows.length === 0) {
      preview.innerHTML = `
        <div class="preview-empty">
          <i data-lucide="file-search" aria-hidden="true"></i>
          <p><strong>No reports match this scope.</strong></p>
          <p class="hint">Widen the province, date range or filters to include some data before generating a PDF.</p>
        </div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    preview.innerHTML = `
      <h3 class="preview-title">Preview</h3>
      <div class="preview-stats">
        <div><strong>${stats.total}</strong><span>Reports</span></div>
        <div><strong>${stats.verified}</strong><span>Verified</span></div>
        <div><strong>${stats.resolved}</strong><span>Resolved</span></div>
        <div><strong>${stats.outstanding}</strong><span>Outstanding</span></div>
        <div><strong>${stats.highSeverity}</strong><span>High / Critical</span></div>
      </div>
      <div class="preview-charts">
        <div class="chart-box"><canvas id="chartSeverity" width="260" height="200"></canvas></div>
        <div class="chart-box"><canvas id="chartWaste" width="260" height="200"></canvas></div>
      </div>
      <p class="hint">Showing a live preview of <strong>${rows.length}</strong> matching report${rows.length === 1 ? "" : "s"}. The full PDF will include everything checked in step 4.</p>
    `;

    if (window.Chart) {
      previewCharts.push(new Chart($("#chartSeverity"), {
        type: "doughnut",
        data: { labels: Object.keys(stats.bySeverity), datasets: [{ data: Object.values(stats.bySeverity), backgroundColor: ["#4CA772", "#C99A3B", "#B0472B", "#8C2E1B"] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } }, title: { display: true, text: "By severity" } } }
      }));
      previewCharts.push(new Chart($("#chartWaste"), {
        type: "bar",
        data: { labels: Object.keys(stats.byWasteType), datasets: [{ data: Object.values(stats.byWasteType), backgroundColor: "#1F6B45" }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: "By waste type" } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
      }));
    }
  }

  function renderIncidentPreview(preview) {
    const all = data().getAllReports();
    const report = all.find((r) => r.id === builder.scope.incidentId) || all[0];
    if (!report) {
      preview.innerHTML = `<div class="preview-empty"><p>No reports are loaded yet.</p></div>`;
      return;
    }
    preview.innerHTML = `
      <h3 class="preview-title">Preview</h3>
      <img class="preview-incident-img" src="${report.image}" alt="" />
      <p class="preview-incident-title">${data().escapeHTML(report.title)}</p>
      <p class="hint">${data().escapeHTML(report.city)}, ${data().escapeHTML(report.province)} · ${report.severity} · ${report.status}</p>
      <p class="hint">This will generate a single-incident PDF with the details, lifecycle and photo you've selected in step 4.</p>
    `;
  }

  /* =======================================================================
     6. PDF GENERATION
  ========================================================================= */

  async function generatePDF() {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      data().showToast("⚠ PDF library did not load — check your connection and try again", "warn");
      return;
    }

    const btn = $("#generateReportBtn");
    btn.disabled = true;
    const originalLabel = btn.innerHTML;
    btn.innerHTML = "Generating…";

    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      if (builder.type === "incident") {
        await buildIncidentPDF(doc);
      } else {
        const rows = getFilteredDataset();
        if (rows.length === 0) {
          data().showToast("⚠ No reports match this scope — nothing to generate", "warn");
          return;
        }
        await buildAggregatePDF(doc, rows);
      }
      const filename = `CleanSA-${builder.type}-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      data().showToast("✓ Report generated");
    } catch (err) {
      console.error("PDF generation failed", err);
      data().showToast("⚠ Something went wrong generating the PDF", "warn");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalLabel;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  const PAGE_W = 595.28, PAGE_H = 841.89, MARGIN = 48;
  let pageNum = 1;

  function footer(doc) {
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text("CleanSA — prototype report. Sample/demo data may not reflect verified real-world incidents.", MARGIN, PAGE_H - 24);
    doc.text(String(pageNum), PAGE_W - MARGIN, PAGE_H - 24, { align: "right" });
    doc.setTextColor(20);
  }

  function newPage(doc) {
    doc.addPage();
    pageNum++;
    footer(doc);
  }

  function coverPage(doc, title, subtitle) {
    pageNum = 1;
    doc.setFillColor(22, 60, 44);
    doc.rect(0, 0, PAGE_W, 220, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("CleanSA", MARGIN, 90);
    doc.setFontSize(11);
    doc.text("Let's keep South Africa clean.", MARGIN, 112);

    doc.setFontSize(20);
    doc.text(title, MARGIN, 170, { maxWidth: PAGE_W - MARGIN * 2 });

    doc.setTextColor(20);
    doc.setFontSize(11);
    let y = 260;
    subtitle.forEach((line) => { doc.text(line, MARGIN, y); y += 18; });

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleString("en-ZA")}`, MARGIN, PAGE_H - 60);
    doc.text("This is a prototype document generated from demo/sample data.", MARGIN, PAGE_H - 46);
    doc.setTextColor(20);
    footer(doc);
  }

  function sectionHeading(doc, y, text) {
    doc.setFontSize(14);
    doc.setTextColor(22, 60, 44);
    doc.text(text, MARGIN, y);
    doc.setDrawColor(228, 225, 213);
    doc.line(MARGIN, y + 6, PAGE_W - MARGIN, y + 6);
    doc.setTextColor(20);
    return y + 26;
  }

  function ensureSpace(doc, y, needed) {
    if (y + needed > PAGE_H - 60) { newPage(doc); return 70; }
    return y;
  }

  async function chartToImage(chartConfig) {
    const canvas = document.createElement("canvas");
    canvas.width = 480; canvas.height = 300;
    canvas.style.position = "fixed"; canvas.style.left = "-9999px";
    document.body.appendChild(canvas);
    const chart = new Chart(canvas, chartConfig);
    await new Promise((res) => setTimeout(res, 60)); // allow one render tick
    const dataUrl = canvas.toDataURL("image/png", 1.0);
    chart.destroy();
    canvas.remove();
    return dataUrl;
  }

  function drawSchematicMap(rows) {
    const canvas = document.createElement("canvas");
    canvas.width = 480; canvas.height = 320;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#F6F4EE"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#E4E1D5"; ctx.strokeRect(0, 0, canvas.width, canvas.height);

    const lats = rows.map((r) => r.latitude), lngs = rows.map((r) => r.longitude);
    const minLat = Math.min(...lats) - 0.4, maxLat = Math.max(...lats) + 0.4;
    const minLng = Math.min(...lngs) - 0.4, maxLng = Math.max(...lngs) + 0.4;

    const colors = { Low: "#4CA772", Medium: "#C99A3B", High: "#B0472B", Critical: "#8C2E1B" };

    rows.forEach((r) => {
      const x = ((r.longitude - minLng) / (maxLng - minLng || 1)) * (canvas.width - 40) + 20;
      const y = canvas.height - (((r.latitude - minLat) / (maxLat - minLat || 1)) * (canvas.height - 40) + 20);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = colors[r.severity] || "#5E6B63";
      ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
    });

    ctx.fillStyle = "#5E6B63"; ctx.font = "11px sans-serif";
    ctx.fillText("Schematic geographic distribution (not a basemap) — point positions are relative to this dataset only.", 10, canvas.height - 8);

    return canvas.toDataURL("image/png", 1.0);
  }

  async function buildAggregatePDF(doc, rows) {
    const stats = computeStats(rows);
    const typeLabel = REPORT_TYPES.find((t) => t.id === builder.type).label;
    const scopeLines = describeScope();

    coverPage(doc, `${typeLabel} report`, scopeLines);

    let y = 70;
    newPage(doc);
    y = sectionHeading(doc, y, "Executive summary");
    doc.setFontSize(11);
    const summaryLines = [
      `${stats.total} environmental incidents recorded in this scope`,
      `${stats.verified} verified (${pct(stats.verified, stats.total)}%)`,
      `${stats.resolved} resolved (${pct(stats.resolved, stats.total)}%)`,
      `${stats.outstanding} currently outstanding`,
      `${stats.highSeverity} high or critical severity`
    ];
    summaryLines.forEach((line) => { doc.text("•  " + line, MARGIN, y); y += 18; });
    y += 10;

    if (builder.contents.charts && rows.length) {
      y = ensureSpace(doc, y, 220);
      y = sectionHeading(doc, y, "Analytics");
      const sevImg = await chartToImage({
        type: "doughnut",
        data: { labels: Object.keys(stats.bySeverity), datasets: [{ data: Object.values(stats.bySeverity), backgroundColor: ["#4CA772", "#C99A3B", "#B0472B", "#8C2E1B"] }] },
        options: { animation: false, plugins: { title: { display: true, text: "By severity" }, legend: { position: "bottom" } } }
      });
      const statusImg = await chartToImage({
        type: "bar",
        data: { labels: Object.keys(stats.byStatus), datasets: [{ data: Object.values(stats.byStatus), backgroundColor: "#1F6B45" }] },
        options: { animation: false, plugins: { title: { display: true, text: "By status" }, legend: { display: false } }, scales: { y: { beginAtZero: true } } }
      });
      doc.addImage(sevImg, "PNG", MARGIN, y, 230, 145);
      doc.addImage(statusImg, "PNG", MARGIN + 250, y, 230, 145);
      y += 160;

      if (builder.contents.timeline) {
        const trend = reportsOverTime(rows);
        if (trend.labels.length > 1) {
          y = ensureSpace(doc, y, 190);
          const trendImg = await chartToImage({
            type: "line",
            data: { labels: trend.labels, datasets: [{ data: trend.values, borderColor: "#1F6B45", backgroundColor: "rgba(31,107,69,0.15)", fill: true, tension: 0.25 }] },
            options: { animation: false, plugins: { title: { display: true, text: "Reports over time" }, legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
          });
          doc.addImage(trendImg, "PNG", MARGIN, y, 480, 170);
          y += 185;
        }
      }
    }

    if (builder.contents.map && rows.length) {
      y = ensureSpace(doc, y, 220);
      y = sectionHeading(doc, y, "Geographic distribution");
      const mapImg = drawSchematicMap(rows);
      doc.addImage(mapImg, "PNG", MARGIN, y, 400, 267);
      y += 280;
    }

    if (builder.contents.cleanup) {
      y = ensureSpace(doc, y, 100);
      y = sectionHeading(doc, y, "Cleanup & resolution");
      doc.setFontSize(11);
      doc.text(`•  ${stats.byStatus["Cleanup In Progress"] || 0} incident(s) currently in cleanup`, MARGIN, y); y += 18;
      doc.text(`•  ${stats.resolved} incident(s) resolved`, MARGIN, y); y += 18;
      doc.text("•  Average resolution time: Data unavailable — this prototype does not yet record a separate resolution timestamp.", MARGIN, y, { maxWidth: PAGE_W - MARGIN * 2 }); y += 30;
    }

    if (builder.contents.impact) {
      y = ensureSpace(doc, y, 110);
      y = sectionHeading(doc, y, "Environmental impact");
      doc.setFontSize(11);
      ["Estimated waste removed", "Volunteer cleanup hours", "Recyclable material diverted"].forEach((label) => {
        doc.text(`•  ${label}: Data unavailable`, MARGIN, y); y += 18;
      });
      y += 8;
    }

    if (builder.contents.list && rows.length) {
      y = ensureSpace(doc, y, 60);
      y = sectionHeading(doc, y, `Incident list (${Math.min(rows.length, 25)} of ${rows.length} shown)`);
      doc.setFontSize(10);
      const shown = rows.slice(0, 25);
      const PHOTO_CAP = 10; // keep file size and generation time reasonable
      let photosEmbedded = 0;

      for (const r of shown) {
        const wantsPhoto = builder.contents.photos && photosEmbedded < PHOTO_CAP;
        y = ensureSpace(doc, y, (builder.contents.descriptions ? 60 : 34) + (wantsPhoto ? 76 : 0));

        let thumb = null;
        if (wantsPhoto) { thumb = await toDataURLSafe(r.image); if (thumb) photosEmbedded++; }

        if (thumb) { doc.addImage(thumb, "JPEG", MARGIN, y, 70, 46); }
        const textX = thumb ? MARGIN + 82 : MARGIN;
        const textWidth = PAGE_W - MARGIN * 2 - (thumb ? 82 : 0);

        doc.setFont(undefined, "bold");
        doc.text(r.title, textX, y + 10);
        doc.setFont(undefined, "normal");
        doc.text(`${r.city}, ${r.province}  ·  ${r.severity}  ·  ${r.status}  ·  ${data().formatDate(r.timestamp)}`, textX, y + 23, { maxWidth: textWidth });

        const rowHeight = thumb ? 50 : 26;
        y += rowHeight;

        if (builder.contents.descriptions) {
          const lines = doc.splitTextToSize(r.description, PAGE_W - MARGIN * 2);
          doc.text(lines, MARGIN, y);
          y += lines.length * 12 + 8;
        }
      }
      if (builder.contents.photos && rows.length > PHOTO_CAP) {
        doc.setFontSize(8); doc.setTextColor(140);
        doc.text(`Photos are only embedded for the first ${PHOTO_CAP} incidents shown, to keep the file size reasonable.`, MARGIN, y);
        doc.setTextColor(20);
        y += 16;
      }
    }

    if (builder.contents.recommendations) {
      y = ensureSpace(doc, y, 100);
      y = sectionHeading(doc, y, "Recommendations");
      doc.setFontSize(11);
      buildRecommendations(rows, stats).forEach((rec) => {
        y = ensureSpace(doc, y, 34);
        const lines = doc.splitTextToSize("•  " + rec, PAGE_W - MARGIN * 2);
        doc.text(lines, MARGIN, y);
        y += lines.length * 14 + 6;
      });
    }

    if (builder.contents.aiInsights) {
      y = ensureSpace(doc, y, 60);
      y = sectionHeading(doc, y, "AI insights");
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text("AI-assisted insights are a planned future capability and are not generated in this prototype.", MARGIN, y, { maxWidth: PAGE_W - MARGIN * 2 });
      doc.setTextColor(20);
    }
  }

  async function buildIncidentPDF(doc) {
    const all = data().getAllReports();
    const r = all.find((rep) => rep.id === builder.scope.incidentId) || all[0];
    if (!r) throw new Error("No incident selected");

    coverPage(doc, r.title, [`${r.city}, ${r.province}`, `Incident ID: ${r.id}`]);
    newPage(doc);
    let y = 70;
    y = sectionHeading(doc, y, "Incident details");
    doc.setFontSize(11);
    const fields = [
      ["Location", `${r.city}, ${r.province}`],
      ["Coordinates", `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`],
      ["Date reported", data().formatDate(r.timestamp)],
      ["Waste type", r.wasteType],
      ["Severity", r.severity],
      ["Status", r.status],
      ["Verification", r.verified ? "Verified" : "Not yet verified"],
      ["Source", r.source]
    ];
    fields.forEach(([k, v]) => { doc.setFont(undefined, "bold"); doc.text(k + ":", MARGIN, y); doc.setFont(undefined, "normal"); doc.text(String(v), MARGIN + 110, y); y += 18; });

    y += 10;
    y = sectionHeading(doc, y, "Description");
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(r.description, PAGE_W - MARGIN * 2);
    doc.text(lines, MARGIN, y);
    y += lines.length * 14 + 16;

    if (builder.contents.timeline) {
      y = ensureSpace(doc, y, 80);
      y = sectionHeading(doc, y, "Lifecycle");
      const order = data().STATUS_ORDER;
      const doneIdx = order.indexOf(r.status);
      doc.setFontSize(10);
      order.forEach((step, i) => {
        doc.text(`${i <= doneIdx ? "[x]" : "[ ]"} ${step}`, MARGIN, y);
        y += 15;
      });
      y += 10;
    }

    if (builder.contents.photos && r.image) {
      y = ensureSpace(doc, y, 220);
      y = sectionHeading(doc, y, "Photograph");
      try {
        const imgData = await toDataURLSafe(r.image);
        if (imgData) doc.addImage(imgData, "JPEG", MARGIN, y, 300, 190);
        else doc.text("Photo unavailable for this report.", MARGIN, y);
      } catch { doc.text("Photo could not be embedded (image failed to load).", MARGIN, y); }
      y += 210;
    }

    if (builder.contents.cleanup) {
      y = ensureSpace(doc, y, 80);
      y = sectionHeading(doc, y, "Cleanup & community");
      doc.setFontSize(10);
      doc.text(`•  Community confirmations: Data unavailable — not yet tracked in this prototype.`, MARGIN, y, { maxWidth: PAGE_W - MARGIN * 2 }); y += 18;
      doc.text(`•  Cleanup participants: Data unavailable — not yet tracked in this prototype.`, MARGIN, y, { maxWidth: PAGE_W - MARGIN * 2 }); y += 18;
    }
  }

  function toDataURLSafe(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          canvas.getContext("2d").drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch { resolve(null); } // tainted canvas (cross-origin) — fail gracefully
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  function describeScope() {
    const lines = [`Report type: ${REPORT_TYPES.find((t) => t.id === builder.type).label}`];
    if (builder.type === "province") lines.push(`Province: ${builder.scope.province && builder.scope.province !== "all" ? builder.scope.province : "All provinces"}`);
    if (builder.type === "location") lines.push(`Location: ${builder.scope.city && builder.scope.city !== "all" ? builder.scope.city : "All cities"}`);
    if (builder.type === "dateRange") lines.push(`Date range: ${builder.scope.from || "any"} to ${builder.scope.to || "any"}`);
    const activeFilters = Object.entries(builder.filters).filter(([, v]) => v !== "all").map(([k, v]) => `${k}: ${v}`);
    if (activeFilters.length) lines.push(`Filters: ${activeFilters.join(", ")}`);
    return lines;
  }

  function pct(n, total) { return total ? Math.round((n / total) * 100) : 0; }

  /* =======================================================================
     7. WIRING / INIT
  ========================================================================= */

  function init() {
    if (!window.CleanSAData) {
      // script.js hasn't attached the bridge yet — try again shortly.
      setTimeout(init, 50);
      return;
    }

    // Wire interactive controls and the refresh listener first, so a
    // failure in the initial render can never prevent later updates
    // (e.g. once real data has finished loading) from working.
    wireRefineFilters();
    wireContentChecklist();
    $("#generateReportBtn").addEventListener("click", generatePDF);
    document.addEventListener("cleansa:reportsChanged", () => {
      try {
        renderScopeControls();
        populateWasteTypeFilter();
        renderPreview();
      } catch (err) { console.error("[CleanSA report builder] refresh failed:", err); }
    });

    try {
      renderTypeGrid();
      renderScopeControls();
      populateWasteTypeFilter();
      renderPreview();
    } catch (err) { console.error("[CleanSA report builder] initial render failed:", err); }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
