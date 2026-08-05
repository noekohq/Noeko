export const defineAutomationSchema = `
  DEFINE TABLE IF NOT EXISTS api_credential SCHEMALESS;
  DEFINE FIELD IF NOT EXISTS userId ON TABLE api_credential TYPE record<user>;
  DEFINE FIELD IF NOT EXISTS name ON TABLE api_credential TYPE string;
  DEFINE FIELD IF NOT EXISTS prefix ON TABLE api_credential TYPE string;
  DEFINE FIELD IF NOT EXISTS secretHash ON TABLE api_credential TYPE string;
  DEFINE FIELD IF NOT EXISTS scopes ON TABLE api_credential TYPE array<string>;
  DEFINE FIELD IF NOT EXISTS createdAt ON TABLE api_credential TYPE datetime;
  DEFINE FIELD IF NOT EXISTS lastUsedAt ON TABLE api_credential TYPE option<datetime>;
  DEFINE FIELD IF NOT EXISTS expiresAt ON TABLE api_credential TYPE option<datetime>;
  DEFINE FIELD IF NOT EXISTS revokedAt ON TABLE api_credential TYPE option<datetime>;
  DEFINE INDEX IF NOT EXISTS api_credential_hash ON TABLE api_credential COLUMNS secretHash UNIQUE;
  DEFINE INDEX IF NOT EXISTS api_credential_user ON TABLE api_credential COLUMNS userId, createdAt;

  DEFINE TABLE IF NOT EXISTS domain_event SCHEMALESS;
  DEFINE FIELD IF NOT EXISTS type ON TABLE domain_event TYPE string;
  DEFINE FIELD IF NOT EXISTS version ON TABLE domain_event TYPE int;
  DEFINE FIELD IF NOT EXISTS userId ON TABLE domain_event TYPE record<user>;
  DEFINE FIELD IF NOT EXISTS actorType ON TABLE domain_event TYPE string;
  DEFINE FIELD IF NOT EXISTS actorId ON TABLE domain_event TYPE option<string>;
  DEFINE FIELD IF NOT EXISTS resourceType ON TABLE domain_event TYPE string;
  DEFINE FIELD IF NOT EXISTS resourceId ON TABLE domain_event TYPE string;
  DEFINE FIELD IF NOT EXISTS data ON TABLE domain_event TYPE object;
  DEFINE FIELD IF NOT EXISTS status ON TABLE domain_event TYPE string;
  DEFINE FIELD IF NOT EXISTS attempt ON TABLE domain_event TYPE int;
  DEFINE FIELD IF NOT EXISTS createdAt ON TABLE domain_event TYPE datetime;
  DEFINE FIELD IF NOT EXISTS dispatchedAt ON TABLE domain_event TYPE option<datetime>;
  DEFINE FIELD IF NOT EXISTS leaseOwner ON TABLE domain_event TYPE option<string>;
  DEFINE FIELD IF NOT EXISTS leaseExpiresAt ON TABLE domain_event TYPE option<datetime>;
  DEFINE INDEX IF NOT EXISTS domain_event_dispatch ON TABLE domain_event COLUMNS status, leaseExpiresAt, createdAt;
  DEFINE INDEX IF NOT EXISTS domain_event_user ON TABLE domain_event COLUMNS userId, createdAt;

  DEFINE TABLE IF NOT EXISTS webhook SCHEMALESS;
  DEFINE FIELD IF NOT EXISTS userId ON TABLE webhook TYPE record<user>;
  DEFINE FIELD IF NOT EXISTS url ON TABLE webhook TYPE string;
  DEFINE FIELD IF NOT EXISTS events ON TABLE webhook TYPE array<string>;
  DEFINE FIELD IF NOT EXISTS encryptedSecret ON TABLE webhook TYPE string;
  DEFINE FIELD IF NOT EXISTS enabled ON TABLE webhook TYPE bool;
  DEFINE FIELD IF NOT EXISTS consecutiveFailures ON TABLE webhook TYPE int;
  DEFINE FIELD IF NOT EXISTS createdAt ON TABLE webhook TYPE datetime;
  DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE webhook TYPE datetime;
  DEFINE FIELD IF NOT EXISTS disabledAt ON TABLE webhook TYPE option<datetime>;
  DEFINE INDEX IF NOT EXISTS webhook_user ON TABLE webhook COLUMNS userId, createdAt;

  DEFINE TABLE IF NOT EXISTS webhook_delivery SCHEMALESS;
  DEFINE FIELD IF NOT EXISTS webhookId ON TABLE webhook_delivery TYPE record<webhook>;
  DEFINE FIELD IF NOT EXISTS eventId ON TABLE webhook_delivery TYPE record<domain_event>;
  DEFINE FIELD IF NOT EXISTS status ON TABLE webhook_delivery TYPE string;
  DEFINE FIELD IF NOT EXISTS attempt ON TABLE webhook_delivery TYPE int;
  DEFINE FIELD IF NOT EXISTS nextAttemptAt ON TABLE webhook_delivery TYPE datetime;
  DEFINE FIELD IF NOT EXISTS createdAt ON TABLE webhook_delivery TYPE datetime;
  DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE webhook_delivery TYPE datetime;
  DEFINE FIELD IF NOT EXISTS deliveredAt ON TABLE webhook_delivery TYPE option<datetime>;
  DEFINE FIELD IF NOT EXISTS responseStatus ON TABLE webhook_delivery TYPE option<int>;
  DEFINE FIELD IF NOT EXISTS error ON TABLE webhook_delivery TYPE option<string>;
  DEFINE FIELD IF NOT EXISTS leaseOwner ON TABLE webhook_delivery TYPE option<string>;
  DEFINE FIELD IF NOT EXISTS leaseExpiresAt ON TABLE webhook_delivery TYPE option<datetime>;
  DEFINE INDEX IF NOT EXISTS webhook_delivery_unique ON TABLE webhook_delivery COLUMNS webhookId, eventId UNIQUE;
  DEFINE INDEX IF NOT EXISTS webhook_delivery_claim ON TABLE webhook_delivery COLUMNS status, nextAttemptAt, leaseExpiresAt;
`;

export const removeAutomationSchema = `
  REMOVE TABLE webhook_delivery;
  REMOVE TABLE webhook;
  REMOVE TABLE domain_event;
  REMOVE TABLE api_credential;
`;
