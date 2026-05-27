import http from "node:http";
import fs from "node:fs";
import path from "node:path";

loadLocalEnv();

const PORT = Number(process.env.FEEDBACK_API_PORT ?? 8787);
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

const scenarioLabels = {
  freeTalk: "프리토킹",
  meeting: "회의",
  presentation: "발표",
  interview: "면접",
  travel: "여행"
};

const scenarioGoals = {
  "프리토킹":
    "friends, coworkers, and customers와 대화할 때 자연스러움과 유창성을 높이는 것",
  "회의":
    "business English를 사용해 설득력과 명확한 next step을 높이는 것",
  "발표": "구조화, 핵심 전달력, 청중이 따라오기 쉬운 흐름을 높이는 것",
  "면접": "논리, STAR 구조, 자신감 있는 답변을 만드는 것",
  "여행": "생존형 표현, 짧고 바로 통하는 즉답성을 높이는 것"
};

const server = http.createServer(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== "POST" || request.url !== "/api/feedback") {
    sendJson(response, 404, { message: "Not found" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    sendJson(response, 503, {
      message:
        "OPENAI_API_KEY가 아직 설정되지 않아 데모 피드백을 보여주고 있어요."
    });
    return;
  }

  try {
    const body = await readJson(request);
    const text = String(body.text ?? "").trim();
    const scenario = String(body.scenario ?? "presentation");

    if (!text) {
      sendJson(response, 400, { message: "분석할 문장이 비어 있어요." });
      return;
    }

    const feedback = await createFeedback({
      text,
      scenarioLabel: scenarioLabels[scenario] ?? scenarioLabels.presentation
    });

    sendJson(response, 200, { feedback });
  } catch (error) {
    sendJson(response, 500, {
      message:
        error instanceof Error
          ? error.message
          : "AI 피드백을 생성하지 못했어요."
    });
  }
});

server.listen(PORT, () => {
  console.log(`Feedback API listening on http://localhost:${PORT}`);
});

async function createFeedback({ text, scenarioLabel }) {
  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      instructions:
        "You are an English speaking coach for Korean native speakers. Return only valid JSON. Do not include markdown.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildPrompt({ text, scenarioLabel })
            }
          ]
        }
      ],
      max_output_tokens: 700
    })
  });

  const data = await apiResponse.json();

  if (!apiResponse.ok) {
    throw new Error(
      data?.error?.message ?? "OpenAI API 요청 중 문제가 생겼어요."
    );
  }

  return parseFeedback(extractOutputText(data), text);
}

function buildPrompt({ text, scenarioLabel }) {
  return `
User scenario: ${scenarioLabel}
Coaching goal: ${scenarioGoals[scenarioLabel] ?? "make the user's intended meaning clear in the given situation"}
User spoken sentence: ${text}

Create concise Korean feedback for a mobile English speaking app.

Return exactly this JSON shape:
{
  "original": "the user's spoken sentence",
  "improved": "one natural English version for the scenario",
  "reason": "short Korean explanation of grammar, Korean-like structure, tone, or context",
  "alternatives": ["natural expression 1", "natural expression 2", "natural expression 3"]
}

Rules:
- Keep "improved" in English.
- Keep "alternatives" in English.
- Keep "reason" in Korean.
- If the original is already grammatical, still suggest a more natural or scenario-appropriate version.
- The app's core advantage is helping users clearly say what they mean in each situation, not just fixing grammar.
- Free talk: prioritize naturalness and fluency for friends, coworkers, and customers.
- Meetings: prioritize persuasive business English and clear next steps.
- Presentations: prioritize structure and delivery.
- Interviews: prioritize logic, STAR structure, and confidence.
- Travel: prioritize survival expressions and quick practical responses.
`.trim();
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  const chunks = [];

  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function parseFeedback(rawText, originalText) {
  const text = rawText.trim();
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("AI 응답 형식을 읽지 못해 데모 피드백을 보여주고 있어요.");
  }

  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

  return {
    original: String(parsed.original ?? originalText),
    improved: String(parsed.improved ?? ""),
    reason: String(parsed.reason ?? ""),
    alternatives: Array.isArray(parsed.alternatives)
      ? parsed.alternatives.map(String).slice(0, 4)
      : []
  };
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "");

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
