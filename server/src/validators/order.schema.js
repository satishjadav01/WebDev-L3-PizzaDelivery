import { z } from 'zod';
import { OBJECT_ID_PATTERN, ORDER_LINE_KIND, ORDER_STATUS } from '../constants/index.js';
import { MOCK_OUTCOME } from '../providers/payment/mock.provider.js';

const objectId = z.string().regex(OBJECT_ID_PATTERN, 'Invalid id');
const MAX_GATEWAY_FIELD_LENGTH = 256;

export function buildOrderSchemas({ orderConfig, inventoryConfig, appConfig }) {
  const { maxQuantityPerLine, maxLinesPerOrder } = orderConfig.limits;
  const maxCustomItems = Object.values(inventoryConfig.categories).reduce(
    (sum, rules) => sum + rules.selection.max,
    0,
  );
  const quantity = z.number().int().min(1).max(maxQuantityPerLine);

  const menuLine = z.strictObject({
    kind: z.literal(ORDER_LINE_KIND.MENU),
    pizzaId: objectId,
    quantity,
  });
  const customLine = z.strictObject({
    kind: z.literal(ORDER_LINE_KIND.CUSTOM),
    itemIds: z
      .array(objectId)
      .min(1)
      .max(maxCustomItems)
      .refine((ids) => new Set(ids).size === ids.length, 'Each option can be picked once'),
    quantity,
  });

  return {
    idParam: z.strictObject({ id: objectId }),
    placeOrder: z.strictObject({
      lines: z
        .array(z.discriminatedUnion('kind', [menuLine, customLine]))
        .min(1)
        .max(maxLinesPerOrder),
    }),
    confirmPayment: z.strictObject({
      providerPaymentId: z.string().min(1).max(MAX_GATEWAY_FIELD_LENGTH),
      signature: z.string().min(1).max(MAX_GATEWAY_FIELD_LENGTH),
    }),
    mockCheckout: z.strictObject({ outcome: z.enum(Object.values(MOCK_OUTCOME)) }),
    adminOrderList: z.strictObject({
      // One status or a comma-separated list, e.g. `status=order_received,in_kitchen`.
      status: z
        .string()
        .transform((value) => value.split(','))
        .pipe(z.array(z.enum(Object.values(ORDER_STATUS))).min(1))
        .optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(appConfig.pagination.maxPageSize).optional(),
    }),
    changeStatus: z.strictObject({ status: z.enum(Object.values(ORDER_STATUS)) }),
  };
}
