import _ from "lodash";

let initializedPromise;
const logger = {};

export const LEVELS = ["debug", "info", "warn", "error"];
export default logger;

LEVELS.forEach((level) => {
  logger[level] = () => {};
});

logger.initialize = function (settings) {
  initializedPromise =
    initializedPromise ||
    new Promise((resolve, reject) => {
      if (_.isObject(settings.logger)) {
        LEVELS.forEach((level) => {
          if (_.isFunction(settings.logger[level])) {
            logger[level] = settings.logger[level];
          } else {
            reject(new Error(`Logger does not have ${level} method.`));
          }
        });
      }
      resolve(logger);
    });
  return initializedPromise;
};
