'use client';

import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Font,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { formatSelectValueList } from '../../utils/selectValueFormat';

const getFontPath = (filename: string) => {
  if (typeof window === 'undefined') {
    return `${process.cwd()}/public/${filename}`;
  }
  return `/${filename}`;
};

Font.register({
  family: 'IBMPlexSansThai',
  fonts: [
    { src: getFontPath('IBMPlexSansThai-Regular.ttf'), fontWeight: 400 },
    { src: getFontPath('IBMPlexSansThai-Medium.ttf'), fontWeight: 500 },
    { src: getFontPath('IBMPlexSansThai-SemiBold.ttf'), fontWeight: 600 },
    { src: getFontPath('IBMPlexSansThai-Bold.ttf'), fontWeight: 700 },
  ],
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CastCall = {
  id: string;
  role: string;
  name: string;
  callTime: string;
  notes: string;
};

export type CallSheetDocumentProps = {
  headerInfo: {
    projectTitle?: string;
    shootingDay?: string;
    totalDays?: string;
    date?: string;
    callTime?: string;
    firstShotTime?: string;
    wrapTime?: string;
    firstmealTime?: string;
    secondmealTime?: string;
    thirdmealTime?: string;
    location1?: string;
    location2?: string;
    location3?: string;
    location?: string;
    director?: string;
    producer?: string;
    dop?: string;
    firstAD?: string;
    secondAD?: string;
    pd?: string;
    weather?: string;
    temp?: string;
    realFeel?: string;
    sunrise?: string;
    sunset?: string;
    precipProb?: string;
  };
  timelineItems: any[];
  callSheetData: {
    generalCall?: string;
    castCalls?: CastCall[];
    emergencyContact?: string;
    nearestHospital?: string;
    hospitalAddress?: string;
    parkingNotes?: string;
    departmentNotes?: string;
    transportNotes?: string;
    safetyNotes?: string;
    lineRemarks?: string;
  };
  stats: {
    totalHours?: number;
    totalMinutes?: number;
    shotCount?: number;
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: any, fallback = '-') => String(v ?? '').trim() || fallback;

const THAI_TEXT_RE = /[\u0E00-\u0E7F]/;
const ZERO_WIDTH_SPACE = '\u200B';

const segmentThaiText = (value: string): string[] => {
  if (!THAI_TEXT_RE.test(value)) return [value];

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
    const segments = Array.from(segmenter.segment(value), part => part.segment).filter(Boolean);
    if (segments.length > 0) return segments;
  }

  return Array.from(value);
};

Font.registerHyphenationCallback((word) => segmentThaiText(word));

const normalizeInlineText = (value: any, fallback = '-') => {
  const normalized = String(value ?? '').trim().replace(/,\s*/g, ', ');
  return normalized || fallback;
};

const fmtWrapped = (value: any, fallback = '-') => {
  const normalized = normalizeInlineText(value, fallback);
  if (normalized === fallback) return normalized;
  return segmentThaiText(normalized).join(ZERO_WIDTH_SPACE);
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const summarizeScenes = (items: any[]) => {
  const s = new Set<string>();
  items.forEach(i => { if (i?.type === 'shot' && i.sceneNumber) s.add(String(i.sceneNumber)); });
  return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join(', ') || '-';
};

const summarizeAction = (item: any) => {
  const descriptions = item?.underlyingItems?.length
    ? item.underlyingItems.map((shot: any) => shot.description).filter(Boolean)
    : [item?.description].filter(Boolean);
  const unique = Array.from(new Set(descriptions.map((desc: string) => normalizeInlineText(desc, '')))).filter(Boolean);
  if (unique.length <= 2) return unique.join(' | ') || '-';
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

const styles = StyleSheet.create({
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

const CrewRow = ({ role, name }: { role: string; name?: string }) => {
  const displayName = String(name ?? '').trim() || '-';
  return (
    <View style={styles.miniRow}>
      <Text style={styles.miniLabel}>{role}</Text>
      <Text style={[styles.miniValue, { maxWidth: '65%', textAlign: 'right' }]}>{displayName}</Text>
    </View>
  );
};

const TimeRow = ({ label, value }: { label: string; value?: string }) => (
  <View style={styles.miniRow}>
    <Text style={styles.miniLabel}>{label}</Text>
    <Text style={styles.miniValue}>{fmt(value)}</Text>
  </View>
);

// ─── Main Document ─────────────────────────────────────────────────────────────

const groupTimelineItemsForCallSheet = (items: any[]) => {
  const result: any[] = [];
  let currentGroup: any = null;

  items.forEach((item) => {
    if (item.type === 'break') {
      if (currentGroup) {
        result.push(currentGroup);
        currentGroup = null;
      }
      result.push(item);
    } else {
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
      } else {
        if (currentGroup && currentGroup.sceneNumber === sceneNum) {
          currentGroup.underlyingItems.push(item);
          currentGroup.duration += Number(item.duration || 0);
          currentGroup.end = item.end;
          
          const shotNumbers = currentGroup.underlyingItems.map((ui: any) => ui.shotNumber).filter(Boolean);
          currentGroup.shotNumber = shotNumbers.length > 0 ? shotNumbers.join(', ') : '';

          const unionCSV = (a: string, b: string) => {
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
          
          const combineCamera = (field: string) => {
            const val = field === 'shotSize' || field === 'movement'
              ? formatSelectValueList(item[field], '')
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
        } else {
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

const CallSheetDocument = ({ headerInfo, timelineItems, callSheetData, stats }: CallSheetDocumentProps) => {
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

  const groupedItems = React.useMemo(() => groupTimelineItemsForCallSheet(timelineItems), [timelineItems]);

  return (
    <Document title={`Call Sheet - ${fmt(h.projectTitle)}`}>
      <Page size="A4" style={styles.page}>

        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <View style={styles.header}>

          {/* Left: Key Crew */}
          <View style={styles.headerLeft}>
            <Text style={[styles.label, { marginBottom: 6 }]}>Key Crew</Text>
            <CrewRow role="Director" name={h.director} />
            <CrewRow role="Producer" name={h.producer} />
            <CrewRow role="DOP" name={h.dop} />
            <CrewRow role="1st AD" name={h.firstAD} />
            <CrewRow role="2nd AD" name={h.secondAD} />
            <CrewRow role="Prod. Designer" name={h.pd} />
          </View>

          {/* Center: Title + Huge General Call */}
          <View style={styles.headerCenter}>
            <Text style={styles.label}>Production Call Sheet</Text>
            <Text style={{ fontSize: F.size.lg, fontWeight: 600, color: C.black, marginTop: 2, textAlign: 'center', lineHeight: 1.15 }}>
              {fmtWrapped(h.projectTitle, 'Untitled Project')}
            </Text>
            <Text style={[styles.label, { marginTop: 8 }]}>General Call Time</Text>
            <Text style={{ fontSize: F.size.hero, fontWeight: 600, color: C.black, lineHeight: 1 }}>
              {generalCall}
            </Text>
          </View>

          {/* Right: Day + Date + Weather */}
          <View style={styles.headerRight}>
            <Text style={{ fontSize: F.size.xs, color: C.midGray, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Day {fmt(h.shootingDay)} of {fmt(h.totalDays)}
            </Text>
            <Text style={{ fontSize: F.size.md, fontWeight: 600, color: C.black, marginTop: 1, textAlign: 'right' }}>
              {formatDate(h.date)}
            </Text>
            <Text style={[styles.muted, { textAlign: 'right', marginTop: 2 }]}>
              {fmtWrapped(h.weather, 'Clear')}
            </Text>
            <Text style={[styles.muted, { textAlign: 'right' }]}>
              {fmt(h.temp)} / Feels {fmt(h.realFeel)}
            </Text>
            <Text style={[styles.muted, { textAlign: 'right', marginBottom: 2 }]}>
              Rain {fmt(h.precipProb)} · Sun {fmt(h.sunrise)} - {fmt(h.sunset)}
            </Text>
          </View>
        </View>

        {/* ── KEY TIMES BAR ────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
          {[
            { label: 'Crew Call', val: generalCall, color: C.black },
            { label: 'Shooting Call', val: shootingCall, color: C.black },
            { label: 'Lunch (Meal 1)', val: h.firstmealTime, color: C.amber },
            { label: 'Dinner (Meal 2)', val: h.secondmealTime, color: C.amber },
            { label: 'Meal 3', val: h.thirdmealTime, color: C.amber },
            { label: 'Est. Wrap', val: h.wrapTime, color: C.black },
          ].map((item) => {
            if (!item.val) return null;
            return (
              <View key={item.label} style={{
                flex: 1,
                borderWidth: 1,
                borderColor: C.rule,
                borderRadius: 4,
                paddingVertical: 5,
                paddingHorizontal: 6,
                alignItems: 'center',
                backgroundColor: C.softBg,
              }}>
                <Text style={{ fontSize: 5.5, color: C.midGray, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>{item.label}</Text>
                <Text style={{ fontSize: 11, fontWeight: 600, color: item.color }}>{item.val}</Text>
              </View>
            );
          })}
        </View>

        {/* ── ANNOUNCEMENT BANNER ──────────────────────────────────────────── */}
        {(cs.safetyNotes || cs.departmentNotes) && (
          <View style={{
            backgroundColor: C.softBg,
            borderLeftWidth: 3,
            borderLeftColor: C.amber,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginBottom: 12,
            borderRadius: 2,
          }}>
            <Text style={{ fontSize: F.size.xs, fontWeight: 600, color: C.amber, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              Important Notice
            </Text>
            <Text style={[styles.noteText, { color: C.darkGray }]}>
              {fmtWrapped(cs.safetyNotes || cs.departmentNotes)}
            </Text>
          </View>
        )}

        {/* ── LOCATIONS ────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Locations</Text>

          {/* Table head */}
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, { width: '5%' }]}>#</Text>
            <Text style={[styles.tableHeadCell, { width: '47%' }]}>Set Location</Text>
            <Text style={[styles.tableHeadCell, { width: '48%' }]}>Parking / Notes</Text>
          </View>

          {/* Row 1 */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: '5%', fontWeight: 600 }]}>1</Text>
            <Text style={[styles.tableCell, { width: '47%' }]}>{fmtWrapped(loc1)}</Text>
            <Text style={[styles.tableCell, { width: '48%' }]}>{fmtWrapped(cs.parkingNotes || cs.transportNotes, '')}</Text>
          </View>

          {/* Row 2 if exists */}
          {loc2 && (
            <View style={[styles.tableRow, styles.tableRowAlt]}>
              <Text style={[styles.tableCell, { width: '5%', fontWeight: 600 }]}>2</Text>
              <Text style={[styles.tableCell, { width: '47%' }]}>{fmtWrapped(loc2)}</Text>
              <Text style={[styles.tableCell, { width: '48%' }]}>{fmtWrapped(cs.transportNotes, '')}</Text>
            </View>
          )}

          {/* Row 3 if exists */}
          {loc3 && (
            <View style={[styles.tableRow, !loc2 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { width: '5%', fontWeight: 600 }]}>3</Text>
              <Text style={[styles.tableCell, { width: '47%' }]}>{fmtWrapped(loc3)}</Text>
              <Text style={[styles.tableCell, { width: '48%' }]}>{fmtWrapped(cs.transportNotes, '')}</Text>
            </View>
          )}
        </View>

        {/* ── EMERGENCY & HOSPITAL INFO ────────────────────────────────────── */}
        {hasEmergencyInfo && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            {(cs.nearestHospital || cs.hospitalAddress) && (
              <View style={[styles.noteCard, { flex: 1, borderLeftWidth: 3, borderLeftColor: C.danger }]}>
                <Text style={[styles.label, { color: C.danger, marginBottom: 2 }]}>Nearest Hospital</Text>
                <Text style={{ fontSize: F.size.xs, fontWeight: 600, color: C.black }}>
                  {fmtWrapped(cs.nearestHospital, '')}
                </Text>
                {cs.hospitalAddress ? (
                  <Text style={{ fontSize: F.size.xs, color: C.midGray, marginTop: 1, lineHeight: 1.35 }}>
                    {fmtWrapped(cs.hospitalAddress, '')}
                  </Text>
                ) : null}
              </View>
            )}
            {(cs.emergencyContact || cs.safetyNotes) && (
              <View style={[styles.noteCard, { flex: 1, borderLeftWidth: 3, borderLeftColor: C.blue }]}>
                <Text style={[styles.label, { color: C.blue, marginBottom: 2 }]}>Emergency / Safety</Text>
                {cs.emergencyContact ? (
                  <Text style={{ fontSize: F.size.xs, fontWeight: 600, color: C.black, lineHeight: 1.35 }}>
                    {fmtWrapped(cs.emergencyContact, '')}
                  </Text>
                ) : null}
                {cs.safetyNotes ? (
                  <Text style={{ fontSize: F.size.xs, color: C.midGray, marginTop: 1, lineHeight: 1.35 }}>
                    {fmtWrapped(cs.safetyNotes, '')}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* ── SCHEDULE ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Schedule  ·  Scenes: {scenes}  ·  {stats.shotCount ?? 0} shots  ·  {stats.totalHours ?? 0}h {stats.totalMinutes ?? 0}m
          </Text>

          {/* Table head */}
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, { width: '8%' }]}>Start</Text>
            <Text style={[styles.tableHeadCell, { width: '6%' }]}>Dur.</Text>
            <Text style={[styles.tableHeadCell, { width: '10%' }]}>Sc/Sh</Text>
            <Text style={[styles.tableHeadCell, { width: '12%' }]}>Set</Text>
            <Text style={[styles.tableHeadCell, { width: '36%' }]}>Action</Text>
            <Text style={[styles.tableHeadCell, { width: '14%' }]}>Cast</Text>
            <Text style={[styles.tableHeadCell, { width: '14%' }]}>Notes</Text>
          </View>

          {groupedItems.map((item, i) => {
            const isBreak = item.type === 'break';
            const isAlt = i % 2 !== 0;
            const desc = (item.description || '').toLowerCase();

            let rowBg = isAlt ? C.bg : C.white;
            let textColor = C.black;

            if (isBreak) {
              if (desc.includes('wrap')) {
                rowBg = C.wrapBg;
                textColor = C.darkGray;
              } else {
                rowBg = C.breakBg;
                textColor = C.breakText;
              }
            }

            const shotMeta = [item.intExt, item.dayNight].filter(Boolean).join(' · ');
            const cameraMeta = [
              formatSelectValueList(item.shotSize, ''),
              item.angle,
              formatSelectValueList(item.movement, ''),
              item.lens ? `${String(item.lens).replace(/mm/g, '')}mm` : ''
            ].filter(Boolean).join(' · ');

            return (
              <View key={item.id ?? i} wrap={false} style={[styles.tableRow, { backgroundColor: rowBg }]}>
                <Text style={[styles.tableCell, { width: '8%', fontWeight: 600, color: textColor }]}>
                  {item.start || '--:--'}
                </Text>
                <Text style={[styles.tableCell, { width: '6%', color: C.midGray }]}>
                  {item.duration ? `${item.duration}'` : ''}
                </Text>

                {isBreak ? (
                  <Text style={[styles.tableCell, { width: '86%', fontWeight: 600, color: textColor }]}>
                    {fmtWrapped(item.description, 'Break')}
                  </Text>
                ) : (
                  <>
                    <View style={{ width: '10%' }}>
                      <Text style={[styles.tableCell, { fontWeight: 600 }]}>Sc. {normalizeInlineText(item.sceneNumber)}</Text>
                      <Text style={styles.tableCellMuted}>Sh. {item.shotNumber || '-'}</Text>
                    </View>
                    <View style={{ width: '12%' }}>
                      <Text style={styles.tableCell}>{fmtWrapped(item.location || loc1)}</Text>
                      <Text style={styles.tableCellMuted}>{fmtWrapped(shotMeta, '')}</Text>
                    </View>
                    <View style={{ width: '36%', paddingRight: 5 }}>
                      <Text style={styles.tableCell}>{fmtWrapped(summarizeAction(item))}</Text>
                      {cameraMeta ? <Text style={styles.tableCellMuted}>{fmtWrapped(cameraMeta, '')}</Text> : null}
                    </View>
                    <Text style={[styles.tableCell, { width: '14%' }]}>{fmtWrapped(item.cast)}</Text>
                    <View style={{ width: '14%' }}>
                      <Text style={styles.tableCellMuted}>{fmtWrapped(item.notes, '')}</Text>
                      {item.props ? <Text style={styles.tableCellMuted}>Props: {fmtWrapped(item.props, '')}</Text> : null}
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </View>

        {/* ── CAST CALL ────────────────────────────────────────────────────── */}
        {castCalls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast  ·  {castCalls.length} on call</Text>

            {/* Table head */}
            <View style={styles.tableHead}>
              <Text style={[styles.tableHeadCell, { width: '6%' }]}>ID</Text>
              <Text style={[styles.tableHeadCell, { width: '28%' }]}>Cast Member</Text>
              <Text style={[styles.tableHeadCell, { width: '26%' }]}>Role / Character</Text>
              <Text style={[styles.tableHeadCell, { width: '14%' }]}>Call Time</Text>
              <Text style={[styles.tableHeadCell, { width: '26%' }]}>Notes</Text>
            </View>

            {castCalls.map((c, i) => (
              <View key={c.id ?? i} style={[styles.tableRow, ...(i % 2 !== 0 ? [styles.tableRowAlt] : [])]}>
                <Text style={[styles.tableCell, { width: '6%', color: C.lightGray, fontWeight: 600 }]}>
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text style={[styles.tableCell, { width: '28%', fontWeight: 600 }]}>{fmtWrapped(c.name)}</Text>
                <Text style={[styles.tableCell, { width: '26%' }]}>{fmtWrapped(c.role)}</Text>
                <Text style={[styles.tableCell, { width: '14%', fontWeight: 600 }]}>{fmt(c.callTime)}</Text>
                <Text style={[styles.tableCell, { width: '26%' }]}>{fmtWrapped(c.notes, '')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── DAILY NOTES ──────────────────────────────────────────────────── */}
        {hasProductionNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Production Notes</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {cs.departmentNotes ? (
                <View style={[styles.noteCard, { borderLeftWidth: 2, borderLeftColor: C.darkGray }]}>
                  <Text style={[styles.label, { marginBottom: 2 }]}>Departments</Text>
                  <Text style={styles.noteText}>{fmtWrapped(cs.departmentNotes, '')}</Text>
                </View>
              ) : null}
              {(cs.parkingNotes || cs.transportNotes) ? (
                <View style={[styles.noteCard, { borderLeftWidth: 2, borderLeftColor: C.blue }]}>
                  <Text style={[styles.label, { marginBottom: 2 }]}>Parking / Transport</Text>
                  <Text style={styles.noteText}>{fmtWrapped([cs.parkingNotes, cs.transportNotes].filter(Boolean).join(' | '), '')}</Text>
                </View>
              ) : null}
              {cs.lineRemarks ? (
                <View style={[styles.noteCard, { borderLeftWidth: 2, borderLeftColor: C.amber }]}>
                  <Text style={[styles.label, { marginBottom: 2 }]}>LINE Remarks</Text>
                  <Text style={styles.noteText}>{fmtWrapped(cs.lineRemarks, '')}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Made with MentalBreakdown · Tawich P.</Text>
          <Text style={[styles.footerText, { textAlign: 'center' }]}>
            {fmt(h.projectTitle)} · Day {fmt(h.shootingDay)}
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} / ${totalPages}`
          } />
        </View>

      </Page>
    </Document>
  );
};

export default CallSheetDocument;
