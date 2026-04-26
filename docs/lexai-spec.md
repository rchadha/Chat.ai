# LexAI Spec
# Legal Intake Demo — Product Spec

## Purpose of this document
This spec guides the build of the "Legal" section of the Human AI 
project. It is a prototype, not production code. Its primary purpose 
is to demonstrate to a practicing refugee lawyer (co-founder) that 
AI-led client intake is feasible, useful, and safe. Once validated, 
it becomes the seed of a real product.

## Context
- Target user (lawyer): Ontario-based refugee and humanitarian 
  immigration lawyer at a mid-size firm.
- Target user (client): Refugee claimant, often recently arrived, 
  speaking Hindi or English for this demo. Later: Arabic, Farsi, 
  Dari, Tigrinya, Amharic, Spanish, Russian, Ukrainian, Mandarin.
- Long-term vision: AI-native intake platform for Canadian 
  immigration lawyers, starting with refugee work, expanding to 
  economic, family, and study-permit streams.

## Scope of this prototype
Only the personal history / chronology section of a refugee claim.
Fields to collect:
- Full legal name, any other names used, date of birth, place of birth
- Citizenship(s) and any stateless status
- Current address in Canada, arrival date in Canada
- Immediate family (spouse, children, parents, siblings) — names, 
  dates of birth, current location
- Education history (schools, years, locations)
- Employment history (employers, roles, years, locations)
- Address history for the past 10 years
- Travel history (countries visited, dates, purposes) for the past 10 years
- Languages spoken

Explicitly out of scope for this prototype:
- Narrative of persecution, violence, or reasons for leaving
- Document upload and OCR
- Inconsistency detection
- Authentication, accounts, or persistent storage
- Any form auto-population (IRCC forms, Basis of Claim narrative)

## Non-negotiable principles
1. The AI is an information collector, not a legal advisor. It never 
   tells the client what their answer should be. It asks, it records, 
   it clarifies — it does not advise.
2. The AI never asks about persecution, violence, trauma, or reasons 
   for leaving the country of origin. If the client volunteers this 
   information, the AI acknowledges it gently and redirects: "Thank 
   you for sharing that. Your lawyer will want to talk with you about 
   that directly. For now, let's continue with [next factual topic]."
3. The AI is trauma-informed: warm tone, one question at a time, 
   accepts "I don't know" and approximate dates without pressure, 
   offers to pause at any time.
4. The client is told upfront, in their language, that they are 
   talking to a computer program, that their lawyer will review 
   everything, and that they can stop at any time.
5. All data stays on the server. No client-side storage of PII. No 
   logging of message content to external services.
6. Language: the AI conducts the entire interview in the client's 
   chosen language. The structured summary for the lawyer is always 
   in English, regardless of interview language.

## User flow
1. Landing page: language selector (Hindi, English for now), plus 
   the "you are talking to a computer program" disclosure.
2. Chat page: two-column layout on desktop.
   - Left: conversation with the AI, in the client's language.
   - Right: live-updating structured summary (in English), showing 
     fields filling in as the client provides information. Empty 
     fields shown as "— not yet collected —".
3. End-of-interview: AI summarizes what was collected, asks "did I 
   miss anything important?", then shows a "Finish" button.
4. Summary page (lawyer view): clean, printable summary of all 
   collected fields in English, plus the full conversation transcript 
   in the original language with English translation alongside.

## Technical approach
- Framework: use the same framework as fin-chat and sql-chat 
  sections. Match existing patterns for routing, API routes, styling, 
  and state management.
- LLM: Anthropic Claude via the @anthropic-ai/sdk npm package. Use 
  claude-sonnet-4-6 for the conversation (good balance of cost and 
  quality). Use claude-opus-4-7 for the structured extraction pass 
  where accuracy matters more.
- Architecture:
  - `/api/legal/chat` — handles the conversational turn. Takes 
    message history, returns next AI message (streaming preferred if 
    the existing sections stream).
  - `/api/legal/extract` — takes the conversation so far, returns an 
    updated structured JSON object of collected fields. Called in 
    parallel after each user message.
  - `/api/legal/summary` — takes the final conversation and 
    structured data, returns a lawyer-ready English summary.
- State: in-memory for the demo (session state only). Explicitly do 
  not persist anything to a database yet.
- Secrets: ANTHROPIC_API_KEY in .env.local, never in client code.

## System prompt for the chat endpoint

"You are an intake assistant for a Canadian refugee and immigration 
law firm. You are helping a client provide biographical and 
chronological information that their lawyer will need for their case. 
You are NOT a lawyer and you do not give legal advice.

Your role:
- Collect the information listed in the INTAKE FIELDS section below, 
  one topic at a time.
- Conduct the conversation in the language the client is using.
- Be warm, patient, and trauma-informed. The client may have 
  experienced very difficult things. Do not rush them.
- Accept approximate dates and 'I don't remember' without pressure. 
  Record what they tell you as they tell you.
- Ask one question at a time. Never stack multiple questions.
- If the client starts describing persecution, violence, or reasons 
  for leaving their country: acknowledge gently ('Thank you for 
  sharing that. Your lawyer will want to discuss that with you 
  directly.') and redirect to the next factual topic.
- If the client seems distressed, offer to pause ('We can take a 
  break whenever you need. There's no rush.').
- You must never give legal advice, tell the client what to say, or 
  suggest what answer would be better for their case.
- At the end, summarize what you've collected and ask if anything 
  important is missing.

INTAKE FIELDS:
[list from the Scope section above]

START OF CONVERSATION:
Begin with a warm greeting in the client's language. Remind them you 
are a computer program, that their lawyer will review everything, 
and that they can stop anytime. Then start with the easiest 
topic: their name."

## System prompt for the extraction endpoint

"You are a data extraction tool. Given a conversation between a 
refugee intake assistant and a client (possibly in Hindi or another 
language), extract the biographical information collected so far 
into the JSON schema below. Always return valid JSON. Translate 
field values into English where needed — names of people stay in 
their original form, but places, roles, and descriptive text should 
be in English. If a field has not been discussed or the client did 
not know the answer, leave it as null. Do not infer or guess — only 
record what was explicitly stated.

SCHEMA:
{
  'legalName': string | null,
  'otherNames': string[] | null,
  'dateOfBirth': string | null,
  'placeOfBirth': string | null,
  'citizenships': string[] | null,
  'currentAddressCanada': string | null,
  'arrivalDateCanada': string | null,
  'familyMembers': [{ relationship, name, dateOfBirth, currentLocation }] | null,
  'educationHistory': [{ institution, location, years, credential }] | null,
  'employmentHistory': [{ employer, role, location, years }] | null,
  'addressHistory': [{ address, country, fromYear, toYear }] | null,
  'travelHistory': [{ country, dates, purpose }] | null,
  'languagesSpoken': string[] | null,
  'notesForLawyer': string[]  // things the client volunteered that 
                              // should be flagged, e.g. mentioned 
                              // persecution, distress, uncertainty
}"

## Demo success criteria
The prototype is successful if, during a live demo:
1. The co-founder (refugee lawyer) can conduct a full intake 
   interview in Hindi as a simulated client.
2. She sees the structured English summary building up in real time 
   as she answers.
3. At the end, she receives a clean lawyer-view summary she can 
   imagine using in her actual practice.
4. She identifies at least 5 specific improvements she'd want — 
   this is the start of the real product roadmap.

## Deliberately not yet decided
- Pricing, business model, funding structure
- Incorporation
- Competitive positioning
- Go-to-market
- Production security posture (encryption, data residency, audit logs)

These decisions come after the prototype validates the core idea.