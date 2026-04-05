# PharmAudit — Pharmacy Management System

A simple, clean, and production-ready pharmacy audit MVP built for small pharmacies.

---

## Tech Stack

| Layer    | Technology                      |
|----------|---------------------------------|
| Frontend | React 18 + Vite + Tailwind CSS  |
| Backend  | Node.js + Express               |
| Database | SQLite (via better-sqlite3)     |

---

## Quick Start

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Start the backend server

```bash
npm start
# or for auto-reload during development:
npm run dev
```

The API will run at **http://localhost:3001**

---

### 3. Install frontend dependencies (in a new terminal)

```bash
cd frontend
npm install
```

### 4. Start the frontend dev server

```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Features

| Feature              | Description                                              |
|----------------------|----------------------------------------------------------|
| **Inventory**        | Add, edit, delete medicines with expiry & price tracking |
| **Sales Logging**    | Record sales, auto-reduce stock, prevent negative stock  |
| **Dashboard**        | Stats: inventory value, today's revenue/profit, alerts   |
| **Alerts**           | Expiring medicines (60 days), low stock (< 10 units)     |
| **Reports**          | Inventory & sales reports with CSV export                |
| **Search & Filter**  | Search by name/batch, filter by expiring/low stock       |

---

## Project Structure

```
audit/
├── backend/
│   ├── server.js          # Express app entry point
│   ├── database.js        # SQLite setup & schema
│   ├── package.json
│   └── routes/
│       ├── medicines.js   # CRUD for medicines
│       ├── sales.js       # Sale recording
│       └── reports.js     # Dashboard & report queries
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx        # Layout + sidebar navigation
        ├── index.css      # Tailwind + custom component classes
        └── pages/
            ├── Dashboard.jsx
            ├── Inventory.jsx
            ├── Sales.jsx
            └── Reports.jsx
```

---

## API Endpoints

| Method | Endpoint                    | Description               |
|--------|-----------------------------|---------------------------|
| GET    | /api/medicines               | List medicines            |
| POST   | /api/medicines               | Add medicine              |
| PUT    | /api/medicines/:id           | Update medicine           |
| DELETE | /api/medicines/:id           | Delete medicine           |
| GET    | /api/sales                   | List sales (filter by date) |
| POST   | /api/sales                   | Record a sale             |
| GET    | /api/reports/dashboard       | Dashboard stats           |
| GET    | /api/reports/inventory       | Full inventory report     |
| GET    | /api/reports/sales           | Sales report (date range) |

---

## Currency

Prices are displayed in **PKR (Pakistani Rupees)**. To change the currency, update the `fmt()` helper functions in the frontend pages (`en-PK` locale, `PKR` currency code).
