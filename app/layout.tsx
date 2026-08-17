import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Random Story — Lịch sử, khoa học và những câu chuyện đáng khám phá",
  description: "Khám phá những câu chuyện về lịch sử, khoa học, con người và thế giới quanh ta qua góc nhìn gần gũi, dễ hiểu.",
  icons: { icon: "/favicon-rounded.svg", shortcut: "/favicon-rounded.svg", apple: "/icon.jpg" },
  openGraph: {
    title: "Random Story — Lịch sử, khoa học và những câu chuyện đáng khám phá",
    description: "Những câu chuyện thú vị về lịch sử, khoa học, con người và thế giới quanh ta.",
    images: [{ url: "/logo.jpg", width: 600, height: 600, alt: "Random Story" }],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Random Story — Lịch sử, khoa học và những câu chuyện đáng khám phá",
    description: "Những câu chuyện thú vị về lịch sử, khoa học, con người và thế giới quanh ta.",
    images: ["/logo.jpg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
