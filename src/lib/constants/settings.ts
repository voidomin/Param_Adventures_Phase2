/**
 * Industrial-grade Default Settings for Param Adventures.
 * Used for both initial database seeding and the "Reset to Defaults" UI action.
 */

export const DEFAULT_PLATFORM_SETTINGS = [
  { key: "email_provider", value: "ZOHO_SMTP", description: "ZOHO_API | ZOHO_SMTP | RESEND" },
  { key: "smtp_host", value: "smtp.zoho.com", description: "SMTP Server Host" },
  { key: "smtp_port", value: "465", description: "SMTP Port (465, 587, 25)" },
  { key: "smtp_user", value: "", description: "SMTP Username" },
  { key: "smtp_pass", value: "", description: "SMTP Password" },
  { key: "smtp_secure", value: "true", description: "Use SSL/TLS (true/false)" },
  { key: "smtp_from", value: "Param Adventures <booking@paramadventures.in>", description: "Email Sender Identity" },
  { key: "zoho_api_key", value: "", description: "Zoho ZeptoMail API Key" },
  { key: "resend_api_key", value: "", description: "Resend.com API Key" },
  { key: "razorpay_mode", value: "TEST", description: "TEST | LIVE" },
  { key: "razorpay_key_id", value: "", description: "Razorpay Public Key ID" },
  { key: "razorpay_key_secret", value: "", description: "Razorpay Secret Key" },
  { key: "razorpay_webhook_secret", value: "", description: "Razorpay Webhook Secret" },
  { key: "cgst_percent", value: "9", description: "Central GST percentage" },
  { key: "sgst_percent", value: "9", description: "State GST percentage" },
  { key: "media_provider", value: "AWS_S3", description: "AWS_S3 | CLOUDINARY" },
  { key: "s3_bucket", value: "", description: "AWS S3 Bucket Name" },
  { key: "s3_region", value: "ap-south-1", description: "AWS S3 Region" },
  { key: "cloudinary_cloud_name", value: "", description: "Cloudinary Cloud Name" },
  { key: "maintenance_mode", value: "false", description: "Site-wide kill switch" },
  { key: "registration_enabled", value: "true", description: "Allow new user signups" },
  { key: "jwt_expiry", value: "1h", description: "Access token duration" },
  { key: "google_analytics_id", value: "", description: "G-XXXXXX Tracking ID" },
];

export const DEFAULT_SITE_SETTINGS = [
  { key: "site_title", value: "Param Adventures" },
  { key: "site_description", value: "Curated outdoor experiences across India" },
  { key: "site_favicon_url", value: "/favicon.ico" },
  { key: "company_name", value: "Param Adventures Private Limited" },
  { key: "company_address", value: "" },
  { key: "company_gst", value: "" },
  { key: "support_email", value: "info@paramadventures.in" },
  { key: "support_phone", value: "+91-9999999999" },
  { key: "instagram_url", value: "" },
  { key: "youtube_url", value: "" },
];
