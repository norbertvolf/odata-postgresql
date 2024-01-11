import get from "../../../lib/get.mjs";
import db from "../../../lib/db.mjs";
import logger from "../../../lib/logger.mjs";
import { strict as assert } from "node:assert";
import sinon from "sinon";
import { REGISTRATION } from "../../../lib/const.mjs";

const sandbox = sinon.createSandbox();

describe("lib/get", function () {
  afterEach(function () {
    sandbox.restore();
  });

  it("readContentFromTable", function () {
    sandbox.stub(db, "readTableContent").returns("PROMISE");
    assert.equal(
      get.readContentFromTable("SETTINGS", {
        properties: {
          table: {
            schemaname: "SCHEMA",
            tablename: "TABLE",
          },
        },
      }),
      "PROMISE"
    );
    assert.ok(db.readTableContent.calledOnce);
    assert.ok(db.readTableContent.calledWith("SETTINGS", "SCHEMA", "TABLE"));
  });

  describe("readContent", function () {
    let registration;
    beforeEach(function () {
      sandbox
        .stub(get, "readContentFromTable")
        .returns(Promise.resolve("TABLE_CONTENT"));
      registration = {
        type: REGISTRATION.TABLE,
      };
    });

    it("missing registration", function () {
      return get.readContent("SETTINGS", null, "REQUEST").catch((err) => {
        assert.ok(err.message.match(/Invalid registration type/));
      });
    });
    it("invalid registration type", function () {
      registration.type = "INVALID";
      return get
        .readContent("SETTINGS", registration, "REQUEST")
        .catch((err) => {
          assert.ok(err.message.match(/Invalid registration type/));
        });
    });
    it("read table content successfully", function () {
      return get
        .readContent("SETTINGS", registration, "REQUEST")
        .then((result) => {
          assert.equal(result, "TABLE_CONTENT");
        });
    });
  });

  it("findRegistration", function () {
    const registrations = [
      {
        properties: {
          entitySetName: "ENTITY_SET_NAME",
        },
      },
    ];
    assert.deepEqual(
      get.findRegistration(registrations, "/ENTITY_SET_NAME"),
      registrations[0]
    );
  });

  it("isRequestFor", function () {
    const registrations = [
      {
        properties: {
          entitySetName: "ENTITY_SET_NAME",
        },
      },
    ];
    sandbox.stub(get, "findRegistration").returns("REGISTRATION");
    assert.equal(
      get.isRequestFor("SETTINGS", registrations, {
        method: "POST",
        path: "/ENTITY_SET_NAME",
      }),
      false
    );
    assert.equal(
      get.isRequestFor("SETTINGS", registrations, {
        method: "GET",
        path: "/ENTITY_SET_NAME",
      }),
      true
    );
    get.findRegistration.returns(null);
    assert.equal(
      get.isRequestFor("SETTINGS", registrations, {
        method: "GET",
        path: "/ENTITY_SET_NAME",
      }),
      false
    );
  });

  it("processError", function () {
    const next = sinon.stub();
    let err = new Error();
    get.processError(next, err);
    assert.equal(err.status, 500);
    assert.ok(next.calledOnce);
    assert.ok(next.calledWith(err));

    next.reset();
    err = new Error();
    err.status = 501;
    get.processError(next, err);
    assert.equal(err.status, 501);
    assert.ok(next.calledOnce);
    assert.ok(next.calledWith(err));
  });

  describe("generateContextUrl", function () {
    let req;
    let registration;
    beforeEach(function () {
      req = {
        protocol: "http",
        hostname: "localhost",
        path: "/ENTITY_SET_NAME",
        baseUrl: "/path/to/service",
        res: {
          socket: {
            localPort: 3000,
          },
        },
      };
      registration = {
        properties: {
          entitySetName: "ENTITY_SET_NAME",
        },
      };
    });
    it("with non-standard port", function () {
      assert.equal(
        get.generateContextUrl(registration, req),
        "http://localhost:3000/path/to/service/$metadata#ENTITY_SET_NAME"
      );
    });
    it("with standard port", function () {
      req.res.socket.localPort = 80;
      assert.equal(
        get.generateContextUrl(registration, req),
        "http://localhost/path/to/service/$metadata#ENTITY_SET_NAME"
      );
    });
  });

  describe("sendResponse", function () {
    let registration;
    let res;
    let req;
    beforeEach(function () {
      registration = {
        name: "ENTITY_SET_NAME",
      };
      res = {
        set: sinon.stub(),
        send: sinon.stub(),
      };
      req = {
        path: "/path/to/service/ENTITY_SET_NAME",
      };

      sandbox.stub(logger, "debug");
      sandbox.stub(get, "findRegistration");
      sandbox.stub(get, "readContent");
      sandbox.stub(get, "generateContextUrl").returns("CONTEXT_URL");
      sandbox.stub(get, "processError");
    });
    it("successfully send GET response", function () {
      get.readContent.returns(Promise.resolve("CONTENT"));
      get.findRegistration.returns(registration);
      return get
        .sendResponse("SETTINGS", "REGISTRATIONS", req, res, "NEXT")
        .then(() => {
          assert.ok(
            get.findRegistration.calledWithExactly("REGISTRATIONS", req.path)
          );
          assert.ok(get.findRegistration.calledOnce);
          assert.ok(
            get.readContent.calledWithExactly("SETTINGS", registration)
          );
          assert.ok(
            res.set.calledWithExactly("Content-Type", "application/json")
          );
          assert.ok(
            res.send.calledWithExactly(
              JSON.stringify({
                "@odata.context": "CONTEXT_URL",
                value: "CONTENT",
              })
            )
          );
          assert.ok(
            logger.debug.calledWithExactly(
              "Handle GET request for ENTITY_SET_NAME endpoint"
            )
          );
          assert.ok(get.processError.notCalled);
        });
    });
    it("readContent fails outside of promise", function () {
      get.readContent.throws(new Error("ERROR"));
      get.findRegistration.returns(registration);
      return get
        .sendResponse("SETTINGS", "REGISTRATIONS", req, res, "NEXT")
        .catch(() => {
          assert.ok(
            get.findRegistration.calledWithExactly("REGISTRATIONS", req.path)
          );
          assert.ok(
            get.readContent.calledWithExactly("SETTINGS", registration)
          );
          assert.ok(res.set.notCalled);
          assert.ok(res.send.notCalled);
          assert.ok(
            logger.debug.calledWithExactly(
              "Handle GET request for ENTITY_SET_NAME endpoint"
            )
          );
          assert.equal(get.processError.getCall(0).args[0], "NEXT");
          assert.equal(get.processError.getCall(0).args[1].message, "ERROR");
        });
    });
    it("promise in readContent fails", function () {
      get.readContent.returns(Promise.reject(new Error("ERROR")));
      get.findRegistration.returns(registration);
      return get
        .sendResponse("SETTINGS", "REGISTRATIONS", req, res, "NEXT")
        .catch(() => {
          assert.ok(
            get.findRegistration.calledWithExactly("REGISTRATIONS", req.path)
          );
          assert.ok(
            get.readContent.calledWithExactly("SETTINGS", registration)
          );
          assert.ok(res.set.notCalled);
          assert.ok(res.send.notCalled);
          assert.ok(
            logger.debug.calledWithExactly(
              "Handle GET request for ENTITY_SET_NAME endpoint"
            )
          );
          assert.equal(get.processError.getCall(0).args[0], "NEXT");
          assert.equal(get.processError.getCall(0).args[1].message, "ERROR");
        });
    });
    it("registration not found", function () {
      return get
        .sendResponse("SETTINGS", "REGISTRATIONS", req, res, "NEXT")
        .catch(() => {
          assert.ok(
            get.findRegistration.calledWithExactly("REGISTRATIONS", req.path)
          );
          assert.ok(get.readContent.notCalled);
          assert.ok(res.set.notCalled);
          assert.ok(res.send.notCalled);
          assert.ok(logger.debug.notCalled);
          assert.equal(get.processError.getCall(0).args[0], "NEXT");
          assert.equal(
            get.processError.getCall(0).args[1].message,
            `No registration found for ${req.path}`
          );
        });
    });
  });
});
