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

export async function runAiTransformation(file: File, extractedMarkdown: string, action: string, customInstruction?: string) {
  const model = getAI();
  let prompt = "";
  
  if (action === 'ai_second_brain') {
    prompt = `You are an expert Personal Knowledge Management (PKM) assistant. Organize the following document into a pristine markdown file tailored for an Obsidian/Notion "Second Brain".
    
Required Format:
1. Start with a YAML frontmatter block containing:
   - title
   - date
   - tags (array)
   - aliases (array)
   - source_type
2. A brief 1-paragraph summary under an "## Abstract" header.
3. A list of 5-10 key bidirectional links (formatted as [[Topic Name]]) under "## Core Concepts".
4. The remaining document meticulously formatted with proper Markdown headers (H2/H3), bullet points, and bolded entities for high scannability. 

CRITICAL: Do NOT simply abbreviate or truncate the content. You must process and synthesize the ENTIRE document comprehensively. Do NOT leave out sections or use phrases like "rest of document omitted".`;
  } else if (action === 'ai_insights_deep') {
    prompt = `You are a world-class strategic analyst. Analyze the following document aggressively through the specific lens or persona provided below.

Your Lens/Focus/Persona:
"${customInstruction}"

Instructions:
1. Get your hands dirty. Dig into the specifics of the text relative to the lens.
2. Identify non-obvious patterns, potential contradictions, and hidden implications.
3. Call out specific metrics, quotes, or findings and interpret what they mean for this persona.
4. Output your analysis in a structured, professional, and well-formatted Markdown document. Use clear headers and authoritative tone. Do not just summarize; critically evaluate the document.

CRITICAL: Be extremely comprehensive. Provide a deep, exhaustive analysis of the ENTIRE document. Do not truncate your insights.`;
  } else if (action === 'ai_llm_prompt') {
    prompt = `Restructure the following document into a high-quality "System Prompt" or Contextual Injection format optimized for an LLM to read. 

Instructions:
- Wrap the core context in clear XML tags e.g. <document_context>.
- Isolate variables or moving parts.
- Provide a set of clear "Rules" or "Directives" for how the receiving LLM should use this data.
- The goal is to make this raw document easily digestible for an AI agent to execute tasks against.

CRITICAL: Include the entire informational payload. Do not skip or abbreviate sections. An AI agent will need every detail to successfully use this prompt later.`;
  } else if (action === 'ai_custom') {
    prompt = `Transform the following document exactly into the following format/specification:
    
"${customInstruction}"

CRITICAL: Ensure the output matches the requested format precisely. Output the ENTIRE transformed document comprehensively without truncating or leaving parts out. If the user asked for a specific file format (e.g., CSV, JSON), output ONLY that raw format without any conversational filler or codeblock ticks wrapped around it if possible, or use clean codeblocks.`;
  }

  prompt += `\n\n--- Document Name: ${file.name} ---\n\n${extractedMarkdown.substring(0, 800000)}`; // Max 800k chars for safety ~200k tokens

  const response = await model.models.generateContent({
    model: "gemini-3.1-pro-preview", // Use Pro for complex transformations
    contents: prompt,
    config: {
      maxOutputTokens: 8192,
    }
  });

  return response.text || "";
}

export async function extractDocumentMetadata(content: string, fileName: string) {
  const model = getAI();
  const response = await model.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `Analyze the following document and extract key metadata, a short summary, and 3-5 main topics or tags.\n\nDocument Name: ${fileName}\n\nContent:\n${content.substring(0, 800000)}`,
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
