const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

// Uses Groq to read a spoken answer to a "rate 1-5" question and extract the
// rating the employee actually stated. Regex digit-matching was unreliable —
// it grabbed unrelated numbers mentioned later in the sentence (e.g. "1 or 2
// people") instead of the stated rating, and missed context entirely.
export async function extractRatingWithAI(question: string, answer: string): Promise<number | undefined> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !answer?.trim()) return undefined;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You extract a 1-5 self-rating from a transcribed spoken answer to a survey question. ' +
              'The question asks the speaker to rate something from 1 (very poor) to 5 (excellent). ' +
              'Read the answer and find the rating the speaker explicitly stated for themselves ' +
              '(e.g. "I\'d say a 4", "probably a 3 out of 5"). Ignore any other numbers mentioned in the ' +
              'answer that are not the stated rating (e.g. counts of people, years of experience, etc). ' +
              'Respond with strict JSON only: {"rating": <integer 1-5 or null if none is stated>}.',
          },
          {
            role: 'user',
            content: `Question: ${question}\nAnswer: ${answer}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Groq rating extraction failed:', response.status, await response.text());
      return undefined;
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return undefined;

    const parsed = JSON.parse(content);
    const rating = Number(parsed?.rating);
    return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined;
  } catch (err) {
    console.error('Groq rating extraction error:', err);
    return undefined;
  }
}
