/**
 * Cloudflare R2 Configuration for Logo Storage
 *
 * R2 Benefits:
 * - 10GB free storage
 * - Zero egress fees (unlike S3)
 * - Global CDN via Cloudflare
 * - Native integration with Cloudflare Workers
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2 uses S3-compatible API
// Lazy initialization to allow env vars to be loaded
let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    const endpoint = process.env.R2_ENDPOINT;
    if (!endpoint || endpoint.includes("<account-id>")) {
      throw new Error("R2_ENDPOINT not configured. Check your .env.production file.");
    }

    r2Client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return r2Client;
}

const getBucketName = () => process.env.R2_BUCKET_NAME || "bsebet-logos";
const getPublicUrl = () => process.env.R2_PUBLIC_URL || "https://logos.bsebet.com";

/**
 * Upload a logo to R2
 */
export async function uploadLogoToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<{ publicUrl: string }> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=86400", // 24 hours cache
  });

  await getR2Client().send(command);

  return {
    publicUrl: `${getPublicUrl()}/${key}`,
  };
}

/**
 * Get a signed URL for temporary access (if needed)
 */
export async function getSignedLogoUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn });
}

/**
 * Delete a logo from R2
 */
export async function deleteLogoFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  await getR2Client().send(command);
}

/**
 * Generate the R2 key for a team logo
 */
export function getTeamLogoKey(teamId: number, extension: string = "png"): string {
  return `teams/${teamId}/logo.${extension}`;
}

/**
 * Generate the R2 key for a tournament logo
 */
export function getTournamentLogoKey(tournamentId: number, extension: string = "png"): string {
  return `tournaments/${tournamentId}/logo.${extension}`;
}

/**
 * Generate the R2 key for a user avatar
 */
export function getUserAvatarKey(userId: string, extension: string = "png"): string {
  return `users/${userId}/avatar.${extension}`;
}

/**
 * Convert Base64 to Buffer for upload
 */
export function base64ToBuffer(base64String: string): { buffer: Buffer; contentType: string } {
  // Extract content type and base64 data
  const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 string");
  }

  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");

  return { buffer, contentType };
}

/**
 * Check if a string is a Base64 data URL
 */
export function isBase64DataUrl(str: string): boolean {
  return str.startsWith("data:");
}

/**
 * Check if a string is already an R2/HTTP URL
 */
export function isExternalUrl(str: string): boolean {
  return str.startsWith("http://") || str.startsWith("https://");
}
