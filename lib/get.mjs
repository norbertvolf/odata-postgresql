import logger from "./logger.mjs";
import _ from "lodash";
import { REGISTRATION } from "./const.mjs";
import db from "./db.mjs";

const moduleExports = {};

/**
 * Pass query definition to database layer
 *
 * @param {object} settings - the global settings object
 * @param {object} registration - the registered table definition
 *
 * @returns {Promise} - the promise resolved by the rows from database
 */
moduleExports.readContentFromTable = function (settings, registration) {
  return db.readTableContent(
    settings,
    registration.properties.table.schemaname,
    registration.properties.table.tablename
  );
};

/**
 * Read content for GET response
 *
 * @param {object} settings - the global settings object
 * @param {object} registration - the registered table definition
 * @param {IncomingMessage} req - the object which represents request from http client
 *
 * @returns {Promise} - the promise resolved by the content from database
 */
moduleExports.readContent = function (settings, registration, req) {
  let promise;
  if (REGISTRATION.TABLE === _.get(registration, "type")) {
    promise = moduleExports.readContentFromTable(settings, registration, req);
  } else {
    promise = Promise.reject(
      new Error(`Invalid registration type ${_.get(registration, "type")}`)
    );
  }
  return promise;
};

/**
 * Find registration for request path
 *
 * @param {object[]} registrations - the registrations to build the metadata
 * @param {string} requestPath - the request path from express
 *
 * @returns {object} - the registration object
 */
moduleExports.findRegistration = function (registrations, requestPath) {
  return _.find(
    registrations,
    (registration) =>
      requestPath === `/${_.get(registration, "properties.entitySetName")}`
  );
};

/**
 * Check if request is for this module
 *
 * @param {object} settings - the global settings object
 * @param {object[]} registrations - the registrations to build the metadata
 * @param {IncomingMessage} req - the object which represents request from http client
 *
 * @returns {boolean} - true if request is for this module
 */
moduleExports.isRequestFor = function (settings, registrations, req) {
  return (
    req.method === "GET" &&
    Boolean(moduleExports.findRegistration(registrations, req.path))
  );
};

/**
 * Process error and send it to express
 *
 * @param {function} next - the next function from express
 * @param {Error} err - the error object
 */
moduleExports.processError = function (next, err) {
  err.status = err.status || 500;
  logger.error(err);
  next(err);
};

/**
 * Generate response context URL
 *
 * @param {object} registration - the registered table definition
 * @param {IncomingMessage} req - the object which represents request from http client
 *
 * @returns {string} - the context URL
 */
moduleExports.generateContextUrl = function (registration, req) {
  return (
    req.protocol +
    "://" +
    req.hostname +
    ([80, 443].indexOf(req.res.socket.localPort) > -1
      ? ""
      : ":" + req.res.socket.localPort) +
    req.baseUrl +
    "/$metadata#" +
    registration.properties.entitySetName
  );
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
  let promise;
  try {
    const registration = moduleExports.findRegistration(
      registrations,
      req.path
    );
    if (!registration) {
      throw new Error(`No registration found for ${req.path}`);
    }
    logger.debug(`Handle GET request for ${registration.name} endpoint`);
    promise = moduleExports
      .readContent(settings, registration)
      .then((result) => {
        res.set("Content-Type", "application/json");
        res.send(
          JSON.stringify({
            "@odata.context": moduleExports.generateContextUrl(
              registration,
              req
            ),
            value: result,
          })
        );
      })
      .catch((err) => {
        moduleExports.processError(next, err);
      });
  } catch (err) {
    moduleExports.processError(next, err);
    promise = Promise.reject(err);
  }

  return promise;
};

export default moduleExports;
