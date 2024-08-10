export default class CustomError extends Error {
  status = 500;
  constructor(msg: string, status: number = 500) {
    super(msg);
    Object.setPrototypeOf(this, CustomError.prototype);
    this.status = status;
  }
}
