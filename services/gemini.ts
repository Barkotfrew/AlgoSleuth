import { TutorSession } from "../types";
import { saveCase, saveCaseMessage } from './evidence';
import { supabase } from './supabase';

const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `You are DSA Detective AI, an elite Cyber Investigation Unit for algorithms.

Your output must be clean, readable, and visually structured in markdown.
Do not output placeholder values like "Unknown".
Never use blockquote markers (no leading '>').
Do not add extra sections outside this structure.

ðŸ”Ž INPUT YOU WILL RECEIVE
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
ðŸ“ for pointers / boundaries
ðŸ”µ for current element / node
âœ… for successful condition
âŒ for failure or bug
Rules:
Visualize ONLY what helps understanding
No storytelling inside diagrams
Keep visuals technical and clean

## Case Stats
- Time Complexity: O(...)
- Space Complexity: O(...)
- Optimization Risk Level: Low / Medium / High

## ðŸ§© Next Clue
End with ONE short interactive question or mini practice task.

Style rules:
- Keep wording concise and technical.
- Keep field names exactly as written in CASE REPORT.
- Use markdown lists, not tables.
- No disclaimers about being an AI model.`;

type ConversationMessage = { role: 'user' | 'model'; text: string };

type GeminiProxyPayload = {
  systemInstruction: string;
  messages: ConversationMessage[];
  model: string;
};

const callGeminiProxy = async (payload: GeminiProxyPayload): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: payload,
  });

  if (error) {
    throw error;
  }

  if (!data || typeof data.text !== 'string') {
    throw new Error('Empty response from AI service.');
  }

  return data.text;
};

export class DSATutorService {
  private history: ConversationMessage[] = [];
  private activeCaseId: string | null = null;

  async startSession(session: TutorSession): Promise<string> {
    const { input, level, visualization, detail } = session;

    const prompt = `
[CODE SNIPPET START]
${input}
[CODE SNIPPET END]

[UI INPUTS]
- Experience Level: ${level}
- Algorithm Trace: ${visualization === 'Show Visualization' ? 'ON' : 'OFF'}
- Report Depth: ${detail === 'Long' ? 'Long' : 'Short'}
`;

    const aiResponseText = await callGeminiProxy({
      systemInstruction: SYSTEM_INSTRUCTION,
      messages: [{ role: 'user', text: prompt }],
      model: GEMINI_MODEL,
    });

    this.history = [
      { role: 'user', text: prompt },
      { role: 'model', text: aiResponseText || 'Investigation inconclusive. No data returned.' },
    ];

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

  async resumeSession(historyMessages: ConversationMessage[]) {
    this.history = historyMessages.map((msg) => ({ role: msg.role, text: msg.text }));
  }

  hasActiveSession() {
    return this.history.length > 0;
  }

  getActiveCaseId() {
    return this.activeCaseId;
  }

  setActiveCaseId(caseId: string | null) {
    this.activeCaseId = caseId;
  }

  async sendMessageStream(message: string, onChunk: (text: string) => void) {
    if (!this.history.length) throw new Error('No active session');

    const nextMessages: ConversationMessage[] = [...this.history, { role: 'user', text: message }];

    const aiResponseText = await callGeminiProxy({
      systemInstruction: SYSTEM_INSTRUCTION,
      messages: nextMessages,
      model: GEMINI_MODEL,
    });

    this.history = [...nextMessages, { role: 'model', text: aiResponseText }];

    onChunk(aiResponseText);
  }
}
