// Click-to-chat deep link. Opens WhatsApp (the trainer's own app) with the
// recipient and a pre-filled message; the trainer taps send. No API, no cost.
// https://faq.whatsapp.com/425247423114725 (wa.me format)

export function waLink(phoneE164: string, text: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// Forgiving phone entry → E.164. wa.me needs the full international number
// (country code, no + / spaces / leading 0), so a trainer typing a bare local
// mobile would otherwise break. Defaults the country code to India (the launch
// market); a number typed with a leading + (or already carrying a country code)
// is kept as-is.
export function normalizePhone(raw: string, defaultCC = "91"): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    return "+" + trimmed.slice(1).replace(/\D/g, "");
  }
  let d = trimmed.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2); // international "00" prefix
  else if (d.startsWith("0")) d = d.slice(1); // local trunk "0"
  if (d.length === 10) return "+" + defaultCC + d; // bare 10-digit local → add CC
  return "+" + d; // already carries a country code
}

// Absolute URL for a client's action page, given the app origin.
export function clientActionUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/c/${token}`;
}
