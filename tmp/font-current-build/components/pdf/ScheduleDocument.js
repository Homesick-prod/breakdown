"use strict";
"use client";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/components/pdf/ScheduleDocument.tsx
var ScheduleDocument_exports = {};
__export(ScheduleDocument_exports, {
  default: () => ScheduleDocument_default
});
module.exports = __toCommonJS(ScheduleDocument_exports);
var import_renderer = require("@react-pdf/renderer");

// src/utils/selectValueFormat.ts
var LEGACY_SELECT_VALUE_ALIASES = {
  Cowboy: "COWBOY",
  Group: "GROUP",
  Insert: "INSERT",
  Cutaway: "CUTAWAY",
  Static: "STATIC",
  "Pan L": "PAN L",
  "Pan R": "PAN R",
  "Tilt U": "TILT U",
  "Tilt D": "TILT D",
  "Dolly I": "DOLLY I",
  "Dolly O": "DOLLY O",
  "Truck L": "TRUCK L",
  "Truck R": "TRUCK R",
  Follow: "FOLLOW",
  "Pedestal U": "PEDESTAL U",
  "Pedestal D": "PEDESTAL D",
  Handheld: "HANDHELD",
  Steadicam: "STEADICAM",
  Gimbal: "GIMBAL",
  Crane: "CRANE",
  Jib: "JIB",
  Drone: "DRONE",
  Aerial: "AERIAL",
  "Zoom I": "ZOOM I",
  "Zoom O": "ZOOM O",
  "Snap Zoom": "SNAP ZOOM",
  "Rack Focus": "RACK FOCUS",
  Arc: "ARC",
  Orbit: "ORBIT",
  "Whip Pan L": "WHIP PAN L",
  "Whip Pan R": "WHIP PAN R"
};
function normalizeLegacySelectValue(value) {
  return LEGACY_SELECT_VALUE_ALIASES[value] ?? value;
}
function formatSelectValueList(value, fallback = "-") {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const formatted = raw.split(",").map((part) => normalizeLegacySelectValue(part.trim())).filter(Boolean).join(" / ");
  return formatted || fallback;
}

// src/components/pdf/ScheduleDocument.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var getFontPath = (filename) => {
  if (typeof window === "undefined") {
    return `${process.cwd()}/public/${filename}`;
  }
  return `/${filename}`;
};
import_renderer.Font.register({
  family: "IBMPlexSansThai",
  fonts: [
    { src: getFontPath("IBMPlexSansThai-Regular.ttf"), fontWeight: 400 },
    { src: getFontPath("IBMPlexSansThai-Medium.ttf"), fontWeight: 500 },
    { src: getFontPath("IBMPlexSansThai-SemiBold.ttf"), fontWeight: 600 },
    { src: getFontPath("IBMPlexSansThai-Bold.ttf"), fontWeight: 700 }
  ]
});
var fmt = (v, fallback = "-") => String(v ?? "").trim() || fallback;
var formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};
var getMealLabel = (timeStr, defaultLabel = "Meal") => {
  if (!timeStr) return defaultLabel;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return defaultLabel;
  const hour = parseInt(match[1], 10);
  if (hour >= 5 && hour < 10) return "Breakfast";
  if (hour >= 10 && hour < 16) return "Lunch";
  if (hour >= 16 && hour < 22) return "Dinner";
  return "Supper";
};
var THAI_TEXT_RE = /[\u0E00-\u0E7F]/;
var ZERO_WIDTH_SPACE = "\u200B";
var segmentThaiText = (value) => {
  if (!THAI_TEXT_RE.test(value)) return [value];
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("th", { granularity: "word" });
    const segments = Array.from(segmenter.segment(value), (part) => part.segment).filter(Boolean);
    if (segments.length > 0) return segments;
  }
  return Array.from(value);
};
import_renderer.Font.registerHyphenationCallback((word) => segmentThaiText(word));
var normalizeInlineText = (value, fallback = "-") => {
  const normalized = String(value ?? "").trim().replace(/,\s*/g, ", ");
  return normalized || fallback;
};
var fmtWrapped = (value, fallback = "-") => {
  const normalized = normalizeInlineText(value, fallback);
  if (normalized === fallback) return normalized;
  return segmentThaiText(normalized).join(ZERO_WIDTH_SPACE);
};
var getBreakCategory = (description) => {
  const value = (description || "").toLowerCase();
  const wrapKeywords = [
    "wrap",
    "end",
    "finished",
    "dismiss",
    "packup",
    "pack up",
    "clean up",
    "cleanup",
    "\u0E40\u0E25\u0E34\u0E01",
    "\u0E1B\u0E34\u0E14\u0E01\u0E25\u0E49\u0E2D\u0E07",
    "\u0E01\u0E25\u0E31\u0E1A\u0E1A\u0E49\u0E32\u0E19",
    "\u0E41\u0E22\u0E01\u0E22\u0E49\u0E32\u0E22",
    "\u0E41\u0E23\u0E47\u0E1B",
    "\u0E41\u0E23\u0E1B"
  ];
  if (wrapKeywords.some((kw) => value.includes(kw))) return "wrap";
  const mealKeywords = [
    "lunch",
    "dinner",
    "breakfast",
    "meal",
    "snack",
    "catering",
    "brunch",
    "supper",
    "food",
    "eating",
    "\u0E01\u0E34\u0E19\u0E02\u0E49\u0E32\u0E27",
    "\u0E2D\u0E32\u0E2B\u0E32\u0E23",
    "\u0E21\u0E37\u0E49\u0E2D",
    "\u0E17\u0E32\u0E19\u0E02\u0E49\u0E32\u0E27",
    "\u0E1E\u0E31\u0E01\u0E40\u0E17\u0E35\u0E48\u0E22\u0E07",
    "\u0E1E\u0E31\u0E01\u0E01\u0E34\u0E19",
    "\u0E02\u0E49\u0E32\u0E27\u0E40\u0E0A\u0E49\u0E32",
    "\u0E02\u0E49\u0E32\u0E27\u0E40\u0E17\u0E35\u0E48\u0E22\u0E07",
    "\u0E02\u0E49\u0E32\u0E27\u0E40\u0E22\u0E47\u0E19",
    "\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E40\u0E0A\u0E49\u0E32",
    "\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E01\u0E25\u0E32\u0E07\u0E27\u0E31\u0E19",
    "\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E40\u0E22\u0E47\u0E19"
  ];
  if (mealKeywords.some((kw) => value.includes(kw))) return "meal";
  const setupKeywords = [
    "set",
    "setup",
    "prep",
    "company move",
    "move",
    "travel",
    "transit",
    "prepare",
    "block",
    "blocking",
    "\u0E22\u0E49\u0E32\u0E22\u0E01\u0E2D\u0E07",
    "\u0E22\u0E49\u0E32\u0E22",
    "\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21",
    "\u0E1A\u0E25\u0E47\u0E2D\u0E01",
    "\u0E40\u0E0B\u0E47\u0E15",
    "\u0E1A\u0E25\u0E47\u0E2D\u0E04",
    "\u0E40\u0E14\u0E34\u0E19\u0E17\u0E32\u0E07"
  ];
  if (setupKeywords.some((kw) => value.includes(kw))) return "setup";
  return "break";
};
var BREAK_THEMES = {
  wrap: {
    bg: "#FEF2F2",
    text: "#991B1B",
    badgeBg: "#FEE2E2",
    badgeText: "#DC2626"
  },
  meal: {
    bg: "#FFFBEB",
    text: "#78350F",
    badgeBg: "#FEF3C7",
    badgeText: "#B45309"
  },
  setup: {
    bg: "#EFF6FF",
    text: "#1E40AF",
    badgeBg: "#DBEAFE",
    badgeText: "#2563EB"
  },
  break: {
    bg: "#F9FAFB",
    text: "#374151",
    badgeBg: "#F3F4F6",
    badgeText: "#4B5563"
  }
};
var getMovementRig = (movementStr) => {
  const value = (movementStr || "").toLowerCase();
  if (value.includes("drone") || value.includes("aerial") || value.includes("flycam") || value.includes("\u0E42\u0E14\u0E23\u0E19") || value.includes("\u0E1A\u0E34\u0E19") || value.includes("\u0E21\u0E38\u0E21\u0E2A\u0E39\u0E07")) {
    return "drone";
  }
  if (value.includes("steadicam") || value.includes("steadi") || value.includes("\u0E2A\u0E40\u0E15\u0E14\u0E34\u0E41\u0E04\u0E21") || value.includes("\u0E2A\u0E40\u0E15\u0E14\u0E34") || value.includes("\u0E2A\u0E40\u0E15\u0E14\u0E35\u0E49\u0E41\u0E04\u0E21") || value.includes("\u0E2A\u0E40\u0E15\u0E14\u0E35\u0E49")) {
    return "steadicam";
  }
  if (value.includes("gimbal") || value.includes("ronin") || value.includes("stabilizer") || value.includes("\u0E01\u0E34\u0E21\u0E1A\u0E2D\u0E25") || value.includes("\u0E01\u0E34\u0E21\u0E1A\u0E31\u0E25") || value.includes("\u0E01\u0E31\u0E19\u0E2A\u0E31\u0E48\u0E19")) {
    return "gimbal";
  }
  if (value.includes("crane") || value.includes("jib") || value.includes("boom") || value.includes("\u0E40\u0E04\u0E23\u0E19") || value.includes("\u0E08\u0E34\u0E4A\u0E1A") || value.includes("\u0E1A\u0E39\u0E21") || value.includes("\u0E40\u0E04\u0E23\u0E19\u0E08\u0E34\u0E4A\u0E1A") || value.includes("\u0E08\u0E34\u0E4A\u0E1A\u0E2D\u0E32\u0E23\u0E4C\u0E21")) {
    return "crane";
  }
  if (value.includes("handheld") || value.includes("hand") || value.includes("shoulder") || value.includes("\u0E16\u0E37\u0E2D\u0E01\u0E25\u0E49\u0E2D\u0E07") || value.includes("\u0E16\u0E37\u0E2D") || value.includes("\u0E41\u0E2E\u0E19\u0E14\u0E4C\u0E40\u0E2E\u0E25\u0E14\u0E4C") || value.includes("\u0E41\u0E2E\u0E19\u0E14\u0E4C\u0E40\u0E2E\u0E25")) {
    return "handheld";
  }
  if (value.includes("dolly") || value.includes("\u0E14\u0E2D\u0E25\u0E25\u0E35\u0E48") || value.includes("\u0E14\u0E2D\u0E25\u0E25\u0E35") || value.includes("track") || value.includes("\u0E41\u0E17\u0E23\u0E47\u0E04") || value.includes("\u0E41\u0E17\u0E23\u0E04") || value.includes("truck") || value.includes("\u0E17\u0E23\u0E31\u0E04") || value.includes("slider") || value.includes("\u0E2A\u0E44\u0E25\u0E40\u0E14\u0E2D\u0E23\u0E4C")) {
    return "dolly";
  }
  return "default";
};
var RIG_THEMES = {
  handheld: { bg: "#FFF1F2", text: "#BE123C" },
  gimbal: { bg: "#F0FDFA", text: "#0D9488" },
  steadicam: { bg: "#EEF2FF", text: "#4F46E5" },
  drone: { bg: "#FFFBEB", text: "#D97706" },
  crane: { bg: "#FDF4FF", text: "#9D174D" },
  dolly: { bg: "#F0FDF4", text: "#16A34A" },
  default: { bg: "", text: "#0A0A0A" }
};
var C = {
  black: "#0A0A0A",
  dark: "#191b1d",
  mid: "#84868c",
  light: "#abb1bb",
  rule: "#D1D5DB",
  bg: "#F6F7F9",
  white: "#FFFFFF"
};
var COL_WITH_STORYBOARD = {
  start: "4.3%",
  end: "4.3%",
  duration: "2.8%",
  sceneShot: "3.6%",
  storyboard: "9.0%",
  setPeriod: "3.0%",
  location: "6.8%",
  size: "5.2%",
  angle: "7.3%",
  movement: "8.4%",
  lens: "5%",
  description: "31.2%",
  cast: "9.1%"
};
var COL_WITHOUT_STORYBOARD = {
  start: "4.6%",
  end: "4.6%",
  duration: "3.2%",
  sceneShot: "5.8%",
  storyboard: "0%",
  setPeriod: "5.4%",
  location: "9%",
  size: "5.2%",
  angle: "7.3%",
  movement: "8.6%",
  lens: "2.8%",
  description: "33.3%",
  cast: "10.2%"
};
var TABLE_HEADERS = [
  ["start", "Start"],
  ["end", "End"],
  ["duration", "Dur."],
  ["sceneShot", "Sc/Sh"],
  ["storyboard", "Storyboard"],
  ["setPeriod", "SET"],
  ["location", "Location"],
  ["size", "Size"],
  ["angle", "Angle"],
  ["movement", "Movement"],
  ["lens", "Lens"],
  ["description", "Description"],
  ["cast", "Cast"]
];
var PAGE_BOTTOM_PADDING = 44;
var PAGE_HORIZONTAL_PADDING = 24;
var NORMAL_FOOTER_BOTTOM = 16 - PAGE_BOTTOM_PADDING;
var FINAL_AD_FOOTER_BOTTOM = 12;
var FOOTER_SIDE_OFFSET = 0;
var getBreakSpan = (columns) => {
  const used = [columns.start, columns.end, columns.duration, columns.cast].map((value) => parseFloat(String(value ?? "0"))).reduce((sum, value) => sum + value, 0);
  return `${Math.max(0, 100 - used).toFixed(1)}%`;
};
var styles = import_renderer.StyleSheet.create({
  page: {
    fontFamily: "IBMPlexSansThai",
    fontSize: 7,
    color: C.black,
    backgroundColor: C.white,
    paddingTop: 24,
    paddingBottom: PAGE_BOTTOM_PADDING,
    paddingHorizontal: PAGE_HORIZONTAL_PADDING
  },
  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    marginBottom: 13,
    paddingBottom: 6
  },
  hLeft: {
    width: "18%",
    paddingRight: 10,
    borderRightWidth: 0.5,
    borderRightColor: C.rule
  },
  hCenter: {
    width: "64%",
    paddingHorizontal: 10
  },
  hRight: {
    width: "18%",
    paddingLeft: 10,
    borderLeftWidth: 0.5,
    borderLeftColor: C.rule,
    alignItems: "flex-end"
  },
  label: {
    fontSize: 6,
    color: C.mid,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1
  },
  // ── Section title ─────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 8,
    fontWeight: 600,
    color: C.black,
    borderBottomWidth: 1.5,
    borderBottomColor: C.black,
    paddingBottom: 2,
    marginBottom: 4
  },
  // ── Table ─────────────────────────────────────────────────────────────────
  tableHead: {
    flexDirection: "row",
    backgroundColor: C.black,
    paddingVertical: 3.2,
    paddingHorizontal: 10,
    alignItems: "center"
  },
  tableHeadContinuationGap: {
    height: 3.2
  },
  tableHeadCell: {
    fontSize: 6,
    color: C.white,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    paddingRight: 4
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3.1,
    paddingHorizontal: 10,
    minHeight: 17,
    alignItems: "flex-start"
  },
  cell: {
    fontSize: 6.8,
    color: C.black,
    paddingRight: 4,
    lineHeight: 1.28
  },
  cellMuted: {
    fontSize: 5.7,
    color: C.mid,
    marginTop: 1,
    paddingRight: 4,
    lineHeight: 1.25
  },
  cellBox: {
    paddingRight: 4
  },
  textColumn: {
    paddingRight: 5
  },
  breakContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 3
  },
  breakBadge: {
    fontSize: 5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    textAlign: "center"
  },
  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: NORMAL_FOOTER_BOTTOM,
    left: FOOTER_SIDE_OFFSET,
    right: FOOTER_SIDE_OFFSET,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  footerText: {
    fontSize: 6,
    color: C.light
  },
  finalAdFooter: {
    position: "absolute",
    bottom: FINAL_AD_FOOTER_BOTTOM,
    left: FOOTER_SIDE_OFFSET,
    right: FOOTER_SIDE_OFFSET,
    height: 42
  },
  finalAdLockup: {
    height: 42,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginHorizontal: PAGE_HORIZONTAL_PADDING
  },
  finalAdFooterSpacer: {
    height: 44
  },
  finalAdLeft: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    flex: 1
  },
  finalAdQr: {
    width: 32,
    height: 32
  },
  finalAdBrand: {
    fontSize: 10.3,
    color: C.dark,
    fontWeight: 600,
    lineHeight: 1.07
  },
  finalAdUrl: {
    fontSize: 6.7,
    color: C.mid,
    fontWeight: 500,
    letterSpacing: 0.2,
    marginTop: 4.3
  },
  finalAdRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    paddingLeft: 12,
    minWidth: 54
  }
});
var CrewRow = ({ role, name }) => {
  const displayName = String(name ?? "").trim() || "-";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1.5 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 6, color: C.mid, fontWeight: 600 }, children: role }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 6, color: C.black, fontWeight: 600, maxWidth: "62%", textAlign: "right" }, children: displayName })
  ] });
};
var TableCell = ({
  width,
  children,
  style
}) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: [styles.cellBox, { width }, style], children });
var ScheduleFooter = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
  import_renderer.View,
  {
    fixed: true,
    render: ({ pageNumber, totalPages }) => {
      const isLastPage = pageNumber === totalPages;
      if (isLastPage) {
        return null;
      }
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: styles.footer, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: styles.footerText, children: "Made with MentalBreakdown \xB7 Tawich P." }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: styles.footerText, children: [
          "Page ",
          pageNumber,
          " / ",
          totalPages
        ] })
      ] });
    }
  }
);
var FinalAdFooter = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
  import_renderer.View,
  {
    style: styles.finalAdFooter,
    fixed: true,
    render: ({ pageNumber, totalPages }) => {
      if (pageNumber !== totalPages) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: styles.finalAdLockup, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: styles.finalAdLeft, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Image, { src: getFontPath("mentalbreakdown-qr.png"), style: styles.finalAdQr }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: styles.finalAdBrand, children: "Made With" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: styles.finalAdBrand, children: "MentalBreakdown" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: styles.finalAdUrl, children: "mentalbreakdown.web.app" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: styles.finalAdRight, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: styles.footerText, children: [
          "Page ",
          pageNumber,
          " / ",
          totalPages
        ] }) })
      ] });
    }
  }
);
var FinalAdFooterSpacer = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: styles.finalAdFooterSpacer, wrap: false });
var ScheduleDocument = ({ headerInfo, timelineItems, imagePreviews, stats }) => {
  const h = headerInfo;
  const hasStoryboardImages = timelineItems.some((item) => item?.id && typeof imagePreviews?.[item.id] === "string" && imagePreviews[item.id].startsWith("data:image"));
  const columns = hasStoryboardImages ? COL_WITH_STORYBOARD : COL_WITHOUT_STORYBOARD;
  const tableHeaders = TABLE_HEADERS.filter(([key]) => hasStoryboardImages || key !== "storyboard");
  const breakSpan = getBreakSpan(columns);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Document, { title: `Schedule - ${fmt(h.projectTitle)}`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Page, { size: "A4", orientation: "landscape", style: styles.page, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: styles.header, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: styles.hLeft, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: styles.label, children: "Key Crew" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CrewRow, { role: "Director", name: h.director }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CrewRow, { role: "Producer", name: h.producer }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CrewRow, { role: "DOP", name: h.dop }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CrewRow, { role: "1st AD", name: h.firstAD }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CrewRow, { role: "2nd AD", name: h.secondAD }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CrewRow, { role: "PD", name: h.pd }),
        stats && (stats.shotCount || stats.totalHours) ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { borderTopWidth: 0.5, borderTopColor: C.rule, marginTop: 4, paddingTop: 4 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CrewRow, { role: "Total Shots", name: stats.shotCount ? String(stats.shotCount) : void 0 }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CrewRow, { role: "Total Time", name: stats.totalHours ? `${stats.totalHours}h ${stats.totalMinutes || 0}m` : void 0 })
        ] }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: [styles.hCenter, { justifyContent: "space-between", alignItems: "stretch" }], children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { flex: 52, justifyContent: "center", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: C.rule, paddingBottom: 1 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [styles.label, { fontSize: 5.8, letterSpacing: 0.8, marginBottom: 0.5 }], children: "Shooting Schedule" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 21, fontWeight: 600, color: C.black, textAlign: "center", lineHeight: 1.08 }, children: fmt(h.projectTitle, "UNTITLED PROJECT") })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { flex: 40, flexDirection: "row", alignItems: "stretch", gap: 5, paddingTop: 2 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { flex: 1, flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "center", paddingBottom: 2 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [styles.label, { marginBottom: 0 }], children: "Shoot Day" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: { fontSize: 14, fontWeight: 600, color: C.black, lineHeight: 0.95, marginTop: -2, marginBottom: 5 }, children: [
              "Q",
              fmt(h.shootingDay)
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: { fontSize: 5.5, fontWeight: 600, color: C.dark, lineHeight: 1, marginTop: 3.5 }, children: [
              "Out of ",
              fmt(h.totalDays)
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { flex: 1.5, flexDirection: "column", alignItems: "center", borderLeftWidth: 0.5, borderLeftColor: C.rule, borderRightWidth: 0.5, borderRightColor: C.rule, paddingHorizontal: 5, height: "100%" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [styles.label, { textAlign: "center", marginTop: 4 }], children: "Locations" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: { flex: 1, justifyContent: "center", alignItems: "center", width: "100%" }, children: h.location1 && !h.location2 && !h.location3 || !h.location1 && !h.location2 && !h.location3 && h.location ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 7.9, fontWeight: 600, color: C.black, textAlign: "center", lineHeight: 1.16 }, children: fmtWrapped(h.location1 || h.location) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { gap: 1.3, justifyContent: "center", width: "100%", marginBottom: "4" }, children: [
              h.location1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: { fontSize: 6.6, color: C.black, fontWeight: 600, textAlign: "center", lineHeight: 1.16 }, children: [
                "L1: ",
                fmtWrapped(h.location1)
              ] }),
              h.location2 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: { fontSize: 6.6, color: C.black, fontWeight: 600, textAlign: "center", lineHeight: 1.16 }, children: [
                "L2: ",
                fmtWrapped(h.location2)
              ] }),
              h.location3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: { fontSize: 6.6, color: C.black, fontWeight: 600, textAlign: "center", lineHeight: 1.16 }, children: [
                "L3: ",
                fmtWrapped(h.location3)
              ] }),
              !h.location1 && !h.location2 && !h.location3 && !h.location && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 5.5, color: C.light, textAlign: "center" }, children: "No locations specified" })
            ] }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { flex: 1, flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "center", paddingBottom: 2 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [styles.label, { marginBottom: 0 }], children: "Call Time" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 14, fontWeight: 600, color: C.black, lineHeight: 0.95, marginTop: -2, marginBottom: 5 }, children: fmt(h.callTime) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 5.5, fontWeight: 600, color: C.dark, lineHeight: 1, marginTop: 3.5 }, children: formatDate(h.date) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: styles.hRight, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { flexDirection: "column", alignItems: "flex-end", gap: 1, width: "100%", marginBottom: 2 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { backgroundColor: "#F3F4F6", borderRadius: 2, paddingVertical: 1.2, paddingHorizontal: 3, flexDirection: "row", alignItems: "center", gap: 2 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Svg, { width: "6", height: "6", viewBox: "0 0 24 24", fill: "none", stroke: "#4B5563", strokeWidth: "2.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Circle, { cx: "12", cy: "12", r: "4" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Path, { d: "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: { fontSize: 5, color: "#4B5563", fontWeight: 600 }, children: [
              fmt(h.weather, "Clear").toUpperCase(),
              " \xB7 ",
              fmt(h.temp)
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { backgroundColor: "#F3F4F6", borderRadius: 2, paddingVertical: 1.2, paddingHorizontal: 3, flexDirection: "row", alignItems: "center", gap: 2 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Svg, { width: "6", height: "6", viewBox: "0 0 24 24", fill: "none", stroke: "#4B5563", strokeWidth: "2.5", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Path, { d: "M17 18a5 5 0 0 0-10 0M12 2v7M9 5l3-3 3 3M2 22h20M12 13V9" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: { fontSize: 5, color: "#4B5563", fontWeight: 600 }, children: [
              fmt(h.sunrise),
              " \u2013 ",
              fmt(h.sunset)
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { backgroundColor: "#F3F4F6", borderRadius: 2, paddingVertical: 1.2, paddingHorizontal: 3, flexDirection: "row", alignItems: "center", gap: 2 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Svg, { width: "6", height: "6", viewBox: "0 0 24 24", fill: "none", stroke: "#4B5563", strokeWidth: "2.5", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Path, { d: "M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: { fontSize: 5, color: "#4B5563", fontWeight: 600 }, children: [
              "RAIN ",
              fmt(h.precipProb, "0%")
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: { borderTopWidth: 0.5, borderTopColor: C.rule, marginTop: 3, paddingTop: 3, width: "100%" }, children: [
          ["Crew Call", h.callTime, "crewCall"],
          ["First Shot", h.firstShotTime, "firstShot"],
          [getMealLabel(h.firstmealTime, "1st Meal"), h.firstmealTime, "firstMeal"],
          [getMealLabel(h.secondmealTime, "2nd Meal"), h.secondmealTime, "secondMeal"],
          [getMealLabel(h.thirdmealTime, "3rd Meal"), h.thirdmealTime, "thirdMeal"],
          ["Est. Wrap", h.wrapTime, "wrapTime"]
        ].map(([label, val, originalKey]) => val ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1.5 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 6.1, color: C.dark, fontWeight: 600 }, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: { fontSize: 6.1, color: C.black, fontWeight: 600 }, children: val })
        ] }, originalKey) : null) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: styles.tableHead, fixed: true, children: tableHeaders.map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [styles.tableHeadCell, { width: columns[key] }], children: label }, key)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        import_renderer.View,
        {
          fixed: true,
          render: ({ pageNumber }) => pageNumber > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: styles.tableHeadContinuationGap }) : null
        }
      ),
      timelineItems.map((item, i) => {
        const isBreak = item.type === "break";
        const movement = formatSelectValueList(item.movement);
        const rig = !isBreak ? getMovementRig(movement) : "default";
        const isAlt = i % 2 !== 0;
        let rowBg = isAlt ? C.bg : C.white;
        let textColor = C.black;
        let theme = BREAK_THEMES.break;
        let category = "break";
        if (isBreak) {
          category = getBreakCategory(item.description || "");
          theme = BREAK_THEMES[category];
          rowBg = theme.bg;
          textColor = theme.text;
        }
        const rowStyle = [styles.tableRow, { backgroundColor: rowBg }];
        if (isBreak) {
          rowStyle.push({
            borderTopWidth: 0.5,
            borderTopColor: "#D1D5DB",
            borderBottomWidth: 0.5,
            borderBottomColor: "#D1D5DB",
            alignItems: "center"
          });
        }
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { wrap: false, style: rowStyle, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { width: columns.start, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [styles.cell, { fontWeight: 600, color: textColor }], children: item.start || "--:--" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { width: columns.end, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [styles.cell, { color: C.mid }], children: item.end || "--:--" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { width: columns.duration, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [styles.cell, { color: C.mid }], children: item.duration ? `${item.duration}'` : "" }) }),
          isBreak ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { width: breakSpan, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: styles.breakContent, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [styles.cell, { fontWeight: 600, color: textColor, textAlign: "center", flex: 1 }], children: fmtWrapped(item.description, "Break") }) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { width: columns.cast, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, {}) })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, { width: columns.sceneShot, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: [styles.cell, { fontWeight: 600 }], children: [
                "Sc. ",
                normalizeInlineText(item.sceneNumber)
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.Text, { style: [styles.cellMuted, { fontSize: 5.5, marginTop: 1 }], children: [
                "Sh. ",
                item.shotNumber || "-"
              ] })
            ] }),
            hasStoryboardImages ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { width: columns.storyboard, style: { justifyContent: "center", alignItems: "flex-start" }, children: typeof imagePreviews?.[item.id] === "string" && imagePreviews[item.id].startsWith("data:image") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              import_renderer.Image,
              {
                src: imagePreviews[item.id],
                cache: false,
                style: {
                  width: "93%"
                }
              }
            ) : null }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, { width: columns.setPeriod, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: styles.cell, children: fmtWrapped(item.intExt) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [styles.cellMuted, { fontSize: 5.5, marginTop: 1 }], children: fmtWrapped(item.dayNight) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { width: columns.location, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: styles.cell, children: fmtWrapped(item.location) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { width: columns.size, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: styles.cell, children: fmtWrapped(formatSelectValueList(item.shotSize)) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { width: columns.angle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [styles.cell, { fontSize: String(item.angle || "").includes(",") ? 6.5 : 7 }], children: fmtWrapped(item.angle) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { width: columns.movement, style: { justifyContent: "center" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_renderer.View, { style: {
              flexDirection: "row",
              alignItems: "center",
              gap: 3.5
            }, children: [
              RIG_THEMES[rig].bg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.View, { style: {
                width: 2.2,
                height: 9,
                backgroundColor: RIG_THEMES[rig].text,
                borderRadius: 0.8
              } }) : null,
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [
                styles.cell,
                {
                  color: RIG_THEMES[rig].bg ? RIG_THEMES[rig].text : C.black,
                  fontSize: movement.includes("/") ? 6.5 : 7,
                  flex: 1
                }
              ], children: fmtWrapped(movement) })
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { width: columns.lens, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: styles.cell, children: item.lens ? `${String(item.lens).replace(/mm/g, "")}mm` : "-" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, { width: columns.description, style: styles.textColumn, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: styles.cell, children: fmtWrapped(item.description) }),
              item.props || item.costume || item.notes ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: [styles.cellMuted, { fontSize: 5.5, color: C.mid, marginTop: 2 }], children: fmtWrapped([
                item.props ? `Props: ${normalizeInlineText(item.props)}` : "",
                item.costume ? `Costume: ${normalizeInlineText(item.costume)}` : "",
                item.notes ? `Notes: ${normalizeInlineText(item.notes)}` : ""
              ].filter(Boolean).join(" | ")) }) : null
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { width: columns.cast, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_renderer.Text, { style: styles.cell, children: fmtWrapped(item.cast) }) })
          ] })
        ] }, item.id ?? i);
      })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FinalAdFooterSpacer, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScheduleFooter, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FinalAdFooter, {})
  ] }) });
};
var ScheduleDocument_default = ScheduleDocument;
