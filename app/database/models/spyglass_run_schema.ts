export const defineSpyglassRunSchema = `
  DEFINE TABLE IF NOT EXISTS spyglass_run SCHEMALESS;
  DEFINE FIELD IF NOT EXISTS userId ON TABLE spyglass_run TYPE record<user>;
  DEFINE FIELD IF NOT EXISTS query ON TABLE spyglass_run TYPE string;
  DEFINE FIELD IF NOT EXISTS profile ON TABLE spyglass_run TYPE string;
  DEFINE FIELD IF NOT EXISTS configuration ON TABLE spyglass_run FLEXIBLE TYPE object;
  DEFINE FIELD IF NOT EXISTS status ON TABLE spyglass_run TYPE string;
  DEFINE FIELD IF NOT EXISTS phase ON TABLE spyglass_run TYPE string;
  DEFINE FIELD IF NOT EXISTS cancellationRequested ON TABLE spyglass_run TYPE bool;
  DEFINE FIELD IF NOT EXISTS attempt ON TABLE spyglass_run TYPE int;
  DEFINE FIELD IF NOT EXISTS lastEventSequence ON TABLE spyglass_run TYPE int;
  DEFINE FIELD IF NOT EXISTS overview ON TABLE spyglass_run TYPE string;
  DEFINE FIELD IF NOT EXISTS findings ON TABLE spyglass_run FLEXIBLE TYPE array;
  DEFINE FIELD IF NOT EXISTS resources ON TABLE spyglass_run FLEXIBLE TYPE array;
  DEFINE FIELD IF NOT EXISTS fullResults ON TABLE spyglass_run FLEXIBLE TYPE array;
  DEFINE FIELD IF NOT EXISTS createdAt ON TABLE spyglass_run TYPE datetime;
  DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE spyglass_run TYPE datetime;
  DEFINE FIELD IF NOT EXISTS startedAt ON TABLE spyglass_run TYPE option<datetime>;
  DEFINE FIELD IF NOT EXISTS completedAt ON TABLE spyglass_run TYPE option<datetime>;
  DEFINE FIELD IF NOT EXISTS failedAt ON TABLE spyglass_run TYPE option<datetime>;
  DEFINE FIELD IF NOT EXISTS cancelledAt ON TABLE spyglass_run TYPE option<datetime>;
  DEFINE FIELD IF NOT EXISTS leaseOwner ON TABLE spyglass_run TYPE option<string>;
  DEFINE FIELD IF NOT EXISTS leaseExpiresAt ON TABLE spyglass_run TYPE option<datetime>;
  DEFINE FIELD IF NOT EXISTS intent ON TABLE spyglass_run FLEXIBLE TYPE option<object>;
  DEFINE FIELD IF NOT EXISTS error ON TABLE spyglass_run TYPE option<string>;
  DEFINE INDEX IF NOT EXISTS spyglass_run_user_created ON TABLE spyglass_run COLUMNS userId, createdAt;
  DEFINE INDEX IF NOT EXISTS spyglass_run_status_lease ON TABLE spyglass_run COLUMNS status, leaseExpiresAt;

  DEFINE TABLE IF NOT EXISTS spyglass_run_event SCHEMALESS;
  DEFINE FIELD IF NOT EXISTS runId ON TABLE spyglass_run_event TYPE record<spyglass_run>;
  DEFINE FIELD IF NOT EXISTS sequence ON TABLE spyglass_run_event TYPE int;
  DEFINE FIELD IF NOT EXISTS type ON TABLE spyglass_run_event TYPE string;
  DEFINE FIELD IF NOT EXISTS data ON TABLE spyglass_run_event FLEXIBLE TYPE any;
  DEFINE FIELD IF NOT EXISTS createdAt ON TABLE spyglass_run_event TYPE datetime;
  DEFINE INDEX IF NOT EXISTS spyglass_run_event_sequence ON TABLE spyglass_run_event COLUMNS runId, sequence UNIQUE;

  DEFINE FUNCTION OVERWRITE fn::append_spyglass_run_event(
    $runId: record<spyglass_run>,
    $type: string,
    $data: any
  ) {
    LET $run = (SELECT * FROM ONLY $runId);
    LET $sequence = $run.lastEventSequence + 1;
    CREATE spyglass_run_event CONTENT {
      runId: $runId,
      sequence: $sequence,
      type: $type,
      data: $data,
      createdAt: time::now()
    };
    UPDATE $runId SET
      lastEventSequence = $sequence,
      updatedAt = time::now();
    RETURN $sequence;
  };
`;

export const removeSpyglassRunSchema = `
  REMOVE FUNCTION fn::append_spyglass_run_event;
  REMOVE TABLE spyglass_run_event;
  REMOVE TABLE spyglass_run;
`;
