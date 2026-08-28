import { NextRequest } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getSharedMomentVideos, createSharedMomentVideo } from "@/db/queries/homepageContent";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const videos = await getSharedMomentVideos();
  return Response.json(videos);
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request, ["admin", "super_admin"]);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  if (!body.videoUrl) {
    return Response.json({ error: "videoUrl is required" }, { status: 400 });
  }

  const video = await createSharedMomentVideo({
    videoUrl: body.videoUrl,
    thumbnailImage: body.thumbnailImage,
    caption: body.caption,
    sortOrder: body.sortOrder,
  });

  return Response.json(video, { status: 201 });
}
