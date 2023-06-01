import { OrderDefinition, ValueType } from './types';

/**
 * Check if a value is a valid ISO DateTime string
 * @param v
 * @returns
 */
export const isISODateString = (v: unknown): boolean =>
  typeof v === 'string' &&
  /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/.test(
    v
  );

/**
 * Safely parse any value to a ValueType
 * @param v Any value
 * @returns a ValueType
 */
export const parseValue = (v: any): ValueType => {
  if (isISODateString(v)) return new Date(v);
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

/**
 *
 * @param i Ahhh gotta love typescript
 * @returns
 */
export const isNotNull = <I>(i: I | null): i is I => i !== null;

export const sortSearchParams = (params: URLSearchParams) =>
  new URLSearchParams(
    Array.from(params.entries()).sort((a, b) => {
      const x = `${a[0]}${a[1]}`;
      const y = `${b[0]}${b[1]}`;
      return x > y ? 1 : -1;
    })
  );

/**
 * Returns all paths of an object in dot notation
 * @param obj
 * @param prev
 * @returns
 */
export const getAllPaths = (
  obj: Record<string, unknown>,
  prev = ''
): string[] => {
  const result = [];

  for (const k in obj) {
    const path = prev + (prev ? '.' : '') + k;

    if (typeof obj[k] == 'object') {
      result.push(...getAllPaths(obj[k] as Record<string, unknown>, path));
    } else result.push(path);
  }

  return result;
};

/**
 * Encodes an object by url-encoding an ordered lists of all paths and their values.
 * @param obj The object to encode
 * @returns The encoded object
 */
export const encodeObject = (obj: Record<string, unknown>): string => {
  const paths = getAllPaths(obj).sort();
  const bodyParams = new URLSearchParams();
  paths.forEach((key) => {
    const value = get(obj, key);
    bodyParams.append(key, String(value));
  });
  return sortSearchParams(bodyParams).toString();
};

export const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && !Array.isArray(v) && v !== null;

/**
 * Parses orderByKey back to OrderDefinition
 * @param key generated by PostgrestParser
 * @returns The parsed OrderDefinition
 */
export const parseOrderByKey = (v: string): OrderDefinition[] => {
  return v.split('|').map((orderBy) => {
    const [tableDef, orderDef] = orderBy.split(':');
    const [foreignTableOrCol, maybeCol] = tableDef.split('.');
    const [dir, nulls] = orderDef.split('.');
    return {
      ascending: dir === 'asc',
      nullsFirst: nulls === 'nullsFirst',
      foreignTable: maybeCol ? foreignTableOrCol : undefined,
      column: maybeCol ? maybeCol : foreignTableOrCol,
    };
  });
};

export const get = (obj: any, path: string, defaultValue = undefined) => {
  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce(
        (res, key) => (res !== null && res !== undefined ? res[key] : res),
        obj
      );
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};

/**
 * Returns the index of the last element in the array where predicate is true, and -1
 * otherwise.
 * @param array The source array to search in
 * @param predicate find calls predicate once for each element of the array, in descending
 * order, until it finds one where predicate returns true. If such an element is found,
 * findLastIndex immediately returns that element index. Otherwise, findLastIndex returns -1.
 */
export function findLastIndex<T>(
  array: T[],
  predicate: (value: T, index: number, obj: T[]) => boolean
): number {
  let l = array.length;
  while (l--) {
    if (predicate(array[l], l, array)) return l;
  }
  return -1;
}
