import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const adminEmail = "hungmanh0206@gmail.com";
const seeds = [
  {
    title: "Học cách ở yên giữa một thế giới luôn vội",
    slug: "hoc-cach-o-yen-giua-mot-the-gioi-luon-voi",
    excerpt: "Đôi khi, tiến về phía trước bắt đầu bằng việc cho mình được dừng lại và lắng nghe.",
    content: "Có những ngày ta đi qua mọi thứ thật nhanh. Nhanh đến mức quên mất một tách trà cũng cần thời gian để ngấm, một câu chuyện cũng cần khoảng lặng để được hiểu.\n\nTôi từng nghĩ bận rộn là bằng chứng của một cuộc sống có ý nghĩa. Nhưng có một ranh giới mỏng giữa chuyển động và trưởng thành.\n\n## Khoảng trống không phải là lãng phí\n\nKhi thôi lấp đầy mọi phút giây, ta bắt đầu nghe thấy những điều rất nhỏ. Sự tĩnh lặng dọn một chỗ đủ rộng để câu trả lời có thể xuất hiện.",
    category: "Sống chậm",
    cover_url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
  },
  {
    title: "AI không lấy đi sự sáng tạo — nó đổi cách ta bắt đầu",
    slug: "ai-khong-lay-di-su-sang-tao",
    excerpt: "Một góc nhìn bình tĩnh hơn về công cụ, ý tưởng và phần việc vẫn thuộc về con người.",
    content: "Công cụ mới không thay thế sự tò mò. Nó giúp ta thử nhanh hơn, nhưng lựa chọn điều gì đáng kể vẫn là công việc của con người.\n\n## Công cụ không phải là ý tưởng\n\nChất lượng của một tác phẩm vẫn đến từ trải nghiệm, sự quan sát và những quyết định có chủ đích.",
    category: "Công nghệ",
    cover_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "5 cuốn sách để đọc trong những ngày cần một khoảng thở",
    slug: "5-cuon-sach-cho-mot-khoang-tho",
    excerpt: "Những trang viết dịu dàng, không hứa giải quyết tất cả nhưng biết cách ngồi cạnh bạn.",
    content: "Một cuốn sách hay đôi khi không đưa ra câu trả lời. Nó chỉ ở cạnh ta đủ lâu để câu hỏi trở nên sáng rõ hơn.\n\nĐọc chậm cũng là một cách để lắng nghe chính mình.",
    category: "Sách",
    cover_url: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1200&q=85",
  },
];

const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
if (usersError) throw usersError;
const admin = users.users.find((user) => user.email === adminEmail);
if (!admin) throw new Error(`Không tìm thấy tài khoản ${adminEmail}`);

const rows = seeds.map((post, index) => ({
  ...post,
  author_id: admin.id,
  status: "published",
  published_at: new Date(Date.UTC(2026, 6, 24 - index * 4)).toISOString(),
}));

const { error } = await supabase.from("posts").upsert(rows, { onConflict: "slug" });
if (error) throw error;
console.log(`Seeded ${rows.length} posts for ${adminEmail}`);
