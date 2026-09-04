# THE FRAGRANCE UNIVERSE

A simple receipting and sales system for a perfume and air-freshener shop.

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** PHP 8.2+
- **Database:** MySQL / MariaDB (XAMPP + phpMyAdmin)
- **Currency:** Ghana Cedi (GH₵)

## What you need

- [XAMPP](https://www.apachefriends.org/) (Apache + MySQL + phpMyAdmin)
- Node.js 18 or newer (for the React app)
- PHP 8.2 or newer with `pdo_mysql` (XAMPP includes this)

## Set up the database in phpMyAdmin

1. Open the **XAMPP Control Panel** and start **Apache** and **MySQL**.
2. Open [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
3. Click **Import**.
4. Choose `backend/schema.sql` from this project and click **Import**.

That creates the `fragrance_universe` database and tables. You can also leave this step out: the API will create the database on first request if MySQL is running.

Default XAMPP login for MySQL is user `root` with an empty password.

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
- phpMyAdmin: [http://localhost/phpmyadmin](http://localhost/phpmyadmin)

Login: `admin` / `admin1234`.

If you set a MySQL password in XAMPP, put it in `backend/.env` as `DB_PASSWORD`.
