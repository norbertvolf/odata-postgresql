/* eslint-disable node/no-unpublished-import */

import express from "express";
import pg from "pg";
import ODataService from "../index.mjs";

const Pool = pg.Pool;

const oDataService = new ODataService({
  logger: console, //Logger object which contains debug, info, warn and error methods (optional, disabled by default)
  pool: new Pool({
    host: "/run/postgresql/",
    database: "ekome",
  }),
});

oDataService.registerTable("core.*");
oDataService.registerTable("project.activity", "project.activity");

const app = express();

app.use("/service", (...args) => oDataService.handler(...args));
app.use("/", (req, res) => {
  res.send(req.path);
});

app.listen(3000);
