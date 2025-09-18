import { NextResponse } from 'next/server';
import { getOpenAI, performSearch } from '@affiliate-factory/sdk';
import { createServiceClient } from '../../../lib/supabase';

export async function POST(request: Request) {
  const { question } = await request.json();
  if (!question) {
    return NextResponse.json({ error: 'Question missing' }, { status: 400 });
  }

  const client = createServiceClient();
  const { data: posts } = await client
    .from('posts')
    .select('title, excerpt, slug, body_mdx')
    .eq('status', 'published')
    .limit(10);

  const knowledge = (posts ?? [])
    .map((post: any) => `${post.title}\n${post.excerpt}\n${post.body_mdx}`)
    .join('\n---\n');

  let snippets: string[] = [];
  try {
    const searchResults = await performSearch({ query: question, maxResults: 3 });
    snippets = searchResults.map((result) => `${result.title} (${result.url}): ${result.snippet}`);
  } catch (error) {
    console.error('Search fallback error', error);
  }

  const completion = await getOpenAI().responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content:
          'You are a helpful wearable tech affiliate concierge. Answer with concise paragraphs, cite at least one source, avoid medical or legal advice. Mention affiliate links include tag=jmpkc01-20.'
      },
      {
        role: 'user',
        content: `Question: ${question}\nKnowledge Base:\n${knowledge}\nRecent snippets:\n${snippets.join('\n')}`
      }
    ]
  });

  return NextResponse.json({ answer: completion.output_text });
}
