import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/session";

// Client-upload flow: the browser uploads the file directly to Vercel Blob,
// so we never proxy the bytes through a serverless function (and avoid the
// 4.5 MB request-body limit — important for animated GIFs). This route only
// hands out a short-lived, scoped upload token to authenticated admins.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!(await isAdminAuthenticated())) {
          throw new Error("Unauthorized");
        }
        return {
          allowedContentTypes: [
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/gif",
            "image/avif",
            // Audio, for the Song library.
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/ogg",
            "audio/aac",
            "audio/mp4",
            "audio/x-m4a",
            "audio/webm",
          ],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB (songs are bigger than GIFs)
          addRandomSuffix: true,
        };
      },
      // Runs on Vercel's side after the upload finishes. Nothing to persist
      // here — the returned URL is saved with the post.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
