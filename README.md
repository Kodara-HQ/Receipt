# EVERY FRAGRANCE

A simple receipting and sales system for a perfume and air-freshener shop.

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** PHP 8.2+
- **Data:** JSON file (`backend/data/store.json`) — no MySQL or phpMyAdmin
- **Currency:** Ghana Cedi (GH₵)

## What you need

- PHP 8.2 or newer
- Node.js 18 or newer (for the React app)

No database server is required. Login still uses a username and password; the account is stored in the JSON file.

## Start the app

Copy `backend/.env.example` to `backend/.env` if you do not already have one.

```bash
npm install
npm run install:all
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

- React app: [http://localhost:5173](http://localhost:5173)
- PHP API: [http://localhost:4000](http://localhost:4000)

Login: `admin` / `admin1234`.

Products, receipts, users, and settings are saved in `backend/data/store.json` the first time you use the app.
