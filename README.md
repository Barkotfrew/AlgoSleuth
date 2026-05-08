# AlgoSleuth

AlgoSleuth is a cyber-themed DSA learning app that turns code analysis into a forensic investigation.

Users paste a DSA solution, choose how they want the analysis delivered, and receive a structured case-file style report with evidence boards, bug traces, complexity insights, and next-step clues.

Live site: [www.algosleuth.me](https://www.algosleuth.me)

## What it does

- Analyzes DSA code submissions with an AI-backed forensic workflow
- Supports guest usage with a limited free trial before sign-in is required
- Lets users tune the report through Modus Operandi settings:
  - Expertise Level
  - Visualization style
  - Detail Depth
- Stores user cases and follow-up case messages in Supabase
- Supports authentication, password reset, and account deletion flows

## Product flow

1. Open the landing page and start an investigation
2. Paste code into the Suspect Profile input
3. Configure Modus Operandi
4. Run the scan
5. Review the generated report, evidence, and follow-up clues

## Tech stack

- Frontend: React 19, TypeScript, Vite
- Styling: Tailwind via CDN, custom cyber UI styling
- Backend services: Supabase
- Auth: Supabase Auth
- Database: Supabase Postgres with Row Level Security
- Edge Functions: Supabase Edge Functions
- AI analysis: Gemini via a Supabase function proxy

## Core features

### Forensic DSA analysis

AlgoSleuth reframes algorithm debugging as a case investigation. Instead of returning a plain answer, it generates a structured dossier with findings, reasoning, and suggested fixes.

### Modus Operandi controls

Users can tailor the analysis before scanning:

- `Expertise Level`
  - `Beginner` for more guided explanations
  - `Intermediate` for tighter, assumption-aware feedback
- `Visualization`
  - `Text Only` for a report-first experience
  - visual traces and evidence-style views where supported
- `Detail Depth`
  - `Brief` for concise output
  - `Full Report` for deeper reasoning and context

### Guest mode

Unauthenticated users can try the app before creating an account. Guest usage is capped so users can explore the product before signing in.

### Case history

Signed-in users can persist evidence records, revisit old investigations, and continue conversations tied to a stored case.

## Project structure

```text
.
|-- App.tsx
|-- components/
|-- contexts/
|-- services/
|-- supabase/
|   |-- functions/
|   |-- schema.sql
|-- public/
|-- index.html
|-- vite.config.ts
```

## Environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key_for_local_builds_if_needed
```

Notes:

- The frontend directly requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Production Gemini requests are expected to go through the Supabase Edge Function secret `GEMINI_API_KEY`

## Local development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Supabase setup

### 1. Database schema

Run [supabase/schema.sql](</C:/Users/ASUS/Desktop/AlgoSeuth - Copy/AlgoSleuth/supabase/schema.sql>) in the Supabase SQL Editor.

This creates:

- `cases`
- `case_messages`
- `profiles`

It also enables and enforces Row Level Security so users can only access their own data.

### 2. Edge Functions

This project uses Supabase Edge Functions for server-side operations such as:

- `gemini-proxy`
- `delete-account`
- `test-email`

Deploy functions with the Supabase CLI, for example:

```bash
supabase functions deploy gemini-proxy
supabase functions deploy delete-account
```

### 3. Required Supabase secrets

Set these in `Supabase -> Edge Functions -> Secrets` as needed:

- `GEMINI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` if transactional email is used in functions

### 4. Auth configuration

Recommended production settings:

- Set `Site URL` to your production domain
- Add redirect URLs for production and localhost
- Enable custom SMTP for reliable verification and reset emails

## Deployment

AlgoSleuth is deployed on Vercel.

### Vercel

- Connect the repository to Vercel
- Set the required environment variables
- Deploy the app

### Domain

The project can be served from a custom domain such as:

- `https://www.algosleuth.me`

### Search indexing

This repo includes:

- `public/robots.txt`
- `public/sitemap.xml`
- production metadata in `index.html`

After deployment, submit the sitemap to Google Search Console.

## Design direction

AlgoSleuth is intentionally not a generic coding dashboard. The interface uses a detective-lab visual system with:

- CRT overlays
- grid backgrounds
- evidence-themed panels
- terminal-style motion
- pinned case-file visuals

## Future improvements

- richer algorithm visualizations
- stronger multi-level tutoring modes
- expanded evidence/timeline interactions
- improved production email delivery flow
- additional SEO and structured content pages

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
