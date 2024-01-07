import _ from "lodash";

export function checkSettings(settings) {
  const messages = [
    [
      !_.has(settings, "pool"),
      "Missing pool object in settings as instance of pg.Pool.",
    ],
    [
      isNaN(parseInt(_.get(settings, "schemaTimeout"), 10)),
      "Invalid schemaTimeout in settings. It must be an array of strings.",
    ],
  ]
    .filter((check) => check[0])
    .map((check) => check[1]);

  if (messages.length) {
    throw new Error(messages.join("\n"));
  }
}

export function normalizeSettings(settings) {
  return _.assign(
    {
      schemaTimeout: 60000,
      schemaNameSeparator: "_",
    },
    settings
  );
}

export default {
  check: checkSettings,
  normalize: normalizeSettings,
};
