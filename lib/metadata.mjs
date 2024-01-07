import logger from "./logger.mjs";
import { tableEntitySetName } from "./name.mjs";
import { buildEntityType } from "./metadata/entityType.mjs";
import xml from "xml";
import _ from "lodash";

const moduleExports = {};

moduleExports.buildEntityContainer = function (settings, registrations) {
  return [
    {
      EntityContainer: [
        {
          _attr: {
            Name: "Container",
          },
        },
      ].concat(
        registrations.map((registration) => ({
          EntitySet: [
            {
              _attr: {
                Name: tableEntitySetName(
                  settings,
                  registration.properties.table.schemaname,
                  registration.properties.table.tablename
                ),
                EntityType: `${registration.properties.table.schemaname}.${registration.properties.table.tablename}`,
              },
            },
          ],
        }))
      ),
    },
  ];
};

moduleExports.buildSchema = function (settings, schemaName, registrations) {
  return {
    Schema: [
      {
        _attr: {
          xmlns: "http://docs.oasis-open.org/odata/ns/edm",
          Namespace: schemaName,
        },
      },
    ].concat(
      _.filter(
        registrations,
        (registration) =>
          registration.properties.table.schemaname === schemaName
      ).map((registration) => buildEntityType(settings, registration))
    ),
  };
};

moduleExports.buildSchemas = function (settings, registrations) {
  return _.chain(registrations)
    .reduce(
      (acc, registration) =>
        _.assign(acc, { [registration.properties.table.schemaname]: true }),
      {}
    )
    .keys()
    .map((schemaName, index) => {
      const schemaDefinition = moduleExports.buildSchema(
        settings,
        schemaName,
        registrations
      );
      if (index === 0) {
        schemaDefinition.Schema.push(
          ...moduleExports.buildEntityContainer(settings, registrations)
        );
      }

      return schemaDefinition;
    })
    .value();
};

moduleExports.buildDataservices = function (settings, registrations) {
  return {
    "edmx:Edmx": [
      {
        _attr: {
          "xmlns:edmx": "http://docs.oasis-open.org/odata/ns/edmx",
          Version: "4.0",
        },
      },
      {
        "edmx:DataServices": moduleExports.buildSchemas(
          settings,
          registrations
        ),
      },
    ],
  };
};

/**
 * Determine if the request is possible to process by this module.
 *
 * @param {object} settings - the global settings object
 * @param {object[]} registrations - the registrations to build the metadata
 * @param {object} req - the request object from express
 *
 * @returns {boolean} true if the request is possible to process by this module
 */
moduleExports.isRequestFor = function (settings, registrations, req) {
  return req.method === "GET" && req.path === "/$metadata";
};

/**
 * Build metadata XMl and send it as response.
 *
 * @param {object} settings - the global settings object
 * @param {object[]} registrations - the registrations to build the metadata
 * @param {object} req - the request object from express
 * @param {object} res - the response object from express
 * @param {function} next - the next function from express
 *
 * @returns {undefined}
 */
moduleExports.sendResponse = function (
  settings,
  registrations,
  req,
  res,
  next
) {
  try {
    logger.debug("Handle metadata request");
    res.set("Content-Type", "text/xml");
    res.send(xml(moduleExports.buildDataservices(settings, registrations)));
  } catch (err) {
    err.status = err.status || 500;
    logger.error(err);
    next(err);
  }
};

export default moduleExports;
