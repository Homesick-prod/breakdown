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
  Svg,
  Path,
  Circle,
} from '@react-pdf/renderer';
import { formatSelectValueList } from '../../utils/selectValueFormat';

// Register font
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

// ─── Types ─────────────────────────────────────────────────────────────────

export type ScheduleDocumentProps = {
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
    sunrise?: string;
    sunset?: string;
    precipProb?: string;
  };
  timelineItems: any[];
  imagePreviews: { [key: string]: string };
  stats: {
    totalHours?: number;
    totalMinutes?: number;
    shotCount?: number;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────

const fmt = (v: any, fallback = '-') => String(v ?? '').trim() || fallback;

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

const getMealLabel = (timeStr?: string, defaultLabel = 'Meal') => {
  if (!timeStr) return defaultLabel;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return defaultLabel;
  const hour = parseInt(match[1], 10);
  if (hour >= 5 && hour < 10) return 'Breakfast';
  if (hour >= 10 && hour < 16) return 'Lunch';
  if (hour >= 16 && hour < 22) return 'Dinner';
  return 'Supper';
};

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

type BreakCategory = 'meal' | 'wrap' | 'setup' | 'break';

const getBreakCategory = (description: string): BreakCategory => {
  const value = (description || '').toLowerCase();
  
  // 1. Wrap (เลิกกอง)
  const wrapKeywords = [
    'wrap', 'end', 'finished', 'dismiss', 'packup', 'pack up', 'clean up', 'cleanup',
    'เลิก', 'ปิดกล้อง', 'กลับบ้าน', 'แยกย้าย', 'แร็ป', 'แรป'
  ];
  if (wrapKeywords.some(kw => value.includes(kw))) return 'wrap';

  // 2. Meal (พักทานอาหาร)
  const mealKeywords = [
    'lunch', 'dinner', 'breakfast', 'meal', 'snack', 'catering', 'brunch', 'supper', 'food', 'eating',
    'กินข้าว', 'อาหาร', 'มื้อ', 'ทานข้าว', 'พักเที่ยง', 'พักกิน', 'ข้าวเช้า', 'ข้าวเที่ยง', 'ข้าวเย็น', 'อาหารเช้า', 'อาหารกลางวัน', 'อาหารเย็น'
  ];
  if (mealKeywords.some(kw => value.includes(kw))) return 'meal';

  // 3. Setup (เซ็ตฉาก / ย้ายกอง)
  const setupKeywords = [
    'set', 'setup', 'prep', 'company move', 'move', 'travel', 'transit', 'prepare', 'block', 'blocking',
    'ย้ายกอง', 'ย้าย', 'เตรียม', 'บล็อก', 'เซ็ต', 'บล็อค', 'เดินทาง'
  ];
  if (setupKeywords.some(kw => value.includes(kw))) return 'setup';

  return 'break';
};

const getBreakLabel = (category: BreakCategory): string => {
  switch (category) {
    case 'wrap': return 'Wrap';
    case 'meal': return 'Meal';
    case 'setup': return 'Setup';
    case 'break': return 'Break';
  }
};

const BREAK_THEMES = {
  wrap: {
    bg: '#FEF2F2',
    text: '#991B1B',
    badgeBg: '#FEE2E2',
    badgeText: '#DC2626'
  },
  meal: {
    bg: '#FFFBEB',
    text: '#78350F',
    badgeBg: '#FEF3C7',
    badgeText: '#B45309'
  },
  setup: {
    bg: '#EFF6FF',
    text: '#1E40AF',
    badgeBg: '#DBEAFE',
    badgeText: '#2563EB'
  },
  break: {
    bg: '#F9FAFB',
    text: '#374151',
    badgeBg: '#F3F4F6',
    badgeText: '#4B5563'
  }
};

type MovementRig = 'handheld' | 'gimbal' | 'steadicam' | 'drone' | 'crane' | 'dolly' | 'default';

const getMovementRig = (movementStr: string): MovementRig => {
  const value = (movementStr || '').toLowerCase();
  
  if (
    value.includes('drone') || value.includes('aerial') || value.includes('flycam') ||
    value.includes('โดรน') || value.includes('บิน') || value.includes('มุมสูง')
  ) {
    return 'drone';
  }
  if (
    value.includes('steadicam') || value.includes('steadi') ||
    value.includes('สเตดิแคม') || value.includes('สเตดิ') ||
    value.includes('สเตดี้แคม') || value.includes('สเตดี้')
  ) {
    return 'steadicam';
  }
  if (
    value.includes('gimbal') || value.includes('ronin') || value.includes('stabilizer') ||
    value.includes('กิมบอล') || value.includes('กิมบัล') || value.includes('กันสั่น')
  ) {
    return 'gimbal';
  }
  if (
    value.includes('crane') || value.includes('jib') || value.includes('boom') ||
    value.includes('เครน') || value.includes('จิ๊บ') || value.includes('บูม') ||
    value.includes('เครนจิ๊บ') || value.includes('จิ๊บอาร์ม')
  ) {
    return 'crane';
  }
  if (
    value.includes('handheld') || value.includes('hand') || value.includes('shoulder') ||
    value.includes('ถือกล้อง') || value.includes('ถือ') ||
    value.includes('แฮนด์เฮลด์') || value.includes('แฮนด์เฮล')
  ) {
    return 'handheld';
  }
  if (
    value.includes('dolly') || value.includes('ดอลลี่') || value.includes('ดอลลี') ||
    value.includes('track') || value.includes('แทร็ค') || value.includes('แทรค') ||
    value.includes('truck') || value.includes('ทรัค') ||
    value.includes('slider') || value.includes('สไลเดอร์')
  ) {
    return 'dolly';
  }
  return 'default';
};

const RIG_THEMES = {
  handheld: { bg: '#FFF1F2', text: '#BE123C' },
  gimbal: { bg: '#F0FDFA', text: '#0D9488' },
  steadicam: { bg: '#EEF2FF', text: '#4F46E5' },
  drone: { bg: '#FFFBEB', text: '#D97706' },
  crane: { bg: '#FDF4FF', text: '#9D174D' },
  dolly: { bg: '#F0FDF4', text: '#16A34A' },
  default: { bg: '', text: '#0A0A0A' }
};

// ─── Colors & Sizes ───────────────────────────────────────────────────────

const C = {
  black: '#0A0A0A',
  dark: '#191b1d',
  mid: '#84868c',
  light: '#abb1bb',
  rule: '#D1D5DB',
  bg: '#F6F7F9',
  white: '#FFFFFF',
};

const COL_WITH_STORYBOARD = {
  start: '4.3%',
  end: '4.3%',
  duration: '2.8%',
  sceneShot: '3.6%',
  storyboard: '9.0%',
  setPeriod: '3.0%',
  location: '6.8%',
  size: '5.2%',
  angle: '7.3%',
  movement: '8.4%',
  lens: '5%',
  description: '31.2%',
  cast: '9.1%',
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
  ['setPeriod', 'SET'],
  ['location', 'Location'],
  ['size', 'Size'],
  ['angle', 'Angle'],
  ['movement', 'Movement'],
  ['lens', 'Lens'],
  ['description', 'Description'],
  ['cast', 'Cast'],
] as const;

type ColumnKey = typeof TABLE_HEADERS[number][0];
type ColumnMap = Record<ColumnKey, string>;

const PAGE_BOTTOM_PADDING = 44;
const PAGE_HORIZONTAL_PADDING = 24;
const NORMAL_FOOTER_BOTTOM = 16 - PAGE_BOTTOM_PADDING;
const FINAL_AD_FOOTER_BOTTOM = 12;
const FOOTER_SIDE_OFFSET = 0;

const getBreakSpan = (columns: ColumnMap) => {
  const used = [columns.start, columns.end, columns.duration, columns.cast]
    .map((value) => parseFloat(String(value ?? '0')))
    .reduce((sum, value) => sum + value, 0);
  return `${Math.max(0, 100 - used).toFixed(1)}%`;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'IBMPlexSansThai',
    fontSize: 7,
    color: C.black,
    backgroundColor: C.white,
    paddingTop: 24,
    paddingBottom: PAGE_BOTTOM_PADDING,
    paddingHorizontal: PAGE_HORIZONTAL_PADDING,
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
  tableHeadContinuationGap: {
    height: 3.2,
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
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 3,
  },
  breakBadge: {
    fontSize: 5,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    textAlign: 'center',
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: NORMAL_FOOTER_BOTTOM,
    left: FOOTER_SIDE_OFFSET,
    right: FOOTER_SIDE_OFFSET,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 6,
    color: C.light,
  },
  finalAdFooter: {
    position: 'absolute',
    bottom: FINAL_AD_FOOTER_BOTTOM,
    left: FOOTER_SIDE_OFFSET,
    right: FOOTER_SIDE_OFFSET,
    height: 42,
  },
  finalAdLockup: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginHorizontal: PAGE_HORIZONTAL_PADDING,
  },
  finalAdFooterSpacer: {
    height: 44,
  },
  finalAdLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    flex: 1,
  },
  finalAdQr: {
    width: 32,
    height: 32,
  },
  finalAdBrand: {
    fontSize: 10.3,
    color: C.dark,
    fontWeight: 600,
    lineHeight: 1.07,
  },
  finalAdUrl: {
    fontSize: 6.7,
    color: C.mid,
    fontWeight: 500,
    letterSpacing: 0.2,
    marginTop: 4.3,
  },
  finalAdRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 12,
    minWidth: 54,
  },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

const CrewRow = ({ role, name }: { role: string; name?: string }) => {
  const displayName = String(name ?? '').trim() || '-';
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1.5 }}>
      <Text style={{ fontSize: 6, color: C.mid, fontWeight: 600 }}>{role}</Text>
      <Text style={{ fontSize: 6, color: C.black, fontWeight: 600, maxWidth: '62%', textAlign: 'right' }}>{displayName}</Text>
    </View>
  );
};

const TableCell = ({
  width,
  children,
  style,
}: {
  width: string;
  children: React.ReactNode;
  style?: any;
}) => (
  <View style={[styles.cellBox, { width }, style]}>
    {children}
  </View>
);

const ScheduleFooter = () => (
  <View
    fixed
    render={({ pageNumber, totalPages }) => {
      const isLastPage = pageNumber === totalPages;

      if (isLastPage) {
        return null;
      }

      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with MentalBreakdown · Tawich P.</Text>
          <Text style={styles.footerText}>Page {pageNumber} / {totalPages}</Text>
        </View>
      );
    }}
  />
);

const FinalAdFooter = () => (
  <View
    style={styles.finalAdFooter}
    fixed
    render={({ pageNumber, totalPages }) => {
      if (pageNumber !== totalPages) return null;

      return (
        <View style={styles.finalAdLockup}>
          <View style={styles.finalAdLeft}>
            <Image src={getFontPath('mentalbreakdown-qr.png')} style={styles.finalAdQr} />
            <View>
              <Text style={styles.finalAdBrand}>Made With</Text>
              <Text style={styles.finalAdBrand}>MentalBreakdown</Text>
              <Text style={styles.finalAdUrl}>mentalbreakdown.web.app</Text>
            </View>
          </View>
          <View style={styles.finalAdRight}>
            <Text style={styles.footerText}>Page {pageNumber} / {totalPages}</Text>
          </View>
        </View>
      );
    }}
  />
);

const FinalAdFooterSpacer = () => (
  <View style={styles.finalAdFooterSpacer} wrap={false} />
);

// ─── Main Document ─────────────────────────────────────────────────────────────

const ScheduleDocument = ({ headerInfo, timelineItems, imagePreviews, stats }: ScheduleDocumentProps) => {
  const h = headerInfo;
  const hasStoryboardImages = timelineItems.some((item) => (
    item?.id && typeof imagePreviews?.[item.id] === 'string' && imagePreviews[item.id].startsWith('data:image')
  ));
  const columns = hasStoryboardImages ? COL_WITH_STORYBOARD : COL_WITHOUT_STORYBOARD;
  const tableHeaders = TABLE_HEADERS.filter(([key]) => hasStoryboardImages || key !== 'storyboard');
  const breakSpan = getBreakSpan(columns);

  return (
    <Document title={`Schedule - ${fmt(h.projectTitle)}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>

          {/* Left: Key Crew */}
          <View style={styles.hLeft}>
            <Text style={styles.label}>Key Crew</Text>
            <CrewRow role="Director" name={h.director} />
            <CrewRow role="Producer" name={h.producer} />
            <CrewRow role="DOP" name={h.dop} />
            <CrewRow role="1st AD" name={h.firstAD} />
            <CrewRow role="2nd AD" name={h.secondAD} />
            <CrewRow role="PD" name={h.pd} />

            {stats && (stats.shotCount || stats.totalHours) ? (
              <View style={{ borderTopWidth: 0.5, borderTopColor: C.rule, marginTop: 4, paddingTop: 4 }}>
                <CrewRow role="Total Shots" name={stats.shotCount ? String(stats.shotCount) : undefined} />
                <CrewRow role="Total Time" name={stats.totalHours ? `${stats.totalHours}h ${stats.totalMinutes || 0}m` : undefined} />
              </View>
            ) : null}
          </View>

          {/* Center: Project Title (58% height) & Bottom Row (42% height) split into 3 columns */}
          <View style={[styles.hCenter, { justifyContent: 'space-between', alignItems: 'stretch' }]}>
            {/* Top row: Project Title (flex: 58) */}
            <View style={{ flex: 52, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: C.rule, paddingBottom: 1 }}>
              <Text style={[styles.label, { fontSize: 5.8, letterSpacing: 0.8, marginBottom: 0.5 }]}>
                Shooting Schedule
              </Text>
              <Text style={{ fontSize: 21, fontWeight: 600, color: C.black, textAlign: 'center', lineHeight: 1.08 }}>
                {fmt(h.projectTitle, 'UNTITLED PROJECT')}
              </Text>
            </View>

            {/* Bottom row: 3 columns (flex: 42) */}
            <View style={{ flex: 40, flexDirection: 'row', alignItems: 'stretch', gap: 5, paddingTop: 2 }}>
              {/* Col 1: Q (Day) */}
              <View style={{ flex: 1, flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'center', paddingBottom: 2 }}>
                <Text style={[styles.label, { marginBottom: 0 }]}>Shoot Day</Text>
                <Text style={{ fontSize: 14, fontWeight: 600, color: C.black, lineHeight: 0.95, marginTop: -2, marginBottom: 5 }}>
                  Q{fmt(h.shootingDay)}
                </Text>
                <Text style={{ fontSize: 5.5, fontWeight: 600, color: C.dark, lineHeight: 1, marginTop: 3.5 }}>
                  Out of {fmt(h.totalDays)}
                </Text>
              </View>

              {/* Col 2: Shooting Locations */}
              <View style={{ flex: 1.5, flexDirection: 'column', alignItems: 'center', borderLeftWidth: 0.5, borderLeftColor: C.rule, borderRightWidth: 0.5, borderRightColor: C.rule, paddingHorizontal: 5, height: '100%' }}>
                <Text style={[styles.label, { textAlign: 'center', marginTop: 4 }]}>Locations</Text>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  {((h.location1 && !h.location2 && !h.location3) || (!h.location1 && !h.location2 && !h.location3 && h.location)) ? (
                    <Text style={{ fontSize: 7.9, fontWeight: 600, color: C.black, textAlign: 'center', lineHeight: 1.16 }}>
                      {fmtWrapped(h.location1 || h.location)}
                    </Text>
                  ) : (
                    <View style={{ gap: 1.3, justifyContent: 'center', width: '100%',marginBottom: '4' }}>
                      {h.location1 && (
                        <Text style={{ fontSize: 6.6, color: C.black, fontWeight: 600, textAlign: 'center', lineHeight: 1.16 }}>
                          L1: {fmtWrapped(h.location1)}
                        </Text>
                      )}
                      {h.location2 && (
                        <Text style={{ fontSize: 6.6, color: C.black, fontWeight: 600, textAlign: 'center', lineHeight: 1.16 }}>
                          L2: {fmtWrapped(h.location2)}
                        </Text>
                      )}
                      {h.location3 && (
                        <Text style={{ fontSize: 6.6, color: C.black, fontWeight: 600, textAlign: 'center', lineHeight: 1.16 }}>
                          L3: {fmtWrapped(h.location3)}
                        </Text>
                      )}
                      {!h.location1 && !h.location2 && !h.location3 && !h.location && (
                        <Text style={{ fontSize: 5.5, color: C.light, textAlign: 'center' }}>No locations specified</Text>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* Col 3: General Call Time */}
              <View style={{ flex: 1, flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'center', paddingBottom: 2 }}>
                <Text style={[styles.label, { marginBottom: 0 }]}>Call Time</Text>
                <Text style={{ fontSize: 14, fontWeight: 600, color: C.black, lineHeight: 0.95, marginTop: -2, marginBottom: 5 }}>
                  {fmt(h.callTime)}
                </Text>
                <Text style={{ fontSize: 5.5, fontWeight: 600, color: C.dark, lineHeight: 1, marginTop: 3.5 }}>
                  {formatDate(h.date)}
                </Text>
              </View>
            </View>
          </View>

          {/* Right: Times list, weather */}
          <View style={styles.hRight}>
            <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 1, width: '100%', marginBottom: 2 }}>
              {/* Badge 1: Weather + Temp */}
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 2, paddingVertical: 1.2, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5">
                  <Circle cx="12" cy="12" r="4" />
                  <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </Svg>
                <Text style={{ fontSize: 5, color: '#4B5563', fontWeight: 600 }}>
                  {fmt(h.weather, 'Clear').toUpperCase()} · {fmt(h.temp)}
                </Text>
              </View>

              {/* Badge 2: Sunrise/Sunset */}
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 2, paddingVertical: 1.2, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5">
                  <Path d="M17 18a5 5 0 0 0-10 0M12 2v7M9 5l3-3 3 3M2 22h20M12 13V9" />
                </Svg>
                <Text style={{ fontSize: 5, color: '#4B5563', fontWeight: 600 }}>
                  {fmt(h.sunrise)} – {fmt(h.sunset)}
                </Text>
              </View>

              {/* Badge 3: Rain probability */}
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 2, paddingVertical: 1.2, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5">
                  <Path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" />
                </Svg>
                <Text style={{ fontSize: 5, color: '#4B5563', fontWeight: 600 }}>
                  RAIN {fmt(h.precipProb, '0%')}
                </Text>
              </View>
            </View>

            <View style={{ borderTopWidth: 0.5, borderTopColor: C.rule, marginTop: 3, paddingTop: 3, width: '100%' }}>
              {[
                ['Crew Call', h.callTime, 'crewCall'],
                ['First Shot', h.firstShotTime, 'firstShot'],
                [getMealLabel(h.firstmealTime, '1st Meal'), h.firstmealTime, 'firstMeal'],
                [getMealLabel(h.secondmealTime, '2nd Meal'), h.secondmealTime, 'secondMeal'],
                [getMealLabel(h.thirdmealTime, '3rd Meal'), h.thirdmealTime, 'thirdMeal'],
                ['Est. Wrap', h.wrapTime, 'wrapTime'],
              ].map(([label, val, originalKey]) => val ? (
                <View key={originalKey} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1.5 }}>
                  <Text style={{ fontSize: 6.1, color: C.dark, fontWeight: 600 }}>{label}</Text>
                  <Text style={{ fontSize: 6.1, color: C.black, fontWeight: 600 }}>{val}</Text>
                </View>
              ) : null)}
            </View>
          </View>
        </View>

        {/* ── SCHEDULE TABLE ──────────────────────────────────────────────── */}
        <View>

          {/* Table header */}
          <View style={styles.tableHead} fixed>
            {tableHeaders.map(([key, label]) => (
              <Text key={key} style={[styles.tableHeadCell, { width: columns[key] }]}>
                {label}
              </Text>
            ))}
          </View>
          <View
            fixed
            render={({ pageNumber }) => (
              pageNumber > 1 ? <View style={styles.tableHeadContinuationGap} /> : null
            )}
          />

          {timelineItems.map((item, i) => {
            const isBreak = item.type === 'break';
            const movement = formatSelectValueList(item.movement);
            const rig = !isBreak ? getMovementRig(movement) : 'default';
            const isAlt = i % 2 !== 0;

            let rowBg = isAlt ? C.bg : C.white;
            let textColor = C.black;
            let theme = BREAK_THEMES.break;
            let category: BreakCategory = 'break';

            if (isBreak) {
              category = getBreakCategory(item.description || '');
              theme = BREAK_THEMES[category];
              rowBg = theme.bg;
              textColor = theme.text;
            }

            const rowStyle: any = [styles.tableRow, { backgroundColor: rowBg }];
            if (isBreak) {
              rowStyle.push({
                borderTopWidth: 0.5,
                borderTopColor: '#D1D5DB',
                borderBottomWidth: 0.5,
                borderBottomColor: '#D1D5DB',
                alignItems: 'center',
              });
            }

            return (
              <View key={item.id ?? i} wrap={false} style={rowStyle}>
                <TableCell width={columns.start!}>
                  <Text style={[styles.cell, { fontWeight: 600, color: textColor }]}>
                    {item.start || '--:--'}
                  </Text>
                </TableCell>
                <TableCell width={columns.end!}>
                  <Text style={[styles.cell, { color: C.mid }]}>
                    {item.end || '--:--'}
                  </Text>
                </TableCell>
                <TableCell width={columns.duration!}>
                  <Text style={[styles.cell, { color: C.mid }]}>
                    {item.duration ? `${item.duration}'` : ''}
                  </Text>
                </TableCell>

                {isBreak ? (
                  <>
                    <TableCell width={breakSpan}>
                      <View style={styles.breakContent}>
                        <Text style={[styles.cell, { fontWeight: 600, color: textColor, textAlign: 'center', flex: 1 }]}>
                          {fmtWrapped(item.description, 'Break')}
                        </Text>
                      </View>
                    </TableCell>
                    <TableCell width={columns.cast!}><Text /></TableCell>
                  </>
                ) : (
                  <>
                    <TableCell width={columns.sceneShot!}>
                      <Text style={[styles.cell, { fontWeight: 600 }]}>Sc. {normalizeInlineText(item.sceneNumber)}</Text>
                      <Text style={[styles.cellMuted, { fontSize: 5.5, marginTop: 1 }]}>Sh. {item.shotNumber || '-'}</Text>
                    </TableCell>
                    {hasStoryboardImages ? (
                      <TableCell width={columns.storyboard!} style={{ justifyContent: 'center', alignItems: 'flex-start' }}>
                        {typeof imagePreviews?.[item.id] === 'string' && imagePreviews[item.id].startsWith('data:image') ? (
                          <Image
                            src={imagePreviews[item.id]}
                            cache={false}
                            style={{
                              width: '93%',
                            }}
                          />
                        ) : null}
                      </TableCell>
                    ) : null}
                    <TableCell width={columns.setPeriod!}>
                      <Text style={styles.cell}>{fmtWrapped(item.intExt)}</Text>
                      <Text style={[styles.cellMuted, { fontSize: 5.5, marginTop: 1 }]}>{fmtWrapped(item.dayNight)}</Text>
                    </TableCell>
                    <TableCell width={columns.location!}>
                      <Text style={styles.cell}>{fmtWrapped(item.location)}</Text>
                    </TableCell>
                    <TableCell width={columns.size!}>
                      <Text style={styles.cell}>{fmtWrapped(formatSelectValueList(item.shotSize))}</Text>
                    </TableCell>
                    <TableCell width={columns.angle!}>
                      <Text style={[styles.cell, { fontSize: String(item.angle || '').includes(',') ? 6.5 : 7 }]}>
                        {fmtWrapped(item.angle)}
                      </Text>
                    </TableCell>
                    <TableCell width={columns.movement!} style={{ justifyContent: 'center' }}>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 3.5,
                      }}>
                        {RIG_THEMES[rig].bg ? (
                          <View style={{
                            width: 2.2,
                            height: 9,
                            backgroundColor: RIG_THEMES[rig].text,
                            borderRadius: 0.8,
                          }} />
                        ) : null}
                        <Text style={[
                          styles.cell,
                          {
                            color: RIG_THEMES[rig].bg ? RIG_THEMES[rig].text : C.black,
                            fontSize: movement.includes('/') ? 6.5 : 7,
                            flex: 1
                          }
                        ]}>
                          {fmtWrapped(movement)}
                        </Text>
                      </View>
                    </TableCell>
                    <TableCell width={columns.lens!}>
                      <Text style={styles.cell}>
                        {item.lens ? `${String(item.lens).replace(/mm/g, '')}mm` : '-'}
                      </Text>
                    </TableCell>
                    <TableCell width={columns.description!} style={styles.textColumn}>
                      <Text style={styles.cell}>{fmtWrapped(item.description)}</Text>
                      {(item.props || item.costume || item.notes) ? (
                        <Text style={[styles.cellMuted, { fontSize: 5.5, color: C.mid, marginTop: 2 }]}>
                          {fmtWrapped([
                            item.props ? `Props: ${normalizeInlineText(item.props)}` : '',
                            item.costume ? `Costume: ${normalizeInlineText(item.costume)}` : '',
                            item.notes ? `Notes: ${normalizeInlineText(item.notes)}` : '',
                          ].filter(Boolean).join(' | '))}
                        </Text>
                      ) : null}
                    </TableCell>
                    <TableCell width={columns.cast!}>
                      <Text style={styles.cell}>{fmtWrapped(item.cast)}</Text>
                    </TableCell>
                  </>
                )}
              </View>
            );
          })}
        </View>

        <FinalAdFooterSpacer />

        <ScheduleFooter />
        <FinalAdFooter />

      </Page>
    </Document>
  );
};

export default ScheduleDocument;
