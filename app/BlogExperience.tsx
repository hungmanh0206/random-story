"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase";

type Post = {
  id: number;
  category: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  read: string;
  likes: number;
  featured?: boolean;
};

const posts: Post[] = [
  {
    id: 1,
    category: "Sống chậm",
    title: "Học cách ở yên giữa một thế giới luôn vội",
    excerpt: "Đôi khi, tiến về phía trước bắt đầu bằng việc cho mình được dừng lại và lắng nghe.",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
    date: "24.07.2026",
    read: "8 phút đọc",
    likes: 128,
    featured: true,
  },
  {
    id: 2,
    category: "Công nghệ",
    title: "AI không lấy đi sự sáng tạo — nó đổi cách ta bắt đầu",
    excerpt: "Một góc nhìn bình tĩnh hơn về công cụ, ý tưởng và phần việc vẫn thuộc về con người.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85",
    date: "20.07.2026",
    read: "6 phút đọc",
    likes: 96,
  },
  {
    id: 3,
    category: "Sách",
    title: "5 cuốn sách để đọc trong những ngày cần một khoảng thở",
    excerpt: "Những trang viết dịu dàng, không hứa giải quyết tất cả nhưng biết cách ngồi cạnh bạn.",
    image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1200&q=85",
    date: "17.07.2026",
    read: "5 phút đọc",
    likes: 74,
  },
  {
    id: 4,
    category: "Du lịch",
    title: "Một buổi sáng không bản đồ ở Hội An",
    excerpt: "Đi bộ qua những con ngõ vàng, uống cà phê thật chậm và để thành phố tự kể chuyện.",
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=85",
    date: "12.07.2026",
    read: "7 phút đọc",
    likes: 153,
  },
  {
    id: 5,
    category: "Ghi chép",
    title: "Những điều nhỏ bé đã cứu một ngày rất dài",
    excerpt: "Một tin nhắn đúng lúc, mùi áo quần vừa phơi và bữa cơm còn nóng ở cuối ngày.",
    image: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=85",
    date: "08.07.2026",
    read: "4 phút đọc",
    likes: 61,
  },
  {
    id: 6,
    category: "Công nghệ",
    title: "Thiết kế một góc số ít xao nhãng hơn",
    excerpt: "Những thay đổi nhỏ giúp màn hình phục vụ sự tập trung, thay vì liên tục gọi tên ta.",
    image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=85",
    date: "02.07.2026",
    read: "6 phút đọc",
    likes: 88,
  },
];

const categories = ["Tất cả", "Công nghệ", "Sách", "Du lịch", "Sống chậm", "Ghi chép"];

export function BlogExperience() {
  const [category, setCategory] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Post | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory = category === "Tất cả" || post.category === category;
      const matchesQuery = !value || `${post.title} ${post.excerpt} ${post.category}`.toLowerCase().includes(value);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const openPost = (post: Post) => {
    setActive(post);
    setLiked(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (adminOpen) {
    return <AdminPanel onExit={() => setAdminOpen(false)} />;
  }

  if (active) {
    return (
      <ArticleView
        post={active}
        liked={liked}
        onLike={() => userEmail ? setLiked(!liked) : setLoginOpen(true)}
        onBack={() => setActive(null)}
        onRelated={openPost}
        loginOpen={loginOpen}
        setLoginOpen={setLoginOpen}
      />
    );
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Random Story"><img src="/logo.jpg" alt="random story." /></a>
        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Điều hướng chính">
          <a href="#stories">Bài viết</a>
          <a href="#topics">Chủ đề</a>
          <a href="#about">Về chúng tôi</a>
          <button className="nav-link" onClick={() => setAdminOpen(true)}>Quản trị</button>
        </nav>
        <div className="header-actions">
          <label className="search">
            <span>⌕</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm bài viết..." aria-label="Tìm bài viết" />
          </label>
          <button className="login-btn" onClick={() => setLoginOpen(true)}>{userEmail ? userEmail.split("@")[0] : "Đăng nhập"}</button>
          <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Mở menu">☰</button>
        </div>
      </header>

      <section id="top" className="hero">
        <div className="hero-image" role="img" aria-label="Khung cảnh thiên nhiên yên bình" />
        <div className="hero-overlay" />
        <div className="hero-copy">
          <span className="eyebrow light">Bài viết nổi bật · Sống chậm</span>
          <h1>Học cách ở yên giữa một thế giới luôn vội</h1>
          <p>Đôi khi, tiến về phía trước bắt đầu bằng việc cho mình được dừng lại và lắng nghe.</p>
          <button className="text-link light-link" onClick={() => openPost(posts[0])}>Đọc câu chuyện <span>↗</span></button>
        </div>
        <p className="hero-note">Một blog về những điều đáng để chậm lại.</p>
      </section>

      <section id="stories" className="content-section">
        <div className="section-heading">
          <div>
          <span className="eyebrow">Mới trên Random Story</span>
            <h2>Những câu chuyện gần đây</h2>
          </div>
          <p>Góc nhỏ dành cho công nghệ, sách, những chuyến đi và cả những ngày rất bình thường.</p>
        </div>

        <div id="topics" className="filter-row" role="group" aria-label="Lọc theo chủ đề">
          {categories.map((item) => (
            <button key={item} className={category === item ? "filter active" : "filter"} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>

        {filtered.length ? (
          <div className="post-grid">
            {filtered.map((post, index) => <PostCard key={post.id} post={post} index={index} onOpen={() => openPost(post)} />)}
          </div>
        ) : (
          <div className="empty-state"><span>⌕</span><h3>Chưa tìm thấy câu chuyện phù hợp</h3><p>Thử một từ khóa hoặc chủ đề khác nhé.</p></div>
        )}
      </section>

      <section id="about" className="about-section">
        <div className="about-mark">n</div>
        <div>
          <span className="eyebrow light">Về Random Story</span>
          <h2>Một khoảng lặng nhỏ<br />giữa internet rộng lớn.</h2>
        </div>
        <div className="about-copy">
          <p>Random Story được tạo nên để lưu lại những điều đáng nhớ: một ý tưởng hay, một cuốn sách đẹp, một nơi chốn khiến lòng mình dịu lại.</p>
          <a className="text-link light-link" href="mailto:hello@randomstory.vn">Viết thư cho chúng tôi <span>↗</span></a>
        </div>
      </section>

      <Newsletter />
      <Footer onAdmin={() => setAdminOpen(true)} />
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onSuccess={setUserEmail} />}
    </main>
  );
}

function PostCard({ post, index, onOpen }: { post: Post; index: number; onOpen: () => void }) {
  return (
    <article className={`post-card card-${index % 3}`}>
      <button className="card-image" onClick={onOpen} aria-label={`Đọc ${post.title}`}>
        <img src={post.image} alt="" />
        <span>{String(index + 1).padStart(2, "0")}</span>
      </button>
      <div className="post-meta"><span>{post.category}</span><span>{post.date} · {post.read}</span></div>
      <h3><button onClick={onOpen}>{post.title}</button></h3>
      <p>{post.excerpt}</p>
      <button className="arrow-btn" onClick={onOpen} aria-label="Đọc bài viết">↗</button>
    </article>
  );
}

function ArticleView({ post, onBack, onLike, onRelated, liked, loginOpen, setLoginOpen }: {
  post: Post; liked: boolean; onBack: () => void; onLike: () => void; onRelated: (post: Post) => void;
  loginOpen: boolean; setLoginOpen: (value: boolean) => void;
}) {
  const related = posts.filter((item) => item.id !== post.id).slice(0, 3);
  return (
    <main className="article-page">
      <header className="article-header">
        <button className="brand" onClick={onBack}><img src="/logo.jpg" alt="random story." /></button>
        <button className="back-btn" onClick={onBack}>← Trở về trang chủ</button>
        <button className="login-btn" onClick={() => setLoginOpen(true)}>Đăng nhập</button>
      </header>
      <article>
        <div className="article-intro">
          <span className="eyebrow">{post.category}</span>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          <div className="author-row"><div className="avatar">HN</div><div><strong>Hà Nguyên</strong><span>{post.date} · {post.read}</span></div></div>
        </div>
        <img className="article-cover" src={post.image} alt="" />
        <div className="article-body">
          <p className="lead">Có những ngày ta đi qua mọi thứ thật nhanh. Nhanh đến mức quên mất một tách trà cũng cần thời gian để ngấm, một câu chuyện cũng cần khoảng lặng để được hiểu.</p>
          <p>Tôi từng nghĩ bận rộn là bằng chứng của một cuộc sống có ý nghĩa. Lịch kín, tin nhắn nối tiếp và những danh sách chưa bao giờ hết việc khiến ta cảm thấy mình đang tiến lên. Nhưng có một ranh giới mỏng giữa chuyển động và trưởng thành.</p>
          <h2>Khoảng trống không phải là lãng phí</h2>
          <p>Khi thôi lấp đầy mọi phút giây, ta bắt đầu nghe thấy những điều rất nhỏ: tiếng gió ngoài cửa, nhịp thở của mình, hay một ý nghĩ đã nằm yên quá lâu. Sự tĩnh lặng không cho ta câu trả lời ngay. Nó chỉ dọn một chỗ đủ rộng để câu trả lời có thể xuất hiện.</p>
          <blockquote>“Chậm lại không phải để tụt phía sau. Chậm lại là để biết mình đang đi đâu.”</blockquote>
          <p>Hôm nay, thử để điện thoại ở một căn phòng khác. Đi một đoạn đường không nghe gì cả. Ăn một bữa mà không nhìn màn hình. Những khoảng trống bé xíu ấy có thể là nơi bạn gặp lại chính mình.</p>
          <div className="tags"><span>#sống-chậm</span><span>#ghi-chép</span><span>#thực-hành</span></div>
          <div className="article-actions">
            <button onClick={onLike}>♡ {liked ? post.likes + 1 : post.likes} lượt thích</button>
            <button onClick={() => navigator.clipboard?.writeText(window.location.href)}>↗ Chia sẻ</button>
          </div>
          <section className="comments">
            <span className="eyebrow">Trò chuyện</span>
            <h2>Để lại một suy nghĩ</h2>
            <p>Đăng nhập để tham gia cuộc trò chuyện cùng những độc giả khác.</p>
            <button className="primary-btn" onClick={() => setLoginOpen(true)}>Đăng nhập để bình luận</button>
          </section>
        </div>
      </article>
      <section className="related">
        <div className="section-heading"><div><span className="eyebrow">Đọc tiếp</span><h2>Có thể bạn sẽ thích</h2></div></div>
        <div className="post-grid">{related.map((item, index) => <PostCard key={item.id} post={item} index={index} onOpen={() => onRelated(item)} />)}</div>
      </section>
      <Footer onAdmin={() => {}} />
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onSuccess={() => setLoginOpen(false)} />}
    </main>
  );
}

function LoginModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = createSupabaseBrowserClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (result.data.user && !result.data.session) {
      setMessage("Hãy kiểm tra email để xác nhận tài khoản.");
      return;
    }

    onSuccess(result.data.user?.email ?? email);
    onClose();
  };

  const loginWithGoogle = async () => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setMessage(error.message);
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" onMouseDown={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Đóng">×</button>
        <img className="modal-logo" src="/logo.jpg" alt="random story." />
        <span className="eyebrow">{mode === "login" ? "Chào mừng trở lại" : "Bắt đầu câu chuyện"}</span>
        <h2 id="login-title">{mode === "login" ? "Đăng nhập" : "Tạo tài khoản"} Random Story</h2>
        <p>Để lưu bài yêu thích và cùng trò chuyện.</p>
        <form onSubmit={submit}>
          <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@example.com" /></label>
          <label>Mật khẩu<input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></label>
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Đang xử lý..." : "Tiếp tục"}</button>
        </form>
        <div className="modal-divider"><span>hoặc</span></div>
        <button className="google-btn" onClick={loginWithGoogle}>G&nbsp;&nbsp; Tiếp tục với Google</button>
        <small>{mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"} <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Đăng ký miễn phí" : "Đăng nhập"}</button></small>
      </div>
    </div>
  );
}

function Newsletter() {
  const [sent, setSent] = useState(false);
  return (
    <section className="newsletter">
      <span className="eyebrow">Thư từ Random Story</span>
      <h2>Một lá thư nhỏ,<br />thỉnh thoảng thôi.</h2>
      <p>Nhận những bài viết mới và vài điều hay ho được chúng tôi nhặt nhạnh trên đường.</p>
      {sent ? <div className="thanks">Cảm ơn bạn. Hẹn gặp trong lá thư tới! ✦</div> : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
          <input type="email" required placeholder="Email của bạn" aria-label="Email của bạn" />
          <button type="submit">Đăng ký ↗</button>
        </form>
      )}
      <small>Không spam. Có thể rời đi bất cứ lúc nào.</small>
    </section>
  );
}

function Footer({ onAdmin }: { onAdmin: () => void }) {
  return (
    <footer>
      <a className="brand" href="#top"><img src="/logo.jpg" alt="random story." /></a>
      <p>Ghi lại điều đáng nhớ.<br />Chia sẻ điều đáng nghĩ.</p>
      <div><a href="#stories">Bài viết</a><a href="#topics">Chủ đề</a><a href="#about">Về chúng tôi</a><button onClick={onAdmin}>Quản trị</button></div>
      <div><a href="#">Instagram</a><a href="#">Threads</a><a href="mailto:hello@randomstory.vn">Email</a></div>
      <small>© 2026 Random Story. Làm bằng sự tử tế tại Việt Nam.</small>
    </footer>
  );
}

function AdminPanel({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState("Tổng quan");
  const items = ["Tổng quan", "Bài viết", "Chủ đề", "Bình luận", "Độc giả"];
  return (
    <div className="admin-shell">
      <aside>
        <button className="brand admin-brand" onClick={onExit}><img src="/logo.jpg" alt="random story." /></button>
        <p>Trang quản trị</p>
        <nav>{items.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
        <button className="admin-exit" onClick={onExit}>← Xem trang blog</button>
      </aside>
      <section className="admin-main">
        <header><div><span className="eyebrow">28 tháng 7, 2026</span><h1>{tab}</h1></div><button className="primary-btn">+ Bài viết mới</button></header>
        {tab === "Tổng quan" ? (
          <>
            <div className="stat-grid"><div><span>Bài đã đăng</span><strong>24</strong><small>+3 tháng này</small></div><div><span>Lượt thích</span><strong>1.280</strong><small>+18% so với tháng trước</small></div><div><span>Bình luận mới</span><strong>36</strong><small>8 chờ duyệt</small></div></div>
            <div className="admin-grid">
              <div className="admin-card"><div className="card-title"><h2>Bài viết gần đây</h2><button onClick={() => setTab("Bài viết")}>Xem tất cả</button></div>{posts.slice(0,4).map(p => <div className="admin-post" key={p.id}><img src={p.image} alt="" /><div><strong>{p.title}</strong><span>{p.category} · {p.date}</span></div><b>Đã đăng</b></div>)}</div>
              <div className="admin-card"><div className="card-title"><h2>Hoạt động</h2></div><div className="chart"><i style={{height:"35%"}}/><i style={{height:"55%"}}/><i style={{height:"42%"}}/><i style={{height:"75%"}}/><i style={{height:"64%"}}/><i style={{height:"90%"}}/><i style={{height:"70%"}}/></div><div className="chart-labels"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div></div>
            </div>
          </>
        ) : (
          <div className="admin-card table-card"><div className="card-title"><h2>Quản lý {tab.toLowerCase()}</h2><label className="search"><span>⌕</span><input placeholder="Tìm kiếm..." /></label></div><table><thead><tr><th>Tên / Nội dung</th><th>Trạng thái</th><th>Cập nhật</th><th></th></tr></thead><tbody>{posts.slice(0,5).map((p,i)=><tr key={p.id}><td><strong>{tab === "Chủ đề" ? p.category : p.title}</strong></td><td><span className="status">{i === 2 ? "Bản nháp" : "Đang hiển thị"}</span></td><td>{p.date}</td><td>•••</td></tr>)}</tbody></table></div>
        )}
      </section>
    </div>
  );
}
