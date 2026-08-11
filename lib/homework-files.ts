export const HOMEWORK_BUCKET = "homework-files";
export const MAX_HOMEWORK_FILE_SIZE = 10 * 1024 * 1024;

const ASSIGNMENT_EXTENSIONS = new Set(["pdf", "doc", "docx"]);
const SUBMISSION_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif", "pdf", "doc", "docx"]);

export function fileExtension(name: string) {
  const part = name.split(".").pop()?.toLowerCase() || "";
  return part;
}

export function sanitizeFilename(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "file";
}

export function validateAssignmentFile(file: { name: string; size: number }) {
  if (file.size <= 0) return "Choose a file first.";
  if (file.size > MAX_HOMEWORK_FILE_SIZE) return "The file must be 10 MB or smaller.";
  if (!ASSIGNMENT_EXTENSIONS.has(fileExtension(file.name))) return "Homework files must be PDF, DOC, or DOCX.";
  return null;
}

export function validateSubmissionFile(file: { name: string; size: number }) {
  if (file.size <= 0) return "Choose your completed homework file first.";
  if (file.size > MAX_HOMEWORK_FILE_SIZE) return "The file must be 10 MB or smaller.";
  if (!SUBMISSION_EXTENSIONS.has(fileExtension(file.name))) {
    return "Submissions must be a picture (JPG, PNG, WEBP, HEIC), PDF, DOC, or DOCX.";
  }
  return null;
}

export async function createHomeworkDownloadUrl(supabase: any, path: string | null | undefined) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(HOMEWORK_BUCKET).createSignedUrl(path, 60 * 60, { download: true });
  if (error) return null;
  return data?.signedUrl || null;
}
