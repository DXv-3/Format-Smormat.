import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

export async function extractDocumentMetadata(content: string, fileName: string) {
  const model = getAI();
  const response = await model.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `Analyze the following document and extract key metadata, a short summary, and 3-5 main topics or tags.\n\nDocument Name: ${fileName}\n\nContent:\n${content.substring(0, 15000)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: "A concise 2-3 sentence summary of the document."
          },
          documentType: {
            type: Type.STRING,
            description: "The inferred type or category of the document (e.g., Invoice, Article, Report, Receipt, Code)."
          },
          sentiment: {
            type: Type.STRING,
            description: "The overall sentiment or tone of the document (e.g., Neutral, Positive, Negative, Formal)."
          },
          keyEntities: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Main entities, people, organizations, or concepts mentioned."
          },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3-5 relevant tags for the document."
          }
        },
        required: ["summary", "documentType", "sentiment", "keyEntities", "tags"]
      }
    }
  });

  if (response.text) {
    try {
      let text = response.text.trim();
      if (text.startsWith('```json')) {
        text = text.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (text.startsWith('```')) {
        text = text.replace(/^```/, '').replace(/```$/, '').trim();
      }
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI response", e);
      return null;
    }
  }
  return null;
}
