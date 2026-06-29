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

// ─── Colors & Sizes ───────────────────────────────────────────────────────

const C = {
  black: '#0A0A0A',
  dark: '#374151',
  mid: '#6B7280',
  light: '#9CA3AF',
  rule: '#D1D5DB',
  bg: '#F9FAFB',
  white: '#FFFFFF',
  amber: '#D97706',
  breakBg: '#FFFBEB',
  breakText: '#92400E',
  wrapBg: '#F3F4F6',
  handheldBg: '#EFF6FF',
  handheldText: '#1D4ED8',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'IBMPlexSansThai',
    fontSize: 7,
    color: C.black,
    backgroundColor: C.white,
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 24,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 10,
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
    paddingVertical: 4,
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
    paddingVertical: 4,
    paddingHorizontal: 10,
    minHeight: 20,
    alignItems: 'center',
  },
  cell: {
    fontSize: 7,
    color: C.black,
    paddingRight: 4,
  },
  cellMuted: {
    fontSize: 6,
    color: C.mid,
    marginTop: 1,
    paddingRight: 4,
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

const CrewRow = ({ role, name }: { role: string; name?: string }) => {
  const displayName = String(name ?? '').trim() || '-';
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1.5 }}>
      <Text style={{ fontSize: 6, color: C.mid, fontWeight: 600 }}>{role}</Text>
      <Text style={{ fontSize: 6, color: C.black, fontWeight: 600, maxWidth: '62%', textAlign: 'right' }}>{displayName}</Text>
    </View>
  );
};

// ─── Main Document ─────────────────────────────────────────────────────────────

const ScheduleDocument = ({ headerInfo, timelineItems, imagePreviews, stats }: ScheduleDocumentProps) => {
  const h = headerInfo;
  const now = new Date().toLocaleString('en-GB');

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
            <View style={{ flex: 58, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: C.rule, paddingBottom: 2 }}>
              <Text style={[styles.label, { fontSize: 6, letterSpacing: 0.8, marginBottom: 1 }]}>
                Shooting Schedule
              </Text>
              <Text style={{ fontSize: 24, fontWeight: 600, color: C.black, textAlign: 'center' }}>
                {fmt(h.projectTitle, 'UNTITLED PROJECT')}
              </Text>
            </View>

            {/* Bottom row: 3 columns (flex: 42) */}
            <View style={{ flex: 42, flexDirection: 'row', alignItems: 'stretch', gap: 6, paddingTop: 3 }}>
              {/* Col 1: Q (Day) */}
              <View style={{ flex: 1, flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'center', paddingTop: 1 }}>
                <Text style={styles.label}>Shoot Day</Text>
                <Text style={{ fontSize: 15, fontWeight: 600, color: C.black, lineHeight: 1, marginTop: -4.5, marginBottom: 5.5 }}>
                  Q{fmt(h.shootingDay)}
                </Text>
                <Text style={{ fontSize: 5.5, fontWeight: 600, color: C.mid, lineHeight: 1 }}>
                  Out of {fmt(h.totalDays)}
                </Text>
              </View>

              {/* Col 2: Shooting Locations */}
              <View style={{ flex: 1.5, flexDirection: 'column', alignItems: 'center', borderLeftWidth: 0.5, borderLeftColor: C.rule, borderRightWidth: 0.5, borderRightColor: C.rule, paddingHorizontal: 4, height: '100%' }}>
                <Text style={[styles.label, { textAlign: 'center', marginTop: 2 }]}>Locations</Text>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  {((h.location1 && !h.location2 && !h.location3) || (!h.location1 && !h.location2 && !h.location3 && h.location)) ? (
                    <Text style={{ fontSize: 8.5, fontWeight: 600, color: C.black, textAlign: 'center' }}>
                      {fmt(h.location1 || h.location)}
                    </Text>
                  ) : (
                    <View style={{ gap: 3, justifyContent: 'center', width: '100%' }}>
                      {h.location1 && (
                        <Text style={{ fontSize: 7, color: C.black, fontWeight: 600, textAlign: 'center' }}>
                          L1: {fmt(h.location1)}
                        </Text>
                      )}
                      {h.location2 && (
                        <Text style={{ fontSize: 7, color: C.black, fontWeight: 600, textAlign: 'center' }}>
                          L2: {fmt(h.location2)}
                        </Text>
                      )}
                      {h.location3 && (
                        <Text style={{ fontSize: 7, color: C.black, fontWeight: 600, textAlign: 'center' }}>
                          L3: {fmt(h.location3)}
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
              <View style={{ flex: 1, flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'center', paddingTop: 1 }}>
                <Text style={styles.label}>Call Time</Text>
                <Text style={{ fontSize: 15, fontWeight: 600, color: C.black, lineHeight: 1, marginTop: -4.5, marginBottom: 5.5 }}>
                  {fmt(h.callTime)}
                </Text>
                <Text style={{ fontSize: 5.5, fontWeight: 600, color: C.mid, lineHeight: 1 }}>
                  {formatDate(h.date)}
                </Text>
              </View>
            </View>
          </View>

          {/* Right: Times list, weather */}
          <View style={styles.hRight}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4, width: '100%', marginBottom: 3 }}>
              {/* Badge 1: Weather + Temp */}
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 2, paddingVertical: 1.5, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5">
                  <Circle cx="12" cy="12" r="4" />
                  <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </Svg>
                <Text style={{ fontSize: 5, color: '#4B5563', fontWeight: 600 }}>
                  {fmt(h.weather, 'Clear').toUpperCase()} · {fmt(h.temp)}
                </Text>
              </View>

              {/* Badge 2: Sunrise/Sunset */}
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 2, paddingVertical: 1.5, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5">
                  <Path d="M17 18a5 5 0 0 0-10 0M12 2v7M9 5l3-3 3 3M2 22h20M12 13V9" />
                </Svg>
                <Text style={{ fontSize: 5, color: '#4B5563', fontWeight: 600 }}>
                  {fmt(h.sunrise)} – {fmt(h.sunset)}
                </Text>
              </View>

              {/* Badge 3: Rain probability */}
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 2, paddingVertical: 1.5, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.5">
                  <Path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" />
                </Svg>
                <Text style={{ fontSize: 5, color: '#4B5563', fontWeight: 600 }}>
                  RAIN {fmt(h.precipProb, '0%')}
                </Text>
              </View>
            </View>

            <View style={{ borderTopWidth: 0.5, borderTopColor: C.rule, marginTop: 5, paddingTop: 4, width: '100%' }}>
              {[
                ['Crew Call', h.callTime, 'crewCall'],
                ['First Shot', h.firstShotTime, 'firstShot'],
                [getMealLabel(h.firstmealTime, '1st Meal'), h.firstmealTime, 'firstMeal'],
                [getMealLabel(h.secondmealTime, '2nd Meal'), h.secondmealTime, 'secondMeal'],
                [getMealLabel(h.thirdmealTime, '3rd Meal'), h.thirdmealTime, 'thirdMeal'],
                ['Est. Wrap', h.wrapTime, 'wrapTime'],
              ].map(([label, val, originalKey]) => val ? (
                <View key={originalKey} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1.5 }}>
                  <Text style={{ fontSize: 6, color: C.mid, fontWeight: 600 }}>{label}</Text>
                  <Text style={{ fontSize: 6, color: C.black, fontWeight: 600 }}>{val}</Text>
                </View>
              ) : null)}
            </View>
          </View>
        </View>

        {/* ── SCHEDULE TABLE ──────────────────────────────────────────────── */}
        <View>

          {/* Table header */}
          <View style={styles.tableHead} fixed>
            <Text style={[styles.tableHeadCell, { width: '6%' }]}>Start</Text>
            <Text style={[styles.tableHeadCell, { width: '6%' }]}>End</Text>
            <Text style={[styles.tableHeadCell, { width: '3%' }]}>Dur.</Text>
            <Text style={[styles.tableHeadCell, { width: '6%' }]}>Sc/Sh</Text>
            <Text style={[styles.tableHeadCell, { width: '12%' }]}>Storyboard</Text>
            <Text style={[styles.tableHeadCell, { width: '7%' }]}>Set/Period</Text>
            <Text style={[styles.tableHeadCell, { width: '9%' }]}>Location</Text>
            <Text style={[styles.tableHeadCell, { width: '5%' }]}>Size</Text>
            <Text style={[styles.tableHeadCell, { width: '7%' }]}>Angle</Text>
            <Text style={[styles.tableHeadCell, { width: '7%' }]}>Movement</Text>
            <Text style={[styles.tableHeadCell, { width: '4%' }]}>Lens</Text>
            <Text style={[styles.tableHeadCell, { width: '20%' }]}>Description</Text>
            <Text style={[styles.tableHeadCell, { width: '8%' }]}>Cast</Text>
          </View>

          {timelineItems.map((item, i) => {
            const isBreak = item.type === 'break';
            const desc = (item.description || '').toLowerCase();
            const movement = formatSelectValueList(item.movement);
            const isHandheld = !isBreak && movement.toLowerCase().includes('hand');
            const isAlt = i % 2 !== 0;

            let rowBg = isAlt ? C.bg : C.white;
            let textColor = C.black;

            if (isBreak) {
              if (desc.includes('wrap')) { rowBg = C.wrapBg; textColor = C.dark; }
              else if (desc.includes('lunch') || desc.includes('dinner')) { rowBg = C.breakBg; textColor = C.breakText; }
              else { rowBg = C.bg; }
            } else if (isHandheld) {
              rowBg = C.handheldBg;
            }

            return (
              <View key={item.id ?? i} style={[styles.tableRow, { backgroundColor: rowBg }]}>
                <Text style={[styles.cell, { width: '6%', fontWeight: 600, color: textColor }]}>
                  {item.start || '--:--'}
                </Text>
                <Text style={[styles.cell, { width: '6%', color: C.mid }]}>
                  {item.end || '--:--'}
                </Text>
                <Text style={[styles.cell, { width: '3%', color: C.mid }]}>
                  {item.duration ? `${item.duration}'` : ''}
                </Text>

                {isBreak ? (
                  <Text style={[styles.cell, { width: '85%', fontWeight: 600, color: textColor }]}>
                    {item.description || 'Break'}
                  </Text>
                ) : (
                  <>
                    <View style={{ width: '6%', paddingRight: 4 }}>
                      <Text style={[styles.cell, { fontWeight: 600 }]}>Sc. {item.sceneNumber || '-'}</Text>
                      <Text style={[styles.cellMuted, { fontSize: 5.5, marginTop: 1 }]}>Sh. {item.shotNumber || '-'}</Text>
                    </View>
                    <View style={{ width: '12%', justifyContent: 'center', alignItems: 'center', paddingRight: 4 }}>
                      {imagePreviews && imagePreviews[item.id] ? (
                        <Image
                          src={imagePreviews[item.id]}
                          style={{
                            width: '100%',
                            height: 24,
                            borderRadius: 2,
                            objectFit: 'cover',
                          }}
                        />
                      ) : null}
                    </View>
                    <View style={{ width: '7%', paddingRight: 4 }}>
                      <Text style={styles.cell}>{item.intExt || '-'}</Text>
                      <Text style={[styles.cellMuted, { fontSize: 5.5, marginTop: 1 }]}>{item.dayNight || '-'}</Text>
                    </View>
                    <Text style={[styles.cell, { width: '9%' }]}>
                      {item.location || '-'}
                    </Text>
                    <Text style={[styles.cell, { width: '5%' }]}>
                      {formatSelectValueList(item.shotSize)}
                    </Text>
                    <Text style={[styles.cell, { width: '7%' }]}>
                      {item.angle || '-'}
                    </Text>
                    <Text style={[styles.cell, { width: '7%', color: isHandheld ? C.handheldText : C.black }]}>
                      {movement}
                    </Text>
                    <Text style={[styles.cell, { width: '4%' }]}>
                      {item.lens ? `${String(item.lens).replace(/mm/g, '')}mm` : '-'}
                    </Text>
                    <View style={{ width: '20%', paddingRight: 4 }}>
                      <Text style={styles.cell}>{item.description || '-'}</Text>
                      {(item.props || item.costume || item.notes) ? (
                        <Text style={[styles.cellMuted, { fontSize: 5.5, color: C.mid, marginTop: 2 }]}>
                          {[
                            item.props ? `Props: ${item.props}` : '',
                            item.costume ? `Costume: ${item.costume}` : '',
                            item.notes ? `Notes: ${item.notes}` : '',
                          ].filter(Boolean).join(' | ')}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.cell, { width: '8%' }]}>
                      {item.cast || '-'}
                    </Text>
                  </>
                )}
              </View>
            );
          })}
        </View>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated {now}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} / ${totalPages}`
          } />
        </View>

      </Page>
    </Document>
  );
};

export default ScheduleDocument;
