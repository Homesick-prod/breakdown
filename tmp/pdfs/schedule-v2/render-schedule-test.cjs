const React = require('react');
const { renderToFile } = require('@react-pdf/renderer');
const ScheduleDocument = require('../../pdf-build/components/pdf/ScheduleDocument.js').default;

const names = ['นะโม', 'เจนนี่', 'ภูเขา', 'band'];
const descriptions = [
  'กลุ่มเด็กนักเรียนชายพิงผนังห้องอยู่บริเวณหน้าห้องเรียน มีผู้หญิงคนหนึ่งเดินผ่าน ทุกคนมองตามด้วยสายตาลุกวาว',
  'นะโมเดินตาม ชะเง้อ และแอคเท่ระหว่างเดินตามเจนนี่ ก่อนเจนนี่เลี้ยวขวาไปทางโต๊ะของตัวเอง',
  'ภูเขาเปิดประตูออกมาด้วยท่าทางซิกเนเจอร์ เป็นการเปิดตัวเหมือนพระเอกรัฐญี่ปุ่น',
  'กลุ่มเพื่อนเชียร์นะโมสุดใจ เจนนี่มีสีหน้ากังวล ภูเขาเขียนคำตอบผิดแต่ยังได้รับกำลังใจ',
  'นะโมและภูเขาสู้กันด้วยท่าทางเหยาะแยะเหมือนเด็กเล่น ก่อนทั้งคู่หันไปหาเจนนี่พร้อมกัน',
  'เพื่อน ๆ แอบมองนะโมและภูเขาสู้กันอยู่ห่าง ๆ ชะเง้อออกมาด้วยความกลัว',
];

const times = [
  ['06:30', '07:30', 60],
  ['07:30', '07:45', 15],
  ['07:45', '07:55', 10],
  ['07:55', '08:05', 10],
  ['08:05', '08:20', 15],
  ['08:20', '08:35', 15],
  ['08:35', '08:50', 15],
  ['08:50', '09:05', 15],
  ['09:05', '09:15', 10],
  ['09:15', '09:25', 10],
  ['09:25', '09:35', 10],
  ['09:35', '09:45', 10],
  ['09:45', '09:55', 10],
  ['09:55', '10:05', 10],
  ['10:05', '10:15', 10],
  ['10:15', '10:25', 10],
  ['10:25', '10:35', 10],
  ['10:35', '10:45', 10],
  ['10:45', '11:00', 15],
  ['11:00', '11:15', 15],
  ['11:15', '11:30', 15],
  ['11:30', '11:45', 15],
  ['11:45', '12:15', 30],
  ['12:15', '12:30', 15],
  ['12:30', '12:45', 15],
  ['12:45', '13:00', 15],
  ['13:00', '13:15', 15],
  ['13:15', '13:30', 15],
  ['13:30', '13:45', 15],
  ['13:45', '14:00', 15],
  ['14:00', '14:15', 15],
  ['14:15', '14:30', 15],
  ['14:30', '14:40', 10],
  ['14:40', '14:55', 15],
  ['14:55', '15:10', 15],
  ['15:10', '15:25', 15],
  ['15:25', '15:40', 15],
  ['15:40', '15:50', 10],
  ['15:50', '16:00', 10],
  ['16:00', '16:10', 10],
  ['16:10', '16:25', 15],
  ['16:25', '16:35', 10],
  ['16:35', '16:45', 10],
  ['16:45', '17:00', 15],
  ['17:00', '17:15', 15],
  ['17:15', '17:30', 15],
  ['17:30', '17:45', 15],
  ['17:45', '18:00', 15],
  ['18:00', '18:10', 10],
  ['18:10', '18:20', 10],
  ['18:20', '19:30', 70],
];

const timelineItems = times.map(([start, end, duration], index) => {
  if (index === 0) return { id: `break-${index}`, type: 'break', start, end, duration, description: 'set up ทุกฝ่าย' };
  if (index === 22) return { id: `break-${index}`, type: 'break', start, end, duration, description: 'ทีมงานและนักแสดงบางส่วนมาจ่ายที่ตึกมหามกุฎ คนอื่นพักกินข้าว' };
  if (index === times.length - 1) return { id: `break-${index}`, type: 'break', start, end, duration, description: 'Wrap Up' };

  const scene = index < 14 ? Math.ceil(index / 6) : index < 40 ? 8 : 6;
  const movement = index % 7 === 0 ? 'DOLLY O / FOLLOW / HANDHELD' : index % 5 === 0 ? 'DOLLY I / PAN R' : 'STATIC';
  return {
    id: `shot-${index}`,
    type: 'shot',
    start,
    end,
    duration,
    sceneNumber: String(scene),
    shotNumber: String(index),
    intExt: 'INT',
    dayNight: 'DAY',
    location: index > 40 ? 'บันไดอาคารมหามกุฎ' : 'ตึกแถบ',
    shotSize: index % 6 === 0 ? 'MS / GROUP' : index % 4 === 0 ? 'MCU / 2S' : 'WS',
    angle: index % 9 === 0 ? 'Eye Level, 3/4' : index % 4 === 0 ? 'Low Angle, POV' : 'Eye Level',
    movement,
    lens: '',
    description: descriptions[index % descriptions.length],
    cast: names.slice(0, (index % names.length) + 1).join(', '),
  };
});

const imagePreviews = {};
if (process.env.WITH_STORYBOARD === '1') {
  for (const item of timelineItems.filter((item) => item.type !== 'break').slice(0, 4)) {
    imagePreviews[item.id] = `${process.cwd()}/public/og-image.png`;
  }
}

const element = React.createElement(ScheduleDocument, {
  headerInfo: {
    projectTitle: 'เธอเหมาะกับฉันกว่า',
    shootingDay: '1',
    totalDays: '2',
    date: '2026-07-02',
    callTime: '06:00',
    firstShotTime: '06:30',
    wrapTime: '19:30',
    location1: 'อาคารแถบ นีละนิธิ',
    location2: 'อาคารมหามกุฎ',
    director: 'ปริม 0644982568',
    producer: 'เมย์ 0858781878',
    dop: 'เต้ 0918168382',
    firstAD: 'ปัน 0959145392',
    secondAD: 'ทีม 0983689477',
    weather: 'Thunderstorm',
    temp: '31°',
    sunrise: '05:54',
    sunset: '18:49',
    precipProb: '97%',
  },
  timelineItems,
  imagePreviews,
  stats: { shotCount: 48, totalHours: 13, totalMinutes: 0 },
});

renderToFile(element, process.env.OUT || 'tmp/pdfs/schedule-v2/schedule-test.pdf');
