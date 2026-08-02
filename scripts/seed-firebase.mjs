import { readFile } from "node:fs/promises";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(await readFile(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8"));
initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const auth = getAuth();
const db = getFirestore();

const adminEmail = "hungmanh0206@gmail.com";
let admin;
try { admin = await auth.getUserByEmail(adminEmail); }
catch {
  admin = await auth.createUser({ email: adminEmail, password: process.env.FIREBASE_ADMIN_PASSWORD, displayName: "Hùng Mạnh", emailVerified: true });
}
await auth.updateUser(admin.uid, { password: process.env.FIREBASE_ADMIN_PASSWORD, displayName: "Hùng Mạnh", emailVerified: true });
await auth.setCustomUserClaims(admin.uid, { admin: true });
await db.collection("users").doc(admin.uid).set({ email: adminEmail, full_name: "Hùng Mạnh", avatar_url: null, role: "admin", updatedAt: FieldValue.serverTimestamp() }, { merge: true });

const categories = [
  ["cong-nghe", "Công nghệ"], ["sach", "Sách"], ["du-lich", "Du lịch"],
  ["song-cham", "Sống chậm"], ["ghi-chep", "Ghi chép"],
];
for (const [slug, name] of categories) await db.collection("categories").doc(slug).set({ name, slug, description: "", updatedAt: FieldValue.serverTimestamp() }, { merge: true });

const posts = [
  {
    id: "hoc-cach-o-yen-giua-mot-the-gioi-luon-voi", title: "Học cách ở yên giữa một thế giới luôn vội", slug: "hoc-cach-o-yen-giua-mot-the-gioi-luon-voi",
    excerpt: "Đôi khi, tiến về phía trước bắt đầu bằng việc cho mình được dừng lại và lắng nghe.", category: "Sống chậm",
    content: "Có những ngày ta đi qua mọi thứ thật nhanh. Nhanh đến mức quên mất một tách trà cũng cần thời gian để ngấm, một câu chuyện cũng cần khoảng lặng để được hiểu.\n\n## Khoảng trống không phải là lãng phí\n\nKhi thôi lấp đầy mọi phút giây, ta bắt đầu nghe thấy những điều rất nhỏ.",
    cover_url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85", published_at: "2026-07-24T00:00:00.000Z",
  },
  {
    id: "ai-khong-lay-di-su-sang-tao", title: "AI không lấy đi sự sáng tạo — nó đổi cách ta bắt đầu", slug: "ai-khong-lay-di-su-sang-tao",
    excerpt: "Một góc nhìn bình tĩnh hơn về công cụ, ý tưởng và phần việc vẫn thuộc về con người.", category: "Công nghệ",
    content: "Công cụ mới không thay thế sự tò mò. Nó giúp ta thử nhanh hơn, nhưng lựa chọn điều gì đáng kể vẫn là công việc của con người.",
    cover_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85", published_at: "2026-07-20T00:00:00.000Z",
  },
  {
    id: "5-cuon-sach-cho-mot-khoang-tho", title: "5 cuốn sách để đọc trong những ngày cần một khoảng thở", slug: "5-cuon-sach-cho-mot-khoang-tho",
    excerpt: "Những trang viết dịu dàng, không hứa giải quyết tất cả nhưng biết cách ngồi cạnh bạn.", category: "Sách",
    content: "Một cuốn sách hay đôi khi không đưa ra câu trả lời. Nó chỉ ở cạnh ta đủ lâu để câu hỏi trở nên sáng rõ hơn.",
    cover_url: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1200&q=85", published_at: "2026-07-16T00:00:00.000Z",
  },
];
for (const post of posts) {
  const { id, ...data } = post;
  await db.collection("posts").doc(id).set({ ...data, author_id: admin.uid, status: "published", likeCount: 0, created_at: data.published_at, updated_at: new Date().toISOString(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

console.log(JSON.stringify({ projectId: serviceAccount.project_id, admin: adminEmail, categories: categories.length, posts: posts.length }, null, 2));
