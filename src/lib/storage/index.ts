import "server-only";
import { env } from "@/lib/env";
import { createLocalStore } from "@/lib/storage/local";
import { createS3Store } from "@/lib/storage/s3";
import type { DocumentStore } from "@/lib/storage/types";

let store: DocumentStore | undefined;

export function documentStore(): DocumentStore {
  store ??= env.STORAGE_DRIVER === "s3" ? createS3Store() : createLocalStore();
  return store;
}
