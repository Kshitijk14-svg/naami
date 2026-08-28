import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffprobePath from "@ffprobe-installer/ffprobe";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { generateThumbnail } from "./imageProcessing";

ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

export const MAX_VIDEO_UPLOAD_BYTES = 60 * 1024 * 1024;
export const MAX_VIDEO_DURATION_SECONDS = 120;

export class InvalidVideoError extends Error {}

interface VideoMetadata {
  durationSeconds: number;
}

// ffprobe/ffmpeg only operate on files, not buffers, so uploads are staged to
// a scratch file in the OS temp dir for the duration of validation/thumbnail
// extraction, then cleaned up.
async function withTempFile<T>(buffer: Buffer, fn: (filePath: string) => Promise<T>): Promise<T> {
  const tmpPath = path.join(os.tmpdir(), `naami-upload-${crypto.randomBytes(6).toString("hex")}.mp4`);
  await fs.writeFile(tmpPath, buffer);
  try {
    return await fn(tmpPath);
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}

/**
 * Validates that a buffer is a real, playable video (via ffprobe) and within
 * the allowed duration. Throws InvalidVideoError on anything that isn't a
 * clean short clip — corrupt files, audio-only files, oversized durations.
 */
export async function validateVideoBuffer(buffer: Buffer): Promise<VideoMetadata> {
  return withTempFile(buffer, async (filePath) => {
    const metadata = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    }).catch(() => {
      throw new InvalidVideoError("File is not a valid video");
    });

    const videoStream = metadata.streams.find((s) => s.codec_type === "video");
    if (!videoStream) {
      throw new InvalidVideoError("File does not contain a video stream");
    }

    const durationSeconds = Number(metadata.format.duration ?? videoStream.duration ?? 0);
    if (!durationSeconds || Number.isNaN(durationSeconds)) {
      throw new InvalidVideoError("Could not determine video duration");
    }
    if (durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
      throw new InvalidVideoError(`Video exceeds the ${MAX_VIDEO_DURATION_SECONDS}s limit`);
    }

    return { durationSeconds };
  });
}

/**
 * Extracts a single frame (~0.5s in, or the start for very short clips) and
 * runs it through the existing image thumbnail pipeline so output format
 * stays consistent with image-derived thumbnails (WebP).
 */
export async function generateVideoThumbnail(buffer: Buffer, durationSeconds: number): Promise<Buffer> {
  return withTempFile(buffer, async (filePath) => {
    const framePath = path.join(os.tmpdir(), `naami-thumb-${crypto.randomBytes(6).toString("hex")}.png`);
    const seekSeconds = Math.min(0.5, Math.max(0, durationSeconds / 4));

    await new Promise<void>((resolve, reject) => {
      ffmpeg(filePath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .screenshots({
          timestamps: [seekSeconds],
          filename: path.basename(framePath),
          folder: path.dirname(framePath),
        });
    }).catch(() => {
      throw new InvalidVideoError("Could not generate a thumbnail from this video");
    });

    try {
      const frameBuffer = await fs.readFile(framePath);
      return await generateThumbnail(frameBuffer);
    } finally {
      await fs.unlink(framePath).catch(() => {});
    }
  });
}
