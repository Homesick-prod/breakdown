'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const renderer_1 = require("@react-pdf/renderer");
const selectValueFormat_1 = require("../../utils/selectValueFormat");
// Register font
const getFontPath = (filename) => {
    if (typeof window === 'undefined') {
        return `${process.cwd()}/public/${filename}`;
    }
    return `/${filename}`;
};
renderer_1.Font.register({
    family: 'IBMPlexSansThai',
    fonts: [
        { src: getFontPath('IBMPlexSansThai-Regular.ttf'), fontWeight: 400 },
        { src: getFontPath('IBMPlexSansThai-Medium.ttf'), fontWeight: 500 },
        { src: getFontPath('IBMPlexSansThai-SemiBold.ttf'), fontWeight: 600 },
        { src: getFontPath('IBMPlexSansThai-Bold.ttf'), fontWeight: 700 },
    ],
});
// ─── Helpers ──────────────────────────────────────────────────────────────
const fmt = (v, fallback = '-') => String(v ?? '').trim() || fallback;
const formatDate = (dateStr) => {
    if (!dateStr)
        return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime()))
        return dateStr;
    return d.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};
const getMealLabel = (timeStr, defaultLabel = 'Meal') => {
    if (!timeStr)
        return defaultLabel;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match)
        return defaultLabel;
    const hour = parseInt(match[1], 10);
    if (hour >= 5 && hour < 10)
        return 'Breakfast';
    if (hour >= 10 && hour < 16)
        return 'Lunch';
    if (hour >= 16 && hour < 22)
        return 'Dinner';
    return 'Supper';
};
const THAI_TEXT_RE = /[\u0E00-\u0E7F]/;
const ZERO_WIDTH_SPACE = '\u200B';
const segmentThaiText = (value) => {
    if (!THAI_TEXT_RE.test(value))
        return [value];
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
        const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
        const segments = Array.from(segmenter.segment(value), part => part.segment).filter(Boolean);
        if (segments.length > 0)
            return segments;
    }
    return Array.from(value);
};
renderer_1.Font.registerHyphenationCallback((word) => segmentThaiText(word));
const normalizeInlineText = (value, fallback = '-') => {
    const normalized = String(value ?? '').trim().replace(/,\s*/g, ', ');
    return normalized || fallback;
};
const fmtWrapped = (value, fallback = '-') => {
    const normalized = normalizeInlineText(value, fallback);
    if (normalized === fallback)
        return normalized;
    return segmentThaiText(normalized).join(ZERO_WIDTH_SPACE);
};
const getBreakLabel = (description) => {
    const value = description.toLowerCase();
    if (value.includes('wrap'))
        return 'Wrap';
    if (value.includes('lunch') || value.includes('dinner') || value.includes('meal') || value.includes('พัก'))
        return 'Break';
    if (value.includes('set'))
        return 'Setup';
    return 'Event';
};
// ─── Colors & Sizes ───────────────────────────────────────────────────────
const C = {
    black: '#0A0A0A',
    dark: '#374151',
    mid: '#6B7280',
    light: '#9CA3AF',
    rule: '#D1D5DB',
    bg: '#F2F4F7',
    white: '#FFFFFF',
    breakBg: '#FFF8E8',
    breakText: '#7C4A03',
    setupBg: '#F5F7FA',
    wrapBg: '#EEF0F3',
    handheldBg: '#F3F8FF',
    handheldText: '#2563B8',
};
const COL_WITH_STORYBOARD = {
    start: '4.6%',
    end: '4.6%',
    duration: '3.1%',
    sceneShot: '5.7%',
    storyboard: '6.5%',
    setPeriod: '5.6%',
    location: '8.8%',
    size: '5.2%',
    angle: '7.3%',
    movement: '8.4%',
    lens: '3%',
    description: '27.1%',
    cast: '10.1%',
};
const COL_WITHOUT_STORYBOARD = {
    start: '4.6%',
    end: '4.6%',
    duration: '3.2%',
    sceneShot: '5.8%',
    storyboard: '0%',
    setPeriod: '5.4%',
    location: '9%',
    size: '5.2%',
    angle: '7.3%',
    movement: '8.6%',
    lens: '2.8%',
    description: '33.3%',
    cast: '10.2%',
};
const TABLE_HEADERS = [
    ['start', 'Start'],
    ['end', 'End'],
    ['duration', 'Dur.'],
    ['sceneShot', 'Sc/Sh'],
    ['storyboard', 'Storyboard'],
    ['setPeriod', 'Set/Period'],
    ['location', 'Location'],
    ['size', 'Size'],
    ['angle', 'Angle'],
    ['movement', 'Movement'],
    ['lens', 'Lens'],
    ['description', 'Description'],
    ['cast', 'Cast'],
];
const getBreakSpan = (columns) => {
    const used = [columns.start, columns.end, columns.duration]
        .map((value) => parseFloat(String(value ?? '0')))
        .reduce((sum, value) => sum + value, 0);
    return `${Math.max(0, 100 - used).toFixed(1)}%`;
};
const styles = renderer_1.StyleSheet.create({
    page: {
        fontFamily: 'IBMPlexSansThai',
        fontSize: 7,
        color: C.black,
        backgroundColor: C.white,
        paddingTop: 24,
        paddingBottom: 28,
        paddingHorizontal: 24,
    },
    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        marginBottom: 13,
        paddingBottom: 6,
    },
    hLeft: {
        width: '18%',
        paddingRight: 10,
        borderRightWidth: 0.5,
        borderRightColor: C.rule,
    },
    hCenter: {
        width: '64%',
        paddingHorizontal: 10,
    },
    hRight: {
        width: '18%',
        paddingLeft: 10,
        borderLeftWidth: 0.5,
        borderLeftColor: C.rule,
        alignItems: 'flex-end',
    },
    label: {
        fontSize: 6,
        color: C.mid,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 1,
    },
    // ── Section title ─────────────────────────────────────────────────────────
    sectionTitle: {
        fontSize: 8,
        fontWeight: 600,
        color: C.black,
        borderBottomWidth: 1.5,
        borderBottomColor: C.black,
        paddingBottom: 2,
        marginBottom: 4,
    },
    // ── Table ─────────────────────────────────────────────────────────────────
    tableHead: {
        flexDirection: 'row',
        backgroundColor: C.black,
        paddingVertical: 3.2,
        paddingHorizontal: 10,
        alignItems: 'center',
    },
    tableHeadCell: {
        fontSize: 6,
        color: C.white,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        paddingRight: 4,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 3.1,
        paddingHorizontal: 10,
        minHeight: 17,
        alignItems: 'flex-start',
    },
    cell: {
        fontSize: 6.8,
        color: C.black,
        paddingRight: 4,
        lineHeight: 1.28,
    },
    cellMuted: {
        fontSize: 5.7,
        color: C.mid,
        marginTop: 1,
        paddingRight: 4,
        lineHeight: 1.25,
    },
    cellBox: {
        paddingRight: 4,
    },
    textColumn: {
        paddingRight: 5,
    },
    breakContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    breakBadge: {
        fontSize: 5.2,
        color: C.mid,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        width: 28,
    },
    // ── Footer ────────────────────────────────────────────────────────────────
    footer: {
        position: 'absolute',
        bottom: 16,
        left: 24,
        right: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 0.5,
        borderTopColor: C.rule,
        paddingTop: 3,
    },
    footerText: {
        fontSize: 6,
        color: C.light,
    },
});
// ─── Sub-components ───────────────────────────────────────────────────────────
const CrewRow = ({ role, name }) => {
    const displayName = String(name ?? '').trim() || '-';
    return ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1.5 }, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: 6, color: C.mid, fontWeight: 600 }, children: role }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: 6, color: C.black, fontWeight: 600, maxWidth: '62%', textAlign: 'right' }, children: displayName })] }));
};
const TableCell = ({ width, children, style, }) => ((0, jsx_runtime_1.jsx)(renderer_1.View, { style: [styles.cellBox, { width }, style], children: children }));
// ─── Main Document ─────────────────────────────────────────────────────────────
const ScheduleDocument = ({ headerInfo, timelineItems, imagePreviews, stats }) => {
    const h = headerInfo;
    const hasStoryboardImages = timelineItems.some((item) => item?.id && imagePreviews?.[item.id]);
    const columns = hasStoryboardImages ? COL_WITH_STORYBOARD : COL_WITHOUT_STORYBOARD;
    const tableHeaders = TABLE_HEADERS.filter(([key]) => hasStoryboardImages || key !== 'storyboard');
    const breakSpan = getBreakSpan(columns);
    return ((0, jsx_runtime_1.jsx)(renderer_1.Document, { title: `Schedule - ${fmt(h.projectTitle)}`, children: (0, jsx_runtime_1.jsxs)(renderer_1.Page, { size: "A4", orientation: "landscape", style: styles.page, children: [(0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.header, children: [(0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.hLeft, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.label, children: "Key Crew" }), (0, jsx_runtime_1.jsx)(CrewRow, { role: "Director", name: h.director }), (0, jsx_runtime_1.jsx)(CrewRow, { role: "Producer", name: h.producer }), (0, jsx_runtime_1.jsx)(CrewRow, { role: "DOP", name: h.dop }), (0, jsx_runtime_1.jsx)(CrewRow, { role: "1st AD", name: h.firstAD }), (0, jsx_runtime_1.jsx)(CrewRow, { role: "2nd AD", name: h.secondAD }), (0, jsx_runtime_1.jsx)(CrewRow, { role: "PD", name: h.pd }), stats && (stats.shotCount || stats.totalHours) ? ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { borderTopWidth: 0.5, borderTopColor: C.rule, marginTop: 4, paddingTop: 4 }, children: [(0, jsx_runtime_1.jsx)(CrewRow, { role: "Total Shots", name: stats.shotCount ? String(stats.shotCount) : undefined }), (0, jsx_runtime_1.jsx)(CrewRow, { role: "Total Time", name: stats.totalHours ? `${stats.totalHours}h ${stats.totalMinutes || 0}m` : undefined })] })) : null] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: [styles.hCenter, { justifyContent: 'space-between', alignItems: 'stretch' }], children: [(0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { flex: 52, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: C.rule, paddingBottom: 1 }, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.label, { fontSize: 5.8, letterSpacing: 0.8, marginBottom: 0.5 }], children: "Shooting Schedule" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: 21, fontWeight: 600, color: C.black, textAlign: 'center', lineHeight: 1.08 }, children: fmt(h.projectTitle, 'UNTITLED PROJECT') })] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { flex: 40, flexDirection: 'row', alignItems: 'stretch', gap: 5, paddingTop: 2 }, children: [(0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { flex: 1, flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'center', paddingBottom: 2 }, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.label, { marginBottom: 0 }], children: "Shoot Day" }), (0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: { fontSize: 14, fontWeight: 600, color: C.black, lineHeight: 0.95, marginTop: -4, marginBottom: 5 }, children: ["Q", fmt(h.shootingDay)] }), (0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: { fontSize: 5.3, fontWeight: 600, color: C.mid, lineHeight: 1, marginTop: 0 }, children: ["Out of ", fmt(h.totalDays)] })] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { flex: 1.5, flexDirection: 'column', alignItems: 'center', borderLeftWidth: 0.5, borderLeftColor: C.rule, borderRightWidth: 0.5, borderRightColor: C.rule, paddingHorizontal: 5, height: '100%' }, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.label, { textAlign: 'center', marginTop: 1 }], children: "Locations" }), (0, jsx_runtime_1.jsx)(renderer_1.View, { style: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }, children: ((h.location1 && !h.location2 && !h.location3) || (!h.location1 && !h.location2 && !h.location3 && h.location)) ? ((0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: 7.7, fontWeight: 600, color: C.black, textAlign: 'center', lineHeight: 1.18 }, children: fmtWrapped(h.location1 || h.location) })) : ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { gap: 1.3, justifyContent: 'center', width: '100%' }, children: [h.location1 && ((0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: { fontSize: 6.4, color: C.black, fontWeight: 600, textAlign: 'center', lineHeight: 1.18 }, children: ["L1: ", fmtWrapped(h.location1)] })), h.location2 && ((0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: { fontSize: 6.4, color: C.black, fontWeight: 600, textAlign: 'center', lineHeight: 1.18 }, children: ["L2: ", fmtWrapped(h.location2)] })), h.location3 && ((0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: { fontSize: 6.4, color: C.black, fontWeight: 600, textAlign: 'center', lineHeight: 1.18 }, children: ["L3: ", fmtWrapped(h.location3)] })), !h.location1 && !h.location2 && !h.location3 && !h.location && ((0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: 5.5, color: C.light, textAlign: 'center' }, children: "No locations specified" }))] })) })] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { flex: 1, flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'center', paddingBottom: 2 }, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.label, { marginBottom: 0 }], children: "Call Time" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: 14, fontWeight: 600, color: C.black, lineHeight: 0.95, marginTop: -4, marginBottom: 5 }, children: fmt(h.callTime) }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: 5.3, fontWeight: 600, color: C.mid, lineHeight: 1, marginTop: 0 }, children: formatDate(h.date) })] })] })] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.hRight, children: [(0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { flexDirection: 'column', alignItems: 'flex-end', gap: 1, width: '100%', marginBottom: 2 }, children: [(0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { backgroundColor: '#F3F4F6', borderRadius: 2, paddingVertical: 1.2, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', gap: 2 }, children: [(0, jsx_runtime_1.jsxs)(renderer_1.Svg, { width: "6", height: "6", viewBox: "0 0 24 24", fill: "none", stroke: "#4B5563", strokeWidth: "2.5", children: [(0, jsx_runtime_1.jsx)(renderer_1.Circle, { cx: "12", cy: "12", r: "4" }), (0, jsx_runtime_1.jsx)(renderer_1.Path, { d: "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" })] }), (0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: { fontSize: 5, color: '#4B5563', fontWeight: 600 }, children: [fmt(h.weather, 'Clear').toUpperCase(), " \u00B7 ", fmt(h.temp)] })] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { backgroundColor: '#F3F4F6', borderRadius: 2, paddingVertical: 1.2, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', gap: 2 }, children: [(0, jsx_runtime_1.jsx)(renderer_1.Svg, { width: "6", height: "6", viewBox: "0 0 24 24", fill: "none", stroke: "#4B5563", strokeWidth: "2.5", children: (0, jsx_runtime_1.jsx)(renderer_1.Path, { d: "M17 18a5 5 0 0 0-10 0M12 2v7M9 5l3-3 3 3M2 22h20M12 13V9" }) }), (0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: { fontSize: 5, color: '#4B5563', fontWeight: 600 }, children: [fmt(h.sunrise), " \u2013 ", fmt(h.sunset)] })] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { backgroundColor: '#F3F4F6', borderRadius: 2, paddingVertical: 1.2, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', gap: 2 }, children: [(0, jsx_runtime_1.jsx)(renderer_1.Svg, { width: "6", height: "6", viewBox: "0 0 24 24", fill: "none", stroke: "#4B5563", strokeWidth: "2.5", children: (0, jsx_runtime_1.jsx)(renderer_1.Path, { d: "M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" }) }), (0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: { fontSize: 5, color: '#4B5563', fontWeight: 600 }, children: ["RAIN ", fmt(h.precipProb, '0%')] })] })] }), (0, jsx_runtime_1.jsx)(renderer_1.View, { style: { borderTopWidth: 0.5, borderTopColor: C.rule, marginTop: 3, paddingTop: 3, width: '100%' }, children: [
                                        ['Crew Call', h.callTime, 'crewCall'],
                                        ['First Shot', h.firstShotTime, 'firstShot'],
                                        [getMealLabel(h.firstmealTime, '1st Meal'), h.firstmealTime, 'firstMeal'],
                                        [getMealLabel(h.secondmealTime, '2nd Meal'), h.secondmealTime, 'secondMeal'],
                                        [getMealLabel(h.thirdmealTime, '3rd Meal'), h.thirdmealTime, 'thirdMeal'],
                                        ['Est. Wrap', h.wrapTime, 'wrapTime'],
                                    ].map(([label, val, originalKey]) => val ? ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1.5 }, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: 6, color: C.mid, fontWeight: 600 }, children: label }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: 6, color: C.black, fontWeight: 600 }, children: val })] }, originalKey)) : null) })] })] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { children: [(0, jsx_runtime_1.jsx)(renderer_1.View, { style: styles.tableHead, fixed: true, children: tableHeaders.map(([key, label]) => ((0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: columns[key] }], children: label }, key))) }), timelineItems.map((item, i) => {
                            const isBreak = item.type === 'break';
                            const desc = (item.description || '').toLowerCase();
                            const movement = (0, selectValueFormat_1.formatSelectValueList)(item.movement);
                            const isHandheld = !isBreak && movement.toLowerCase().includes('hand');
                            const isAlt = i % 2 !== 0;
                            let rowBg = isAlt ? C.bg : C.white;
                            let textColor = C.black;
                            if (isBreak) {
                                if (desc.includes('wrap')) {
                                    rowBg = C.wrapBg;
                                    textColor = C.dark;
                                }
                                else if (desc.includes('lunch') || desc.includes('dinner')) {
                                    rowBg = C.breakBg;
                                    textColor = C.breakText;
                                }
                                else if (desc.includes('set')) {
                                    rowBg = C.setupBg;
                                    textColor = C.dark;
                                }
                                else {
                                    rowBg = C.bg;
                                }
                            }
                            else if (isHandheld) {
                                rowBg = C.handheldBg;
                            }
                            return ((0, jsx_runtime_1.jsxs)(renderer_1.View, { wrap: false, style: [styles.tableRow, { backgroundColor: rowBg }], children: [(0, jsx_runtime_1.jsx)(TableCell, { width: columns.start, children: (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.cell, { fontWeight: 600, color: textColor }], children: item.start || '--:--' }) }), (0, jsx_runtime_1.jsx)(TableCell, { width: columns.end, children: (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.cell, { color: C.mid }], children: item.end || '--:--' }) }), (0, jsx_runtime_1.jsx)(TableCell, { width: columns.duration, children: (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.cell, { color: C.mid }], children: item.duration ? `${item.duration}'` : '' }) }), isBreak ? ((0, jsx_runtime_1.jsx)(TableCell, { width: breakSpan, children: (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.breakContent, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.breakBadge, children: getBreakLabel(item.description || '') }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.cell, { fontWeight: 600, color: textColor, flex: 1 }], children: fmtWrapped(item.description, 'Break') })] }) })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(TableCell, { width: columns.sceneShot, children: [(0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: [styles.cell, { fontWeight: 600 }], children: ["Sc. ", normalizeInlineText(item.sceneNumber)] }), (0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: [styles.cellMuted, { fontSize: 5.5, marginTop: 1 }], children: ["Sh. ", item.shotNumber || '-'] })] }), hasStoryboardImages ? ((0, jsx_runtime_1.jsx)(TableCell, { width: columns.storyboard, style: { justifyContent: 'center', alignItems: 'center' }, children: imagePreviews && imagePreviews[item.id] ? ((0, jsx_runtime_1.jsx)(renderer_1.Image, { src: imagePreviews[item.id], style: {
                                                        width: '100%',
                                                        height: 22,
                                                        borderRadius: 2,
                                                        objectFit: 'cover',
                                                    } })) : null })) : null, (0, jsx_runtime_1.jsxs)(TableCell, { width: columns.setPeriod, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.cell, children: fmtWrapped(item.intExt) }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.cellMuted, { fontSize: 5.5, marginTop: 1 }], children: fmtWrapped(item.dayNight) })] }), (0, jsx_runtime_1.jsx)(TableCell, { width: columns.location, children: (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.cell, children: fmtWrapped(item.location) }) }), (0, jsx_runtime_1.jsx)(TableCell, { width: columns.size, children: (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.cell, children: fmtWrapped((0, selectValueFormat_1.formatSelectValueList)(item.shotSize)) }) }), (0, jsx_runtime_1.jsx)(TableCell, { width: columns.angle, children: (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.cell, { fontSize: String(item.angle || '').includes(',') ? 6.5 : 7 }], children: fmtWrapped(item.angle) }) }), (0, jsx_runtime_1.jsx)(TableCell, { width: columns.movement, children: (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.cell, { color: isHandheld ? C.handheldText : C.black, fontSize: movement.includes('/') ? 6.5 : 7 }], children: fmtWrapped(movement) }) }), (0, jsx_runtime_1.jsx)(TableCell, { width: columns.lens, children: (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.cell, children: item.lens ? `${String(item.lens).replace(/mm/g, '')}mm` : '-' }) }), (0, jsx_runtime_1.jsxs)(TableCell, { width: columns.description, style: styles.textColumn, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.cell, children: fmtWrapped(item.description) }), (item.props || item.costume || item.notes) ? ((0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.cellMuted, { fontSize: 5.5, color: C.mid, marginTop: 2 }], children: fmtWrapped([
                                                            item.props ? `Props: ${normalizeInlineText(item.props)}` : '',
                                                            item.costume ? `Costume: ${normalizeInlineText(item.costume)}` : '',
                                                            item.notes ? `Notes: ${normalizeInlineText(item.notes)}` : '',
                                                        ].filter(Boolean).join(' | ')) })) : null] }), (0, jsx_runtime_1.jsx)(TableCell, { width: columns.cast, children: (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.cell, children: fmtWrapped(item.cast) }) })] }))] }, item.id ?? i));
                        })] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.footer, fixed: true, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.footerText, children: "Made with MentalBreakdown \u00B7 Tawich P." }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.footerText, render: ({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}` })] })] }) }));
};
exports.default = ScheduleDocument;
