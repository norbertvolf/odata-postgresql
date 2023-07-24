/* eslint-disable node/no-unpublished-import */
import express from "express";
import pg from "pg";
import oDataHandler from "../index.mjs";

const Pool = pg.Pool;
const pool = new Pool({
  host: "/run/postgresql/.s.PGSQL.5432",
  user: "norbert",
  database: "ekome",
});

const oDataHandlerSettings = {
  pool: pool,
  schemas: ["core", "schema", "project"], //By defautl only public schema is published
  schemaTimeout: 60000, //Timeout for metadata refreshing in miliseconds
};

const app = express();

app.use("/service", (req, res, next) =>
  oDataHandler(oDataHandlerSettings, req, res, next)
);

app.use("/", (req, res) => {
  res.send(req.path);
});

app.listen(3000);
