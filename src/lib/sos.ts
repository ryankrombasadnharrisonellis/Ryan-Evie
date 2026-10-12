export type SosKind = "call" | "facetime" | "attention" | "annoy";
export type SosAck = "calling" | "five" | "love" | "stop";

export const SOS_INFO: Record<SosKind, { emoji: string; label: string; short: string }> = {
  call: { emoji: "🚨", label: "Immediate call needed", short: "needs a call — NOW" },
  facetime: { emoji: "📹", label: "10-minute FaceTime required", short: "requires a 10-minute FaceTime" },
  attention: { emoji: "👀", label: "Wants attention", short: "wants attention" },
  annoy: { emoji: "😈", label: "Wants to annoy you", short: "wants to annoy you" },
};

export const ACK_INFO: Record<SosAck, { emoji: string; label: string }> = {
  calling: { emoji: "📞", label: "Calling now" },
  five: { emoji: "⏳", label: "Give me 5 min" },
  love: { emoji: "❤️", label: "Sending love" },
  stop: { emoji: "🙄", label: "Stop it (lovingly)" },
};

export const ANNOY_LINES = [
  "Hey. Hey. Hey. Hey.",
  "👉 poke",
  "👉👉 poke poke",
  "Are you thinking about me? You should be.",
  "This is your hourly reminder that I exist.",
  "I'm bored. Entertain me.",
  "Knock knock 🚪",
  "Just checking you still love me. Do you?",
  "*taps screen repeatedly*",
  "Beep boop. Attention required. Beep.",
  "I have nothing to say, I just wanted to buzz your phone 😇",
  "What are you doing? Wrong answer, talk to me.",
  "Notification! Notification! Notification!",
  "🦆 quack",
  "I'm going to keep doing this.",
  "Ding ding ding 🔔",
  "Look at your phone. No, properly.",
  "Ugh, you're so cute it's annoying. So now I'm annoying you back.",
];

/** How to start a call to someone, given their phone number or Apple ID email. */
export function callLinks(contact: string | null | undefined) {
  if (!contact) return null;
  const c = contact.trim();
  const isPhone = /^[+\d][\d\s()-]{5,}$/.test(c);
  const clean = isPhone ? c.replace(/[^\d+]/g, "") : c;
  return {
    facetime: `facetime:${clean}`,
    audio: isPhone ? `tel:${clean}` : `facetime-audio:${clean}`,
  };
}
