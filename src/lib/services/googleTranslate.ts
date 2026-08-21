/**
 * Google Translate integration service
 * Provides Google Translate functionality with DeepLX-compatible API format
 */

import { createErrorResponse } from "../errorHandler";
import {
  Config,
  createStandardResponse,
  RequestParams,
  ResponseParams,
} from "../types";

type GoogleTranslateSegment = [string?, ...unknown[]];
type GoogleTranslateBody = [GoogleTranslateSegment[]?, unknown?, string?];

/**
 * Translate text using Google Translate API
 * @param params - Translation parameters (text, source_lang, target_lang)
 * @param config - Configuration options
 * @returns Translation response in DeepLX format
 */
export async function translateWithGoogle(
  params: RequestParams,
  config?: Config & { env?: any; clientIP?: string }
): Promise<ResponseParams> {
  try {
    const { text, source_lang, target_lang } = params;

    const proxyUrls = String(config?.env?.PROXY_URLS || "")
      .split(",")
      .filter(Boolean);
    const proxyUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)];
    const attempts = [
      [
        proxyUrl
          ? new URL("/google/translate_a/single", proxyUrl).toString()
          : "https://translate.googleapis.com/translate_a/single",
        "gtx",
      ],
      ["https://translate.googleapis.com/translate_a/single", "gtx"],
      ["https://translate.google.com/translate_a/single", "dict-chrome-ex"],
    ];
    const googleParams = new URLSearchParams();
    googleParams.append("client", "gtx"); // Google Translate web client
    googleParams.append(
      "sl",
      source_lang === "auto" ? "auto" : source_lang.toLowerCase()
    ); // Source language
    googleParams.append("tl", target_lang.toLowerCase()); // Target language
    googleParams.append("dt", "t"); // 't' for translation of text
    googleParams.append("q", text); // The text to translate

    const requestInit = {
      method: "POST",
      body: googleParams.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://translate.google.com/",
      },
    };

    let googleResponse: Response | undefined;
    for (const [endpoint, client] of attempts) {
      googleParams.set("client", client);
      requestInit.body = googleParams.toString();
      try {
        googleResponse = await fetch(endpoint, requestInit);
        if (googleResponse.ok) break;
      } catch {
        // Try the compatible fallback host.
      }
    }

    if (!googleResponse?.ok) {
      throw new Error(
        `Google Translate API responded with status ${googleResponse?.status || 500}`
      );
    }

    const googleResponseBody =
      (await googleResponse.json()) as GoogleTranslateBody;

    // Parse the complex Google Translate response
    // The response is a deeply nested array. The translated text is
    // typically in the first element. We concatenate the pieces.
    let translatedText = "";
    const segments = Array.isArray(googleResponseBody?.[0])
      ? googleResponseBody[0]
      : [];
    for (const segment of segments) {
      if (typeof segment?.[0] === "string") {
        translatedText += segment[0];
      }
    }

    if (!translatedText) {
      throw new Error("No translation result received from Google Translate");
    }

    // Format the response to match the DeepLX API
    const detectedSourceLang =
      typeof googleResponseBody?.[2] === "string"
        ? googleResponseBody[2]
        : source_lang;

    return createStandardResponse(
      200,
      translatedText,
      Math.floor(Math.random() * 10000000000),
      detectedSourceLang.toUpperCase(),
      target_lang.toUpperCase()
    );
  } catch (error) {
    console.error("Error in Google Translate:", error);

    const errorResponse = createErrorResponse(error, {
      endpoint: "/google",
      clientIP: config?.clientIP || "unknown",
    });

    return errorResponse.response;
  }
}
