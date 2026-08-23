import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import sharp from "sharp";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

const BUCKET = process.env.AWS_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION;

/**
 * Defaults to a dry run (logs what it would do, changes nothing) so it's
 * safe to run against production first. Pass COMMIT=true to actually
 * upload converted images to S3 and update the database.
 */
const DRY_RUN = process.env.COMMIT !== "true";

if (!BUCKET || !REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error(
    "Missing S3 configuration. Requires AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME (or S3_BUCKET_NAME) in the environment.",
  );
  process.exit(1);
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const S3_URL_PREFIX = `https://${BUCKET}.s3.${REGION}.amazonaws.com/`;

function isConvertibleS3Url(url: string | null | undefined): url is string {
  return !!url && url.startsWith(S3_URL_PREFIX) && !url.toLowerCase().endsWith(".webp");
}

function keyFromUrl(url: string): string {
  return decodeURIComponent(url.slice(S3_URL_PREFIX.length));
}

/**
 * Downloads the original, re-encodes it as WebP (same 2560px/90%-quality
 * target used for client-side compression on new uploads, so backfilled
 * photos match what's already being uploaded going forward), and uploads
 * the result under a sibling key. The original object is left in place --
 * this is a one-time, best-effort migration, not a destructive rewrite,
 * so a bad conversion can't take an image down; stale originals can be
 * cleaned up separately once the backfill has been verified live.
 */
async function convertToWebp(key: string): Promise<{ newUrl: string } | null> {
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const bytes = await obj.Body!.transformToByteArray();

  const webp = await sharp(Buffer.from(bytes))
    .resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();

  if (webp.length >= bytes.length) {
    console.log(`  skip (WebP wasn't smaller): ${key}`);
    return null;
  }

  const newKey = key.replace(/\.[a-zA-Z0-9]+$/, "") + ".webp";
  const newUrl = `${S3_URL_PREFIX}${newKey}`;

  if (!DRY_RUN) {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: newKey,
        Body: webp,
        ContentType: "image/webp",
      }),
    );
  }

  console.log(
    `  ${DRY_RUN ? "[dry-run] would convert" : "converted"}: ${key} (${bytes.length}B) -> ${newKey} (${webp.length}B)`,
  );
  return { newUrl };
}

async function tryConvert(url: string): Promise<string | null> {
  try {
    const result = await convertToWebp(keyFromUrl(url));
    return result?.newUrl ?? null;
  } catch (error) {
    console.error(`  failed to convert ${url}:`, error);
    return null;
  }
}

async function run() {
  console.log(
    DRY_RUN
      ? "DRY RUN -- nothing will be uploaded or written. Set COMMIT=true to apply.\n"
      : "LIVE RUN -- converted images will be uploaded to S3 and the database updated.\n",
  );

  let converted = 0;
  let skipped = 0;

  const experiences = await prisma.experience.findMany({
    select: { id: true, title: true, coverImage: true, cardImage: true, images: true },
  });
  console.log(`Found ${experiences.length} experience(s).`);

  for (const exp of experiences) {
    const updates: { coverImage?: string; cardImage?: string; images?: string[] } = {};

    if (isConvertibleS3Url(exp.coverImage)) {
      const newUrl = await tryConvert(exp.coverImage);
      if (newUrl) {
        updates.coverImage = newUrl;
        converted++;
      } else {
        skipped++;
      }
    }

    if (isConvertibleS3Url(exp.cardImage)) {
      const newUrl = await tryConvert(exp.cardImage);
      if (newUrl) {
        updates.cardImage = newUrl;
        converted++;
      } else {
        skipped++;
      }
    }

    if (Array.isArray(exp.images) && exp.images.length > 0) {
      let imagesChanged = false;
      const newImages: string[] = [];
      for (const img of exp.images) {
        if (isConvertibleS3Url(img)) {
          const newUrl = await tryConvert(img);
          if (newUrl) {
            newImages.push(newUrl);
            imagesChanged = true;
            converted++;
            continue;
          }
          skipped++;
        }
        newImages.push(img);
      }
      if (imagesChanged) updates.images = newImages;
    }

    if (Object.keys(updates).length > 0) {
      console.log(`Experience "${exp.title}" (${exp.id}): updating ${Object.keys(updates).join(", ")}`);
      if (!DRY_RUN) {
        await prisma.experience.update({ where: { id: exp.id }, data: updates });
      }
    }
  }

  const images = await prisma.image.findMany({ select: { id: true, originalUrl: true } });
  console.log(`\nFound ${images.length} uploaded Image record(s).`);

  for (const img of images) {
    if (!isConvertibleS3Url(img.originalUrl)) continue;

    const newUrl = await tryConvert(img.originalUrl);
    if (!newUrl) {
      skipped++;
      continue;
    }
    converted++;
    console.log(`Image ${img.id}: updating originalUrl`);
    if (!DRY_RUN) {
      await prisma.image.update({ where: { id: img.id }, data: { originalUrl: newUrl } });
    }
  }

  console.log(`\nDone. Converted ${converted}, skipped ${skipped} (already WebP, non-S3, or WebP wasn't smaller).`);
  if (DRY_RUN) {
    console.log("This was a dry run -- nothing was changed. Re-run with COMMIT=true to apply.");
  }
}

run()
  .catch((error) => {
    console.error("Error running WebP backfill:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    prisma.$disconnect();
  });
