import os

# Konfigurasi dibaca dari environment variable, sama seperti backend/src/config.js di
# backend Node — supaya nilai lokal, CI, dan hosting cukup dibedakan lewat env var.
PORT = int(os.getenv("PORT", "8000"))
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "*")
