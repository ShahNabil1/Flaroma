import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Minimal AWS Signature V4 for S3-compatible APIs (Cloudflare R2).
 * Supports two modes:
 *   1. POST JSON { order_id } → returns presigned PUT URL (legacy)
 *   2. POST FormData with "file" + "order_id" → uploads PDF server-side to R2 (preferred, no CORS issues)
 */

async function hmacSHA256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256HexBytes(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSHA256(new TextEncoder().encode("AWS4" + key).buffer, dateStamp);
  const kRegion = await hmacSHA256(kDate, region);
  const kService = await hmacSHA256(kRegion, service);
  return hmacSHA256(kService, "aws4_request");
}

/** Direct server-side PUT to R2 using AWS Sig V4 */
async function uploadToR2(
  accessKeyId: string,
  secretAccessKey: string,
  endpoint: string,
  bucket: string,
  key: string,
  body: ArrayBuffer,
  contentType: string = "application/pdf"
): Promise<void> {
  const region = "auto";
  const service = "s3";
  const method = "PUT";

  const endpointUrl = new URL(endpoint);
  const host = `${bucket}.${endpointUrl.hostname}`;
  const url = `https://${host}/${key}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.substring(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  const payloadHash = await sha256HexBytes(body);

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    method,
    `/${key}`,
    "", // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = toHex(await hmacSHA256(signingKey, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Host": host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "Authorization": authHeader,
    },
    body: body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 upload failed (${res.status}): ${text}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const endpoint = Deno.env.get("R2_ENDPOINT")!;
    const bucket = "flaroma-invoices";

    // Mode 2: Server-side upload (FormData with file blob)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const orderId = formData.get("order_id") as string;
      const file = formData.get("file") as File;

      if (!orderId || !file) {
        return new Response(JSON.stringify({ error: "Missing order_id or file" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const objectKey = `order_${orderId}.pdf`;
      const arrayBuffer = await file.arrayBuffer();

      await uploadToR2(accessKeyId, secretAccessKey, endpoint, bucket, objectKey, arrayBuffer);

      const publicUrl = `https://i.flaroma.bd/${objectKey}`;

      return new Response(JSON.stringify({ success: true, public_url: publicUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 1: Return presigned URL (legacy/fallback)
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const objectKey = `order_${order_id}.pdf`;
    const publicUrl = `https://i.flaroma.bd/${objectKey}`;

    // Just return the public URL — actual upload should use FormData mode
    return new Response(JSON.stringify({ public_url: publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("r2-presign error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
