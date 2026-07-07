const React = require('react');
const { renderToFile } = require('@react-pdf/renderer');
const CallSheetDocument = require('../../callsheet-build/components/pdf/CallSheetDocument.js').default;

const timelineItems = [
  { id: 'b1', type: 'break', start: '06:30', end: '07:15', duration: 45, description: 'Set up ทุกฝ่าย' },
  { id: 's1', type: 'shot', start: '07:15', end: '07:30', duration: 15, sceneNumber: '1', shotNumber: '1', intExt: 'INT', dayNight: 'DAY', location: 'ตึกแถบ', shotSize: 'WS', angle: 'Eye Level', movement: 'STATIC', description: 'กลุ่มเด็กนักเรียนนั่งรอหน้าห้องเรียน เจนนี่เดินผ่าน ทุกคนมองตาม', cast: 'นะโม, เจนนี่, band', props: 'หนังสือ' },
  { id: 's2', type: 'shot', start: '07:30', end: '07:45', duration: 15, sceneNumber: '1', shotNumber: '2', intExt: 'INT', dayNight: 'DAY', location: 'ตึกแถบ', shotSize: 'MS / GROUP', angle: 'Eye Level, OTS', movement: 'DOLLY I / PAN R', description: 'นะโมลุกขึ้นอย่างช้า ๆ เพื่อนช่วยแต่งตัวและส่งสัญญาณให้เดินตาม', cast: 'นะโม, เจนนี่, band', notes: 'ใช้ hallway ให้โล่ง' },
  { id: 's3', type: 'shot', start: '07:45', end: '08:00', duration: 15, sceneNumber: '2', shotNumber: '1', intExt: 'INT', dayNight: 'DAY', location: 'อาคารมหามกุฎ', shotSize: 'MCU', angle: 'Low Angle', movement: 'HANDHELD', description: 'ภูเขาเปิดประตูออกมาด้วยท่าทางมั่นใจ', cast: 'ภูเขา' },
  { id: 'meal', type: 'break', start: '11:45', end: '12:30', duration: 45, description: 'Lunch Break' },
  { id: 's4', type: 'shot', start: '12:30', end: '12:45', duration: 15, sceneNumber: '6', shotNumber: '4', intExt: 'INT', dayNight: 'DAY', location: 'บันไดอาคารมหามกุฎ', shotSize: 'MS / GROUP', angle: 'High Angle', movement: 'TILT D', description: 'ภูเขาลงบันได กลุ่มเพื่อนล้อมและร้องเพลงใส่กล้อง', cast: 'ภูเขา, band' },
  { id: 'wrap', type: 'break', start: '18:20', end: '19:30', duration: 70, description: 'Wrap Up' },
];

const element = React.createElement(CallSheetDocument, {
  headerInfo: {
    projectTitle: 'เธอเหมาะกับฉันกว่า',
    shootingDay: '1',
    totalDays: '2',
    date: '2026-07-02',
    callTime: '06:00',
    firstShotTime: '06:30',
    wrapTime: '19:30',
    firstmealTime: '11:45',
    secondmealTime: '16:00',
    location1: 'อาคารแถบ นีละนิธิ',
    location2: 'อาคารมหามกุฎ',
    location3: 'บันไดอาคารมหามกุฎ',
    director: 'ปริม 0644982568',
    producer: 'เมย์ 0858781878',
    dop: 'เต้ 0918168382',
    firstAD: 'ปัน 0959145392',
    secondAD: 'ทีม 0983689477',
    pd: 'ทีม Art',
    weather: 'Thunderstorm',
    temp: '31°',
    realFeel: '36°',
    sunrise: '05:54',
    sunset: '18:49',
    precipProb: '97%',
  },
  timelineItems,
  callSheetData: {
    generalCall: '06:00',
    castCalls: [
      { id: 'c1', role: 'นะโม', name: 'นักแสดง A', callTime: '06:00', notes: 'Makeup first' },
      { id: 'c2', role: 'เจนนี่', name: 'นักแสดง B', callTime: '06:30', notes: '' },
      { id: 'c3', role: 'ภูเขา', name: 'นักแสดง C', callTime: '07:00', notes: 'Bring costume set B' },
    ],
    emergencyContact: 'Production Manager: 081-111-1111 | Set Medic: 089-222-2222',
    nearestHospital: 'โรงพยาบาลใกล้กอง',
    hospitalAddress: 'ระบุที่อยู่และเส้นทางเข้าฉุกเฉินจากฝ่าย production',
    parkingNotes: 'จอดรถที่ประตู 2 รับบัตรผ่านก่อน 06:00',
    transportNotes: 'รถ shuttle จาก basecamp ทุก 20 นาที',
    safetyNotes: 'พื้นบันไดลื่นหลังฝนตก ให้ grip ตรวจพื้นที่ก่อนถ่าย',
    departmentNotes: 'Art เตรียม props ห้องเรียน / Wardrobe เตรียมชุดสำรอง',
    lineRemarks: 'ส่งโลเคชันและ call time ใน LINE group ก่อนวันถ่าย 20:00',
  },
  stats: { shotCount: 4, totalHours: 13, totalMinutes: 0 },
});

renderToFile(element, 'tmp/pdfs/callsheet-review/callsheet-test.pdf');
