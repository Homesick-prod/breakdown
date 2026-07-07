"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_SELECT_VALUE_ALIASES = void 0;
exports.normalizeLegacySelectValue = normalizeLegacySelectValue;
exports.formatSelectValueList = formatSelectValueList;
exports.LEGACY_SELECT_VALUE_ALIASES = {
    Cowboy: 'COWBOY',
    Group: 'GROUP',
    Insert: 'INSERT',
    Cutaway: 'CUTAWAY',
    Static: 'STATIC',
    'Pan L': 'PAN L',
    'Pan R': 'PAN R',
    'Tilt U': 'TILT U',
    'Tilt D': 'TILT D',
    'Dolly I': 'DOLLY I',
    'Dolly O': 'DOLLY O',
    'Truck L': 'TRUCK L',
    'Truck R': 'TRUCK R',
    Follow: 'FOLLOW',
    'Pedestal U': 'PEDESTAL U',
    'Pedestal D': 'PEDESTAL D',
    Handheld: 'HANDHELD',
    Steadicam: 'STEADICAM',
    Gimbal: 'GIMBAL',
    Crane: 'CRANE',
    Jib: 'JIB',
    Drone: 'DRONE',
    Aerial: 'AERIAL',
    'Zoom I': 'ZOOM I',
    'Zoom O': 'ZOOM O',
    'Snap Zoom': 'SNAP ZOOM',
    'Rack Focus': 'RACK FOCUS',
    Arc: 'ARC',
    Orbit: 'ORBIT',
    'Whip Pan L': 'WHIP PAN L',
    'Whip Pan R': 'WHIP PAN R',
};
function normalizeLegacySelectValue(value) {
    return exports.LEGACY_SELECT_VALUE_ALIASES[value] ?? value;
}
function formatSelectValueList(value, fallback = '-') {
    const raw = String(value ?? '').trim();
    if (!raw)
        return fallback;
    const formatted = raw
        .split(',')
        .map(part => normalizeLegacySelectValue(part.trim()))
        .filter(Boolean)
        .join(' / ');
    return formatted || fallback;
}
