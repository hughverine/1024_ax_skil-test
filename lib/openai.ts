import OpenAI from "openai";

export const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
