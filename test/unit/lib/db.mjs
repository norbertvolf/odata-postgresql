import db from "../../../lib/db.mjs";
import logger from "../../../lib/logger.mjs";
import { strict as assert } from "node:assert";
import sinon from "sinon";

const sandbox = sinon.createSandbox();

describe("lib/db", function () {
  afterEach(function () {
    sandbox.restore();
  });

  it("readTableContent", function () {
    const pgClient = {
      query: sinon.stub().returns("QUERY"),
    };
    sandbox.stub(logger, "debug");
    sandbox.stub(db, "handleQuery").returns(Promise.resolve({ rows: "ROWS" }));

    return db
      .readTableContent("SETTINGS", "SCHEMA_NAME", "TABLE_NAME")
      .then((result) => {
        assert.equal(result, "ROWS");
        assert.equal(db.handleQuery.getCall(0).args[0], "SETTINGS");
        assert.equal(db.handleQuery.getCall(0).args[1](pgClient), "QUERY");
        assert.ok(
          pgClient.query.calledWith({
            text: "SELECT * FROM SCHEMA_NAME.TABLE_NAME",
          })
        );
      });
  });
});
