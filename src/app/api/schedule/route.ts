import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: schedule, error } = await supabase
      .from('schedule')
      .select('*')
      .order('event_datetime', { ascending: false }).limit(50)

    if (error) throw error;
    const formattedSchedule = schedule?.map(item => ({
      id: item.id,
      title: item.event_details,
      time: item.event_datetime,
      locationStr: item.location_name,
      location: {
        lat: item.latitude,
        lng: item.longitude
      }
    })) || [];
    return NextResponse.json({ data: formattedSchedule });
  } catch (error) {
    console.error('Error fetching schedule data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule data' },
      { status: 500 }
    );
  }
} 