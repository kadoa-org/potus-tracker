import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'all';
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Fetch data based on type filter
    if (type === 'news') {
      const { data: news, error, count } = await supabase
        .from('news')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const formattedNews = news?.map(item => ({
        id: item.id,
        title: item.title,
        text: item.content,
        summary: item.summary,
        source: item.author,
        link: item.link,
        timestamp: item.date,
        type: 'News',
        category: item.category
      })) || [];

      return NextResponse.json({
        data: formattedNews,
        totalPages: Math.ceil((count || 0) / limit),
        currentPage: page
      });
    } else if (type === 'truth_social') {
      const { data: truthSocial, error, count } = await supabase
        .from('truth_social')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const formattedTruthSocial = truthSocial?.map(item => ({
        id: item.id,
        title: 'Truth Social Post',
        text: item.content,
        source: 'Truth Social',
        link: item.link,
        original_post_link: item.original_post_link,
        timestamp: item.date,
        type: 'Truth Social',
        sentiment: item.sentiment,
        topics: item.topics
      })) || [];

      return NextResponse.json({
        data: formattedTruthSocial,
        totalPages: Math.ceil((count || 0) / limit),
        currentPage: page
      });
    } else {
      // Fetch both news and truth social posts
      const [newsResult, truthSocialResult] = await Promise.all([
        supabase
          .from('news')
          .select('*', { count: 'exact' })
          .order('date', { ascending: false }),
        supabase
          .from('truth_social')
          .select('*', { count: 'exact' })
          .order('date', { ascending: false })
      ]);

      if (newsResult.error) throw newsResult.error;
      if (truthSocialResult.error) throw truthSocialResult.error;

      // Combine and format the data
      const formattedNews = newsResult.data?.map(item => ({
        id: item.id,
        title: item.title,
        text: item.content,
        source: item.author,
        link: item.link,
        timestamp: item.date,
        type: 'News',
        category: item.category
      })) || [];

      const formattedTruthSocial = truthSocialResult.data?.map(item => ({
        id: item.id,
        title: 'Truth Social Post',
        text: item.content,
        source: 'Truth Social',
        link: item.link,
        timestamp: item.date,
        type: 'Truth Social',
        sentiment: item.sentiment,
        topics: item.topics
      })) || [];

      // Combine and sort by timestamp
      const allItems = [...formattedNews, ...formattedTruthSocial]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      const paginatedItems = allItems.slice(offset, offset + limit);
      const totalCount = allItems.length;

      return NextResponse.json({
        data: paginatedItems,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
      });
    }
  } catch (error) {
    console.error('Error fetching feed data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed data' },
      { status: 500 }
    );
  }
} 