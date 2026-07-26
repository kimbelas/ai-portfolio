# Developer API

Acme offers a REST API. Create an API key under Settings → Developer; keys can be scoped read-only or read-write.

The API is rate limited to 1000 requests per hour per key. Exceeding the limit returns HTTP 429.

Endpoints cover listing backups, triggering a manual backup, and restoring a file.
