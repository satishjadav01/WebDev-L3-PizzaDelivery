import { ERROR_CODE, HTTP_STATUS } from '../../constants/index.js';
import { AppError } from './AppError.js';
import { ConflictError } from './httpErrors.js';

export class OutOfStockError extends ConflictError {
  constructor(shortages, message = 'Some ingredients are no longer available') {
    super(message, { shortages }, ERROR_CODE.OUT_OF_STOCK);
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor({ from, to, allowed }) {
    super(`An order cannot move from "${from}" to "${to}"`, {
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      code: ERROR_CODE.INVALID_STATUS_TRANSITION,
      details: { from, to, allowed },
    });
  }
}

export class PaymentSignatureError extends AppError {
  constructor() {
    super('Payment could not be verified', {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: ERROR_CODE.PAYMENT_SIGNATURE_INVALID,
    });
  }
}
