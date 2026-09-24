// Error yang boleh ditampilkan ke client. Error handler di app.js mengubahnya menjadi
// response standar `{ error: { code, message, details? } }`.
export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = true;
  }
}
