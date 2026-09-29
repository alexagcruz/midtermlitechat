import { parseChatBody, MAX_REQUEST_BYTES } from "@/lib/chat/validation";
import { sendChatRequest } from "@/lib/proxy/chat-service";
import { ProxyFailure } from "@/lib/proxy/errors";

export const runtime = "nodejs";

type BoundedBodyResult =
  | { success: true; text: string }
  | { success: false; status: 400 | 413; message: string };

async function readBoundedBody(request: Request): Promise<BoundedBodyResult> {
  const contentLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return {
      success: false,
      status: 413,
      message: "This message history is too large. Start a new conversation or shorten it.",
    };
  }

  if (!request.body) return { success: true, text: "" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      byteLength += value.byteLength;
      if (byteLength > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return {
          success: false,
          status: 413,
          message: "This message history is too large. Start a new conversation or shorten it.",
        };
      }

      chunks.push(value);
    }
  } catch {
    return {
      success: false,
      status: 400,
      message: "The chat request could not be read.",
    };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { success: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return {
      success: false,
      status: 400,
      message: "The chat request is not valid UTF-8.",
    };
  }
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: { code: "INVALID_CONTENT_TYPE", message: "Send a JSON chat request." } }, 415);
  }

  const body = await readBoundedBody(request);
  if (!body.success) {
    return json(
      { error: { code: "INVALID_REQUEST", message: body.message } },
      body.status,
    );
  }

  const parsed = parseChatBody(body.text);
  if (!parsed.success) {
    return json(
      { error: { code: "INVALID_REQUEST", message: parsed.message } },
      parsed.status,
    );
  }

  try {
    const assistant = await sendChatRequest(
      parsed.data.routeId,
      parsed.data.messages,
    );
    return json({ assistant });
  } catch (error) {
    if (error instanceof ProxyFailure) {
      return json(
        { error: { code: error.code, message: error.safeMessage } },
        error.status,
      );
    }

    return json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "The chat request could not be completed.",
        },
      },
      500,
    );
  }
}
