import { Static, Type } from '@sinclair/typebox';

export const CreateLeadSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  message: Type.Optional(Type.String()),
});

export type CreateLeadType = Static<typeof CreateLeadSchema>;
