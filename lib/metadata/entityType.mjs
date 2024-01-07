import _ from "lodash";

export const TYPES = {
  STRING: "Edm.String",
  INT32: "Edm.Int32",
  DATE_TIME_OFFSET: "Edm.DateTimeOffset",
  DATE_TIME: "Edm.DateTime",
  DECIMAL: "Edm.Decimal",
};

export const typeConversions = [
  {
    condition: (columnDefinition) =>
      ["character varying", "character", "text"].indexOf(
        columnDefinition.data_type
      ) > -1,
    edmType: TYPES.STRING,
  },
  {
    condition: (columnDefinition) =>
      columnDefinition.data_type === "integer" &&
      columnDefinition.numeric_precision === 32,
    edmType: TYPES.INT32,
  },
  {
    condition: (columnDefinition) =>
      columnDefinition.data_type === "timestamp with time zone",
    edmType: TYPES.DATE_TIME_OFFSET,
  },
  {
    condition: (columnDefinition) => columnDefinition.data_type === "numeric",
    edmType: TYPES.DECIMAL,
  },
  {
    condition: (columnDefinition) =>
      columnDefinition.data_type === "timestamp without time zone",
    edmType: TYPES.DATE_TIME,
  },
];

export function attributeNullable(columnDefinition) {
  return columnDefinition.is_nullable === "NO"
    ? {
        Nullable: false,
      }
    : {};
}

export function attributeType(columnDefinition) {
  const typeConversion = typeConversions.find((item) =>
    item.condition(columnDefinition)
  );

  if (!typeConversion) {
    throw new Error(
      `No OData type conversion found for ${columnDefinition.data_type}`
    );
  }
  return typeConversion ? { Type: typeConversion.edmType } : {};
}

export function attributeMaxLength(columnDefinition) {
  return columnDefinition.character_maximum_length
    ? { MaxLength: columnDefinition.character_maximum_length }
    : {};
}

export function attributeNumericPrecisionAndScale(columnDefinition) {
  return columnDefinition.data_type === "numeric"
    ? {
        Precision: columnDefinition.numeric_precision,
        Scale: columnDefinition.numeric_scale,
      }
    : {};
}

export function buildProperty(columnDefinition) {
  return {
    Property: [
      {
        _attr: _.assign(
          {
            Name: columnDefinition.column_name,
          },
          attributeNullable(columnDefinition),
          attributeType(columnDefinition),
          attributeMaxLength(columnDefinition),
          attributeNumericPrecisionAndScale(columnDefinition)
        ),
      },
    ],
  };
}

export function buildKey(listKeys) {
  return {
    Key: _.map(listKeys, (listKey) => {
      return {
        PropertyRef: [
          {
            _attr: _.assign({
              Name: listKey.column_name,
            }),
          },
        ],
      };
    }),
  };
}

export function buildEntityType(settings, registration) {
  return {
    EntityType: _.reduce(
      registration.properties.columns,
      (acc, columnDefinition) => {
        acc.push(buildProperty(columnDefinition));
        return acc;
      },
      [
        {
          _attr: {
            Name: registration.properties.table.tablename,
          },
        },
        buildKey(registration.properties.keys),
      ]
    ),
  };
}
