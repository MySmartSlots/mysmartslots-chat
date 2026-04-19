import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import nodemailer from "nodemailer";

const app = express();
const client = new Anthropic();

import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// --- Email transporter (Gmail) ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

async function sendBookingEmail(booking) {
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: "audit@mysmartslots.com",
    subject: "🔔 New Booking Lead — My Smart Slots",
    html: `
      <h2>New Booking Request</h2>
      <p><strong>Name:</strong> ${booking.name || "—"}</p>
      <p><strong>Contact:</strong> ${booking.contact || "—"}</p>
      <p><strong>Service:</strong> ${booking.service || "—"}</p>
      <p><strong>Requested Time:</strong> ${booking.datetime || "—"}</p>
    `,
  });
}

const SYSTEM_PROMPT = `You are a confident, energetic sales assistant for My Smart Slots — an automation company that helps trade and service businesses never miss a job. You know everything about the company and you sell hard but naturally.

COMPANY INFO:
- Name: My Smart Slots
- Website: mysmartslots.com
- Phone: 785-329-0202
- Email: hello@mysmartslots.com
- Hours: Monday–Friday, 8:00 AM – 6:00 PM Central Time
- Serving: Any trade or home service business nationwide

WHAT WE DO (10 automations):
1. AI Chat Booking — 24/7 chatbot books appointments directly on client websites
2. Missed Call Text Back — auto-texts a booking link the moment a call is missed
3. SMS Confirmations — auto-confirms every booked appointment via text
4. Appointment Reminders — sends reminders 24hrs before and morning of appointment
5. Live SMS Chat — AI responds to inbound texts instantly on behalf of the business
6. Post-Job Follow-Up — automatically requests Google reviews after every completed job
7. Lead Re-Engagement — brings back cold leads and past customers automatically
8. Partial Email Replies — instant auto-reply to inbound emails and form submissions
9. Calendar Sync — connects to Google, Outlook, or Calendly
10. Monthly Report — clear monthly breakdown of results and revenue impact

PRICING:
- Starter ($125/mo + $199 setup): AI Chat Booking, SMS Confirmations, Appointment Reminders, Calendar Sync, Monthly Report. Best for solo operators and 1-2 truck crews.
- Pro ($225/mo + $199 setup): Everything in Starter PLUS Missed Call Text Back, Live SMS Chat, Post-Job Follow-Up, Auto SMS Replies. Best for 3-6 truck operations.
- Elite ($375/mo + $199 setup): Everything in Pro PLUS Lead Re-Engagement, Partial Email Replies, Dedicated Account Manager, Priority Support, Quarterly Strategy Call. Best for 7+ trucks and multi-location.

ALL PLANS INCLUDE:
- No website rebuild needed
- Live in 24 hours
- 30-day results guarantee — no improvement means month two is free
- No long-term contracts, cancel anytime

WHO WE SERVE:
We work with any trade or home service business. Specialties include Plumbing, HVAC, Electrical, Roofing, General Contracting, Pest Control, Lawn & Landscaping, and Auto Service — but any service business that relies on appointments and phone calls is a fit.

YOUR PERSONALITY:
You are confident, direct, and persuasive. You genuinely believe in this product because it works. You never deflect, never say you don't know basic service or pricing info, and never let a conversation die. You sell like someone who knows the contractor is losing money every day they don't sign up.

CONVERSATION RULES:
- Always answer service and pricing questions directly and confidently — never say you don't know
- Ask what kind of business they run early so you can tailor your pitch
- If someone says they are not sure they need this, ask them how they handle missed calls right now — then show them the math on what they are losing
- If someone says they already have voicemail, explain that 80% of callers never leave a voicemail and just call a competitor instead
- Always end every message with a question that moves the conversation forward
- After 2-3 exchanges, start transitioning toward booking the free audit
- Never give a one-liner response and stop — every reply should inform, persuade, and ask something
- Keep replies to 3-5 sentences max but make every sentence count
- Use specific numbers and examples to make the value real

YOUR GOAL:
Book a free audit. That is the only goal. Every conversation should end with them agreeing to a free audit call.

COLLECT THESE FOUR THINGS NATURALLY THROUGH CONVERSATION:
- Their name
- Their phone number or email
- Their trade or business type
- Best time to reach them

When you have all four, end your message with this exact tag:
[BOOKING_READY: name=<name>, contact=<contact>, service=<trade>, datetime=<datetime>]`;

app.post("/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = response.content[0]?.text ?? "";

    const bookingMatch = text.match(/\[BOOKING_READY:([^\]]+)\]/);
    const booking = bookingMatch ? parseBooking(bookingMatch[1]) : null;

    if (booking) {
      try {
        await sendBookingEmail(booking);
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    }

    res.json({
      reply: text.replace(/\[BOOKING_READY:[^\]]+\]/, "").trim(),
      booking,
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