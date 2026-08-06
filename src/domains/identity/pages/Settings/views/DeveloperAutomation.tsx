import {
  Badge,
  Checkbox,
  Code,
  CopyButton,
  Group,
  Loader,
  Modal,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  CheckIcon,
  CodeIcon,
  CopyIcon,
  KeyIcon,
  PaperPlaneTiltIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Trans, t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useCallback, useEffect, useState } from "react";
import PaperButton from "@core/design/components/Paper/PaperButton";
import PaperCard from "@core/design/components/Paper/PaperCard";
import {
  apiScopes,
  developerApi,
  type ApiCredential,
  type ApiScope,
  type Webhook,
  type WebhookDelivery,
  type WebhookEventType,
} from "@infrastructure/api/developer";
import classes from "../Settings.module.scss";

const webhookEvents: { value: WebhookEventType; label: string }[] = [
  { value: "idea.created", label: "idea.created" },
  { value: "idea.updated", label: "idea.updated" },
  { value: "idea.deleted", label: "idea.deleted" },
  { value: "idea.processing.completed", label: "idea.processing.completed" },
  { value: "idea.processing.failed", label: "idea.processing.failed" },
  { value: "*", label: "All idea events" },
];

const messageFor = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : "Never");

export default function DeveloperAutomation() {
  const { i18n } = useLingui();
  const [credentials, setCredentials] = useState<ApiCredential[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string>();
  const [credentialModalOpen, setCredentialModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [secret, setSecret] = useState<{ label: string; value: string }>();
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>();
  const [deliveryModalTitle, setDeliveryModalTitle] = useState("");
  const [credentialName, setCredentialName] = useState("");
  const [credentialScopes, setCredentialScopes] = useState<ApiScope[]>([
    "ideas:read",
    "ideas:write",
  ]);
  const [credentialExpiration, setCredentialExpiration] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>(["idea.created"]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextCredentials, nextWebhooks] = await Promise.all([
        developerApi.listCredentials(),
        developerApi.listWebhooks(),
      ]);
      setCredentials(nextCredentials);
      setWebhooks(nextWebhooks);
    } catch (error) {
      showNotification({
        title: i18n._(t`Could not load developer settings`),
        message: messageFor(error),
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [i18n]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createCredential = async () => {
    if (!credentialName.trim() || credentialScopes.length === 0) return;
    setBusyId("create-credential");
    try {
      const created = await developerApi.createCredential({
        name: credentialName.trim(),
        scopes: credentialScopes,
        ...(credentialExpiration
          ? { expires_at: new Date(credentialExpiration).toISOString() }
          : {}),
      });
      setCredentials((current) => [created, ...current]);
      setCredentialName("");
      setCredentialExpiration("");
      setCredentialModalOpen(false);
      setSecret({ label: created.name, value: created.secret });
    } catch (error) {
      showNotification({
        title: i18n._(t`Could not create API key`),
        message: messageFor(error),
        color: "red",
      });
    } finally {
      setBusyId(undefined);
    }
  };

  const revokeCredential = async (credential: ApiCredential) => {
    setBusyId(credential.id);
    try {
      await developerApi.revokeCredential(credential.id);
      setCredentials((current) => current.filter(({ id }) => id !== credential.id));
      showNotification({
        title: i18n._(t`API key revoked`),
        message: credential.name,
        color: "green",
      });
    } catch (error) {
      showNotification({
        title: i18n._(t`Could not revoke API key`),
        message: messageFor(error),
        color: "red",
      });
    } finally {
      setBusyId(undefined);
    }
  };

  const createWebhook = async () => {
    if (!webhookUrl.trim() || selectedEvents.length === 0) return;
    setBusyId("create-webhook");
    try {
      const created = await developerApi.createWebhook({
        url: webhookUrl.trim(),
        events: selectedEvents,
      });
      setWebhooks((current) => [created, ...current]);
      setWebhookUrl("");
      setSelectedEvents(["idea.created"]);
      setWebhookModalOpen(false);
      setSecret({ label: created.url, value: created.secret });
    } catch (error) {
      showNotification({
        title: i18n._(t`Could not create webhook`),
        message: messageFor(error),
        color: "red",
      });
    } finally {
      setBusyId(undefined);
    }
  };

  const updateWebhook = async (webhook: Webhook, enabled: boolean) => {
    setBusyId(webhook.id);
    try {
      const updated = await developerApi.updateWebhook(webhook.id, { enabled });
      setWebhooks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      showNotification({
        title: i18n._(t`Could not update webhook`),
        message: messageFor(error),
        color: "red",
      });
    } finally {
      setBusyId(undefined);
    }
  };

  const deleteWebhook = async (webhook: Webhook) => {
    setBusyId(webhook.id);
    try {
      await developerApi.deleteWebhook(webhook.id);
      setWebhooks((current) => current.filter(({ id }) => id !== webhook.id));
    } catch (error) {
      showNotification({
        title: i18n._(t`Could not delete webhook`),
        message: messageFor(error),
        color: "red",
      });
    } finally {
      setBusyId(undefined);
    }
  };

  const testWebhook = async (webhook: Webhook) => {
    setBusyId(`test-${webhook.id}`);
    try {
      await developerApi.testWebhook(webhook.id);
      showNotification({
        title: i18n._(t`Test event queued`),
        message: webhook.url,
        color: "green",
      });
    } catch (error) {
      showNotification({
        title: i18n._(t`Could not queue test event`),
        message: messageFor(error),
        color: "red",
      });
    } finally {
      setBusyId(undefined);
    }
  };

  const viewDeliveries = async (webhook: Webhook) => {
    setBusyId(`deliveries-${webhook.id}`);
    try {
      setDeliveries(await developerApi.listWebhookDeliveries(webhook.id));
      setDeliveryModalTitle(webhook.url);
    } catch (error) {
      showNotification({
        title: i18n._(t`Could not load deliveries`),
        message: messageFor(error),
        color: "red",
      });
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <Stack gap="lg" className={classes.fadeIn}>
      <Stack gap="xs">
        <Title order={2}>
          <Trans>Developer & Automation</Trans>
        </Title>
        <Text c="dimmed">
          <Trans>Create scoped API keys and connect Noeko to your own automations.</Trans>
        </Text>
      </Stack>

      <PaperCard title={i18n._(t`API Keys`)} icon={KeyIcon}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            <Trans>
              Keys act with your account permissions. Copy a key when it is created; its full secret
              is never shown again.
            </Trans>
          </Text>
          <Group justify="space-between">
            <Text size="sm">
              {credentials.length} <Trans>active key(s)</Trans>
            </Text>
            <PaperButton
              leftSection={<KeyIcon weight="bold" />}
              onClick={() => setCredentialModalOpen(true)}
            >
              <Trans>Create API key</Trans>
            </PaperButton>
          </Group>
          {loading ? (
            <Loader size="sm" />
          ) : credentials.length === 0 ? (
            <Text size="sm" c="dimmed">
              <Trans>No API keys yet.</Trans>
            </Text>
          ) : (
            credentials.map((credential) => (
              <Group key={credential.id} justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={4} style={{ minWidth: 0 }}>
                  <Text fw={600}>{credential.name}</Text>
                  <Code>{credential.prefix}…</Code>
                  <Group gap={4}>
                    {credential.scopes.map((scope) => (
                      <Badge key={scope} size="sm" variant="light">
                        {scope}
                      </Badge>
                    ))}
                  </Group>
                  <Text size="xs" c="dimmed">
                    <Trans>Last used:</Trans> {formatDate(credential.last_used_at)} ·{" "}
                    <Trans>Expires:</Trans> {formatDate(credential.expires_at)}
                  </Text>
                </Stack>
                <PaperButton
                  variant="danger"
                  size="sm"
                  leftSection={<TrashIcon weight="bold" />}
                  loading={busyId === credential.id}
                  onClick={() => void revokeCredential(credential)}
                >
                  <Trans>Revoke</Trans>
                </PaperButton>
              </Group>
            ))
          )}
        </Stack>
      </PaperCard>

      <PaperCard title={i18n._(t`Webhooks`)} icon={PaperPlaneTiltIcon}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            <Trans>Receive signed notifications when your ideas change or finish processing.</Trans>
          </Text>
          <Group justify="flex-end">
            <PaperButton
              leftSection={<PaperPlaneTiltIcon weight="bold" />}
              onClick={() => setWebhookModalOpen(true)}
            >
              <Trans>Add webhook</Trans>
            </PaperButton>
          </Group>
          {loading ? (
            <Loader size="sm" />
          ) : webhooks.length === 0 ? (
            <Text size="sm" c="dimmed">
              <Trans>No webhook subscriptions yet.</Trans>
            </Text>
          ) : (
            webhooks.map((webhook) => (
              <Stack
                key={webhook.id}
                gap="xs"
                p="sm"
                style={{
                  border: "1px solid var(--mantine-color-dark-5)",
                  borderRadius: "var(--mantine-radius-md)",
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text fw={600} lineClamp={1}>
                      {webhook.url}
                    </Text>
                    <Group gap={4}>
                      {webhook.events.map((event) => (
                        <Badge key={event} size="sm" variant="light">
                          {event}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                  <Switch
                    checked={webhook.enabled}
                    onChange={(event) => void updateWebhook(webhook, event.currentTarget.checked)}
                    disabled={busyId === webhook.id}
                    aria-label={i18n._(t`Enable webhook`)}
                  />
                </Group>
                <Text size="xs" c="dimmed">
                  <Trans>Consecutive failures:</Trans> {webhook.consecutive_failures}
                </Text>
                <Group gap="xs">
                  <PaperButton
                    size="sm"
                    variant="light"
                    loading={busyId === `test-${webhook.id}`}
                    onClick={() => void testWebhook(webhook)}
                  >
                    <Trans>Send test</Trans>
                  </PaperButton>
                  <PaperButton
                    size="sm"
                    variant="light"
                    loading={busyId === `deliveries-${webhook.id}`}
                    onClick={() => void viewDeliveries(webhook)}
                  >
                    <Trans>Deliveries</Trans>
                  </PaperButton>
                  <PaperButton
                    size="sm"
                    variant="danger"
                    loading={busyId === webhook.id}
                    onClick={() => void deleteWebhook(webhook)}
                  >
                    <Trans>Delete</Trans>
                  </PaperButton>
                </Group>
              </Stack>
            ))
          )}
        </Stack>
      </PaperCard>

      <PaperCard title={i18n._(t`API reference`)} icon={CodeIcon}>
        <Text size="sm">
          <Trans>The machine-readable OpenAPI reference is available at</Trans>{" "}
          <Code>/api/v1/openapi.yaml</Code>.
        </Text>
      </PaperCard>

      <Modal
        opened={credentialModalOpen}
        onClose={() => setCredentialModalOpen(false)}
        title={i18n._(t`Create API key`)}
      >
        <Stack gap="md">
          <TextInput
            label={i18n._(t`Name`)}
            placeholder={i18n._(t`My automation`)}
            value={credentialName}
            onChange={(event) => setCredentialName(event.currentTarget.value)}
            required
          />
          <Checkbox.Group
            label={i18n._(t`Scopes`)}
            value={credentialScopes}
            onChange={(value) => setCredentialScopes(value as ApiScope[])}
          >
            <Stack mt="xs">
              {apiScopes.map((scope) => (
                <Checkbox key={scope} value={scope} label={scope} />
              ))}
            </Stack>
          </Checkbox.Group>
          <TextInput
            label={i18n._(t`Expiration (optional)`)}
            type="datetime-local"
            value={credentialExpiration}
            onChange={(event) => setCredentialExpiration(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <PaperButton variant="light" onClick={() => setCredentialModalOpen(false)}>
              <Trans>Cancel</Trans>
            </PaperButton>
            <PaperButton
              loading={busyId === "create-credential"}
              disabled={!credentialName.trim() || credentialScopes.length === 0}
              onClick={() => void createCredential()}
            >
              <Trans>Create key</Trans>
            </PaperButton>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={webhookModalOpen}
        onClose={() => setWebhookModalOpen(false)}
        title={i18n._(t`Add webhook`)}
      >
        <Stack gap="md">
          <TextInput
            label={i18n._(t`Endpoint URL`)}
            placeholder="https://automation.example.com/noeko"
            type="url"
            value={webhookUrl}
            onChange={(event) => setWebhookUrl(event.currentTarget.value)}
            required
          />
          <Checkbox.Group
            label={i18n._(t`Events`)}
            value={selectedEvents}
            onChange={(value) => setSelectedEvents(value as WebhookEventType[])}
          >
            <Stack mt="xs">
              {webhookEvents.map((event) => (
                <Checkbox key={event.value} value={event.value} label={event.label} />
              ))}
            </Stack>
          </Checkbox.Group>
          <Group justify="flex-end">
            <PaperButton variant="light" onClick={() => setWebhookModalOpen(false)}>
              <Trans>Cancel</Trans>
            </PaperButton>
            <PaperButton
              loading={busyId === "create-webhook"}
              disabled={!webhookUrl.trim() || selectedEvents.length === 0}
              onClick={() => void createWebhook()}
            >
              <Trans>Add webhook</Trans>
            </PaperButton>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!secret}
        onClose={() => setSecret(undefined)}
        title={i18n._(t`Save your secret now`)}
      >
        <Stack gap="md">
          <Text>
            <Trans>This secret will not be shown again.</Trans>
          </Text>
          <Code block>{secret?.value}</Code>
          <CopyButton value={secret?.value ?? ""}>
            {({ copied, copy }) => (
              <PaperButton
                leftSection={copied ? <CheckIcon weight="bold" /> : <CopyIcon weight="bold" />}
                onClick={copy}
              >
                {copied ? i18n._(t`Copied`) : i18n._(t`Copy secret`)}
              </PaperButton>
            )}
          </CopyButton>
          <Text size="xs" c="dimmed">
            {secret?.label}
          </Text>
        </Stack>
      </Modal>

      <Modal
        opened={!!deliveries}
        onClose={() => setDeliveries(undefined)}
        title={deliveryModalTitle}
        size="lg"
      >
        <Stack gap="sm">
          {deliveries?.length === 0 ? (
            <Text c="dimmed">
              <Trans>No deliveries yet.</Trans>
            </Text>
          ) : (
            deliveries?.map((delivery) => (
              <Stack
                key={delivery.id}
                gap={2}
                p="sm"
                style={{ borderBottom: "1px solid var(--mantine-color-dark-5)" }}
              >
                <Group justify="space-between">
                  <Badge
                    color={
                      delivery.status === "succeeded"
                        ? "green"
                        : delivery.status === "failed"
                          ? "red"
                          : "yellow"
                    }
                  >
                    {delivery.status}
                  </Badge>
                  <Text size="xs">
                    <Trans>Attempt</Trans> {delivery.attempt}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  {formatDate(delivery.created_at)}
                  {delivery.response_status ? ` · HTTP ${delivery.response_status}` : ""}
                </Text>
                {delivery.error && (
                  <Text size="xs" c="red">
                    {delivery.error}
                  </Text>
                )}
              </Stack>
            ))
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
