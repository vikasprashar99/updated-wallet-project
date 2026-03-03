# Full-Stack Wallet System - HighLevel

This repository contains the full-stack implementation of a wallet system. The application includes a Node.js/Express backend API and a React/Vite frontend UI.

---

## Live Demo

* **Frontend Application:** `https://wallet-project-highlevel.vercel.app`
* **Backend API Base URL:** `https://wallet-project-highlevel.onrender.com`

## Note
While accessing the application with deployed link, the first API call may take up to 1 minute as the API is deployed through Render’s free plan. It goes into sleep mode due to inactivity, but all subsequent calls will be fast and responsive.

---

## a. API Endpoints

All endpoints are relative to the base URL mentioned above.

### 1. Setup a New Wallet

Initializes a new wallet with a starting balance and creates the first transaction record.

* **URL:** `/setup`
* **Method:** `POST`
* **Request Body:**
    ```json
    {
      "name": "My Test Wallet",
      "balance": 150.7500
    }
    ```
* **Success Response (200 OK):**
    ```json
    {
      "id": "64e8b3f2c1d3a4b5c6d7e8f9",
      "balance": "150.7500",
      "transactionId": "64e8b3f2c1d3a4b5c6d7e8fa",
      "name": "My Test Wallet",
      "date": "2023-08-25T12:00:00.000Z"
    }
    ```

### 2. Create a Transaction (Credit/Debit)

Credits or debits a specified amount to/from a wallet. A positive amount is a credit, and a negative amount is a debit.

* **URL:** `/transact/:walletId`
* **Method:** `POST`
* **URL Parameters:**
    * `walletId` (string, required): The ID of the wallet to transact with.
* **Request Body:**
    ```json
    {
      "amount": -25.50,
      "description": "Coffee purchase"
    }
    ```
* **Success Response (200 OK):**
    ```json
    {
      "balance": "125.2500",
      "transactionId": "64e8b4a0c1d3a4b5c6d7e8fb"
    }
    ```

### 3. Fetch Wallet Transactions

Retrieves a paginated and sortable list of transactions for a specific wallet.

* **URL:** `/transactions`
* **Method:** `GET`
* **Query Parameters:**
    * `walletId` (string, required): The ID of the wallet.
    * `skip` (number, optional, default: 0): The number of transactions to skip for pagination.
    * `limit` (number, optional, default: 10): The maximum number of transactions to return.
    * `sortBy` (string, optional, default: 'date'): The field to sort by (`date` or `amount`).
    * `order` (string, optional, default: 'desc'): The sort order (`asc` or `desc`).
* **Sample Query:**
    `/transactions?walletId=64e8b3f2c1d3a4b5c6d7e8f9&skip=0&limit=5&sortBy=date&order=desc`
* **Success Response (200 OK):**
    ```json
    [
      {
        "id": "64e8b4a0c1d3a4b5c6d7e8fb",
        "walletId": "64e8b3f2c1d3a4b5c6d7e8f9",
        "amount": "25.5000",
        "balance": "125.2500",
        "description": "Coffee purchase",
        "date": "2023-08-25T12:05:00.000Z",
        "type": "DEBIT"
      },
      {
        "id": "64e8b3f2c1d3a4b5c6d7e8fa",
        "walletId": "64e8b3f2c1d3a4b5c6d7e8f9",
        "amount": "150.7500",
        "balance": "150.7500",
        "description": "Setup",
        "date": "2023-08-25T12:00:00.000Z",
        "type": "CREDIT"
      }
    ]
    ```

### 4. Get Wallet Details

Fetches the details of a single wallet by its ID.

* **URL:** `/wallet/:id`
* **Method:** `GET`
* **URL Parameters:**
    * `id` (string, required): The ID of the wallet.
* **Success Response (200 OK):**
    ```json
    {
      "id": "64e8b3f2c1d3a4b5c6d7e8f9",
      "balance": "125.2500",
      "name": "My Test Wallet",
      "date": "2023-08-25T12:00:00.000Z"
    }
    ```

---

## b. Setup Instructions

This project is a monorepo containing both the backend and frontend.

### Prerequisites

* Node.js (v22 or later)

### Local Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/vikasprashar99/wallet-project-highlevel.git
    cd wallet-project-highlevel
    ```

2.  **Install dependencies and start the backend:**
    ```bash
    # Install all dependencies (backend + frontend)
    npm install

    # Start the backend server (uses SQLite database)
    npm run start:backend
    ```
    The API will be running at `http://localhost:3000`.

3.  **Setup the Frontend:**
    Open a **new terminal window**.
    ```bash
    # Navigate to the frontend directory from the root
    cd frontend

    # Install dependencies
    npm install

    # Create a .env file in the /frontend directory
    touch .env
    ```
    Add the following content to `.env` file:
    ```
    VITE_API_URL=http://localhost:3000
    ```
    ```bash
    # Start the frontend development server
    npm run dev
    ```
    The React application will be available at `http://localhost:5173`.

### 4. Run Unit Tests (Backend)

The backend uses Vitest for unit testing. You can run the tests using the following command:

```bash
cd backend
npm test
```

---

## API Testing with cURL

Here are some cURL commands to test the API endpoints. Make sure the backend server is running (`npm run start:backend`).

### 1. Setup a New Wallet

```bash
curl -X POST http://localhost:3000/setup \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Wallet", "balance": 100.50}'
```

**Expected Response:**
```json
{
  "id": "<wallet-id>",
  "balance": "100.5000",
  "transactionId": "<transaction-id>",
  "name": "Test Wallet",
  "date": "<timestamp>"
}
```

> **Note:** Copy the `id` from the response to use in the following commands.

### 2. Credit Transaction (Add Money)

```bash
curl -X POST http://localhost:3000/transact/<wallet-id> \
  -H "Content-Type: application/json" \
  -d '{"amount": 50.00, "description": "Deposit"}'
```

### 3. Debit Transaction (Withdraw Money)

```bash
curl -X POST http://localhost:3000/transact/<wallet-id> \
  -H "Content-Type: application/json" \
  -d '{"amount": -25.00, "description": "ATM Withdrawal"}'
```

### 4. Get Wallet Details

```bash
curl http://localhost:3000/wallet/<wallet-id>
```

### 5. Get All Transactions for a Wallet

```bash
curl "http://localhost:3000/transactions?walletId=<wallet-id>&skip=0&limit=10&sortBy=date&order=desc"
```

### Quick Test Script

Run this script to test all endpoints sequentially (replace `<wallet-id>` after the first command):

```bash
# 1. Create wallet and capture the ID
WALLET_ID=$(curl -s -X POST http://localhost:3000/setup \
  -H "Content-Type: application/json" \
  -d '{"name": "Quick Test Wallet", "balance": 500}' | jq -r '.id')

echo "Created Wallet ID: $WALLET_ID"

# 2. Credit transaction
curl -s -X POST "http://localhost:3000/transact/$WALLET_ID" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "description": "Salary"}' | jq

# 3. Debit transaction
curl -s -X POST "http://localhost:3000/transact/$WALLET_ID" \
  -H "Content-Type: application/json" \
  -d '{"amount": -50, "description": "Groceries"}' | jq

# 4. Get wallet details
curl -s "http://localhost:3000/wallet/$WALLET_ID" | jq

# 5. Get all transactions
curl -s "http://localhost:3000/transactions?walletId=$WALLET_ID" | jq
```

---

## c. Database and Query Design

### Database Choice: SQLite (with Prisma ORM)

SQLite is used as the database for its simplicity, zero-configuration setup, and perfect fit for local development and small-to-medium scale applications. Prisma ORM provides type-safe database access and handles migrations seamlessly.

### Schema Design

Two main models were designed:

1.  **Wallet:** Stores the wallet's `name`, `balance`, and creation `date`.
    * **Precision:** The `balance` field uses `Float` type, which provides sufficient precision for financial calculations up to 4 decimal places.

2.  **Transaction:** Stores details of each transaction, including `walletId`, `amount`, `description`, `type` ('CREDIT'/'DEBIT'), and the resulting `balance` of the wallet *after* the transaction.

### Query Design & Race Condition Handling

The most critical aspect of the query design was preventing race conditions, where two simultaneous transactions could corrupt the wallet's balance.

* **Atomic Operations:** This is handled in the `/transact/:walletId` endpoint by using Prisma's atomic update with `increment`.
    ```javascript
    await tx.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } });
    ```
    This single command tells the database to perform the find-and-modify operation as one step. It prevents the application from reading a stale balance, performing a calculation, and writing an incorrect result. This single command tells the database to perform the find-and-modify operation as one step. It prevents the application from reading a stale balance, performing a calculation, and writing an incorrect result.

* **Database Transactions:** This makes sure that either both actions are completed successfully or neither one happens, so we don’t end up with a wallet or transaction left hanging on its own.
