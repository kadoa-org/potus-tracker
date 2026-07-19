"use client";

import { addDays, format, isToday, isTomorrow, isYesterday, parseISO, startOfDay } from "date-fns";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../lib/basePath";
import { FetchStatus } from "./FetchStatus.jsx";

// Dynamically import the LeafletMap component with no SSR
const LeafletMap = dynamic(() => import("./LeafletMap").then((mod) => mod.LeafletMap), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full dk-hint">Loading map...</div>,
});

const ScheduleItem = ({ item }) => {
  // Check if the time string contains timezone offset
  let displayTime;

  if (item.time.includes("+") || item.time.includes("Z")) {
    // If it has timezone info, extract time directly to avoid conversion
    const timeMatch = item.time.match(/T(\d{2}):(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2];
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      displayTime = `${displayHours}:${minutes} ${period}`;
    } else {
      displayTime = format(new Date(item.time), "h:mm a");
    }
  } else {
    // If no timezone info, parse normally
    displayTime = format(new Date(item.time), "h:mm a");
  }

  return (
    <div className="grid auto-rows-min gap-1 p-4 md:px-6 bg-white">
      <div className="flex items-center gap-2">
        <div className="text-[13px] font-semibold text-[#1d70b8] tabular-nums whitespace-nowrap">{displayTime}</div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-1 text-sm">
          <span className="dk-hint">{item.locationStr}</span>
        </div>
      </div>
      <div>{item.title}</div>
    </div>
  );
};

// Deterministic day label from the date STRING (fixed UTC parse) so the server
// and client first render match. "Today/Tomorrow/Yesterday" is relative to now,
// so it's applied client-side after mount to avoid a hydration mismatch.
const DAY_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const baseDayLabel = (date) => DAY_FMT.format(new Date(`${date}T00:00:00Z`));

const DayGroup = ({ date, events }) => {
  const [dayLabel, setDayLabel] = useState(() => baseDayLabel(date));

  useEffect(() => {
    const d = new Date(`${date}T00:00:00`);
    const md = format(d, "MMMM d, yyyy");
    if (isToday(d)) setDayLabel(`Today - ${md}`);
    else if (isTomorrow(d)) setDayLabel(`Tomorrow - ${md}`);
    else if (isYesterday(d)) setDayLabel(`Yesterday - ${md}`);
    else setDayLabel(baseDayLabel(date));
  }, [date]);

  return (
    <div>
      <div
        className="px-4 py-2 bg-[#f3f2f1] border-y border-[#e5e6e7] font-semibold text-[13px]"
        suppressHydrationWarning
      >
        {dayLabel}
      </div>
      <div className="flex flex-col gap-[1px]">
        {events.map((item) => (
          <ScheduleItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

export function Schedule({ initial }) {
  const [location, setLocation] = useState(null);
  const [schedule, setSchedule] = useState(initial ?? null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(!initial);
  const [locationError, setLocationError] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const skipInitialSchedule = useRef(Boolean(initial));

  useEffect(() => {
    const fetchLocation = async () => {
      setLocationLoading(true);
      setLocationError("");

      try {
        const response = await fetch(apiUrl("/api/location"));
        if (!response.ok) throw new Error("Failed to fetch location");

        const result = await response.json();
        setLocation(result.data);
      } catch (err) {
        setLocationError(err.message);
      } finally {
        setLocationLoading(false);
      }
    };

    const fetchSchedule = async () => {
      setScheduleLoading(true);
      setScheduleError("");

      try {
        const response = await fetch(apiUrl("/api/schedule"));
        if (!response.ok) throw new Error("Failed to fetch schedule");

        const result = await response.json();
        setSchedule(result.data);
      } catch (err) {
        setScheduleError(err.message);
      } finally {
        setScheduleLoading(false);
      }
    };

    fetchLocation();
    // Skip the redundant schedule refetch on mount when the server already sent it.
    if (skipInitialSchedule.current) {
      skipInitialSchedule.current = false;
    } else {
      fetchSchedule();
    }

    // Refresh location every 5 minutes
    const interval = setInterval(fetchLocation, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Group events by day - show all events grouped by day
  const groupEventsByDay = (events) => {
    if (!events || events.length === 0) return {};

    // Group all events by day
    const grouped = events.reduce((acc, event) => {
      // Extract the date directly from the ISO string to avoid timezone conversion
      // Format: "2025-07-03T22:01:00+00:00" -> "2025-07-03"
      const dateMatch = event.time.match(/^(\d{4}-\d{2}-\d{2})/);
      const dayKey = dateMatch ? dateMatch[1] : format(new Date(event.time), "yyyy-MM-dd");

      if (!acc[dayKey]) {
        acc[dayKey] = [];
      }
      acc[dayKey].push(event);
      return acc;
    }, {});

    // Sort days chronologically (most recent first) and events within each day (latest first)
    const sortedGrouped = {};
    Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a)) // Sort days in descending order (most recent first)
      .slice(0, 7) // Show only the last 7 days
      .forEach((day) => {
        sortedGrouped[day] = grouped[day].sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(), // Latest events first
        );
      });

    return sortedGrouped;
  };

  const groupedData = schedule ? groupEventsByDay(schedule) : {};

  return (
    <main>
      <div className="dk-section-head p-4 mb-0!">
        <h2>Location &amp; Schedule</h2>
      </div>
      <hr />

      {/* Location Section */}
      <div className="scrollarea">
        <div className="p-4 bg-white">
          <h3 className="font-semibold text-[15px] mb-2">Current Location</h3>
          {locationLoading && <FetchStatus loading={true} />}
          {locationError && <FetchStatus error={locationError} />}
          {!locationLoading && !locationError && location && (
            <>
              <div className="grid grid-cols-[10rem_1fr] gap-2 text-sm">
                <div className="dk-hint">Last updated:</div>
                <div>
                  {(() => {
                    if (location.time && (location.time.includes("+") || location.time.includes("Z"))) {
                      // Extract date and time directly from ISO string
                      const match = location.time.match(/(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
                      if (match) {
                        const dateStr = match[1];
                        const hours = parseInt(match[2]);
                        const minutes = match[3];
                        const period = hours >= 12 ? "PM" : "AM";
                        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                        const timeStr = `${displayHours}:${minutes} ${period}`;

                        // Format the date
                        const dateParts = dateStr.split("-");
                        const date = new Date(
                          parseInt(dateParts[0]),
                          parseInt(dateParts[1]) - 1,
                          parseInt(dateParts[2]),
                        );
                        const dateFormatted = format(date, "MMM d, yyyy");

                        return `${dateFormatted} at ${timeStr}`;
                      }
                    }
                    // Fallback for normal dates
                    return format(new Date(location.time), "PPp");
                  })()}
                </div>
                <div className="dk-hint">Location:</div>
                <div>{location.locationName || "Unknown"}</div>
                <div className="dk-hint">Coordinates:</div>
                <div>
                  {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                </div>
              </div>
              <div className="mt-3 h-[400px] w-full relative overflow-hidden border border-[#b1b4b6]">
                <LeafletMap location={location} />
              </div>
            </>
          )}
          {!locationLoading && !locationError && !location && <div className="dk-hint">No location data available</div>}
        </div>
        <hr />
        <div className="p-4 bg-white">
          <h3 className="font-semibold text-[15px]">President's Public Schedule</h3>
          <p className="dk-hint mt-1">All times are Eastern Time (ET)</p>
        </div>
        {scheduleLoading ? (
          <div className="p-4">
            <FetchStatus loading={true} />
          </div>
        ) : scheduleError ? (
          <div className="p-4">
            <FetchStatus error={scheduleError} />
          </div>
        ) : (
          <>
            {Object.keys(groupedData).length === 0 ? (
              <div className="dk-empty bg-white">No scheduled events found</div>
            ) : (
              Object.entries(groupedData).map(([date, events]) => <DayGroup key={date} date={date} events={events} />)
            )}
          </>
        )}
      </div>
    </main>
  );
}
