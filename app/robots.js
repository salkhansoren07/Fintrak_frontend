function getSiteUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "https://www.fintrak.online";

  return siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
}

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/bank/",
          "/budget",
          "/insights",
          "/individual",
          "/individual/",
          "/passcode",
          "/profile",
          "/unlock",
        ],
      },
    ],
    host: getSiteUrl(),
  };
}
