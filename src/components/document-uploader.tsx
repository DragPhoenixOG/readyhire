"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { type UploadTargetInput, completeDocumentUpload, prepareDocumentUpload } from "@/actions/documents";
import { buttonClass, cx, fileInputClass } from "@/components/ui";
import type { UploadTarget } from "@/lib/storage/types";
import { uploadAccept, uploadProblem } from "@/lib/upload-rules";

type State =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "done"; message: string }
  | { status: "error"; message: string };

/** PUTs the file to the pre-signed URL, reporting progress (fetch can't report upload progress). */
function putFile(target: UploadTarget, file: File, onProgress: (fraction: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(target.method, target.url);
    for (const [name, value] of Object.entries(target.headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`status ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("network error"));
    xhr.send(file);
  });
}

export function DocumentUploader({
  target,
  label,
  submitLabel = "Upload",
  variant = "primary",
}: {
  target: UploadTargetInput;
  /** Accessible name of the file input. */
  label: string;
  submitLabel?: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ status: "idle" });
  const busy = state.status === "uploading";
  const kind = target.kind === "resume" ? "resume" : "document";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return setState({ status: "error", message: "Choose a file to upload." });
    const problem = uploadProblem(file.type, file.size, kind);
    if (problem) return setState({ status: "error", message: problem });

    setState({ status: "uploading", progress: 0 });
    try {
      const prepared = await prepareDocumentUpload({
        target,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      });
      if (!prepared.ok) return setState({ status: "error", message: prepared.error });
      await putFile(prepared.upload, file, (progress) => setState({ status: "uploading", progress }));
      const result = await completeDocumentUpload(prepared.ticket);
      if (!result.ok)
        return setState({
          status: "error",
          message: result.error ?? "Upload failed.",
        });
      setState({ status: "done", message: result.message ?? "Uploaded." });
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setState({
        status: "error",
        message: "The upload didn't go through. Check your connection and try again.",
      });
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-2"
      onChange={() => state.status !== "uploading" && setState({ status: "idle" })}
    >
      <input
        ref={inputRef}
        type="file"
        name="file"
        required
        accept={uploadAccept(kind)}
        aria-label={label}
        disabled={busy}
        className={fileInputClass}
      />
      {state.status === "uploading" && (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={Math.round(state.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-brand-600 transition-[width]"
            style={{ width: `${Math.max(5, state.progress * 100)}%` }}
          />
        </div>
      )}
      {state.status === "error" && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {state.message}
        </p>
      )}
      {state.status === "done" && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          {state.message}
        </p>
      )}
      <button type="submit" disabled={busy} className={cx(buttonClass(variant, "sm"))}>
        {busy ? "Uploading…" : submitLabel}
      </button>
    </form>
  );
}
