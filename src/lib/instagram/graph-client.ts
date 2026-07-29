const GRAPH_API_BASE = "https://graph.facebook.com";

function graphApiVersion(): string {
  return process.env.META_GRAPH_API_VERSION ?? "v21.0";
}

function graphApiUrl(path: string): string {
  return `${GRAPH_API_BASE}/${graphApiVersion()}${path}`;
}

interface MetaErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export class InstagramApiError extends Error {
  code?: number;
  type?: string;
  fbtraceId?: string;

  constructor(message: string, body?: MetaErrorBody["error"]) {
    super(message);
    this.name = "InstagramApiError";
    this.code = body?.code;
    this.type = body?.type;
    this.fbtraceId = body?.fbtrace_id;
  }
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & MetaErrorBody;
  if (!response.ok) {
    throw new InstagramApiError(
      body.error?.message ?? `Meta Graph API request failed (${response.status})`,
      body.error,
    );
  }
  return body;
}

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface OAuthTokenResult {
  accessToken: string;
  expiresInSeconds?: number;
}

export async function exchangeCodeForShortLivedToken(
  code: string,
): Promise<OAuthTokenResult> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    client_secret: process.env.META_APP_SECRET ?? "",
    redirect_uri: process.env.META_REDIRECT_URI ?? "",
    code,
  });
  const response = await fetch(graphApiUrl(`/oauth/access_token?${params}`));
  const body = await parseJsonOrThrow<TokenResponse>(response);
  return { accessToken: body.access_token, expiresInSeconds: body.expires_in };
}

export async function getLongLivedToken(
  shortLivedToken: string,
): Promise<OAuthTokenResult> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID ?? "",
    client_secret: process.env.META_APP_SECRET ?? "",
    fb_exchange_token: shortLivedToken,
  });
  const response = await fetch(graphApiUrl(`/oauth/access_token?${params}`));
  const body = await parseJsonOrThrow<TokenResponse>(response);
  return { accessToken: body.access_token, expiresInSeconds: body.expires_in };
}

export async function refreshLongLivedToken(
  currentToken: string,
): Promise<OAuthTokenResult> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID ?? "",
    client_secret: process.env.META_APP_SECRET ?? "",
    fb_exchange_token: currentToken,
  });
  const response = await fetch(graphApiUrl(`/oauth/access_token?${params}`));
  const body = await parseJsonOrThrow<TokenResponse>(response);
  return { accessToken: body.access_token, expiresInSeconds: body.expires_in };
}

export async function createMediaContainer({
  igBusinessAccountId,
  imageUrl,
  caption,
  accessToken,
}: {
  igBusinessAccountId: string;
  imageUrl: string;
  caption: string;
  accessToken: string;
}): Promise<{ creationId: string }> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  });
  const response = await fetch(
    graphApiUrl(`/${igBusinessAccountId}/media?${params}`),
    { method: "POST" },
  );
  const body = await parseJsonOrThrow<{ id: string }>(response);
  return { creationId: body.id };
}

export async function getInstagramBusinessAccount(
  accessToken: string,
): Promise<{ pageId: string; igBusinessAccountId: string }> {
  const params = new URLSearchParams({
    fields: "instagram_business_account",
    access_token: accessToken,
  });
  const response = await fetch(graphApiUrl(`/me/accounts?${params}`));
  const body = await parseJsonOrThrow<{
    data: Array<{ id: string; instagram_business_account?: { id: string } }>;
  }>(response);

  const page = body.data.find((entry) => entry.instagram_business_account);
  if (!page?.instagram_business_account) {
    throw new InstagramApiError(
      "Keine mit einer Facebook-Seite verknüpfte Instagram-Business-Account gefunden.",
    );
  }

  return {
    pageId: page.id,
    igBusinessAccountId: page.instagram_business_account.id,
  };
}

export async function publishMedia({
  igBusinessAccountId,
  creationId,
  accessToken,
}: {
  igBusinessAccountId: string;
  creationId: string;
  accessToken: string;
}): Promise<{ mediaId: string }> {
  const params = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });
  const response = await fetch(
    graphApiUrl(`/${igBusinessAccountId}/media_publish?${params}`),
    { method: "POST" },
  );
  const body = await parseJsonOrThrow<{ id: string }>(response);
  return { mediaId: body.id };
}
