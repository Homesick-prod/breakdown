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

export type ShotlistDocumentItem = {
  id: string;
  sceneNumber?: string;
  shotNumber?: string;
  shotSize?: string;
  angle?: string;
  movement?: string;
  lens?: string;
  description?: string;
  notes?: string;
  imageUrl?: string;
};

export type ShotlistDocumentProps = {
  projectTitle: string;
  shotListItems: ShotlistDocumentItem[];
  imagePreviews: { [key: string]: string };
};

const fmt = (v: any, fallback = '-') => String(v ?? '').trim().replace(/,\s*/g, ', ') || fallback;

const fmtWrapped = (v: any, fallback = '-') => {
  const value = fmt(v, fallback);
  if (value === fallback) return value;
  return segmentThaiText(value).join(ZERO_WIDTH_SPACE);
};

const formatLens = (lens?: string) => {
  const value = String(lens ?? '').trim();
  if (!value) return '-';
  return value.toLowerCase().includes('mm') ? value : `${value}mm`;
};

const C = {
  black: '#0A0A0A',
  dark: '#374151',
  mid: '#6B7280',
  light: '#9CA3AF',
  rule: '#D1D5DB',
  bg: '#F9FAFB',
  white: '#FFFFFF',
  handheldBg: '#EFF6FF',
  handheldText: '#1D4ED8',
};

const COL = {
  sceneShot: '5%',
  reference: '13%',
  size: '8%',
  angle: '9%',
  movement: '10%',
  lens: '4%',
  description: '36%',
  notes: '15%',
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
  header: {
    marginBottom: 14,
    paddingBottom: 8,
  },
  hCenter: {
    width: '100%',
    alignItems: 'center',
  },
  label: {
    fontSize: 6,
    color: C.mid,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
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
    paddingRight: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 10,
    minHeight: 34,
    alignItems: 'center',
  },
  cell: {
    fontSize: 7,
    color: C.black,
    paddingRight: 6,
  },
  textColumn: {
    paddingRight: 8,
    minWidth: 0,
  },
  wrappedText: {
    fontSize: 7,
    color: C.black,
    lineHeight: 1.35,
  },
  cellMuted: {
    fontSize: 6,
    color: C.mid,
    marginTop: 1,
    paddingRight: 4,
  },
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
  footerStamp: {
    fontSize: 6,
    color: C.light,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
});

const ShotlistDocument = ({ projectTitle, shotListItems, imagePreviews }: ShotlistDocumentProps) => {
  const now = new Date().toLocaleString('en-GB');

  return (
    <Document title={`Shot List - ${fmt(projectTitle)}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.hCenter}>
            <Text style={[styles.label, { fontSize: 6, letterSpacing: 0.8, marginBottom: 1 }]}>Shot List</Text>
            <Text style={{ fontSize: 24, fontWeight: 600, color: C.black, textAlign: 'center' }}>
              {fmt(projectTitle, 'UNTITLED PROJECT')}
            </Text>
          </View>
        </View>

        <View>
          <View style={styles.tableHead} fixed>
            <Text style={[styles.tableHeadCell, { width: COL.sceneShot }]}>Sc/Sh</Text>
            <Text style={[styles.tableHeadCell, { width: COL.reference }]}>Reference</Text>
            <Text style={[styles.tableHeadCell, { width: COL.size }]}>Size</Text>
            <Text style={[styles.tableHeadCell, { width: COL.angle }]}>Angle</Text>
            <Text style={[styles.tableHeadCell, { width: COL.movement }]}>Movement</Text>
            <Text style={[styles.tableHeadCell, { width: COL.lens }]}>Lens</Text>
            <Text style={[styles.tableHeadCell, { width: COL.description }]}>Description</Text>
            <Text style={[styles.tableHeadCell, { width: COL.notes }]}>Notes</Text>
          </View>

          {shotListItems.map((item, index) => {
            const isAlt = index % 2 !== 0;
            const movement = formatSelectValueList(item.movement);
            const isHandheld = movement.toLowerCase().includes('hand');
            const rowBg = isHandheld ? C.handheldBg : isAlt ? C.bg : C.white;
            const imageSrc = imagePreviews[item.id];

            return (
              <View key={item.id ?? index} wrap={false} style={[styles.tableRow, { backgroundColor: rowBg }]}>
                <View style={{ width: COL.sceneShot, paddingRight: 6 }}>
                  <Text style={[styles.cell, { fontWeight: 600 }]}>Sc. {fmt(item.sceneNumber)}</Text>
                  <Text style={[styles.cellMuted, { fontSize: 5.5 }]}>Sh. {fmt(item.shotNumber)}</Text>
                </View>
                <View style={{ width: COL.reference, height: 28, justifyContent: 'center', alignItems: 'center', paddingRight: 8 }}>
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      style={{
                        width: '100%',
                        height: 28,
                        borderRadius: 2,
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <View style={{ width: '100%', height: 28, backgroundColor: C.bg, borderRadius: 2, borderWidth: 0.5, borderColor: C.rule, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 5.5, color: C.light, fontWeight: 600 }}>No Image</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cell, { width: COL.size, fontWeight: 600 }]}>{formatSelectValueList(item.shotSize)}</Text>
                <Text style={[styles.cell, { width: COL.angle }]}>{fmt(item.angle)}</Text>
                <Text style={[styles.cell, { width: COL.movement, color: isHandheld ? C.handheldText : C.black }]}>{movement}</Text>
                <Text style={[styles.cell, { width: COL.lens }]}>{formatLens(item.lens)}</Text>
                <View style={[styles.textColumn, { width: COL.description }]}>
                  <Text style={styles.wrappedText}>{fmtWrapped(item.description)}</Text>
                </View>
                <View style={[styles.textColumn, { width: COL.notes, paddingRight: 0 }]}>
                  <Text style={[styles.wrappedText, { color: item.notes ? C.black : C.mid }]}>{fmtWrapped(item.notes)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated {now}</Text>
          <Text style={styles.footerStamp}>Made with MentalBreakdown · Tawich P.</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} / ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  );
};

export default ShotlistDocument;
