// Error "de negocio" que se devuelve al cliente como 4xx con un código legible.
export class ApiError extends Error {
  constructor(status, code, extra = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}
