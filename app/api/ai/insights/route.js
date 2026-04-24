import { NextResponse } from "next/server.js";
import { getGroqClient, getGroqModel, hasGroqConfig } from "../../../lib/aiClient.js";
import {
  AI_INSIGHTS_CACHE_TTL_MS,
  buildAiInsightsCacheKey,
  buildAiInsightsPrompt,
  buildFallbackInsights,
  extractJsonObject,
  normalizeAiInsightsPayload,
  normalizeTransactionsForAi,
  summarizeTransactionsForAi,
} from "../../../lib/aiInsights.js";
import { reportServerWarning } from "../../../lib/observability.server.js";
import { readSessionFromRequest } from "../../../lib/serverAuth.js";

const aiInsightsCache = new Map();

function pruneAiInsightsCache(now = Date.now()) {
  for (const [key, entry] of aiInsightsCache.entries()) {
    if (!entry?.savedAt || now - entry.savedAt > AI_INSIGHTS_CACHE_TTL_MS) {
      aiInsightsCache.delete(key);
    }
  }
}

function getCachedInsights(cacheKey) {
  pruneAiInsightsCache();
  return aiInsightsCache.get(cacheKey) || null;
}

function setCachedInsights(cacheKey, payload) {
  pruneAiInsightsCache();
  aiInsightsCache.set(cacheKey, {
    ...payload,
    savedAt: Date.now(),
  });
}

function buildNoDataPayload(enabled) {
  return {
    enabled,
    source: "none",
    overview: "",
    insights: [],
    actions: [],
    warning: "Insights appear after FinTrak has enough transactions in the current filter.",
  };
}

export async function POST(req) {
  const user = readSessionFromRequest(req);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body = null;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const transactions = normalizeTransactionsForAi(body?.transactions);
  const forceRefresh = body?.forceRefresh === true;

  if (transactions.length === 0) {
    return NextResponse.json(buildNoDataPayload(hasGroqConfig()));
  }

  const stats = summarizeTransactionsForAi(transactions);
  const cacheKey = buildAiInsightsCacheKey(user.id, transactions);
  const cached = forceRefresh ? null : getCachedInsights(cacheKey);

  if (cached) {
    return NextResponse.json({
      ...cached.payload,
      cached: true,
    });
  }

  if (!hasGroqConfig()) {
    const fallbackPayload = {
      ...buildFallbackInsights(stats),
      enabled: false,
      source: "fallback",
      warning: "Add GROQ_API_KEY on the server to enable Groq-written insights.",
    };

    setCachedInsights(cacheKey, { payload: fallbackPayload });

    return NextResponse.json({
      ...fallbackPayload,
      cached: false,
    });
  }

  try {
    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: getGroqModel(),
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You turn structured transaction data into concise dashboard insights. Return JSON only.",
        },
        {
          role: "user",
          content: buildAiInsightsPrompt({ stats, transactions }),
        },
      ],
    });

    const rawContent = completion.choices?.[0]?.message?.content || "";
    const parsed = extractJsonObject(rawContent);
    const normalized = normalizeAiInsightsPayload(parsed, stats);

    if (!normalized) {
      throw new Error("Groq returned an invalid insights payload");
    }

    const payload = {
      ...normalized,
      enabled: true,
      source: "groq",
      model: getGroqModel(),
    };

    setCachedInsights(cacheKey, { payload });

    return NextResponse.json({
      ...payload,
      cached: false,
    });
  } catch (error) {
    await reportServerWarning({
      event: "ai.insights.generate_failed",
      message: "Failed to generate Groq dashboard insights. Returning fallback insights.",
      error,
      request: req,
      context: {
        sessionUserId: user.id,
        transactionCount: transactions.length,
      },
    });

    const fallbackPayload = {
      ...buildFallbackInsights(stats),
      enabled: true,
      source: "fallback",
      warning:
        "Groq insights are temporarily unavailable, so FinTrak is showing a rule-based summary.",
    };

    setCachedInsights(cacheKey, { payload: fallbackPayload });

    return NextResponse.json({
      ...fallbackPayload,
      cached: false,
    });
  }
}
