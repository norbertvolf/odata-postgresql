import logger from "./logger.mjs";
import _ from "lodash";

export function handleQuery(settings, queryHandler) {
  let pgClient;
  logger.debug("Request database connection from pool");
  return settings.pool
    .connect()
    .then((pgClientFromPool) => {
      pgClient = pgClientFromPool;
      return queryHandler(pgClient);
    })
    .finally(() => {
      logger.debug("Release database connection");
      pgClient.release();
    });
}

export function readTableList(settings) {
  return handleQuery(settings, (pgClient) => {
    logger.debug("Read list of tables");
    return pgClient.query({
      text: "SELECT schemaname, tablename FROM pg_tables",
    });
  }).then((result) => result.rows);
}

export function readTableDefinition(settings, schema, table) {
  return handleQuery(settings, (pgClient) => {
    logger.debug(
      `Read definition of table "${table}" from database schema "${schema}"`
    );
    return pgClient.query(
      "SELECT * FROM information_schema.columns where  table_schema = $1 AND table_name = $2 ORDER BY ordinal_position",
      [schema, table]
    );
  }).then((result) => result.rows);
}

export function readTableKeys(settings, schema, table) {
  return handleQuery(settings, (pgClient) => {
    logger.debug(
      `Read keys of table "${table}" from database schema "${schema}"`
    );
    return pgClient.query(
      `
          SElECT  kcu.column_name
                   FROM information_schema.key_column_usage kcu
                   JOIN information_schema.table_constraints tc
                       ON tc.constraint_name = kcu.constraint_name
                          AND tc.table_name  = kcu.table_name
                          AND tc.table_schema  = kcu.table_schema
                          AND tc.table_catalog  = kcu.table_catalog
                   JOIN information_schema.columns c
                       ON c.column_name = kcu.column_name
                          AND c.table_name  = tc.table_name
                          AND c.table_schema  = tc.table_schema
                          AND c.table_catalog  = tc.table_catalog
                   WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND tc.table_schema = $1
                      AND tc.table_name = $2
      `,
      [schema, table]
    );
  }).then((result) => result.rows);
}

export function readDatabaseName(settings) {
  return handleQuery(settings, (pgClient) => {
    logger.debug("Read databasename");
    return pgClient.query("SELECT current_database() as databasename");
  }).then((result) => {
    return _.reduce(result.rows, (acc, row) => row.databasename, "");
  });
}
