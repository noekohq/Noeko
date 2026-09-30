import { migration as createSchemaMigration } from "./20260629233000_create_schema_migration";
import { migration as addSchemaMigrationMetadata } from "./20260629233100_add_schema_migration_metadata";
import { migration as addEmbeddingMetadataFields } from "./20260714120000_add_embedding_metadata_fields";
import { migration as addSpyglassRuns } from "./20260728120000_add_spyglass_runs";
import { migration as addAutomation } from "./20260803200000_add_automation";
import { migration as addOrganizations } from "./20260804130000_add_organizations";
import { migration as fixUserTokenDatetimes } from "./20260804223500_fix_user_token_datetimes";
import { migration as improveRabbitholes } from "./20260805010000_improve_rabbitholes";
import { migration as addRabbitholeEvaluationJobs } from "./20260805020000_add_rabbithole_evaluation_jobs";
import { migration as addRabbitholeGeneratedContext } from "./20260805030000_add_rabbithole_generated_context";
import { migration as addOrganizationInvitations } from "./20260805130000_add_organization_invitations";
import type { Migration } from "./types";

export const migrations: Migration[] = [
  createSchemaMigration,
  addSchemaMigrationMetadata,
  addEmbeddingMetadataFields,
  addSpyglassRuns,
  addAutomation,
  addOrganizations,
  fixUserTokenDatetimes,
  improveRabbitholes,
  addRabbitholeEvaluationJobs,
  addRabbitholeGeneratedContext,
  addOrganizationInvitations,
].sort((a, b) => a.id.localeCompare(b.id));
