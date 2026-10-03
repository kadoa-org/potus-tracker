"use client";

import { addDays, format, isToday, isTomorrow, isYesterday, parseISO, startOfDay } from "date-fns";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../lib/basePath";
import { hasMapCoordinates } from "../lib/location";
import { eventTimeLabel, inDayOrder } from "../lib/schedule";
import { SectionHeading } from "../kit";
import { FetchStatus } from "./FetchStatus.jsx";
import { ScheduleTimeline } from "./ScheduleTimeline.jsx";

// The same globe as the Travel page, zoomed in on where he is now with the last two weeks of flights.
const loadGlobe = () => import("./TravelGlobe").then((mod) => mod.TravelGlobe);
const MapSkeleton = () => <div className="h-[420px] w-full animate-pulse bg-[#e5e6e7]" aria-label="Loading map" />;
const TravelGlobe = dynamic(loadGlobe, { ssr: false, loading: MapSkeleton });

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
    <div className="mb-6">
      <h3 className="font-bold text-[19px] mb-5" suppressHydrationWarning>
        {dayLabel}
      </h3>
      <ScheduleTimeline events={inDayOrder(events)} headingLevel="h4" />
    </div>
  );
};

export function Schedule({ initial }) {
  const [location, setLocation] = useState(null);
  const [recent, setRecent] = useState(null);
  const [recentDone, setRecentDone] = useState(false);
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

    // Start downloading the globe code now, alongside the data requests, rather than after the location arrives.
    loadGlobe();

    // The last two weeks of flights for the globe; the card still renders without them.
    const fetchRecent = async () => {
      try {
        const response = await fetch(apiUrl("/api/travel/recent"));
        if (response.ok) setRecent((await response.json()).data);
      } catch {
        setRecent(null);
      } finally {
        setRecentDone(true);
      }
    };

    fetchLocation();
    fetchRecent();
    // Skip the redundant schedule refetch on mount when the server already sent it.
    if (skipInitialSchedule.current) {
      skipInitialSchedule.current = false;
    } else {
      fetchSchedule();
    }

    // Refresh location every 5 minutes
    const interval = setInterval(() => {
      fetchLocation();
      fetchRecent();
    }, 5 * 60 * 1000);
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
  const canShowMap = hasMapCoordinates(location);
  const now = useMemo(
    () => (canShowMap ? { lat: location.lat, lon: location.lon, label: location.locationName || "Unknown" } : null),
    [canShowMap, location?.lat, location?.lon, location?.locationName],
  );

  // "Sep 26, 2026 at 12:00 PM" from the stored Eastern wall-clock time, which carries a +00:00 offset.
  const updatedLabel = (() => {
    const m = location?.time?.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return location?.time ? format(new Date(location.time), "PPp") : null;
    return `${format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])), "MMM d, yyyy")} at ${eventTimeLabel(location.time) ?? "12:00 AM"} ET`;
  })();

  return (
    <main>
      <div className="mb-8">
        <h1 className="dk-h1">President Trump&apos;s Schedule Today</h1>
        <p className="text-[19px] text-[#505a5f] m-0">His public schedule and latest known location, updated live.</p>
      </div>

      {locationLoading && !location && (
        <section className="dk-card" aria-busy="true">
          <div className="mb-2 h-[26px] w-[340px] max-w-full animate-pulse bg-[#e5e6e7]" />
          <div className="mb-5 h-[18px] w-[220px] animate-pulse bg-[#e5e6e7]" />
          <MapSkeleton />
        </section>
      )}
      {locationError && <FetchStatus error={locationError} />}
      {!locationError && location && (
        <>
          {/* One card answers "where is he": the place in the title, when it was last updated, then the map. A
              separate headline row repeated the same two facts. */}
          <section className="dk-card">
            <SectionHeading
              title={`Current location: ${location.locationName || "Unknown"}`}
              description={canShowMap ? undefined : "No map: coordinates have not been provided for this location."}
              date={updatedLabel ? `Updated ${updatedLabel}` : undefined}
            />
            {canShowMap && (
              <div className="dk-card__panel relative" style={{ padding: 0 }}>
                {recentDone ? (
                  <TravelGlobe places={recent?.places ?? []} flights={recent?.flights ?? []} to={recent?.to} now={now} compact startZoom={3} />
                ) : (
                  <MapSkeleton />
                )}
              </div>
            )}
          </section>
        </>
      )}
      {!locationLoading && !locationError && !location && <div className="dk-hint">No location data available</div>}

      <div className="dk-section">
        <SectionHeading title="Public schedule" description="All times Eastern (ET). The last seven days with events, newest day first." />
        {scheduleLoading ? (
          <FetchStatus loading={true} />
        ) : scheduleError ? (
          <FetchStatus error={scheduleError} />
        ) : (
          <>
            {Object.keys(groupedData).length === 0 ? (
              <div className="dk-empty">No scheduled events found</div>
            ) : (
              Object.entries(groupedData).map(([date, events]) => <DayGroup key={date} date={date} events={events} />)
            )}
          </>
        )}
      </div>
    </main>
  );
}
