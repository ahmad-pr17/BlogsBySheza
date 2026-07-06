import { upload } from "@vercel/blob/client";

// Uploads a file straight from the browser to Vercel Blob via the signed-token
// route at /api/upload, and returns the public URL to store in a post.
export async function uploadFile(file: File): Promise<string> {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
  });
  return blob.url;
}

// Back-compat alias — same underlying flow, just reads better at image callsites.
export const uploadImage = uploadFile;
