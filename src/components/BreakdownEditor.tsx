'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Helper function to format time
const formatTime = (date) => {
  return date.toTimeString().substring(0, 5);
};

// Helper function to parse time string to Date object
const parseTime = (timeString) => {
  if (!timeString) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Calculate duration between two times in minutes
const calculateDuration = (startTime, endTime) => {
  const start = parseTime(startTime);
  const end = parseTime(endTime);

  if (!start || !end) return 0;

  // Handle overnight cases
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }

  return Math.round((end - start) / 60000);
};

// Calculate end time from start time and duration
const calculateEndTime = (startTime, duration) => {
  const start = parseTime(startTime);
  if (!start || isNaN(duration)) return '';

  const end = new Date(start.getTime() + duration * 60000);
  return formatTime(end);
};

// Main Component
function ShootingScheduleEditor() {
  const [headerInfo, setHeaderInfo] = useState({
    firstShotTime: '08:00',
    // other header fields...
  });

  const [timelineItems, setTimelineItems] = useState([]);

  // Handle time changes with proper recalculation
  const handleTimeChange = useCallback((itemId, field, value) => {
    setTimelineItems(prevItems => {
      const newItems = [...prevItems];
      const itemIndex = newItems.findIndex(item => item.id === itemId);
      if (itemIndex === -1) return prevItems;

      const currentItem = newItems[itemIndex];
      const newItem = { ...currentItem, [field]: value };

      if (field === 'start') {
        // If start time changed, calculate new end time based on duration
        newItem.end = calculateEndTime(value, currentItem.duration);
      } else if (field === 'end') {
        // If end time changed, calculate new duration
        newItem.duration = calculateDuration(value, currentItem.start);
      }

      newItems[itemIndex] = newItem;

      // Recalculate subsequent items if needed
      if (itemIndex < newItems.length - 1) {
        let currentTime = newItem.end;
        for (let i = itemIndex + 1; i < newItems.length; i++) {
          const nextItem = newItems[i];
          if (nextItem.type === 'shot') {
            nextItem.start = currentTime;
            nextItem.end = calculateEndTime(currentTime, nextItem.duration);
            currentTime = nextItem.end;
            newItems[i] = { ...nextItem };
          }
        }
      }

      return newItems;
    });
  }, []);

  // Handle duration changes
  const handleDurationChange = useCallback((itemId, value) => {
    setTimelineItems(prevItems => {
      const newItems = [...prevItems];
      const itemIndex = newItems.findIndex(item => item.id === itemId);
      if (itemIndex === -1) return prevItems;

      const currentItem = newItems[itemIndex];
      const duration = Math.max(0, Number(value) || 0);
      const newItem = {
        ...currentItem,
        duration,
        end: calculateEndTime(currentItem.start, duration)
      };

      newItems[itemIndex] = newItem;

      // Recalculate subsequent items
      if (itemIndex < newItems.length - 1) {
        let currentTime = newItem.end;
        for (let i = itemIndex + 1; i < newItems.length; i++) {
          const nextItem = newItems[i];
          if (nextItem.type === 'shot') {
            nextItem.start = currentTime;
            nextItem.end = calculateEndTime(currentTime, nextItem.duration);
            currentTime = nextItem.end;
            newItems[i] = { ...nextItem };
          }
        }
      }

      return newItems;
    });
  }, []);

  // Add new shot with proper timing
  const addShot = useCallback(() => {
    const lastItem = timelineItems[timelineItems.length - 1];
    const startTime = lastItem ? lastItem.end : headerInfo.firstShotTime;

    const newShot = {
      id: uuidv4(),
      type: 'shot',
      start: startTime,
      duration: 5,
      end: calculateEndTime(startTime, 5),
      // other shot fields...
    };

    setTimelineItems(prevItems => [...prevItems, newShot]);
  }, [timelineItems, headerInfo.firstShotTime]);

  // Add break with independent timing
  const addBreak = useCallback(() => {
    const newBreak = {
      id: uuidv4(),
      type: 'break',
      start: '', // Will be set by user
      duration: 15,
      end: '', // Will be calculated when start is set
      description: 'Break',
    };

    setTimelineItems(prevItems => [...prevItems, newBreak]);
  }, []);

  // Render time input with proper handling
  const renderTimeInput = (item, field) => {
    return (
      <input
        type="time"
        value={item[field]}
        onChange={(e) => handleTimeChange(item.id, field, e.target.value)}
        className="w-full p-1 border text-xs h-full"
      />
    );
  };

  // Render duration input
  const renderDurationInput = (item) => {
    return (
      <input
        type="number"
        min="0"
        value={item.duration}
        onChange={(e) => handleDurationChange(item.id, e.target.value)}
        className="w-full p-1 border text-center text-xs h-full"
      />
    );
  };

  return (
    <div className="p-2 bg-gray-50 min-h-screen min-w-[1200px] overflow-x-auto">
      {/* Header section */}
      <div className="flex flex-nowrap border border-black shadow-md mb-4 text-xs md:text-sm">
        {/* Header fields including firstShotTime */}
        <div className="flex flex-col justify-between bg-purple-100 p-2 border-r border-black space-y-1 min-w-[160px] flex-shrink-0 h-auto">
          <div className="flex items-center justify-between">
            <label htmlFor="firstShotTime" className="mr-2 font-semibold">First shot:</label>
            <input
              id="firstShotTime"
              type="time"
              value={headerInfo.firstShotTime}
              onChange={(e) => setHeaderInfo({...headerInfo, firstShotTime: e.target.value})}
              className="p-1 border rounded bg-white w-24 placeholder:text-gray-400 text-black"
            />
          </div>
        </div>
        {/* Other header fields... */}
      </div>

      {/* Add buttons */}
      <div className="mb-4 mt-6 space-x-4">
        <button onClick={addShot} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          + Add Shot
        </button>
        <button onClick={addBreak} className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
          + Add Break
        </button>
      </div>

      {/* Timeline table */}
      <div className="bg-white border border-gray-300">
        {/* Table header */}
        <div className="flex flex-nowrap bg-gray-200 text-xs font-semibold text-gray-700 sticky top-0 z-10">
          <div className="w-16 px-1 border-r border-gray-400 text-center">Start</div>
          <div className="w-16 px-1 border-r border-gray-400 text-center">End</div>
          <div className="w-16 px-1 border-r border-gray-400 text-center">Duration</div>
          {/* Other headers... */}
        </div>

        {/* Timeline items */}
        {timelineItems.map((item) => (
          <div key={item.id} className={`flex flex-nowrap border-b border-gray-200 items-stretch`}>
            {/* Time columns */}
            <div className="w-16 px-1 border-r border-gray-300">
              {renderTimeInput(item, 'start')}
            </div>
            <div className="w-16 px-1 border-r border-gray-300">
              {renderTimeInput(item, 'end')}
            </div>
            <div className="w-16 px-1 border-r border-gray-300">
              {renderDurationInput(item)}
            </div>
            {/* Other fields... */}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ShootingScheduleEditor;