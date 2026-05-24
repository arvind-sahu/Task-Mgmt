import {
  EMAIL_DELIVERY_FAILED_MESSAGE,
  friendlyEmailSendErrorMessage,
} from "~/utils/emailErrors";

export { EMAIL_DELIVERY_FAILED_MESSAGE, friendlyEmailSendErrorMessage };

export class EmailDeliveryError extends Error {
  constructor(message: string = EMAIL_DELIVERY_FAILED_MESSAGE) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}
