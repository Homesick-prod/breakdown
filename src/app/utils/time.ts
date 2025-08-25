/**
 * Calculates the end time based on a start time and a duration in minutes.
 * @param {string} startTime - The start time in "HH:MM" format.
 * @param {number} duration - The duration in minutes.
 * @returns {string} The calculated end time in "HH:MM" format.
 */
export const calculateEndTime = (startTime: string, duration: number): string => {
  if (!startTime || duration === null || duration < 0 || isNaN(duration)) return '';
  try {
    const [hours, minutes] = startTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return '';
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const endHours = endDate.getHours().toString().padStart(2, '0');
    const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
    return `${endHours}:${endMinutes}`;
  } catch {
    return '';
  }
};

/**
 * Calculates the duration in minutes between a start and end time.
 * @param {string} startTime - The start time in "HH:MM" format.
 * @param {string} endTime - The end time in "HH:MM" format.
 * @returns {number} The duration in minutes.
 */
export const calculateDuration = (startTime: string, endTime: string): number => {
  if (!startTime || !endTime) return 0;
  try {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) return 0;
    
    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);
    
    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);

    // Handle overnight schedules
    if (endDate < startDate) {
        endDate.setDate(endDate.getDate() + 1);
    }

    const diffMillis = endDate.getTime() - startDate.getTime();
    const diffMinutes = Math.round(diffMillis / 60000);
    return diffMinutes >= 0 ? diffMinutes : 0;
  } catch {
    return 0;
  }
};
