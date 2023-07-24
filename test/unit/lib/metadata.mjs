import { isMetadataRequest } from "../../../lib/metadata.mjs";
import { strict as assert } from "node:assert";

describe("lib/metadata", function () {
  it("isMetadataRequest", function () {
    assert.equal(isMetadataRequest({}), false);
    assert.equal(
      isMetadataRequest({
        method: "GET",
      }),
      false
    );
    assert.equal(
      isMetadataRequest({
        method: "GET",
        path: "/$metadata",
      }),
      true
    );
  });
});
