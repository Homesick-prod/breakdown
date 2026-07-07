'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const renderer_1 = require("@react-pdf/renderer");
const selectValueFormat_1 = require("../../utils/selectValueFormat");
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
// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v, fallback = '-') => String(v ?? '').trim() || fallback;
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
const summarizeScenes = (items) => {
    const s = new Set();
    items.forEach(i => { if (i?.type === 'shot' && i.sceneNumber)
        s.add(String(i.sceneNumber)); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join(', ') || '-';
};
const summarizeAction = (item) => {
    const descriptions = item?.underlyingItems?.length
        ? item.underlyingItems.map((shot) => shot.description).filter(Boolean)
        : [item?.description].filter(Boolean);
    const unique = Array.from(new Set(descriptions.map((desc) => normalizeInlineText(desc, '')))).filter(Boolean);
    if (unique.length <= 2)
        return unique.join(' | ') || '-';
    return `${unique.slice(0, 2).join(' | ')} +${unique.length - 2} shots`;
};
// ─── Styles ───────────────────────────────────────────────────────────────────
const C = {
    black: '#0A0A0A',
    darkGray: '#374151',
    midGray: '#6B7280',
    lightGray: '#9CA3AF',
    rule: '#D1D5DB',
    bg: '#F2F4F7',
    softBg: '#F9FAFB',
    white: '#FFFFFF',
    amber: '#D97706',
    breakBg: '#FFF8E8',
    breakText: '#7C4A03',
    wrapBg: '#EEF0F3',
    danger: '#DC2626',
    blue: '#2563B8',
};
const F = {
    regular: 'IBMPlexSansThai',
    size: {
        xs: 6.5,
        sm: 7.5,
        base: 8.5,
        md: 10,
        lg: 14,
        xl: 20,
        hero: 26,
    },
};
const styles = renderer_1.StyleSheet.create({
    page: {
        fontFamily: F.regular,
        fontSize: F.size.sm,
        color: C.black,
        backgroundColor: C.white,
        paddingTop: 24,
        paddingBottom: 28,
        paddingHorizontal: 26,
    },
    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        marginBottom: 12,
        paddingBottom: 9,
        borderBottomWidth: 1,
        borderBottomColor: C.rule,
    },
    headerLeft: {
        width: '28%',
        paddingRight: 12,
        borderRightWidth: 1,
        borderRightColor: C.rule,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    headerRight: {
        width: '28%',
        paddingLeft: 12,
        borderLeftWidth: 1,
        borderLeftColor: C.rule,
        alignItems: 'flex-end',
    },
    // ── Text helpers ──────────────────────────────────────────────────────────
    label: {
        fontSize: F.size.xs,
        color: C.midGray,
        fontWeight: 600,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        marginBottom: 1,
    },
    value: {
        fontSize: F.size.sm,
        color: C.black,
        fontWeight: 600,
    },
    muted: {
        fontSize: F.size.xs,
        color: C.midGray,
    },
    // ── Section ───────────────────────────────────────────────────────────────
    section: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: F.size.base,
        fontWeight: 600,
        color: C.black,
        borderBottomWidth: 1.5,
        borderBottomColor: C.black,
        paddingBottom: 2,
        marginBottom: 5,
    },
    // ── Table ─────────────────────────────────────────────────────────────────
    tableHead: {
        flexDirection: 'row',
        backgroundColor: C.black,
        paddingVertical: 3.2,
        paddingHorizontal: 8,
    },
    tableHeadCell: {
        fontSize: F.size.xs,
        color: C.white,
        fontWeight: 600,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: C.rule,
        paddingVertical: 3.5,
        paddingHorizontal: 8,
    },
    tableRowAlt: {
        backgroundColor: C.bg,
    },
    tableCell: {
        fontSize: 7.1,
        color: C.black,
        lineHeight: 1.3,
    },
    tableCellMuted: {
        fontSize: 6.1,
        color: C.midGray,
        marginTop: 1,
        lineHeight: 1.25,
    },
    // ── Mini row (crew/time grids) ────────────────────────────────────────────
    miniRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    miniLabel: {
        fontSize: F.size.xs,
        color: C.midGray,
        fontWeight: 600,
    },
    miniValue: {
        fontSize: F.size.xs,
        color: C.black,
        fontWeight: 600,
    },
    // ── Note card ─────────────────────────────────────────────────────────────
    noteCard: {
        flex: 1,
        borderWidth: 0.5,
        borderColor: C.rule,
        borderRadius: 3,
        padding: 5,
        minHeight: 42,
    },
    noteText: {
        fontSize: F.size.xs,
        color: C.darkGray,
        lineHeight: 1.4,
    },
    // ── Footer ────────────────────────────────────────────────────────────────
    footer: {
        position: 'absolute',
        bottom: 14,
        left: 28,
        right: 28,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 0.5,
        borderTopColor: C.rule,
        paddingTop: 4,
    },
    footerText: {
        fontSize: F.size.xs,
        color: C.lightGray,
    },
});
// ─── Sub-components ───────────────────────────────────────────────────────────
const CrewRow = ({ role, name }) => {
    const displayName = String(name ?? '').trim() || '-';
    return ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.miniRow, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.miniLabel, children: role }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.miniValue, { maxWidth: '65%', textAlign: 'right' }], children: displayName })] }));
};
const TimeRow = ({ label, value }) => ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.miniRow, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.miniLabel, children: label }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.miniValue, children: fmt(value) })] }));
// ─── Main Document ─────────────────────────────────────────────────────────────
const groupTimelineItemsForCallSheet = (items) => {
    const result = [];
    let currentGroup = null;
    items.forEach((item) => {
        if (item.type === 'break') {
            if (currentGroup) {
                result.push(currentGroup);
                currentGroup = null;
            }
            result.push(item);
        }
        else {
            const sceneNum = (item.sceneNumber || '').trim();
            if (!sceneNum) {
                if (currentGroup) {
                    result.push(currentGroup);
                    currentGroup = null;
                }
                result.push({
                    ...item,
                    underlyingItems: [item]
                });
            }
            else {
                if (currentGroup && currentGroup.sceneNumber === sceneNum) {
                    currentGroup.underlyingItems.push(item);
                    currentGroup.duration += Number(item.duration || 0);
                    currentGroup.end = item.end;
                    const shotNumbers = currentGroup.underlyingItems.map((ui) => ui.shotNumber).filter(Boolean);
                    currentGroup.shotNumber = shotNumbers.length > 0 ? shotNumbers.join(', ') : '';
                    const unionCSV = (a, b) => {
                        const set = new Set([...(a || '').split(',').map(s => s.trim()), ...(b || '').split(',').map(s => s.trim())].filter(Boolean));
                        return Array.from(set).join(', ');
                    };
                    currentGroup.cast = unionCSV(currentGroup.cast, item.cast);
                    if (!currentGroup.sceneCast && item.sceneCast) {
                        currentGroup.sceneCast = item.sceneCast;
                    }
                    currentGroup.props = unionCSV(currentGroup.props, item.props);
                    currentGroup.costume = unionCSV(currentGroup.costume, item.costume);
                    const currentDescription = String(currentGroup.description || '');
                    if (item.description && !currentDescription.includes(item.description)) {
                        currentGroup.description = currentGroup.description
                            ? `${currentGroup.description} | ${item.description}`
                            : item.description;
                    }
                    const combineCamera = (field) => {
                        const val = field === 'shotSize' || field === 'movement'
                            ? (0, selectValueFormat_1.formatSelectValueList)(item[field], '')
                            : item[field];
                        const currentValue = String(currentGroup[field] || '');
                        if (val && !currentValue.includes(val)) {
                            currentGroup[field] = currentGroup[field] ? `${currentGroup[field]} · ${val}` : val;
                        }
                    };
                    combineCamera('shotSize');
                    combineCamera('angle');
                    combineCamera('movement');
                    if (item.lens) {
                        const lensVal = String(item.lens).replace(/mm/g, '') + 'mm';
                        const currentLens = String(currentGroup.lens || '');
                        if (!currentLens.includes(lensVal)) {
                            currentGroup.lens = currentGroup.lens ? `${currentGroup.lens} · ${lensVal}` : lensVal;
                        }
                    }
                    const currentNotes = String(currentGroup.notes || '');
                    if (item.notes && !currentNotes.includes(item.notes)) {
                        currentGroup.notes = currentGroup.notes
                            ? `${currentGroup.notes} | ${item.notes}`
                            : item.notes;
                    }
                }
                else {
                    if (currentGroup) {
                        result.push(currentGroup);
                    }
                    currentGroup = {
                        ...item,
                        id: `scene-group-${sceneNum}-${item.id}`,
                        type: 'scene-group',
                        duration: Number(item.duration || 0),
                        underlyingItems: [item]
                    };
                }
            }
        }
    });
    if (currentGroup) {
        result.push(currentGroup);
    }
    return result.map(group => {
        if (group.type === 'scene-group') {
            return {
                ...group,
                cast: group.sceneCast || group.cast
            };
        }
        return group;
    });
};
const CallSheetDocument = ({ headerInfo, timelineItems, callSheetData, stats }) => {
    const h = headerInfo;
    const cs = callSheetData;
    const castCalls = cs.castCalls ?? [];
    const generalCall = fmt(cs.generalCall || h.callTime);
    const loc1 = fmt(h.location1 || h.location);
    const loc2 = h.location2 ? fmt(h.location2) : null;
    const loc3 = h.location3 ? fmt(h.location3) : null;
    const scenes = summarizeScenes(timelineItems);
    const shots = timelineItems.filter(i => i?.type === 'shot');
    const firstShot = shots[0];
    const shootingCall = fmt(h.firstShotTime || firstShot?.start || h.callTime);
    const hasEmergencyInfo = Boolean(cs.emergencyContact || cs.nearestHospital || cs.hospitalAddress || cs.safetyNotes);
    const hasProductionNotes = Boolean(cs.departmentNotes || cs.transportNotes || cs.parkingNotes || cs.lineRemarks);
    const groupedItems = react_1.default.useMemo(() => groupTimelineItemsForCallSheet(timelineItems), [timelineItems]);
    return ((0, jsx_runtime_1.jsx)(renderer_1.Document, { title: `Call Sheet - ${fmt(h.projectTitle)}`, children: (0, jsx_runtime_1.jsxs)(renderer_1.Page, { size: "A4", style: styles.page, children: [(0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.header, children: [(0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.headerLeft, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.label, { marginBottom: 6 }], children: "Key Crew" }), (0, jsx_runtime_1.jsx)(CrewRow, { role: "Director", name: h.director }), (0, jsx_runtime_1.jsx)(CrewRow, { role: "Producer", name: h.producer }), (0, jsx_runtime_1.jsx)(CrewRow, { role: "DOP", name: h.dop }), (0, jsx_runtime_1.jsx)(CrewRow, { role: "1st AD", name: h.firstAD }), (0, jsx_runtime_1.jsx)(CrewRow, { role: "2nd AD", name: h.secondAD }), (0, jsx_runtime_1.jsx)(CrewRow, { role: "Prod. Designer", name: h.pd })] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.headerCenter, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.label, children: "Production Call Sheet" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: F.size.lg, fontWeight: 600, color: C.black, marginTop: 2, textAlign: 'center', lineHeight: 1.15 }, children: fmtWrapped(h.projectTitle, 'Untitled Project') }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.label, { marginTop: 8 }], children: "General Call Time" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: F.size.hero, fontWeight: 600, color: C.black, lineHeight: 1 }, children: generalCall })] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.headerRight, children: [(0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: { fontSize: F.size.xs, color: C.midGray, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }, children: ["Day ", fmt(h.shootingDay), " of ", fmt(h.totalDays)] }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: F.size.md, fontWeight: 600, color: C.black, marginTop: 1, textAlign: 'right' }, children: formatDate(h.date) }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.muted, { textAlign: 'right', marginTop: 2 }], children: fmtWrapped(h.weather, 'Clear') }), (0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: [styles.muted, { textAlign: 'right' }], children: [fmt(h.temp), " / Feels ", fmt(h.realFeel)] }), (0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: [styles.muted, { textAlign: 'right', marginBottom: 2 }], children: ["Rain ", fmt(h.precipProb), " \u00B7 Sun ", fmt(h.sunrise), " - ", fmt(h.sunset)] })] })] }), (0, jsx_runtime_1.jsx)(renderer_1.View, { style: { flexDirection: 'row', gap: 6, marginBottom: 12 }, children: [
                        { label: 'Crew Call', val: generalCall, color: C.black },
                        { label: 'Shooting Call', val: shootingCall, color: C.black },
                        { label: 'Lunch (Meal 1)', val: h.firstmealTime, color: C.amber },
                        { label: 'Dinner (Meal 2)', val: h.secondmealTime, color: C.amber },
                        { label: 'Meal 3', val: h.thirdmealTime, color: C.amber },
                        { label: 'Est. Wrap', val: h.wrapTime, color: C.black },
                    ].map((item) => {
                        if (!item.val)
                            return null;
                        return ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: {
                                flex: 1,
                                borderWidth: 1,
                                borderColor: C.rule,
                                borderRadius: 4,
                                paddingVertical: 5,
                                paddingHorizontal: 6,
                                alignItems: 'center',
                                backgroundColor: C.softBg,
                            }, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: 5.5, color: C.midGray, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }, children: item.label }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: 11, fontWeight: 600, color: item.color }, children: item.val })] }, item.label));
                    }) }), (cs.safetyNotes || cs.departmentNotes) && ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: {
                        backgroundColor: C.softBg,
                        borderLeftWidth: 3,
                        borderLeftColor: C.amber,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        marginBottom: 12,
                        borderRadius: 2,
                    }, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: F.size.xs, fontWeight: 600, color: C.amber, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }, children: "Important Notice" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.noteText, { color: C.darkGray }], children: fmtWrapped(cs.safetyNotes || cs.departmentNotes) })] })), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.section, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.sectionTitle, children: "Locations" }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.tableHead, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '5%' }], children: "#" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '47%' }], children: "Set Location" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '48%' }], children: "Parking / Notes" })] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.tableRow, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '5%', fontWeight: 600 }], children: "1" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '47%' }], children: fmtWrapped(loc1) }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '48%' }], children: fmtWrapped(cs.parkingNotes || cs.transportNotes, '') })] }), loc2 && ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: [styles.tableRow, styles.tableRowAlt], children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '5%', fontWeight: 600 }], children: "2" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '47%' }], children: fmtWrapped(loc2) }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '48%' }], children: fmtWrapped(cs.transportNotes, '') })] })), loc3 && ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: [styles.tableRow, !loc2 ? styles.tableRowAlt : {}], children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '5%', fontWeight: 600 }], children: "3" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '47%' }], children: fmtWrapped(loc3) }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '48%' }], children: fmtWrapped(cs.transportNotes, '') })] }))] }), hasEmergencyInfo && ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { flexDirection: 'row', gap: 8, marginBottom: 10 }, children: [(cs.nearestHospital || cs.hospitalAddress) && ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: [styles.noteCard, { flex: 1, borderLeftWidth: 3, borderLeftColor: C.danger }], children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.label, { color: C.danger, marginBottom: 2 }], children: "Nearest Hospital" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: F.size.xs, fontWeight: 600, color: C.black }, children: fmtWrapped(cs.nearestHospital, '') }), cs.hospitalAddress ? ((0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: F.size.xs, color: C.midGray, marginTop: 1, lineHeight: 1.35 }, children: fmtWrapped(cs.hospitalAddress, '') })) : null] })), (cs.emergencyContact || cs.safetyNotes) && ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: [styles.noteCard, { flex: 1, borderLeftWidth: 3, borderLeftColor: C.blue }], children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.label, { color: C.blue, marginBottom: 2 }], children: "Emergency / Safety" }), cs.emergencyContact ? ((0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: F.size.xs, fontWeight: 600, color: C.black, lineHeight: 1.35 }, children: fmtWrapped(cs.emergencyContact, '') })) : null, cs.safetyNotes ? ((0, jsx_runtime_1.jsx)(renderer_1.Text, { style: { fontSize: F.size.xs, color: C.midGray, marginTop: 1, lineHeight: 1.35 }, children: fmtWrapped(cs.safetyNotes, '') })) : null] }))] })), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.section, children: [(0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: styles.sectionTitle, children: ["Schedule  \u00B7  Scenes: ", scenes, "  \u00B7  ", stats.shotCount ?? 0, " shots  \u00B7  ", stats.totalHours ?? 0, "h ", stats.totalMinutes ?? 0, "m"] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.tableHead, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '8%' }], children: "Start" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '6%' }], children: "Dur." }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '10%' }], children: "Sc/Sh" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '12%' }], children: "Set" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '36%' }], children: "Action" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '14%' }], children: "Cast" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '14%' }], children: "Notes" })] }), groupedItems.map((item, i) => {
                            const isBreak = item.type === 'break';
                            const isAlt = i % 2 !== 0;
                            const desc = (item.description || '').toLowerCase();
                            let rowBg = isAlt ? C.bg : C.white;
                            let textColor = C.black;
                            if (isBreak) {
                                if (desc.includes('wrap')) {
                                    rowBg = C.wrapBg;
                                    textColor = C.darkGray;
                                }
                                else {
                                    rowBg = C.breakBg;
                                    textColor = C.breakText;
                                }
                            }
                            const shotMeta = [item.intExt, item.dayNight].filter(Boolean).join(' · ');
                            const cameraMeta = [
                                (0, selectValueFormat_1.formatSelectValueList)(item.shotSize, ''),
                                item.angle,
                                (0, selectValueFormat_1.formatSelectValueList)(item.movement, ''),
                                item.lens ? `${String(item.lens).replace(/mm/g, '')}mm` : ''
                            ].filter(Boolean).join(' · ');
                            return ((0, jsx_runtime_1.jsxs)(renderer_1.View, { wrap: false, style: [styles.tableRow, { backgroundColor: rowBg }], children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '8%', fontWeight: 600, color: textColor }], children: item.start || '--:--' }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '6%', color: C.midGray }], children: item.duration ? `${item.duration}'` : '' }), isBreak ? ((0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '86%', fontWeight: 600, color: textColor }], children: fmtWrapped(item.description, 'Break') })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { width: '10%' }, children: [(0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: [styles.tableCell, { fontWeight: 600 }], children: ["Sc. ", normalizeInlineText(item.sceneNumber)] }), (0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: styles.tableCellMuted, children: ["Sh. ", item.shotNumber || '-'] })] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { width: '12%' }, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.tableCell, children: fmtWrapped(item.location || loc1) }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.tableCellMuted, children: fmtWrapped(shotMeta, '') })] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { width: '36%', paddingRight: 5 }, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.tableCell, children: fmtWrapped(summarizeAction(item)) }), cameraMeta ? (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.tableCellMuted, children: fmtWrapped(cameraMeta, '') }) : null] }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '14%' }], children: fmtWrapped(item.cast) }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { width: '14%' }, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.tableCellMuted, children: fmtWrapped(item.notes, '') }), item.props ? (0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: styles.tableCellMuted, children: ["Props: ", fmtWrapped(item.props, '')] }) : null] })] }))] }, item.id ?? i));
                        })] }), castCalls.length > 0 && ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.section, children: [(0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: styles.sectionTitle, children: ["Cast  \u00B7  ", castCalls.length, " on call"] }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.tableHead, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '6%' }], children: "ID" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '28%' }], children: "Cast Member" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '26%' }], children: "Role / Character" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '14%' }], children: "Call Time" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableHeadCell, { width: '26%' }], children: "Notes" })] }), castCalls.map((c, i) => ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: [styles.tableRow, ...(i % 2 !== 0 ? [styles.tableRowAlt] : [])], children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '6%', color: C.lightGray, fontWeight: 600 }], children: String(i + 1).padStart(2, '0') }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '28%', fontWeight: 600 }], children: fmtWrapped(c.name) }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '26%' }], children: fmtWrapped(c.role) }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '14%', fontWeight: 600 }], children: fmt(c.callTime) }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.tableCell, { width: '26%' }], children: fmtWrapped(c.notes, '') })] }, c.id ?? i)))] })), hasProductionNotes && ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.section, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.sectionTitle, children: "Production Notes" }), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: { flexDirection: 'row', gap: 8 }, children: [cs.departmentNotes ? ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: [styles.noteCard, { borderLeftWidth: 2, borderLeftColor: C.darkGray }], children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.label, { marginBottom: 2 }], children: "Departments" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.noteText, children: fmtWrapped(cs.departmentNotes, '') })] })) : null, (cs.parkingNotes || cs.transportNotes) ? ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: [styles.noteCard, { borderLeftWidth: 2, borderLeftColor: C.blue }], children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.label, { marginBottom: 2 }], children: "Parking / Transport" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.noteText, children: fmtWrapped([cs.parkingNotes, cs.transportNotes].filter(Boolean).join(' | '), '') })] })) : null, cs.lineRemarks ? ((0, jsx_runtime_1.jsxs)(renderer_1.View, { style: [styles.noteCard, { borderLeftWidth: 2, borderLeftColor: C.amber }], children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: [styles.label, { marginBottom: 2 }], children: "LINE Remarks" }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.noteText, children: fmtWrapped(cs.lineRemarks, '') })] })) : null] })] })), (0, jsx_runtime_1.jsxs)(renderer_1.View, { style: styles.footer, fixed: true, children: [(0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.footerText, children: "Made with MentalBreakdown \u00B7 Tawich P." }), (0, jsx_runtime_1.jsxs)(renderer_1.Text, { style: [styles.footerText, { textAlign: 'center' }], children: [fmt(h.projectTitle), " \u00B7 Day ", fmt(h.shootingDay)] }), (0, jsx_runtime_1.jsx)(renderer_1.Text, { style: styles.footerText, render: ({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}` })] })] }) }));
};
exports.default = CallSheetDocument;
