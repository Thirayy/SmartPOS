# Backend configuration

The backend reads its settings from `backend/.env`, regardless of the process
working directory. If `.env` does not exist, create it from the template:

```bash
cd backend
cp .env.example .env
```

Then edit `.env` and set a real PostgreSQL connection URL and a private random
`SECRET_KEY` of at least 32 characters. Keep `.env` private; it is excluded
from Git. The backend reports a clear setup message when required values are
missing.

AI analysis uses `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`. Configure an
OpenAI-compatible chat-completions provider. When the key is missing or the
provider is unavailable, the endpoint returns an explicit service error instead
of fabricated analysis.

`CORS_ORIGINS` is a JSON array, for example
`["http://localhost:3000"]`. All application records, including uploaded
profile photos, are persisted through the configured PostgreSQL database.
