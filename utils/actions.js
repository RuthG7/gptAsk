'use server';
import OpenAI from 'openai';
import { revalidatePath } from 'next/cache';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Chat completion without DB
export const generateChatResponse = async (chatMessages) => {
  const response = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: 'you are a helpful assistant' },
      ...chatMessages,
    ],
    model: 'gpt-3.5-turbo',
    temperature: 0,
    max_tokens: 100,
  });
  return {
    message: response.choices[0].message,
    tokens: response.usage.totalTokens,
  };
};

// Tour generation without DB
export const generateTourResponse = async ({ city, country }) => {
  const query = `Find a exact ${city} in this exact ${country}.
If ${city} and ${country} exist, create a list of things families can do in this ${city},${country}. 
Once you have a list, create a one-day tour. Response should be  in the following JSON format: 
{
  "tour": {
    "city": "${city}",
    "country": "${country}",
    "title": "title of the tour",
    "description": "short description of the city and tour",
    "stops": [" stop name", "stop name","stop name"]
  }
}
"stops" property should include only three stops.
If you can't find info on exact ${city}, or ${city} does not exist, or it's population is less than 1, or it is not located in the following ${country},   return { "tour": null }, with no additional characters.`;

  const response = await openai.chat.completions.create({
    messages: [
      { role: 'system', content: 'you are a tour guide' },
      { role: 'user', content: query },
    ],
    model: 'gpt-3.5-turbo',
    temperature: 0,
  });

  const tourData = JSON.parse(response.choices[0].message.content);
  return tourData.tour
    ? { tour: tourData.tour, tokens: response.usage.totalTokens }
    : null;
};

// Optional: Generate an image for the tour
export const generateTourImage = async ({ city, country }) => {
  try {
    const tourImage = await openai.images.generate({
      prompt: `a panoramic view of the ${city} ${country}`,
      n: 1,
      size: '512x512',
    });
    return tourImage?.data[0]?.url;
  } catch {
    return null;
  }
};

// Example of revalidating a path if needed
export const someOtherAction = async () => {
  // ... perform server action ...
  revalidatePath('/profile');
};
