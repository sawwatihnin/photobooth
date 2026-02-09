import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure to add this to your .env file
});

export async function POST(req) {
  try {
    const { name } = await req.json();

    // The "Style Wrapper" - This ensures the AI makes a background, not a busy photo
    const prompt = `A vertical minimalist photobooth strip background, aesthetic and high-quality, themed around: ${name}. Use a soft pastel color palette, subtle patterns, and no text. Aspect ratio 1:3.`;

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1792", // DALL-E's closest vertical size
    });

    const imageUrl = response.data[0].url;
    return NextResponse.json({ imageUrl });

  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate background" }, { status: 500 });
  }
}