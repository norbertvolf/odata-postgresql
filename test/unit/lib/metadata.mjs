import metadata from "../../../lib/metadata.mjs";
import logger from "../../../lib/logger.mjs";
import { strict as assert } from "node:assert";
import sinon from "sinon";

const sandbox = sinon.createSandbox();

describe("lib/metadata", function () {
  afterEach(function () {
    sandbox.restore();
  });

  it("isRequestFor", function () {
    assert.equal(metadata.isRequestFor("SETTINGS", "REGISTRATIONS", {}), false);
    assert.equal(
      metadata.isRequestFor("SETTINGS", "REGISTRATIONS", {
        method: "GET",
      }),
      false
    );
    assert.equal(
      metadata.isRequestFor("SETTINGS", "REGISTRATIONS", {
        method: "GET",
        path: "/$metadata",
      }),
      true
    );
  });

  describe("sendResponse", function () {
    let res;
    beforeEach(function () {
      sandbox.stub(logger, "debug");
      sandbox.stub(logger, "error");
      sandbox.stub(metadata, "buildDataservices").returns({
        service: [],
      });
      res = {
        set: sinon.stub(),
        send: sinon.stub(),
      };
    });

    it("successfully send metadata", function () {
      metadata.sendResponse("SETTINGS", "REGISTRATIONS", "REQ", res, "NEXT");
      assert.ok(logger.debug.calledWithExactly("Handle metadata request"));
      assert.ok(
        metadata.buildDataservices.calledWithExactly(
          "SETTINGS",
          "REGISTRATIONS"
        )
      );
      assert.ok(res.set.calledWithExactly("Content-Type", "text/xml"));
      assert.ok(res.send.getCall(0).args, ["<service></service>"]);
    });

    it("successfully send metadata", function () {
      const next = sinon.stub();
      const raisedError = new Error("ERROR");
      metadata.buildDataservices.throws(raisedError);
      metadata.sendResponse("SETTINGS", "REGISTRATIONS", "REQ", res, next);
      assert.ok(logger.debug.calledWithExactly("Handle metadata request"));
      assert.ok(
        metadata.buildDataservices.calledWithExactly(
          "SETTINGS",
          "REGISTRATIONS"
        )
      );
      assert.ok(res.set.calledWithExactly("Content-Type", "text/xml"));
      assert.ok(res.send.notCalled);
      assert.ok(logger.error.calledWithExactly(raisedError));
      assert.ok(next.calledWithExactly(raisedError));
      assert.equal(raisedError.status, 500);
    });
  });
});
