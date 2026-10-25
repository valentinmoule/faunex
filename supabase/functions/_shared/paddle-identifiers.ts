/** Local grants are not Paddle customers or subscriptions. */
export const isPaddleCustomerId = (value: unknown): value is string =>
  typeof value === 'string' && /^ctm_[a-z0-9]{26}$/.test(value);
export const isPaddleSubscriptionId = (value: unknown): value is string =>
  typeof value === 'string' && /^sub_[a-z0-9]{26}$/.test(value);