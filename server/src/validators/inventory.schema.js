import { z } from 'zod';

const stockNumber = z.number().int().min(0);

export function buildInventorySchemas() {
  return {
    update: z
      .strictObject({ quantity: stockNumber.optional(), threshold: stockNumber.optional() })
      .refine(
        (body) => body.quantity !== undefined || body.threshold !== undefined,
        'Provide quantity, threshold or both',
      ),
  };
}
