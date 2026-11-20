function getFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function normalizeOrigin(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.trim());

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string) {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
  } catch {
    return false;
  }
}

export function getPublicOrigin(request: Request) {
  const configuredOrigin = normalizeOrigin(process.env.APP_URL);

  if (configuredOrigin && !(process.env.NODE_ENV === "production" && isLocalOrigin(configuredOrigin))) {
    return configuredOrigin;
  }

  const forwardedHost = getFirstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost || getFirstHeaderValue(request.headers.get("host"));
  const forwardedProto = getFirstHeaderValue(request.headers.get("x-forwarded-proto"));

  if (host) {
    const protocol =
      forwardedProto || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
}
