import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const medicationParamsSchema = z.object({
  memberId: uuidSchema,
  medicationId: uuidSchema
});

export const recipientParamsSchema = z.object({
  memberId: uuidSchema,
  medicationId: uuidSchema,
  userId: uuidSchema
});

export const createRecipientSchema = z.object({
  userId: uuidSchema
}).strict();
