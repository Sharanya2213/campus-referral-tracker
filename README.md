# CampusPulse — Campus Referral Tracker

CampusPulse is a React + Vite portfolio demo for the NxtWave Growth Challenge. It tracks student registrations for a free AI workshop, compares outreach channels, measures verified ambassador referrals, and provides transparent rule-based growth recommendations.

## Features

- Dashboard for the 500-registration target and seven-day local-date activity.
- Registration form with required-field, email, duplicate-email, and referral-code validation.
- Ambassador management with unique, case-insensitive referral codes.
- Verified referral leaderboard based on current registration records.
- Campaign budget tracking against the ₹2,000 target.
- Cost per registration only when entered spending and registrations are available.
- CSV export with safe handling for commas, quotes, and newlines.
- Rule-based Analytics and Growth Strategy agents with explainable recommendations.
- Responsive dashboard, accessible form labels, keyboard focus states, and empty states.

## Local development

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Validation and production build

```bash
npm run lint
npm run build
npm run preview
```

The production output is generated in `dist/`.

## Deploy to Vercel

Import this project into Vercel with these settings:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

Vite's static output works with the app's client-side navigation because the dashboard uses in-page views rather than server routes. No environment variables or secrets are required.

## Data and privacy limitation

This is a demo, not a production registration system. Registrations, ambassadors, and spending are stored in the browser's `localStorage` only. Data remains on the current browser and device, does not sync across devices, and can be removed by clearing browser storage. The app does not use a backend, authentication, database, external AI API, or paid service.

The Analytics Agent and Growth Strategy Agent are transparent JavaScript rules. They analyze recorded data and suggest next steps; they do not execute actions or claim to be autonomous AI.
