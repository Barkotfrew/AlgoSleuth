import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { TutorSession } from "../types";
import { saveCase, saveCaseMessage } from './evidence';

const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `You are DSA Detective AI, an elite Cyber Investigation Unit for algorithms.

Your output must be clean, readable, and visually structured in markdown.
Do not output placeholder values like "Unknown".
Never use blockquote markers (no leading '>').
Do not add extra sections outside this structure.

🔎 INPUT YOU WILL RECEIVE
User will provide:
- DSA Code Snippet
- Experience Level (Beginner / Intermediate / Advanced)
- Algorithm Trace (ON / OFF)
- Explanation Depth (Short / Detailed)


### CASE ANALYSIS: <Short investigation title>

CASE REPORT:
Case Title: <Algorithm or Bug Name>
Primary Algorithm: <Detected DSA Concept>
Language: <Detected Language>
Difficulty Level: <From UI>
Investigation Status: <Status Icon> <Status Text>
Risk Summary: <One sentence forensic summary>

## Investigation Notes (Main Explanation)
Explain step-by-step:
- What code is doing
- Why it works or fails
- Where bug occurs (if exists)
- Optimization opportunities

Match explanation depth to dropdown.
Report depth rules:
- If Report Depth = Short: concise summary (4-8 lines)
- If Report Depth = Long: detailed walkthrough + edge cases

## Evidence Board (Algorithm Trace)
ONLY include this section if Algorithm Trace = ON.
Visualize execution using ASCII diagrams:
📍 for pointers / boundaries
🔵 for current element / node
✅ for successful condition
❌ for failure or bug
Rules:
Visualize ONLY what helps understanding
No storytelling inside diagrams
Keep visuals technical and clean

## Case Stats
- Time Complexity: O(...)
- Space Complexity: O(...)
- Optimization Risk Level: Low / Medium / High

## 🧩 Next Clue
End with ONE short interactive question or mini practice task.

Style rules:
- Keep wording concise and technical.
- Keep field names exactly as written in CASE REPORT.
- Use markdown lists, not tables.
- No disclaimers about being an AI model.`;

export class DSATutorService {
  private chat: Chat | null = null;
  private ai: GoogleGenAI;
  private activeCaseId: string | null = null;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: import.meta.env.VITE_GEMINI_API_KEY,
    });
  }

  async startSession(session: TutorSession): Promise<string> {
    const { input, level, visualization, detail } = session;

    this.chat = this.ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const prompt = `
[CODE SNIPPET START]
${input}
[CODE SNIPPET END]

[UI INPUTS]
- Experience Level: ${level}
- Algorithm Trace: ${visualization === 'Show Visualization' ? 'ON' : 'OFF'}
- Report Depth: ${detail === 'Long' ? 'Long' : 'Short'}
`;

    const response = await this.chat.sendMessage({ message: prompt });
    const aiResponseText = response.text || "Investigation inconclusive. No data returned.";

    try {
      const savedCase = await saveCase({
        code: input,
        ai_response: aiResponseText,
        level,
        visualization,
        detail,
      });

      this.activeCaseId = savedCase.id;

      await saveCaseMessage({
        case_id: savedCase.id,
        role: 'user',
        text: input,
        is_initial: true,
      });

      await saveCaseMessage({
        case_id: savedCase.id,
        role: 'model',
        text: aiResponseText,
      });
    } catch (storageError) {
      console.error('Failed to persist case evidence:', storageError);
    }

    return aiResponseText;
  }

  async resumeSession(historyMessages: { role: 'user' | 'model'; text: string }[]) {
    const history = historyMessages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    this.chat = this.ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      history,
    });
  }

  hasActiveSession() {
    return this.chat !== null;
  }

  getActiveCaseId() {
    return this.activeCaseId;
  }

  setActiveCaseId(caseId: string | null) {
    this.activeCaseId = caseId;
  }

  async sendMessageStream(message: string, onChunk: (text: string) => void) {
    if (!this.chat) throw new Error('No active session');
    const stream = await this.chat.sendMessageStream({ message });
    let fullText = '';
    for await (const chunk of stream) {
      const c = chunk as GenerateContentResponse;
      fullText += c.text;
      onChunk(fullText);
    }
  }
}



