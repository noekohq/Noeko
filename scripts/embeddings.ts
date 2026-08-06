import { parseArgs } from "node:util";
import { closeDatabaseConnection } from "../app/database/db";
import { getEmbedder } from "../app/ai/embeddings/embeddings";
import { embeddableModels, getEmbeddableModel } from "../app/ai/embeddings/models";
import { isEmbeddingCurrent } from "../app/ai/embeddings/lifecycle";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
    table: {
      type: "string",
      short: "t",
    },
    limit: {
      type: "string",
      short: "l",
    },
    batchSize: {
      type: "string",
      short: "b",
    },
    start: {
      type: "string",
    },
    force: {
      type: "boolean",
      short: "f",
    },
    dryRun: {
      type: "boolean",
    },
    reason: {
      type: "string",
    },
  },
});

const printHelp = () => {
  console.info("Usage:");
  console.info(
    "  bun run scripts/embeddings.ts status [--table idea] [--limit 1000] [--batchSize 100]"
  );
  console.info(
    "  bun run scripts/embeddings.ts mark-stale [--table idea] [--reason provider-switch]"
  );
  console.info(
    "  bun run scripts/embeddings.ts rebuild [--table idea] [--limit 1000] [--batchSize 100] [--force] [--dryRun]"
  );
  console.info("");
  console.info("Without --limit, status and rebuild process every record in the selected tables.");
};

const getSelectedModels = () => {
  if (!values.table) {
    return embeddableModels;
  }

  const model = getEmbeddableModel(values.table);
  if (!model) {
    throw new Error(`Unknown embeddable table: ${values.table}`);
  }
  return [model];
};

const getLimit = () => {
  if (values.limit === undefined) {
    return undefined;
  }
  const limit = Number(values.limit);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`Limit must be a positive integer. Received: ${values.limit}`);
  }
  return limit;
};

const getBatchSize = () => {
  const batchSize = Number(values.batchSize ?? 100);
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error(`Batch size must be a positive integer. Received: ${values.batchSize}`);
  }
  return batchSize;
};

const getStart = () => {
  const start = Number(values.start ?? 0);
  if (!Number.isInteger(start) || start < 0) {
    throw new Error(`Start must be a non-negative integer. Received: ${values.start}`);
  }
  return start;
};

const forEachRecordBatch = async (
  model: (typeof embeddableModels)[number],
  processRecord: (record: Awaited<ReturnType<typeof model.getRecords>>[number]) => Promise<void>
) => {
  const limit = getLimit();
  const batchSize = getBatchSize();
  let start = getStart();
  let processed = 0;

  while (limit === undefined || processed < limit) {
    const requested = Math.min(batchSize, limit === undefined ? batchSize : limit - processed);
    const records = await model.getRecords({ limit: requested, start });
    if (records.length === 0) {
      break;
    }

    for (const record of records) {
      await processRecord(record);
    }

    processed += records.length;
    start += records.length;
    console.info(`${model.table}: scanned=${processed}`);

    if (records.length < requested) {
      break;
    }
  }

  return processed;
};

const runStatus = async () => {
  const embedder = getEmbedder();
  for (const model of getSelectedModels()) {
    let ready = 0;
    let stale = 0;
    let failed = 0;
    let skipped = 0;

    const sampled = await forEachRecordBatch(model, async (record) => {
      const content = model.getEmbeddableContent(record);
      if (!content) {
        skipped += 1;
        return;
      }
      if (record.embeddingsStatus === "failed") {
        failed += 1;
      } else if (isEmbeddingCurrent(record, embedder, content)) {
        ready += 1;
      } else {
        stale += 1;
      }
    });

    console.info(
      `${model.table}: ready=${ready} stale=${stale} failed=${failed} skipped=${skipped} sampled=${sampled}`
    );
  }
};

const markStale = async () => {
  for (const model of getSelectedModels()) {
    await model.markStale(values.reason ?? "manual-stale");
    console.info(`${model.table}: marked embeddings stale`);
  }
};

const rebuild = async () => {
  const embedder = getEmbedder();
  const dryRun = values.dryRun ?? false;
  const force = values.force ?? false;

  for (const model of getSelectedModels()) {
    let rebuilt = 0;
    let current = 0;
    let failed = 0;
    let skipped = 0;

    const sampled = await forEachRecordBatch(model, async (record) => {
      const content = model.getEmbeddableContent(record);
      if (!content) {
        skipped += 1;
        return;
      }

      if (!force && isEmbeddingCurrent(record, embedder, content)) {
        current += 1;
        return;
      }

      if (dryRun) {
        rebuilt += 1;
        return;
      }

      try {
        const vector = await embedder.embedContent(content);
        if (!vector) {
          throw new Error("Provider returned no embedding vector.");
        }
        await model.updateEmbedding(record, embedder, content, vector);
        rebuilt += 1;
      } catch (error) {
        await model.updateEmbeddingFailure(record, embedder, content, error);
        failed += 1;
      }
    });

    console.info(
      `${model.table}: rebuilt=${rebuilt} current=${current} failed=${failed} skipped=${skipped} sampled=${sampled}${dryRun ? " dryRun=true" : ""}`
    );
  }
};

if (values.help) {
  printHelp();
  process.exit(0);
}

const action = positionals[0] ?? "status";

try {
  if (action === "status") {
    await runStatus();
  } else if (action === "mark-stale") {
    await markStale();
  } else if (action === "rebuild") {
    await rebuild();
  } else {
    printHelp();
    throw new Error(`Unknown embeddings action: ${action}`);
  }
} catch (error) {
  console.error("Embeddings command failed:", error);
  process.exitCode = 1;
} finally {
  await closeDatabaseConnection();
}
