-- SurrealDB v3 rejects FLEXIBLE fields on SCHEMALESS tables. These fields
-- already accept arbitrary data because their tables are schemaless.
DEFINE FIELD OVERWRITE configuration ON TABLE spyglass_run TYPE object;
DEFINE FIELD OVERWRITE findings ON TABLE spyglass_run TYPE array;
DEFINE FIELD OVERWRITE resources ON TABLE spyglass_run TYPE array;
DEFINE FIELD OVERWRITE fullResults ON TABLE spyglass_run TYPE array;
DEFINE FIELD OVERWRITE intent ON TABLE spyglass_run TYPE option<object>;
DEFINE FIELD OVERWRITE data ON TABLE spyglass_run_event TYPE any;

-- SurrealDB v3 enforces nested fields on SCHEMAFULL tables during import.
DEFINE FIELD OVERWRITE settings ON TABLE user TYPE option<object>;
DEFINE FIELD OVERWRITE settings.* ON TABLE user TYPE any;
