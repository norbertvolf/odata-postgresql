import metadata from "./lib/metadata.mjs";
import * as root from "./lib/root.mjs";
import { tableFullName } from "./lib/name.mjs";
import { normalizeSettings, checkSettings } from "./lib/settings.mjs";
import logger from "./lib/logger.mjs";
import {
  readTableList,
  readTableDefinition,
  readTableKeys,
} from "./lib/db.mjs";
import micromatch from "micromatch";
import _ from "lodash";

export class ODataService {
  static REGISTRATION = {
    TABLE: "table",
  };
  #settings = {};
  #checkSettingsPromise;
  #registrationPromises = [];
  #registrations = [];

  constructor(settings) {
    this.settings = settings;
  }

  get registrations() {
    return this.#registrations;
  }

  get settings() {
    return this.#settings;
  }

  set settings(settings) {
    this.#settings = normalizeSettings(settings);
    checkSettings(this.#settings);
    this.#checkSettingsPromise = Promise.all(
      [logger.initialize(this.settings)].concat(this.#registrationPromises)
    );
  }

  convertTableRows2StringArray(tableDefinitions) {
    return _.map(tableDefinitions, (tableDefinition) =>
      tableFullName(tableDefinition.schemaname, tableDefinition.tablename)
    );
  }

  isTableRegistered(tableDefinition) {
    return this.#registrations.some(
      (registration) =>
        registration.type === ODataService.REGISTRATION.TABLE &&
        registration.name ===
          tableFullName(tableDefinition.schemaname, tableDefinition.tablename)
    );
  }

  registerTableByDefinition(tableDefinition) {
    let promise = Promise.resolve();
    if (!this.isTableRegistered(tableDefinition)) {
      promise = Promise.all([
        readTableDefinition(
          this.settings,
          tableDefinition.schemaname,
          tableDefinition.tablename
        ),
        readTableKeys(
          this.settings,
          tableDefinition.schemaname,
          tableDefinition.tablename
        ),
      ]).then((results) => {
        const tableColumns = results[0];
        const tableKeys = results[1];
        this.#registrations.push({
          name: tableFullName(
            tableDefinition.schemaname,
            tableDefinition.tablename
          ),
          type: ODataService.REGISTRATION.TABLE,
          properties: {
            table: tableDefinition,
            columns: tableColumns,
            keys: tableKeys,
          },
        });
      });
    }
    return promise;
  }

  matchTables(tableRows, patterns) {
    const stringsForMatching = this.convertTableRows2StringArray(tableRows);
    const objectsForMatching = _.reduce(
      stringsForMatching,
      (acc, stringForMatching, index) =>
        _.assign(acc, {
          [stringForMatching]: tableRows[index],
        }),
      {}
    );
    return _.map(
      micromatch(stringsForMatching, patterns),
      (stringForMatching) => objectsForMatching[stringForMatching]
    );
  }

  registerTable(...args) {
    const promise = this.ready()
      .then(() => readTableList(this.settings))
      .then((tableRows) =>
        Promise.all(
          this.matchTables(tableRows, args).map((tableRow) =>
            this.registerTableByDefinition(tableRow)
          )
        )
      )
      .then(() => {
        _.remove(
          this.#registrationPromises,
          (registrationPromise) => registrationPromise === promise
        );
      });
    this.#registrationPromises.push(promise);
    return promise;
  }

  ready() {
    return this.#checkSettingsPromise;
  }

  handler(...args) {
    const next = args[2];

    this.ready()
      .then(() => {
        const foundHandlerModule = [root, metadata].find((handlerModule) =>
          handlerModule.isRequestFor(this.settings, this.registrations, ...args)
        );
        if (foundHandlerModule) {
          foundHandlerModule.sendResponse(
            this.settings,
            this.registrations,
            ...args
          );
        } else {
          const err = new Error("Not Found");
          err.status = 404;
          next(err);
        }
      })
      .catch((err) => {
        err.status = 500;
        next(err);
      });
  }
}

export default ODataService;
