import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Random Story — Mỗi câu chuyện đều đáng nhớ",
  description: "Một blog về công nghệ, sách, những chuyến đi và những điều đáng để chậm lại.",
  openGraph: {
    title: "Random Story — Mỗi câu chuyện đều đáng nhớ",
    description: "Một khoảng lặng nhỏ giữa internet rộng lớn.",
    images: [{ url: "/logo.jpg", width: 600, height: 600, alt: "Random Story" }],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Random Story — Mỗi câu chuyện đều đáng nhớ",
    description: "Một khoảng lặng nhỏ giữa internet rộng lớn.",
    images: ["/logo.jpg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
