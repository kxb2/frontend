// F-05 PDF 내보내기: 9컷 그리드 + 샷별 프롬프트를 한 문서로 묶어 PDF로 다운로드

import { Document, Page, View, Text, Image as PdfImage, StyleSheet, Font } from '@react-pdf/renderer';
import { StoryboardResult } from '@/types/ai';

// PDF용 한글 폰트
Font.register({
  family: 'IBMPlexSansKR',
  fonts: [
    { src: '/fonts/IBMPlexSansKR-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/IBMPlexSansKR-Bold.ttf', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: 'IBMPlexSansKR',
  },
  title: {
    fontSize: 16,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cell: {
    width: '32%',
    aspectRatio: 16 / 9,
  },
  cellImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cellPlaceholder: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  shotRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  shotNumber: {
    width: 60,
    fontWeight: 'bold',
  },
  shotDescription: {
    flex: 1,
  },
});

interface StoryboardPdfDocumentProps {
  result: StoryboardResult;
}

export default function StoryboardPdfDocument({ result }: StoryboardPdfDocumentProps) {
  const sortedCuts = [...result.cuts].sort((a, b) => a.shotNumber - b.shotNumber);
  const sortedShots = [...result.shots].sort((a, b) => a.shotNumber - b.shotNumber);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>스토리보드 9컷</Text>
        <View style={styles.grid}>
          {sortedCuts.map((cut) => (
            <View key={cut.shotNumber} style={styles.cell}>
              {cut.imageUrl ? <PdfImage style={styles.cellImage} src={cut.imageUrl} /> : <View style={styles.cellPlaceholder} />}
            </View>
          ))}
        </View>
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>샷별 프롬프트</Text>
        {sortedShots.map((shot) => (
          <View key={shot.shotNumber} style={styles.shotRow}>
            <Text style={styles.shotNumber}>Shot {shot.shotNumber}</Text>
            <Text style={styles.shotDescription}>{shot.description}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
