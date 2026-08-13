# LifeOS Design Language (DLS v1)

**Inspiration:** Bloomberg × Apple Health.
**One-line law:** White ground, black bold numbers, gray support, hairline structure. **Color appears only when it carries meaning.**

---

## 1. Principles

1. **Numbers are the interface.** The data is the content; labels are metadata. If a screen doesn't lead with a number, question it.
2. **Color = information, never decoration.** Only three semantic colors exist (good/warn/bad). No category colors, no colored icons, no gradients.
3. **Ink density is a signal.** Logged/taken/active = black. Missing/pending/inactive = gray or faint. A glance at how "dark" a card is tells you how complete the day is.
4. **Input is language, not forms.** One universal capture (text via Wispr Flow + photo). AI classifies and files. Never a dropdown, never a time picker (auto-timestamp).
5. **Dashed = empty, solid = filled.** Border style is state.
6. **Chat is disposable. Data is permanent.** AI briefs are stored structured events attached to their date, like any other data.

---

## 2. Color tokens

| Token | Hex | Use |
|---|---|---|
| `ink` | `#0A0A0A` | Primary text, hero numbers, active icons, FAB, primary buttons |
| `gray` | `#8A8A8E` | Supporting text, units, labels, secondary values |
| `faint` | `#C7C7CC` | Timestamps, placeholders, disabled, empty-state text |
| `border` | `#E8E8EA` | Card borders (1px), input borders |
| `rule` | `#F0F0F2` | Hairline dividers *inside* cards only |
| `page` | `#FAFAFA` | App background |
| `card` | `#FFFFFF` | Card background |
| `good` | `#0B8A3E` | Recovery ≥67%, positive deltas, taken/complete, green-light briefs |
| `warn` | `#C7830A` | Recovery 34–66%, caution briefs |
| `bad` | `#C1272D` | Recovery <34%, negative deltas, LISTENING dot, red-flag briefs |

**Color budget per screen:** status dots + delta arrows + brief-tone dots. Nothing else. If a design needs a fourth color, the design is wrong.

Semantic direction rule: delta color follows *goodness*, not direction. Weight ▼ during a cut = `good`. HRV ▼ = `bad`.

---

## 3. Typography

Font: system stack — `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`.
All numerals: `font-variant-numeric: tabular-nums`, letter-spacing `-0.02em`.

| Role | Size / Weight | Color | Notes |
|---|---|---|---|
| Hero number | 60–64 / 800 | ink | One per screen max (e.g. recovery %) |
| Page title | 32–36 / 800 | ink | letter-spacing −0.03em |
| Card headline / exercise name | 15–17 / 700–800 | ink | |
| Brief headline | 17 / 800 | ink | Verdict sentence, line-height 1.3 |
| Metric value | 16–17 / 700 | ink | |
| Body / notes | 14–15 / 400–500 | ink | line-height 1.5 |
| Unit | 13 / 500 | gray | 4px left margin from value, never bold |
| Support line | 13–13.5 / 400–500 | gray | |
| SECTION LABEL | 11 / 600 | gray | UPPERCASE, letter-spacing 0.08em |
| Timestamp / meta | 12 / 500 | faint | |
| Delta | 12.5 / 700 | good/bad | `▲6%` / `▼6` glyph + value, no space |

**Hierarchy formula for any metric:** `[bold ink value][gray unit] → [uppercase gray label]`. Value always dominates.

---

## 4. Layout & cards

- Page padding: 20px horizontal. Card gap: **12px**. Card: white, `1px solid border`, **radius 16**, padding 16. No shadows (shadows only on floating elements: FAB, sheets, modals).
- Hairline `rule` dividers appear **only inside** cards, between rows. Never between cards.
- **Empty card:** `1.5px dashed border`, centered 40px ⊕ circle (1.5px faint stroke), one hint line in faint 13/600. Entire card is the tap target.
- **View link:** right-aligned, bottom of card. `gray`, 13/500, `→` 13px. Never bold, never ink, never left-aligned. Pattern: `+4 more · View session →`.
- Card summary rows show **max 3 items**, then `+N more` in the view link. Depth lives one tap in.
- Detail pages: `← Back` (ink 15/600), page title, dateline (`Today · July 10, 2026` — always include the date even for today), then cards.

---

## 5. Components

**Status dot** — 10px circle, recovery-colored, sits beside the hero number. Calendar uses 4px dots per logged day, colored by that day's recovery.

**Date strip** — 7 days, chromeless. Selected: ink 17/800 + 2.5px ink underline (inset 24%). Unselected: gray 17/500, faint day label.

**Calendar (jump)** — modal card, month grid, dotted logged days, today = 1.5px ink ring. Opened by tapping the masthead date (with 12px calendar glyph affordance).

**Toggle (iOS-style)** — track 46×28, radius 14; on = ink, off = `border`; 24px white knob. No green — on/off is not good/bad.

**Universal capture sheet** — bottom sheet, radius 24 top. Contents in order: `ADD ANYTHING` label + close; free textarea (placeholder: *"Say anything — a set you just did, what you ate, a BP reading, a note. It gets filed in the right place."*); optional photo attach chip; `TRY SAYING` faint label + suggestion chips (white, border, gray text — suggestive only, never required); camera button + full-width ink **Add** button.
Phases: input → *"Reading · classifying · structuring…"* (pulsing ✦) → **"✓ Filed to {Workout}"** chip + parsed preview rows (staggered fade-in, 0.1s offsets) → ink **Save**.

**Brief card (Coach)** — tone dot (7px, good/warn/bad) + `MORNING BRIEF` label, timestamp right. **Verdict headline** (17/800) — a decision or judgment, not a summary title. Then 3–4 rows: `**Bold key** — supporting sentence with real numbers`, hairline-separated. Morning = decision + plan + one watch item. Evening = accounting + one cross-module pattern + tomorrow's setup.

**FAB** — 58–60px ink circle, white ⊕, bottom-right, shadow `0 10px 28px rgba(0,0,0,0.28)`. The only strong floating object. Present on Today only.

**Chat** — user bubble: ink bg, white text. AI bubble: white bg, 1px border. Radius 16. Suggestion chips above input. Answers must cite the user's actual numbers and dates.

---

## 6. Motion

Sparingly, meaningfully:
- `pulse` (scale 1→1.15, opacity dip, ~0.9–1.6s loop): classifier thinking, LIVE/LISTENING dots only.
- `fade-in-up` (8px rise, 0.35s, staggered 0.1s): parsed rows appearing — the "structuring" moment is the one earned animation.
- Ring/underline transitions: 0.15–0.8s ease. Nothing else moves. Respect reduced-motion.

---

## 7. Voice & copy

- Sentence case everywhere except SECTION LABELS.
- Buttons say what happens: **Add**, **Save**, **Log workout** — never "Submit."
- Empty states invite in one line: *"Add — just say your sets."*
- Coach speaks in verdicts with evidence: numbers, dates, comparisons to the user's own history. Never generic advice ("stay hydrated" is banned). Tone: direct, warm, zero fluff.
- Auto-derived facts stated plainly: *"9:41 AM · auto-timestamped."*

---

## 8. Do / Don't

**Do:** lead with a number · gray the units · dash the empty · auto-timestamp · right-align view links · keep max 3 rows per summary card · store briefs as data.

**Don't:** icons in module cards · colored icons anywhere · shadows on cards · bold view links · category colors · forms, dropdowns, or pickers · more than one hero number per screen · a fourth semantic color.
