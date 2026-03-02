import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const isS3Configured =
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET_NAME;

// Note: In development (or production) if values are missing,
// we will fallback to a mocked implementation so testing can continue.
const s3Client = isS3Configured
  ? new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

export async function generatePresignedUrl(
  fileName: string,
  contentType: string,
): Promise<{ uploadUrl: string; finalUrl: string }> {
  // --- MOCKED IMPLEMENTATION ---
  if (!s3Client || !process.env.AWS_S3_BUCKET_NAME) {
    const timestamp = Date.now();
    // Use picsum for a persistent mocked image based on a seed
    const finalUrl = `https://picsum.photos/seed/${timestamp}/800/600`;
    // We return a special 'MOCK_UPLOAD' url that the frontend knows how to handle instantly
    return {
      uploadUrl: "MOCK_UPLOAD",
      finalUrl,
    };
  }

  // --- REAL AWS S3 IMPLEMENTATION ---
  const key = `uploads/${Date.now()}-${fileName.replace(/\s+/g, "_")}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const finalUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, finalUrl };
}

export async function deleteFromS3(fileUrl: string): Promise<boolean> {
  // If it's a mocked URL (picsum) or S3 isn't configured, we just pretend it succeeded
  if (
    !s3Client ||
    !process.env.AWS_S3_BUCKET_NAME ||
    fileUrl.includes("picsum.photos")
  ) {
    return true;
  }

  try {
    const urlObj = new URL(fileUrl);
    // Extract the key from the pathname (e.g. /uploads/123-file.jpg -> uploads/123-file.jpg)
    const key = urlObj.pathname.substring(1);

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error("Failed to delete from S3:", error);
    return false;
  }
}
