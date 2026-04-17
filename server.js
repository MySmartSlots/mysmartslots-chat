import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const client = new Anthropic(); // reads ANTHROPIC_API_KEY from environment

import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));
const SYSTEM_PROMPT = `You are a friendly booking assistant for a local service business using MySmartSlots. Your job is to help website visitors:

1. Answer FAQs about the business (services, pricing, hours, location)
2. Help them book an appointment by collecting:
   - Their name
   - Their phone number or email
   - The service they need
   - Their preferred date and time

Keep replies SHORT — 1-3 sentences max. Be warm, conversational, and helpful.

When you have collected all booking details (name, contact, service, time), end your message with this exact tag so the system can process it:
[BOOKING_READY: name=<name>, contact=<contact>, service=<service>, datetime=<datetime>]

If you don't know specific business details (hours, pricing, address), say something like "Great question — let me have someone from the team follow up with you on that!" and offer to take their contact info.`;

app.post("/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = response.content[0]?.text ?? "";

    // Check if a booking is ready
    const bookingMatch = text.match(/\[BOOKING_READY:([^\]]+)\]/);
    const booking = bookingMatch ? parseBooking(bookingMatch[1]) : null;

    res.json({
      reply: text.replace(/\[BOOKING_READY:[^\]]+\]/, "").trim(),
      booking, // null unless all details collected
    });
  } catch (err) {
    console.error("Anthropic error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

function parseBooking(raw) {
  const result = {};
  raw.split(",").forEach((pair) => {
    const [key, val] = pair.split("=").map((s) => s.trim());
    if (key && val) result[key] = val;
  });
  return result;
}

app.get("/health", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MySmartSlots chat server running on port ${PORT}`));
