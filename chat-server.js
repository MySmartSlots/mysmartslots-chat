import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const client = new Anthropic();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// ── EMAIL ─────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

async function sendLeadEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `"My Smart Slots" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch(e) {
    console.error("Email error:", e.message);
  }
}

// ── CLIENT CONFIGS ────────────────────────────────────────────────────────────
// In production these come from Supabase via the setup wizard.
// Each client gets their own entry keyed by client_id.
const CLIENT_CONFIGS = {

  // ── DIAMOND PLUMBING — Demo client for /subdomain ──────────────────────────
  "diamond-plumbing": {
    business_name: "Diamond Plumbing Co.",
    business_type: "plumbing",
    tagline: "Fast, reliable plumbing service",
    location: "Kansas City, MO",
    phone: "(816) 555-0192",
    hours: "Monday–Friday 7AM–6PM, Saturday 8AM–2PM. Emergency service available 24/7.",
    booking_url: "https://calendly.com/audit-mysmartslots/free-audit",
    notification_email: "hello@mysmartslots.com",
    brand_color: "#1455a4",
    services: [
      "Drain cleaning and unclogging",
      "Water heater repair and replacement",
      "Leak detection and pipe repair",
      "Toilet and faucet installation",
      "Sewer line inspection and repair",
      "Emergency plumbing — available 24/7",
      "Water pressure issues",
      "Garbage disposal installation",
      "Pipe insulation and winterization",
      "Full bathroom and kitchen plumbing",
    ],
    pricing_note: "Free estimates on all jobs. Most repairs diagnosed and fixed same day.",
    emergency_note: "For emergencies call (816) 555-0192 directly — we answer 24/7.",
    greeting: "Hi! Welcome to Diamond Plumbing Co. I'm here to help schedule your service or answer any questions. What can I help you with today?",
    tone: "professional",
  },

};

// ── SYSTEM PROMPT BUILDER ─────────────────────────────────────────────────────
function buildClientSystemPrompt(config) {
  const servicesList = config.services.map(s => `- ${s}`).join("\n");
  return `You are the AI booking assistant for ${config.business_name} — a ${config.business_type} company serving ${config.location}.

BUSINESS INFORMATION:
- Name: ${config.business_name}
- Phone: ${config.phone}
- Hours: ${config.hours}
- Location: ${config.location}
- Tagline: ${config.tagline}

SERVICES OFFERED:
${servicesList}

PRICING: ${config.pricing_note}
EMERGENCIES: ${config.emergency_note}

YOUR ROLE:
You are a professional, knowledgeable assistant who helps customers of ${config.business_name}. You answer questions about services and scheduling, and you guide customers toward booking an appointment. You represent ${config.business_name} — you are NOT a generic AI assistant.

YOUR PERSONALITY:
Professional, warm, and efficient. You sound like a knowledgeable employee who knows the business inside out. You are helpful and never pushy, but you always move the conversation toward a booked appointment.

CONVERSATION RULES:
1. Always answer questions about services, pricing, and hours directly and confidently
2. If someone asks about a service you don't offer, politely let them know and suggest the closest relevant service
3. For any emergency (burst pipe, flooding, no heat in winter, gas smell) — immediately give them the phone number and tell them to call right now. Do not continue the booking flow.
4. For non-emergency requests, guide them naturally toward booking
5. Keep responses concise — 2-4 sentences max unless explaining something technical
6. Never make up prices or timeframes you don't know — say "our technician will assess and provide a free estimate on-site"
7. Always sound like you work there — say "we" and "our team"

BOOKING COLLECTION FLOW:
When a customer wants to schedule service, collect these five things naturally through conversation — do NOT ask for all of them at once. Ask one at a time, woven into natural responses:
1. First name
2. Phone number
3. What the issue is (their own words)
4. Preferred day or timeframe
5. Morning or afternoon preference

Once you have all five, confirm back to them clearly:
"Perfect — I have everything I need. Let me get you to our booking page to lock in your appointment. I'll have [Name], [phone], [issue], [day] [time] ready for our team."

Then end your message with this exact tag on its own line:
[BOOKING_READY: name=<name>, phone=<phone>, issue=<issue>, day=<day>, time=<time>]

IMPORTANT RULES:
- Never reveal you are Claude or an AI made by Anthropic — you are the ${config.business_name} assistant
- Never discuss competitors
- Never discuss pricing for other businesses
- If someone asks something completely unrelated to plumbing or scheduling, politely redirect: "I'm specifically here to help with plumbing questions and scheduling — is there something I can help you with on that front?"
- The booking URL you will direct customers to is: ${config.booking_url}`;
}

// ── MY SMART SLOTS MARKETING SYSTEM PROMPT (unchanged) ───────────────────────
const MSS_SYSTEM_PROMPT = `You are a confident, energetic sales assistant for My Smart Slots — an automation company that helps trade and service businesses never miss a job. You know everything about the company and you sell hard but naturally.

COMPANY INFO:
- Name: My Smart Slots
- Website: mysmartslots.com
- Phone: 785-329-0202
- Email: hello@mysmartslots.com
- Hours: Monday–Friday, 8:00 AM – 6:00 PM Central Time
- Serving: Any trade or home service business nationwide

WHAT WE DO (11 automations):
1. AI Chat Booking — 24/7 chatbot books appointments directly on client websites
2. Missed Call Text Back — auto-texts a booking link the moment a call is missed
3. SMS Confirmations — auto-confirms every booked appointment via text
4. Appointment Reminders — sends reminders 24hrs before and morning of appointment
5. Live SMS Chat — AI responds to inbound texts instantly on behalf of the business
6. Post-Job Review Requests — automatically requests Google reviews after every completed job
7. Lead Re-Engagement — brings back cold leads and past customers automatically
8. Partial Email Replies — instant auto-reply to inbound emails and form submissions
9. Job Status Update Texts — one-tap employee tool sends automatic customer updates
10. Calendar Sync — connects to Google, Outlook, or Calendly
11. Monthly Report — clear monthly breakdown of results and revenue impact

PRICING:
- Starter ($125/mo + $199 setup): AI Chat Booking, SMS Confirmations, Appointment Reminders, Calendar Sync, Monthly Report.
- Pro ($225/mo + $199 setup): Everything in Starter PLUS Missed Call Text Back, Live SMS Chat, Post-Job Review Requests.
- Elite ($375/mo + $199 setup): Everything in Pro PLUS Lead Re-Engagement, Partial Email Replies, Job Status Update Texts, Quarterly Strategy Review.

ALL PLANS INCLUDE:
- No website rebuild needed
- Live in 24 hours
- 30-day results guarantee — no improvement means month two is free
- No long-term contracts, cancel anytime

YOUR PERSONALITY:
You are confident, direct, and persuasive. You genuinely believe in this product because it works. You never deflect and never let a conversation die. You sell like someone who knows the contractor is losing money every day they don't sign up.

CONVERSATION RULES:
- Always answer service and pricing questions directly and confidently
- Ask what kind of business they run early so you can tailor your pitch
- If someone says they are not sure they need this, ask them how they handle missed calls right now
- If someone says they already have voicemail, explain that 80% of callers never leave a voicemail
- Always end every message with a question that moves the conversation forward
- After 2-3 exchanges, start transitioning toward booking the free audit
- Keep replies to 3-5 sentences max but make every sentence count

YOUR GOAL:
Book a free audit. Every conversation should end with them agreeing to a free audit at: https://calendly.com/audit-mysmartslots/free-audit

COLLECT THESE FOUR THINGS NATURALLY:
- Their name
- Their phone number or email
- Their trade or business type
- Best time to reach them

When you have all four, end with:
[BOOKING_READY: name=<n>, contact=<contact>, service=<trade>, datetime=<datetime>]`;

// ── CHAT ENDPOINT — MULTI-CLIENT ──────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  const { messages, client_id } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  // Determine which system prompt to use
  let systemPrompt = MSS_SYSTEM_PROMPT;
  let clientConfig = null;

  if (client_id && CLIENT_CONFIGS[client_id]) {
    clientConfig = CLIENT_CONFIGS[client_id];
    systemPrompt = buildClientSystemPrompt(clientConfig);
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      system: systemPrompt,
      messages,
    });

    const text = response.content[0]?.text ?? "";

    // Check for booking ready tag
    const bookingMatch = text.match(/\[BOOKING_READY:([^\]]+)\]/);
    const bookingData = bookingMatch ? parseBookingTag(bookingMatch[1]) : null;

    // Send lead notification
    if (bookingData && clientConfig) {
      const bookingUrl = `${clientConfig.booking_url}?name=${encodeURIComponent(bookingData.name||"")}&phone=${encodeURIComponent(bookingData.phone||"")}`;
      await sendLeadEmail({
        to: clientConfig.notification_email,
        subject: `🔔 New Booking Lead — ${clientConfig.business_name}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
            <div style="background:#1A1A2E;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
              <h2 style="color:#00C896;margin:0;">New Chat Lead</h2>
              <p style="color:#fff;margin:4px 0 0;font-size:14px;">${clientConfig.business_name}</p>
            </div>
            <div style="background:#f5f7fb;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e4e8f0;">
              <p style="color:#374151;"><strong>Name:</strong> ${bookingData.name||"—"}</p>
              <p style="color:#374151;"><strong>Phone:</strong> ${bookingData.phone||"—"}</p>
              <p style="color:#374151;"><strong>Issue:</strong> ${bookingData.issue||"—"}</p>
              <p style="color:#374151;"><strong>Preferred Day:</strong> ${bookingData.day||"—"}</p>
              <p style="color:#374151;"><strong>Time Preference:</strong> ${bookingData.time||"—"}</p>
              <div style="margin-top:20px;text-align:center;">
                <a href="${bookingUrl}" style="background:#00C896;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Open Booking Page →</a>
              </div>
            </div>
          </div>`,
      });
    } else if (bookingData && !clientConfig) {
      // MSS marketing bot booking
      await sendLeadEmail({
        to: "hello@mysmartslots.com",
        subject: "🔔 New Audit Lead — My Smart Slots Website",
        html: `<h2>New Audit Request</h2>
          <p><strong>Name:</strong> ${bookingData.name||"—"}</p>
          <p><strong>Contact:</strong> ${bookingData.contact||"—"}</p>
          <p><strong>Business Type:</strong> ${bookingData.service||"—"}</p>
          <p><strong>Best Time:</strong> ${bookingData.datetime||"—"}</p>`,
      });
    }

    // Build response — include booking URL if ready
    let reply = text.replace(/\[BOOKING_READY:[^\]]+\]/g, "").trim();
    let bookingUrl = null;
    if (bookingData && clientConfig) {
      bookingUrl = clientConfig.booking_url;
    }

    res.json({ reply, booking: bookingData, booking_url: bookingUrl });

  } catch(err) {
    console.error("Anthropic error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

function parseBookingTag(raw) {
  const result = {};
  raw.split(",").forEach(pair => {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) return;
    const key = pair.substring(0, eqIdx).trim();
    const val = pair.substring(eqIdx + 1).trim();
    if (key && val) result[key] = val;
  });
  return result;
}

// Widget config endpoint — returns safe public config for a client
app.get("/config", (req, res) => {
  const clientId = req.query.client;
  const cfg = clientId && CLIENT_CONFIGS[clientId];
  if (!cfg) {
    return res.json({ business_name: "Us", brand_color: "#00C896", greeting: "👋 Hi! How can I help you today?" });
  }
  // Only return public-safe fields — never return notification_email or internal config
  res.json({
    business_name: cfg.business_name,
    brand_color:   cfg.brand_color || "#00C896",
    greeting:      cfg.greeting,
    phone:         cfg.phone,
    hours:         cfg.hours,
  });
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MySmartSlots chat server running on port ${PORT}`));
