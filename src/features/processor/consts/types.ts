import { z } from "zod";

export const dateSchema = z.preprocess((arg) => {
  if (typeof arg == "string" || arg instanceof Date) return new Date(arg);
}, z.date());

export const parseObject = (val: unknown) =>
  z.record(z.string(), z.unknown()).parse(val);

export const parseArray = (val: unknown) => z.array(z.unknown()).parse(val);

export const isDate = (val: unknown): val is Date =>
  dateSchema.safeParse(val).success;

export const isString = (val: unknown): val is string =>
  typeof val === "string";

export const isNumber = (val: unknown): val is number =>
  typeof val === "number";

export const isBoolean = (val: unknown): val is boolean =>
  typeof val === "boolean";

export const isNullish = (val: unknown) => {
  return typeof val === "undefined" || val === null;
};

export const isComponent = (val: unknown) => {
  const res = z
    .object({
      id: z.string(),
    })
    .nullable()
    .safeParse(val);

  return res.success;
};

export const isFile = (val: unknown) => {
  const fileSchema = z.object({
    name: z.string(),
    alternativeText: z.string(),
    caption: z.string(),
    hash: z.string(),
    ext: z.string(),
    mime: z.string(),
    size: z.number(),
    width: z.number(),
    height: z.number(),
    url: z.string(),
    formats: z.object({
      thumbnail: z.object({
        name: z.string(),
        hash: z.string(),
        ext: z.string(),
        mime: z.string(),
        width: z.number(),
        height: z.number(),
        size: z.number(),
        url: z.string(),
      }),
      medium: z
        .object({
          name: z.string(),
          hash: z.string(),
          ext: z.string(),
          mime: z.string(),
          width: z.number(),
          height: z.number(),
          size: z.number(),
          url: z.string(),
        })
        .nullish(),
      small: z
        .object({
          name: z.string(),
          hash: z.string(),
          ext: z.string(),
          mime: z.string(),
          width: z.number(),
          height: z.number(),
          size: z.number(),
          url: z.string(),
        })
        .nullish(),
    }),
    provider: z.string(),
    // related: ["5fb5b2c74ed9430012005246"], TODO: what is this for?
    createdAt: dateSchema,
    updatedAt: dateSchema,
    __v: z.number(),
    id: z.string(),
  });

  return fileSchema.safeParse(val).success;
};

export type ProcessedModel = {
  entityName: string;
  fileName: string;
  url: string;
  hint: string;
};

export enum StrapiTypes {
  RichText = "richtext",
  String = "string",
  Date = "date",
  Component = "component",
  Relation = "relation",
  Media = "media",
  Number = "number",
  Boolean = "boolean",
  Nullish = "nullish",
  Unknown = "unknown",
}

type Field = {
  type: StrapiTypes;
  required: boolean;
  unique: boolean;
};
export type Schema = {
  [entity: string]: {
    [field: string]: Field & {
      subFields?: {
        [subField: string]: Field;
      };
    };
  };
};