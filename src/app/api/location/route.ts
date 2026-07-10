import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get the most recent location from schedule events
    const { data: schedule, error } = await supabase
      .from('schedule')
      .select('*')
      .order('event_datetime', { ascending: false })
      .lte('event_datetime', new Date().toISOString()) // Past or current events
      .limit(1);

    if (error) throw error;

    if (!schedule || schedule.length === 0) {
      return NextResponse.json({ data: null });
    }

    const latestEvent = schedule[0];
    
    // If the event has arrival info and the arrival time has passed, use arrival location
    const location = {
      lat: latestEvent.latitude,
      lon: latestEvent.longitude,
      time: latestEvent.event_datetime,
      locationName: latestEvent.location_name
    };

    return NextResponse.json({ data: location });
  } catch (error) {
    console.error('Error fetching location data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location data' },
      { status: 500 }
    );
  }
} 