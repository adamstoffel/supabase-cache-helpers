import { useSWRConfig } from "swr";
import { useEffect, useState } from "react";
import {
  decode,
  PostgrestSWRMutatorOpts,
  usePostgrestFilterCache,
} from "../lib";
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
} from "@supabase/supabase-js";
import { isV1Response, PostgresChangeFilter } from "./types";
import { GenericTable } from "@supabase-cache-helpers/postgrest-shared";
import {
  insertItem,
  updateItem,
  deleteItem,
} from "@supabase-cache-helpers/postgrest-mutate";

function useSubscription<T extends GenericTable>(
  channel: RealtimeChannel | null,
  filter: PostgresChangeFilter,
  primaryKeys: (keyof T["Row"])[],
  opts?: PostgrestSWRMutatorOpts<T> & {
    callback?: (
      event: RealtimePostgresChangesPayload<T["Row"]>
    ) => void | Promise<void>;
  }
) {
  const { mutate, cache } = useSWRConfig();
  const getPostgrestFilter = usePostgrestFilterCache();
  const [status, setStatus] = useState<string>();

  useEffect(() => {
    if (!channel) return;

    const c = channel
      .on<T["Row"]>(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        filter,
        async (payload) => {
          // temporary workaround to make it work with both v1 and v2
          let eventType = payload.eventType;
          let newRecord = payload.new;
          let oldRecord = payload.old;
          if (isV1Response<T>(payload)) {
            eventType = payload.type;
            newRecord = payload.record;
            oldRecord = payload.old_record;
          }
          if (eventType === REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT) {
            await insertItem(
              {
                input: newRecord,
                table: payload.table,
                schema: payload.schema,
                opts,
              },
              {
                cacheKeys: Array.from(cache.keys()),
                decode,
                getPostgrestFilter,
                mutate,
              }
            );
          } else if (
            eventType === REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE
          ) {
            await updateItem(
              {
                primaryKeys,
                input: newRecord,
                table: payload.table,
                schema: payload.schema,
                opts,
              },
              {
                cacheKeys: Array.from(cache.keys()),
                decode,
                getPostgrestFilter,
                mutate,
              }
            );
          } else if (
            eventType === REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.DELETE
          ) {
            await deleteItem(
              {
                primaryKeys,
                input: oldRecord,
                table: payload.table,
                schema: payload.schema,
                opts,
              },
              {
                cacheKeys: Array.from(cache.keys()),
                decode,
                getPostgrestFilter,
                mutate,
              }
            );
          }
          if (opts?.callback) {
            // temporary workaround to make it work with both v1 and v2
            opts.callback({
              ...payload,
              new: newRecord,
              old: oldRecord,
              eventType,
            });
          }
        }
      )
      .subscribe((status: string) => setStatus(status));
    return () => {
      if (c) c.unsubscribe();
    };
  }, []);

  return { status };
}

export { useSubscription };