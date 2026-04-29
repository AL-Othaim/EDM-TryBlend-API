# Othaim Business Central API

Small Node.js app that:

1. Uses an existing Business Central bearer token.
2. Sends the token as `Authorization: Bearer <token>` to Business Central.
3. Parses the Business Central response where `value` contains a JSON string.

## Setup

```bash
npm install
copy .env.example .env
```

Edit `.env` and paste your token:

```env
ACCESS_TOKEN=your-business-central-token
```

## Run

```bash
npm start
```

Server URL:

```text
http://localhost:3000
```

## Endpoints

Retrieve and parse items JSON using the token from `.env`:

```bash
curl -X POST http://localhost:3000/items
```

Or send the token in the request instead of `.env`:

```bash
curl -X POST http://localhost:3000/items -H "Authorization: Bearer your-token"
```

Or send it in the JSON body:

```bash
curl -X POST http://localhost:3000/items -H "Content-Type: application/json" -d "{\"token\":\"your-token\"}"
```

## Notes

The Business Central URL is configured in `.env` as `BUSINESS_CENTRAL_URL`.
