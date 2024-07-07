import express from "express";
import axios, { AxiosError } from "axios";
// import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

// dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// CORS configuration
// const corsOptions = {
//   origin: [process.env.ORIGIN],
//   methods: ["POST", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// };

// app.use(cors(corsOptions));
app.use(cors());
app.use(express.json());

if (!OPENAI_API_KEY) {
  throw new Error("OpenAI API key is not set");
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

app.post("/chat", async (req, res) => {
  console.log("Received chat request body:", JSON.stringify(req.body, null, 2));
  try {
    const { model, messages } = req.body;

    if (!Array.isArray(messages)) {
      console.error("Messages is not an array:", messages);
      throw new Error("Messages must be an array");
    }

    const response = await openai.chat.completions.create({
      model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
    });
    res.json(response);
  } catch (error) {
    console.error("Error in chat request:", error);
    handleError(error, res);
  }
});

app.post("/stream-chat", async (req, res) => {
  console.log(
    "Received stream chat request body:",
    JSON.stringify(req.body, null, 2)
  );
  try {
    const { model, messages } = req.body;

    if (!Array.isArray(messages)) {
      console.error("Messages is not an array:", messages);
      throw new Error("Messages must be an array");
    }

    const stream = await openai.chat.completions.create({
      model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      stream: true,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Error in stream chat request:", error);
    handleError(error, res);
  }
});

function handleError(error: any, res: express.Response) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    res.status(axiosError.response?.status || 500).json({
      error: "An error occurred while processing the request",
      details: axiosError.response?.data || axiosError.message,
    });
  } else {
    res.status(500).json({
      error: "An unexpected error occurred",
      details: (error as Error).message,
    });
  }
}

app.listen(port, () => {
  console.log(`Proxy server listening at http://localhost:${port}`);
});
