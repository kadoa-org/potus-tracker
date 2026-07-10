import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, alertValue } = body;

    // Validate inputs
    if (!email || !alertValue) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // First, mark any existing alerts with the same email as inactive
    await supabase
      .from('alerts')
      .update({ is_active: false })
      .eq('email', email);

    // Insert new alert with pending status
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        name: 'smart',
        type: 'smart',
        value: alertValue,
        email: email,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // Check if it's a constraint error
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An alert with this configuration already exists' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Alert created successfully'
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
} 