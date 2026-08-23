"use client";

import { FormEvent, ReactNode, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export default function NewsPostForm({
  action,
  children,
  style,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  const prepared = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function prepareImage(event: FormEvent<HTMLFormElement>) {
    if (prepared.current) return;

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("image") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) return;

    event.preventDefault();
    setUploadError("");

    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("Image must be 8 MB or smaller.");
      return;
    }

    const extension = EXTENSIONS[file.type];
    if (!extension) {
      setUploadError("Please upload a JPG, PNG, or WebP image.");
      return;
    }

    const externalUrl = String((form.elements.namedItem("external_url") as HTMLInputElement | null)?.value || "").trim();
    if (externalUrl && !externalUrl.startsWith("https://")) {
      setUploadError("External links must use HTTPS.");
      return;
    }

    setUploading(true);
    try {
      const path = `posts/${crypto.randomUUID()}.${extension}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("news-images").upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw new Error(error.message || "Could not upload the news image.");

      const hidden = form.elements.namedItem("uploaded_image_path") as HTMLInputElement | null;
      if (!hidden) throw new Error("Could not prepare the uploaded image.");
      hidden.value = path;
      if (fileInput) fileInput.value = "";

      prepared.current = true;
      form.requestSubmit();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not upload image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} onSubmit={prepareImage} style={style}>
      <input type="hidden" name="uploaded_image_path" defaultValue="" />
      {children}
      {uploadError ? <div className="small" style={{ marginTop: 10, color: "#a3382b" }}><b>Image upload failed:</b> {uploadError}</div> : null}
      {uploading ? <div className="small" style={{ marginTop: 10 }}><b>Uploading image…</b> Please keep this page open.</div> : null}
    </form>
  );
}
