import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  AnswerLog: a
    .model({
      userId: a.string().required(),
      questionId: a.string().required(),
      isCorrect: a.boolean().required(),
      timeTakenSec: a.integer(),
      userAnswer: a.string(),
      answeredAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});