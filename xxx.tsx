"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";

// --- Helper Functions ---
// Custom ID generator to replace uuid
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const calculateEndTime = (startTime, duration) => {
  if (!startTime || duration === null || duration < 0 || isNaN(duration))
    return "";
  try {
    const [hours, minutes] = startTime.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return "";
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const endHours = endDate.getHours().toString().padStart(2, "0");
    const endMinutes = endDate.getMinutes().toString().padStart(2, "0");
    return `${endHours}:${endMinutes}`;
  } catch {
    return "";
  }
};

const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  try {
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);
    if (
      isNaN(startHours) ||
      isNaN(startMinutes) ||
      isNaN(endHours) ||
      isNaN(endMinutes)
    )
      return 0;
    const startDate = new Date();
    startDate.setHours(startHours, startMinutes, 0, 0);
    const endDate = new Date();
    endDate.setHours(endHours, endMinutes, 0, 0);
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

// --- Fields that can be merged ---
const MERGEABLE_FIELDS = [
  "location",
  "scene",
  "shot",
  "size",
  "movementAngle",
  "description",
  "mainCast",
  "wardrobe",
  "makeup",
  "settingProp",
  "remarks",
];

// --- Main Component ---
function ShootingScheduleEditor() {
  const [headerInfo, setHeaderInfo] = useState({
    qNumber: "1",
    onLocationTime: "",
    firstShotTime: "",
    wrapUpTime: "",
    dirContact: "",
    ad1Contact: "",
    ad2Contact: "",
    location: "",
    title: "",
    date: "",
    weatherForecast: "",
  });

  const [timelineItems, setTimelineItems] = useState([]);
  const [imagePreviews, setImagePreviews] = useState({});

  // === State for Selection and Merging ===
  const [selection, setSelection] = useState({
    startItemId: null,
    endItemId: null,
    field: null,
  });
  const [showMergeButton, setShowMergeButton] = useState(false);
  const [showUnmergeButton, setShowUnmergeButton] = useState(false);
  const [activeMergeActionTarget, setActiveMergeActionTarget] = useState(null);

  // --- Time Recalculation ---
  const recalculateAndUpdateTimes = useCallback(
    (items, keepFirstItemTime = false, changedItemId = null) => {
      let currentTime = headerInfo.firstShotTime || "00:00";
      let lastEndTime = currentTime;

      const updatedItems = items.map((item, index) => {
        let newStart;

        // If this is the item that was changed and we want to keep its time
        if (changedItemId === item.id && keepFirstItemTime) {
          newStart = item.start;
        } else if (index === 0) {
          newStart = headerInfo.firstShotTime || "00:00";
        } else {
          newStart = lastEndTime;
        }

        const currentDuration =
          typeof item.duration === "number" ? item.duration : 0;
        const newEnd = calculateEndTime(newStart, currentDuration);
        lastEndTime = newEnd || lastEndTime;

        return { ...item, start: newStart, end: newEnd };
      });

      setTimelineItems(updatedItems);
    },
    [headerInfo.firstShotTime],
  );

  useEffect(() => {
    if (timelineItems.length > 0 && headerInfo.firstShotTime) {
      recalculateAndUpdateTimes(timelineItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerInfo.firstShotTime]);

  // --- Image Preview Cleanup ---
  useEffect(() => {
    return () => {
      Object.values(imagePreviews).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  // --- Item Management Functions ---
  const addShot = useCallback(() => {
    // Get the last item's end time for the new shot's start time
    const lastItem = timelineItems[timelineItems.length - 1];
    const newStartTime = lastItem
      ? lastItem.end
      : headerInfo.firstShotTime || "00:00";

    const newShot = {
      id: generateId(),
      type: "shot",
      start: newStartTime,
      duration: 5,
      end: "",
      extInt: "INT",
      dayNight: "Night",
      location: "",
      scene: "",
      shot: "",
      size: "",
      movementAngle: "",
      description: "",
      mainCast: "",
      wardrobe: "",
      makeup: "",
      settingProp: "",
      remarks: "",
      fieldStatus: MERGEABLE_FIELDS.reduce((acc, field) => {
        acc[field] = { mergedWithAbove: false, isMergeOrigin: false };
        return acc;
      }, {}),
    };

    // Calculate end time for the new shot
    newShot.end = calculateEndTime(newShot.start, newShot.duration);

    const newItems = [...timelineItems, newShot];
    setTimelineItems(newItems);
  }, [timelineItems, headerInfo.firstShotTime]);

  const addBreak = useCallback(() => {
    // Get the last item's end time for the new break's start time
    const lastItem = timelineItems[timelineItems.length - 1];
    const newStartTime = lastItem
      ? lastItem.end
      : headerInfo.firstShotTime || "00:00";

    const newBreak = {
      id: generateId(),
      type: "break",
      start: newStartTime,
      duration: 15,
      end: "",
      description: "พักเบรค",
    };

    // Calculate end time for the new break
    newBreak.end = calculateEndTime(newBreak.start, newBreak.duration);

    const newItems = [...timelineItems, newBreak];
    setTimelineItems(newItems);
  }, [timelineItems, headerInfo.firstShotTime]);

  const removeTimelineItem = useCallback(
    (itemIdToRemove) => {
      if (imagePreviews[itemIdToRemove]) {
        URL.revokeObjectURL(imagePreviews[itemIdToRemove]);
        setImagePreviews((prev) => {
          const newState = { ...prev };
          delete newState[itemIdToRemove];
          return newState;
        });
      }
      const newItems = timelineItems.filter(
        (item) => item.id !== itemIdToRemove,
      );
      recalculateAndUpdateTimes(newItems);
    },
    [timelineItems, recalculateAndUpdateTimes, imagePreviews],
  );

  // --- Handle Item Data Change ---
  const handleItemChange = useCallback(
    (itemId, field, value) => {
      let requiresRecalculation = false;
      let keepItemTime = false;

      const newItems = timelineItems.map((item) => {
        if (item.id === itemId) {
          const newItemData = {
            ...item,
            fieldStatus:
              item.type === "shot"
                ? item.fieldStatus ||
                  MERGEABLE_FIELDS.reduce(
                    (acc, f) => ({
                      ...acc,
                      [f]: { mergedWithAbove: false, isMergeOrigin: false },
                    }),
                    {},
                  )
                : undefined,
          };

          if (field === "duration") {
            const newDuration = parseInt(value, 10) || 0;
            newItemData.duration = newDuration < 0 ? 0 : newDuration;
            newItemData.end = calculateEndTime(
              item.start,
              newItemData.duration,
            );
            requiresRecalculation = true;
          } else if (field === "start") {
            newItemData.start = value;
            newItemData.duration = calculateDuration(value, item.end);
            requiresRecalculation = true;
            keepItemTime = true;
          } else if (field === "end") {
            newItemData.end = value;
            newItemData.duration = calculateDuration(item.start, value);
            // Don't need full recalculation, just update subsequent items
            requiresRecalculation = true;
          } else {
            newItemData[field] = value;
          }

          return newItemData;
        }
        return item;
      });

      if (requiresRecalculation) {
        if (field === "start") {
          // When start time changes, keep this item's time and recalculate others
          recalculateAndUpdateTimes(newItems, keepItemTime, itemId);
        } else {
          // For duration or end time changes, recalculate from this item onwards
          const itemIndex = newItems.findIndex((item) => item.id === itemId);
          if (itemIndex !== -1) {
            // Update subsequent items
            let lastEndTime = newItems[itemIndex].end;
            for (let i = itemIndex + 1; i < newItems.length; i++) {
              newItems[i].start = lastEndTime;
              newItems[i].end = calculateEndTime(
                lastEndTime,
                newItems[i].duration,
              );
              lastEndTime = newItems[i].end;
            }
          }
          setTimelineItems(newItems);
        }
      } else {
        setTimelineItems(newItems);
      }
    },
    [timelineItems, recalculateAndUpdateTimes],
  );

  // --- Handle time input validation ---
  const validateTimeInput = useCallback((value) => {
    // Allow partial input while typing
    if (!value) return true;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):?([0-5]?[0-9])?$/;
    return timeRegex.test(value);
  }, []);

  // --- Image Handling ---
  const handleImageChange = useCallback(
    (itemId, file) => {
      if (!file || !file.type.startsWith("image/")) return;
      const newPreviewUrl = URL.createObjectURL(file);
      if (imagePreviews[itemId]) {
        URL.revokeObjectURL(imagePreviews[itemId]);
      }
      setImagePreviews((prev) => ({ ...prev, [itemId]: newPreviewUrl }));
    },
    [imagePreviews],
  );

  // --- Header Handling ---
  const handleHeaderChange = (field, value) => {
    setHeaderInfo((prevHeader) => ({ ...prevHeader, [field]: value }));
  };

  // === Selection and Merge/Unmerge Logic ===
  const itemIndices = useMemo(() => {
    const indices = {};
    timelineItems.forEach((item, index) => {
      indices[item.id] = index;
    });
    return indices;
  }, [timelineItems]);

  const handleCtrlClick = (itemId, field) => {
    if (!MERGEABLE_FIELDS.includes(field)) return;

    const clickedItem = timelineItems.find((item) => item.id === itemId);
    if (clickedItem?.type !== "shot") return;

    const currentFieldStatus = clickedItem.fieldStatus?.[field] || {
      mergedWithAbove: false,
      isMergeOrigin: false,
    };
    const isMerged =
      currentFieldStatus.mergedWithAbove || currentFieldStatus.isMergeOrigin;

    setShowMergeButton(false);
    setShowUnmergeButton(false);
    setActiveMergeActionTarget(null);

    if (isMerged) {
      setShowUnmergeButton(true);
      setActiveMergeActionTarget({ itemId, field });
      setSelection({ startItemId: null, endItemId: null, field: null });
    } else {
      if (!selection.startItemId || selection.field !== field) {
        setSelection({ startItemId: itemId, endItemId: null, field: field });
      } else if (
        selection.startItemId &&
        selection.field === field &&
        itemId !== selection.startItemId
      ) {
        const startIndex = itemIndices[selection.startItemId];
        const endIndex = itemIndices[itemId];

        if (
          typeof startIndex === "number" &&
          typeof endIndex === "number" &&
          endIndex > startIndex
        ) {
          let canSelectRange = true;
          for (let i = startIndex; i <= endIndex; i++) {
            const loopItem = timelineItems[i];
            const loopFieldStatus = loopItem?.fieldStatus?.[field];
            if (
              !loopItem ||
              loopItem.type !== "shot" ||
              loopFieldStatus?.mergedWithAbove ||
              loopFieldStatus?.isMergeOrigin
            ) {
              canSelectRange = false;
              break;
            }
          }

          if (canSelectRange) {
            setSelection((prev) => ({ ...prev, endItemId: itemId }));
            setShowMergeButton(true);
            setActiveMergeActionTarget({
              itemId: selection.startItemId,
              field,
            });
          } else {
            setSelection({
              startItemId: itemId,
              endItemId: null,
              field: field,
            });
          }
        } else {
          setSelection({ startItemId: itemId, endItemId: null, field: field });
        }
      } else if (
        itemId === selection.startItemId &&
        field === selection.field
      ) {
        setSelection({ startItemId: null, endItemId: null, field: null });
      }
    }
  };

  const getSelectedItems = () => {
    if (!selection.startItemId || !selection.endItemId || !selection.field)
      return [];
    const startIndex = itemIndices[selection.startItemId];
    const endIndex = itemIndices[selection.endItemId];
    if (
      startIndex === undefined ||
      endIndex === undefined ||
      startIndex > endIndex
    )
      return [];
    return timelineItems.slice(startIndex, endIndex + 1).map((item) => item.id);
  };
  const selectedItemIds = useMemo(getSelectedItems, [
    selection,
    itemIndices,
    timelineItems,
  ]);
  const selectedItemIdsSet = useMemo(
    () => new Set(selectedItemIds),
    [selectedItemIds],
  );

  const handleMerge = () => {
    if (
      !activeMergeActionTarget ||
      !selection.startItemId ||
      !selection.endItemId
    )
      return;

    const { field } = activeMergeActionTarget;
    const startIndex = itemIndices[selection.startItemId];
    const endIndex = itemIndices[selection.endItemId];
    const startItemContent = timelineItems[startIndex]?.[field];

    setTimelineItems((prevItems) =>
      prevItems.map((item, index) => {
        if (item.type === "shot" && index >= startIndex && index <= endIndex) {
          const currentFieldStatus =
            item.fieldStatus ||
            MERGEABLE_FIELDS.reduce(
              (acc, f) => ({
                ...acc,
                [f]: { mergedWithAbove: false, isMergeOrigin: false },
              }),
              {},
            );
          const newFieldStatus = {
            ...currentFieldStatus,
            [field]: {
              mergedWithAbove: index > startIndex,
              isMergeOrigin: index === startIndex,
            },
          };
          return {
            ...item,
            [field]: startItemContent,
            fieldStatus: newFieldStatus,
          };
        }
        return item;
      }),
    );

    setSelection({ startItemId: null, endItemId: null, field: null });
    setShowMergeButton(false);
    setActiveMergeActionTarget(null);
  };

  const handleUnmerge = () => {
    if (!activeMergeActionTarget) return;
    const { itemId, field } = activeMergeActionTarget;

    const clickedItemIndex = itemIndices[itemId];
    if (clickedItemIndex === undefined) return;

    let mergeStartIndex = -1;
    let mergeEndIndex = -1;

    const fieldStatus = timelineItems[clickedItemIndex]?.fieldStatus?.[field];
    if (fieldStatus?.isMergeOrigin) {
      mergeStartIndex = clickedItemIndex;
    } else if (fieldStatus?.mergedWithAbove) {
      for (let i = clickedItemIndex - 1; i >= 0; i--) {
        const prevFieldStatus = timelineItems[i]?.fieldStatus?.[field];
        if (prevFieldStatus?.isMergeOrigin) {
          mergeStartIndex = i;
          break;
        }
        if (
          !prevFieldStatus?.mergedWithAbove ||
          timelineItems[i]?.type !== "shot"
        )
          break;
      }
    }

    if (mergeStartIndex === -1) return;

    mergeEndIndex = mergeStartIndex;
    for (let i = mergeStartIndex + 1; i < timelineItems.length; i++) {
      if (
        timelineItems[i]?.fieldStatus?.[field]?.mergedWithAbove &&
        timelineItems[i]?.type === "shot"
      ) {
        mergeEndIndex = i;
      } else {
        break;
      }
    }

    setTimelineItems((prevItems) =>
      prevItems.map((item, index) => {
        if (
          item.type === "shot" &&
          index >= mergeStartIndex &&
          index <= mergeEndIndex
        ) {
          const currentFieldStatus = item.fieldStatus || {};
          const newFieldStatus = {
            ...currentFieldStatus,
            [field]: { mergedWithAbove: false, isMergeOrigin: false },
          };
          return { ...item, fieldStatus: newFieldStatus };
        }
        return item;
      }),
    );

    setShowUnmergeButton(false);
    setActiveMergeActionTarget(null);
    setSelection({ startItemId: null, endItemId: null, field: null });
  };

  // --- Calculate total duration ---
  const totalDuration = useMemo(() => {
    return timelineItems.reduce((sum, item) => sum + (item.duration || 0), 0);
  }, [timelineItems]);

  const totalHours = Math.floor(totalDuration / 60);
  const totalMinutes = totalDuration % 60;

  // --- Render UI ---
  return (
    <div className="p-2 bg-gray-50 min-h-screen min-w-[1200px] overflow-x-auto relative">
      {/* Header */}
      <div className="flex flex-nowrap border border-black shadow-md mb-4 text-xs md:text-sm">
        <div className="flex flex-row justify-center items-center bg-sky-200 p-2 border-r border-black w-16 flex-shrink-0 h-auto">
          <label htmlFor="qNumber" className="font-bold mb-1">
            Q
          </label>
          <input
            id="qNumber"
            type="text"
            value={headerInfo.qNumber}
            onChange={(e) => handleHeaderChange("qNumber", e.target.value)}
            placeholder="No."
            className="p-1 border rounded bg-white w-10 text-center placeholder:text-gray-400 text-black"
          />
        </div>
        <div className="flex flex-col justify-between bg-purple-100 p-2 border-r border-black space-y-1 min-w-[160px] flex-shrink-0 h-auto">
          <div className="flex items-center justify-between">
            <label htmlFor="onLocationTime" className="mr-2 font-semibold">
              On location:
            </label>
            <input
              id="onLocationTime"
              type="time"
              value={headerInfo.onLocationTime}
              onChange={(e) =>
                handleHeaderChange("onLocationTime", e.target.value)
              }
              placeholder="00:00"
              className="p-1 border rounded bg-white w-24 placeholder:text-gray-400 text-black"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="firstShotTime" className="mr-2 font-semibold">
              First shot:
            </label>
            <input
              id="firstShotTime"
              type="time"
              value={headerInfo.firstShotTime}
              onChange={(e) =>
                handleHeaderChange("firstShotTime", e.target.value)
              }
              placeholder="00:00"
              className="p-1 border rounded bg-white w-24 placeholder:text-gray-400 text-black"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="wrapUpTime" className="mr-2 font-semibold">
              Wrap up:
            </label>
            <input
              id="wrapUpTime"
              type="time"
              value={headerInfo.wrapUpTime}
              onChange={(e) => handleHeaderChange("wrapUpTime", e.target.value)}
              placeholder="00:00"
              className="p-1 border rounded bg-white w-24 placeholder:text-gray-400 text-black"
            />
          </div>
        </div>
        <div className="flex flex-col justify-between bg-yellow-100 p-2 border-r border-black space-y-1 min-w-[180px] flex-shrink-0 h-auto">
          <div className="flex items-center justify-between">
            <label htmlFor="dirContact" className="mr-2 font-semibold">
              Dir.:
            </label>
            <input
              id="dirContact"
              type="text"
              value={headerInfo.dirContact}
              onChange={(e) => handleHeaderChange("dirContact", e.target.value)}
              placeholder="เบอร์ผู้กำกับ"
              className="p-1 border rounded bg-white w-32 placeholder:text-gray-400 text-black"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="ad1Contact" className="mr-2 font-semibold">
              AD1:
            </label>
            <input
              id="ad1Contact"
              type="text"
              value={headerInfo.ad1Contact}
              onChange={(e) => handleHeaderChange("ad1Contact", e.target.value)}
              placeholder="เบอร์ AD1"
              className="p-1 border rounded bg-white w-32 placeholder:text-gray-400 text-black"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="ad2Contact" className="mr-2 font-semibold">
              AD2:
            </label>
            <input
              id="ad2Contact"
              type="text"
              value={headerInfo.ad2Contact}
              onChange={(e) => handleHeaderChange("ad2Contact", e.target.value)}
              placeholder="เบอร์ AD2"
              className="p-1 border rounded bg-white w-32 placeholder:text-gray-400 text-black"
            />
          </div>
        </div>
        <div className="flex flex-col justify-center bg-white p-2 border-r border-black min-w-[250px] flex-shrink-0 h-auto">
          <label htmlFor="location" className="font-semibold mb-1">
            Location:
          </label>
          <textarea
            id="location"
            rows="2"
            value={headerInfo.location}
            onChange={(e) => handleHeaderChange("location", e.target.value)}
            placeholder="ชื่อสถานที่ถ่ายทำหลัก"
            className="p-1 border rounded bg-white w-full placeholder:text-gray-400 text-black resize-none"
          />
        </div>
        <div className="flex flex-col justify-center bg-purple-200 p-2 border-r border-black flex-grow min-w-[250px] h-auto">
          <label htmlFor="title" className="font-semibold mb-1 text-center">
            Title:
          </label>
          <input
            id="title"
            type="text"
            value={headerInfo.title}
            onChange={(e) => handleHeaderChange("title", e.target.value)}
            placeholder="ชื่อโปรเจกต์ / ตอน"
            className="p-1 border rounded bg-white w-full text-center mb-2 placeholder:text-gray-400 text-black font-semibold"
          />
          <label htmlFor="date" className="font-semibold mb-1 text-center">
            Date:
          </label>
          <input
            id="date"
            type="text"
            value={headerInfo.date}
            onChange={(e) => handleHeaderChange("date", e.target.value)}
            placeholder="DD/MM/YY"
            className="p-1 border rounded bg-white w-full text-center placeholder:text-gray-400 text-black"
          />
        </div>
        <div className="flex flex-col justify-center bg-yellow-100 p-2 min-w-[200px] flex-shrink-0 h-auto">
          <label
            htmlFor="weatherForecast"
            className="font-semibold mb-1 text-center"
          >
            Weather Forecast:
          </label>
          <textarea
            id="weatherForecast"
            rows="2"
            value={headerInfo.weatherForecast}
            onChange={(e) =>
              handleHeaderChange("weatherForecast", e.target.value)
            }
            placeholder="สภาพอากาศ..."
            className="p-1 border rounded bg-white w-full text-center placeholder:text-gray-400 text-black resize-none"
          />
        </div>
      </div>

      {/* Merge/Unmerge Buttons */}
      {(showMergeButton || showUnmergeButton) && (
        <div className="fixed top-16 right-4 z-20 space-x-2">
          {showMergeButton && activeMergeActionTarget && (
            <button
              onClick={handleMerge}
              className="px-4 py-2 bg-green-500 text-white rounded shadow-lg hover:bg-green-600"
            >
              Merge ({activeMergeActionTarget.field})
            </button>
          )}
          {showUnmergeButton && activeMergeActionTarget && (
            <button
              onClick={handleUnmerge}
              className="px-4 py-2 bg-red-500 text-white rounded shadow-lg hover:bg-red-600"
            >
              Unmerge ({activeMergeActionTarget.field})
            </button>
          )}
        </div>
      )}

      {/* Add Buttons and Total Duration */}
      <div className="mb-4 mt-6 flex justify-between items-center">
        <div className="space-x-4">
          <button
            onClick={addShot}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            + เพิ่ม Shot
          </button>
          <button
            onClick={addBreak}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50"
          >
            + เพิ่ม Break / Activity
          </button>
        </div>
        <div className="bg-blue-100 px-4 py-2 rounded text-sm font-semibold">
          Total Duration: {totalHours}h {totalMinutes}m
        </div>
      </div>

      {/* Timeline Table */}
      <div>
        <div>
          {/* Header Row */}
          <div className="flex flex-nowrap bg-gray-200 text-xs font-semibold text-gray-700 sticky top-0 z-10 border-b-2 border-t border-l border-r border-gray-400 h-10">
            <div className="w-16 px-1 border-r border-gray-400 text-center flex items-center justify-center flex-shrink-0">
              Start
            </div>
            <div className="w-16 px-1 border-r border-gray-400 text-center flex items-center justify-center flex-shrink-0">
              End
            </div>
            <div className="w-16 px-1 border-r border-gray-400 text-center flex items-center justify-center flex-shrink-0">
              Dur.
            </div>
            <div className="w-12 px-1 border-r border-gray-400 text-center flex items-center justify-center flex-shrink-0">
              I/E
            </div>
            <div className="w-12 px-1 border-r border-gray-400 text-center flex items-center justify-center flex-shrink-0">
              D/N
            </div>
            <div className="w-24 px-1 border-r border-gray-400 flex items-center flex-shrink-0">
              Location
            </div>
            <div className="w-16 px-1 border-r border-gray-400 text-center flex items-center justify-center flex-shrink-0">
              Scene
            </div>
            <div className="w-16 px-1 border-r border-gray-400 text-center flex items-center justify-center flex-shrink-0">
              Shot
            </div>
            <div className="w-16 px-1 border-r border-gray-400 flex items-center flex-shrink-0">
              Size
            </div>
            <div className="w-28 px-1 border-r border-gray-400 flex items-center flex-shrink-0">
              Movement/Angle
            </div>
            <div className="w-32 px-1 border-r border-gray-400 flex items-center flex-grow">
              Description
            </div>
            <div className="w-24 px-1 border-r border-gray-400 flex items-center flex-shrink-0">
              Main Cast
            </div>
            <div className="w-24 px-1 border-r border-gray-400 flex items-center flex-shrink-0">
              Wardrobe
            </div>
            <div className="w-24 px-1 border-r border-gray-400 flex items-center flex-shrink-0">
              Make up
            </div>
            <div className="w-32 px-1 border-r border-gray-400 flex items-center flex-grow">
              Setting & Main prop
            </div>
            <div className="w-28 px-1 border-r border-gray-400 flex items-center flex-shrink-0">
              Remarks
            </div>
            <div className="w-24 px-1 border-r border-gray-400 text-center flex items-center justify-center flex-shrink-0">
              Blogshot/Ref.
            </div>
            <div className="w-10 px-1 flex items-center justify-center flex-shrink-0"></div>
          </div>

          {/* Timeline Item Rows */}
          <div className="bg-white border-l border-r border-b border-gray-300">
            {timelineItems.map((item, index) => {
              if (item.type === "break") {
                return (
                  <div
                    key={item.id}
                    className="flex flex-nowrap border-b border-dashed border-gray-400 items-center bg-yellow-50 text-black h-10 text-xs"
                  >
                    <div className="w-16 px-1 border-r border-gray-300 text-center flex-shrink-0 flex items-center justify-center">
                      <input
                        type="time"
                        value={item.start}
                        onChange={(e) =>
                          handleItemChange(item.id, "start", e.target.value)
                        }
                        className="p-0.5 border rounded text-xs text-center bg-yellow-100 w-14"
                        title="Start time"
                      />
                    </div>
                    <div className="w-16 px-1 border-r border-gray-300 text-center flex-shrink-0 flex items-center justify-center">
                      <input
                        type="time"
                        value={item.end}
                        onChange={(e) =>
                          handleItemChange(item.id, "end", e.target.value)
                        }
                        className="p-0.5 border rounded text-xs text-center bg-yellow-100 w-14"
                        title="End time"
                      />
                    </div>
                    <div className="w-16 px-1 border-r border-gray-300 flex items-center justify-center flex-shrink-0">
                      <input
                        type="number"
                        min="0"
                        value={item.duration}
                        onChange={(e) =>
                          handleItemChange(item.id, "duration", e.target.value)
                        }
                        className="p-0.5 border rounded text-xs text-center bg-yellow-100 w-12 mx-auto"
                        title="Duration (minutes)"
                      />
                    </div>
                    <div className="flex-grow px-1 border-l border-r border-gray-300 mx-1 flex items-center bg-yellow-100 h-full col-span-14">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "description",
                            e.target.value,
                          )
                        }
                        placeholder="กิจกรรม / พักเบรค"
                        className="p-1 border rounded bg-white w-full text-sm font-semibold placeholder:text-gray-400 text-black mx-2 h-8"
                      />
                    </div>
                    <div className="w-10 px-1 flex items-center justify-center flex-shrink-0 h-full">
                      <button
                        onClick={() => removeTimelineItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                        aria-label={`ลบ ${item.description}`}
                      >
                        X
                      </button>
                    </div>
                  </div>
                );
              }

              if (item.type === "shot") {
                const fieldStatus = item.fieldStatus || {};

                const getMergeableFieldProps = (field) => {
                  const status = fieldStatus[field] || {
                    mergedWithAbove: false,
                    isMergeOrigin: false,
                  };
                  const isSelected =
                    selectedItemIdsSet.has(item.id) &&
                    selection.field === field &&
                    selection.startItemId !== item.id;
                  const isSelectionStart =
                    selectedItemIdsSet.has(item.id) &&
                    selection.field === field &&
                    selection.startItemId === item.id;
                  const isMerged =
                    status.mergedWithAbove || status.isMergeOrigin;
                  let dynamicClasses = "";

                  if (isSelected)
                    dynamicClasses += " bg-blue-100 ring-1 ring-blue-400";
                  else if (isSelectionStart)
                    dynamicClasses += " bg-blue-200 ring-1 ring-blue-500";

                  if (status.mergedWithAbove)
                    dynamicClasses += " bg-gray-100 text-gray-500 italic";
                  else dynamicClasses += " text-black";

                  if (status.isMergeOrigin)
                    dynamicClasses += " border-b-2 border-b-blue-500";

                  return {
                    value: item[field] || "",
                    readOnly: status.mergedWithAbove,
                    onClick: (e) => {
                      if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        handleCtrlClick(item.id, field);
                      }
                    },
                    className: `p-1 border-r border-gray-300 text-xs resize-none w-full h-full ${dynamicClasses}`,
                    onChange: (e) =>
                      handleItemChange(item.id, field, e.target.value),
                  };
                };

                return (
                  <div
                    key={item.id}
                    className={`flex flex-nowrap border-b border-gray-200 items-stretch ${index % 2 !== 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    {/* Time Columns - Now Editable */}
                    <div className="w-16 flex-shrink-0">
                      <input
                        type="time"
                        value={item.start}
                        onChange={(e) =>
                          handleItemChange(item.id, "start", e.target.value)
                        }
                        className="w-full p-1 border-r border-gray-300 text-xs h-full"
                        title="Start time"
                      />
                    </div>
                    <div className="w-16 flex-shrink-0">
                      <input
                        type="time"
                        value={item.end}
                        onChange={(e) =>
                          handleItemChange(item.id, "end", e.target.value)
                        }
                        className="w-full p-1 border-r border-gray-300 text-xs h-full"
                        title="End time"
                      />
                    </div>
                    <div className="w-16 flex-shrink-0">
                      <input
                        type="number"
                        min="0"
                        value={item.duration}
                        onChange={(e) =>
                          handleItemChange(item.id, "duration", e.target.value)
                        }
                        className="w-full p-1 border-r border-gray-300 text-center text-xs h-full"
                      />
                    </div>
                    <div className="w-12 flex-shrink-0">
                      <select
                        value={item.extInt}
                        onChange={(e) =>
                          handleItemChange(item.id, "extInt", e.target.value)
                        }
                        className="w-full p-1 border-r border-gray-300 text-xs h-full appearance-none text-center"
                      >
                        <option value="INT">INT</option>
                        <option value="EXT">EXT</option>
                      </select>
                    </div>
                    <div className="w-12 flex-shrink-0">
                      <select
                        value={item.dayNight}
                        onChange={(e) =>
                          handleItemChange(item.id, "dayNight", e.target.value)
                        }
                        className="w-full p-1 border-r border-gray-300 text-xs h-full appearance-none text-center"
                      >
                        <option value="Day">Day</option>
                        <option value="Night">Night</option>
                      </select>
                    </div>

                    {/* Mergeable Fields */}
                    <div className="w-24 flex-shrink-0 border-r border-gray-300">
                      <textarea
                        rows="2"
                        {...getMergeableFieldProps("location")}
                      />
                    </div>
                    <div className="w-16 flex-shrink-0 border-r border-gray-300">
                      <input
                        type="text"
                        {...getMergeableFieldProps("scene")}
                        className={`${getMergeableFieldProps("scene").className} text-center`}
                      />
                    </div>
                    <div className="w-16 flex-shrink-0 border-r border-gray-300">
                      <input
                        type="text"
                        {...getMergeableFieldProps("shot")}
                        className={`${getMergeableFieldProps("shot").className} text-center`}
                      />
                    </div>
                    <div className="w-16 flex-shrink-0 border-r border-gray-300">
                      <input type="text" {...getMergeableFieldProps("size")} />
                    </div>
                    <div className="w-28 flex-shrink-0 border-r border-gray-300">
                      <textarea
                        rows="2"
                        {...getMergeableFieldProps("movementAngle")}
                      />
                    </div>
                    <div className="w-32 flex-grow border-r border-gray-300">
                      <textarea
                        rows="2"
                        {...getMergeableFieldProps("description")}
                      />
                    </div>
                    <div className="w-24 flex-shrink-0 border-r border-gray-300">
                      <textarea
                        rows="2"
                        {...getMergeableFieldProps("mainCast")}
                      />
                    </div>
                    <div className="w-24 flex-shrink-0 border-r border-gray-300">
                      <textarea
                        rows="2"
                        {...getMergeableFieldProps("wardrobe")}
                      />
                    </div>
                    <div className="w-24 flex-shrink-0 border-r border-gray-300">
                      <textarea
                        rows="2"
                        {...getMergeableFieldProps("makeup")}
                      />
                    </div>
                    <div className="w-32 flex-grow border-r border-gray-300">
                      <textarea
                        rows="2"
                        {...getMergeableFieldProps("settingProp")}
                      />
                    </div>
                    <div className="w-28 flex-shrink-0 border-r border-gray-300">
                      <textarea
                        rows="2"
                        {...getMergeableFieldProps("remarks")}
                      />
                    </div>

                    {/* Image Col */}
                    <div className="w-24 p-1 border-r border-gray-300 flex flex-col items-center justify-center flex-shrink-0">
                      <div className="w-full aspect-w-16 aspect-h-9 bg-gray-200 rounded overflow-hidden mb-1">
                        {imagePreviews[item.id] ? (
                          <img
                            src={imagePreviews[item.id]}
                            alt={`Ref ${item.shot || ""}`}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        id={`file-${item.id}`}
                        onChange={(e) =>
                          handleImageChange(item.id, e.target.files[0])
                        }
                        className="hidden"
                      />
                      <label
                        htmlFor={`file-${item.id}`}
                        className="cursor-pointer bg-blue-100 text-blue-700 text-xs px-1 py-0.5 rounded hover:bg-blue-200 w-full text-center truncate"
                      >
                        Choose...
                      </label>
                    </div>
                    {/* Remove Btn Col */}
                    <div className="w-10 px-1 flex items-center justify-center flex-shrink-0">
                      <button
                        onClick={() => removeTimelineItem(item.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                        aria-label={`ลบ ${item.type} ${item.shot || ""}`}
                      >
                        X
                      </button>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
      {timelineItems.length === 0 && (
        <p className="text-center text-gray-500 mt-10">ยังไม่มีรายการ...</p>
      )}
    </div>
  );
}

export default ShootingScheduleEditor;
