import logger from "./logger.mjs";
import _ from "lodash";
import { tableEntitySetName } from "./name.mjs";

export function isRequestFor(settings, registrations, req) {
  return req.method === "GET" && req.path === "/";
}

export function sendResponse(settings, registrations, req, res) {
  const metadataContext = `${req.protocol}://${req.get("host")}${
    req.originalUrl
  }/$metadata`;
  logger.debug("Handle root request");
  res.json({
    "@odata.context": metadataContext,
    value: _.map(registrations, (registration) => {
      const entitySetName = tableEntitySetName(
        settings,
        registration.properties.table.schemaname,
        registration.properties.table.tablename
      );
      return {
        name: entitySetName,
        kind: "EntitySet",
        url: entitySetName,
      };
    }),
  });
}
