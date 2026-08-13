// Click-to-chat deep link. Opens WhatsApp (the trainer's own app) with the
// recipient and a pre-filled message; the trainer taps send. No API, no cost.
// https://faq.whatsapp.com/425247423114725 (wa.me format)

export function waLink(phoneE164: string, text: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// Absolute URL for a client's action page, given the app origin.
export function clientActionUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/c/${token}`;
}
