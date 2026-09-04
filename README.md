# THE FRAGRANCE UNIVERSE

A simple receipting and sales system for a perfume and air-freshener shop.

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Currency:** Ghana Cedi (GH₵)

## What you need

- Node.js 18 or newer
- Docker (recommended) **or** a local PostgreSQL database

## Start the app

From the project folder:

```bash
docker compose up -d
npm install
npm run install:all
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

The API runs at [http://localhost:4000](http://localhost:4000).

If you are not using Docker, create a PostgreSQL database and copy `backend/.env.example` to `backend/.env` with your connection string.

## Deploy on Vercel

This app needs two environment variables in the Vercel project settings:

- `DATABASE_URL` — a hosted PostgreSQL URL (Neon, Supabase, or Vercel Postgres). Localhost will not work on Vercel.
- `JWT_SECRET` — a long random string used to sign login tokens.

After those are set, redeploy. The site is the React app; `/api` runs as a serverless function and creates tables on first request.

## First run

The first time the API starts it:

- Creates the database tables
- Saves default company settings for **THE FRAGRANCE UNIVERSE**
- Adds a small sample product catalogue so you can try a sale immediately

Receipt numbers follow the date, then a daily sequence, for example `202609030001`, `202609030002`.

## Main screens

- **Dashboard** — today’s sales, stock warnings, recent receipts
- **New Sale** — search products, take payment, print or download the receipt
- **Products** — add, edit, delete, and adjust stock
- **Sales History** — search, filter, reprint, and download PDFs
- **Receipt Settings** — branding, paper size, and company signature
- **Settings** — default cashier and currency

## Receipts

Receipts can print on **80mm thermal** paper or **A4**. Use **Print receipt** for a printer, or **Download PDF** to save a file.

Company signature can be uploaded as an image or drawn on a signature pad, then turned on or off in Receipt Settings.
