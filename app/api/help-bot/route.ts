import { openai } from "@ai-sdk/openai"
import { convertToModelMessages, streamText, type UIMessage } from "ai"
import { buildHelpBotSystemPrompt } from "@/lib/help-bot/system-prompt"
import { createHelpBotTools, stepCountIs } from "@/lib/help-bot/tools"
import {
  getActiveToolsForAudience,
  resolveBotAudience,
  type BotAudience,
} from "@/lib/help-bot/role-context"

export const maxDuration = 45

const MAX_MESSAGES = 24

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return Response.json({ error: "missing_openai_key" }, { status: 503 })
  }

  let body: {
    messages?: UIMessage[]
    locale?: string
    role?: string | null
    businessType?: string | null
    isLoggedIn?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 })
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : []
  if (messages.length === 0) {
    return Response.json({ error: "invalid_messages" }, { status: 400 })
  }

  const audience: BotAudience = resolveBotAudience({
    role: body.role,
    businessType: body.businessType,
    isLoggedIn: Boolean(body.isLoggedIn ?? body.role),
  })
  const activeTools = getActiveToolsForAudience(audience)

  try {
    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: buildHelpBotSystemPrompt(body.locale, audience),
      messages: await convertToModelMessages(messages),
      temperature: 0.5,
      tools: createHelpBotTools(body.locale, audience),
      // Restrict tools by role so product sellers don't get restaurant menus, etc.
      activeTools: activeTools as never,
      stopWhen: stepCountIs(6),
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[help-bot]", error)
    return Response.json({ error: "help_bot_failed" }, { status: 500 })
  }
}
