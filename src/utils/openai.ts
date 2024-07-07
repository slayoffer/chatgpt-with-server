import { encode } from "gpt-token-utils";
import { db } from "../db";
import { config } from "./config";
import axios from "axios";

const PROXY_URL = process.env.PROXY_URL;

const client = axios.create({
  baseURL: PROXY_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface Message {
  role: string;
  content: string;
}

export async function createStreamChatCompletion(
  messages: Message[],
  chatId: string,
  messageId: string
) {
  const settings = await db.settings.where({ id: "general" }).first();
  const model = settings?.openAiModel ?? config.defaultModel;

  console.log("Preparing stream chat request:", { model, messages });

  if (!Array.isArray(messages)) {
    console.error("Messages is not an array:", messages);
    throw new Error("Messages must be an array");
  }

  const requestBody = {
    model,
    messages,
    stream: true,
  };

  console.log(
    "Sending stream chat request:",
    JSON.stringify(requestBody, null, 2)
  );

  try {
    const response = await client.post("/stream-chat", requestBody, {
      responseType: "text",
      headers: {
        Accept: "text/event-stream",
      },
    });

    const lines = response.data.split("\n");
    let content = "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") {
          setStreamContent(messageId, content, true);
          break;
        }
        try {
          const parsed = JSON.parse(data);
          if (
            parsed.choices &&
            parsed.choices[0].delta &&
            parsed.choices[0].delta.content
          ) {
            const delta = parsed.choices[0].delta.content;
            content += delta;
            setStreamContent(messageId, content, false);
          }
        } catch (error) {
          console.error("Error parsing SSE:", error);
        }
      }
    }

    setTotalTokens(chatId, content);
  } catch (error) {
    console.error("Error in createStreamChatCompletion:", error);
    throw error;
  }
}

export async function createChatCompletion(messages: Message[]) {
  const settings = await db.settings.where({ id: "general" }).first();
  const model = settings?.openAiModel ?? config.defaultModel;

  console.log("Preparing chat request:", { model, messages });

  if (!Array.isArray(messages)) {
    console.error("Messages is not an array:", messages);
    throw new Error("Messages must be an array");
  }

  const requestBody = {
    model,
    messages,
  };

  console.log("Sending chat request:", JSON.stringify(requestBody, null, 2));

  try {
    const response = await client.post("/chat", requestBody);
    return response.data;
  } catch (error) {
    console.error("Error in createChatCompletion:", error);
    throw error;
  }
}

export async function checkOpenAIKey() {
  try {
    const response = await createChatCompletion([
      {
        role: "user",
        content: "hello",
      },
    ]);
    return response;
  } catch (error) {
    console.error(
      "Error checking OpenAI key:",
      error.response?.data || error.message
    );
    throw error;
  }
}

function setStreamContent(
  messageId: string,
  content: string,
  isFinal: boolean
) {
  content = isFinal ? content : content + "█";
  db.messages.update(messageId, { content: content });
}

function setTotalTokens(chatId: string, content: string) {
  let total_tokens = encode(content).length;
  db.chats.where({ id: chatId }).modify((chat) => {
    if (chat.totalTokens) {
      chat.totalTokens += total_tokens;
    } else {
      chat.totalTokens = total_tokens;
    }
  });
}

export async function getSettings() {
  return db.settings.where({ id: "general" }).first();
}
