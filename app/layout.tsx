import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { defaultLocale, getUiCopy, localeDirection } from "../lib/i18n";
import "./globals.css";

const copy = getUiCopy(defaultLocale);

const baseMetadata: Metadata = {
  title: {
    default: copy.metadata.defaultTitle,
    template: copy.metadata.titleTemplate,
  },
  description: copy.metadata.description,
  applicationName: copy.metadata.applicationName,
  authors: [{ name: copy.metadata.author }],
  creator: copy.metadata.author,
  publisher: copy.metadata.author,
  category: copy.metadata.category,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  keywords: [...copy.metadata.keywords],
  robots: {
    index: true,
    follow: true,
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = (forwardedHost ?? requestHeaders.get("host") ?? "localhost:3000")
    .split(",")[0]
    .trim();
  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/u.test(host)
        ? "http"
        : "https";
  let metadataBase: URL;
  try {
    metadataBase = new URL(`${protocol}://${host}`);
  } catch {
    metadataBase = new URL("http://localhost:3000");
  }
  const socialImage = new URL("/og.png", metadataBase).toString();
  return {
    ...baseMetadata,
    metadataBase,
    openGraph: {
      title: copy.metadata.socialTitle,
      description: copy.metadata.socialDescription,
      type: "website",
      siteName: copy.metadata.applicationName,
      images: [
        {
          url: socialImage,
          width: 1730,
          height: 909,
          alt: copy.metadata.socialImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.metadata.socialTitle,
      description: copy.metadata.socialDescription,
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07100f" },
    { media: "(prefers-color-scheme: light)", color: "#f2f0e9" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={defaultLocale}
      dir={localeDirection(defaultLocale)}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
