export function tableEntitySetName(settings, schema, name) {
  return [schema, name].join(settings.schemaNameSeparator);
}

export function tableFullName(schemaName, tableName) {
  return [schemaName, tableName].join(".");
}
