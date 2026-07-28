"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "../lib/supabase";

export type Post = {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  date: string;
  read: string;
  likes: number;
  featured?: boolean;
};

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "reader" | "admin";
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

const fallbackPosts: Post[] = [
  {
    id: "local-1",
    category: "Sống chậm",
    title: "Học cách ở yên giữa một thế giới luôn vội",
    excerpt: "Đôi khi, tiến về phía trước bắt đầu bằng việc cho mình được dừng lại và lắng nghe.",
    content: "Có những ngày ta đi qua mọi thứ thật nhanh. Nhanh đến mức quên mất một tách trà cũng cần thời gian để ngấm, một câu chuyện cũng cần khoảng lặng để được hiểu.\n\nTôi từng nghĩ bận rộn là bằng chứng của một cuộc sống có ý nghĩa. Nhưng có một ranh giới mỏng giữa chuyển động và trưởng thành.\n\n## Khoảng trống không phải là lãng phí\n\nKhi thôi lấp đầy mọi phút giây, ta bắt đầu nghe thấy những điều rất nhỏ. Sự tĩnh lặng dọn một chỗ đủ rộng để câu trả lời có thể xuất hiện.",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
    date: "24.07.2026",
    read: "8 phút đọc",
    likes: 128,
    featured: true,
  },
  {
    id: "local-2",
    category: "Công nghệ",
    title: "AI không lấy đi sự sáng tạo — nó đổi cách ta bắt đầu",
    excerpt: "Một góc nhìn bình tĩnh hơn về công cụ, ý tưởng và phần việc vẫn thuộc về con người.",
    content: "Công cụ mới không thay thế sự tò mò. Nó giúp ta thử nhanh hơn, nhưng lựa chọn điều gì đáng kể vẫn là công việc của con người.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3f06f85e504b3?auto=format&fit=crop&w=1200&q=85",
    date: "20.07.2026",
    read: "6 phút đọc",
    likes: 96,
  },
  {
    id: "local-3",
    category: "Sách",
    title: "5 cuốn sách để đọc trong những ngày cần một khoảng thở",
    excerpt: "Những trang viết dịu dàng, không hứa giải quyết tất cả nhưng biết cách ngồi cạnh bạn.",
    content: "Một cuốn sách hay đôi khi không đưa ra câu trả lời. Nó chỉ ở cạnh ta đủ lâu để câu hỏi trở nên sáng rõ hơn.",
    image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1200&q=85",
    date: "17.07.2026",
    read: "5 phút đọc",
    likes: 74,
  },
];

const categories = ["Tất cả", "Công nghệ", "Sách", "Du lịch", "Sống chậm", "Ghi chép"];

function mapPost(row: Record<string, unknown>): Post {
  const published = row.published_at ? new Date(String(row.published_at)) : new Date(String(row.created_at));
  const content = String(row.content ?? "");
  return {
    id: String(row.id),
    category: String(row.category ?? "Ghi chép"),
    title: String(row.title),
    excerpt: String(row.excerpt ?? ""),
    content,
    image: String(row.cover_url || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1400&q=85"),
    date: published.toLocaleDateString("vi-VN"),
    read: `${Math.max(1, Math.ceil(content.split(/\s+/).length / 220))} phút đọc`,
    likes: Number(row.like_count ?? 0),
  };
}

export function BlogExperience() {
  const [category, setCategory] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>(fallbackPosts);
  const [active, setActive] = useState<Post | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const loadUser = async (nextUser: User | null) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", nextUser.id).single();
      setProfile(data as Profile | null);
    };

    supabase.auth.getUser().then(({ data }) => loadUser(data.user));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => loadUser(session?.user ?? null));

    supabase
      .from("posts")
      .select("*, post_likes(count)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        if (data?.length) {
          setPosts(data.map((row) => mapPost({ ...row, like_count: row.post_likes?.[0]?.count ?? 0 })));
        }
      });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory = category === "Tất cả" || post.category === category;
      return matchesCategory && (!value || `${post.title} ${post.excerpt} ${post.category}`.toLowerCase().includes(value));
    });
  }, [category, posts, query]);

  const accountControl = (
    <div className="account-menu-wrap">
      <AccountButton
        user={user}
        profile={profile}
        onClick={() => user ? setProfileOpen((open) => !open) : setLoginOpen(true)}
      />
      {profileOpen && user && <ProfileMenu user={user} profile={profile} onClose={() => setProfileOpen(false)} />}
    </div>
  );

  if (active) {
    return (
      <>
        <ArticleView
          post={active}
          posts={posts}
          user={user}
          profile={profile}
          accountButton={accountControl}
          onBack={() => setActive(null)}
          onRelated={setActive}
        />
        {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
      </>
    );
  }

  const featured = posts[0];
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Random Story"><img src="/logo-original-font.png" alt="random story." /></a>
        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Điều hướng chính">
          <a href="#stories">Bài viết</a>
          <a href="#topics">Chủ đề</a>
          <a href="#about">Về chúng tôi</a>
        </nav>
        <div className="header-actions">
          <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm bài viết..." aria-label="Tìm bài viết" /></label>
          {accountControl}
          <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Mở menu">☰</button>
        </div>
      </header>

      <section id="top" className="hero">
        <div className="hero-image" role="img" aria-label="Khung cảnh thiên nhiên yên bình" />
        <div className="hero-overlay" />
        <div className="hero-copy">
          <span className="eyebrow light">Bài viết nổi bật · {featured.category}</span>
          <h1>{featured.title}</h1>
          <p>{featured.excerpt}</p>
          <button className="text-link light-link" onClick={() => setActive(featured)}>Đọc câu chuyện <span>↗</span></button>
        </div>
        <p className="hero-note">Một blog về những điều đáng để chậm lại.</p>
      </section>

      <section id="stories" className="content-section">
        <div className="section-heading">
          <div><span className="eyebrow">Mới trên Random Story</span><h2>Những câu chuyện gần đây</h2></div>
          <p>Góc nhỏ dành cho công nghệ, sách, những chuyến đi và cả những ngày rất bình thường.</p>
        </div>
        <div id="topics" className="filter-row" role="group" aria-label="Lọc theo chủ đề">
          {categories.map((item) => <button key={item} className={category === item ? "filter active" : "filter"} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        {filtered.length ? <div className="post-grid">{filtered.map((post, index) => <PostCard key={post.id} post={post} index={index} onOpen={() => setActive(post)} />)}</div> : (
          <div className="empty-state"><span>⌕</span><h3>Chưa tìm thấy câu chuyện phù hợp</h3><p>Thử một từ khóa hoặc chủ đề khác nhé.</p></div>
        )}
      </section>

      <section id="about" className="about-section">
        <div className="about-mark">n</div>
        <div><span className="eyebrow light">Về Random Story</span><h2>Một khoảng lặng nhỏ<br />giữa internet rộng lớn.</h2></div>
        <div className="about-copy"><p>Random Story được tạo nên để lưu lại những điều đáng nhớ: một ý tưởng hay, một cuốn sách đẹp, một nơi chốn khiến lòng mình dịu lại.</p></div>
      </section>

      <Newsletter />
      <Footer />
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </main>
  );
}

function AccountButton({ user, profile, onClick }: { user: User | null; profile: Profile | null; onClick: () => void }) {
  if (!user) return <button className="login-btn" onClick={onClick}>Đăng nhập</button>;
  const name = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Bạn";
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <button className="account-chip" onClick={onClick}>
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{initial}</span>}
      <strong>Xin chào! {name}</strong>
    </button>
  );
}

function ProfileMenu({ user, profile, onClose }: { user: User; profile: Profile | null; onClose: () => void }) {
  const name = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Bạn";
  const signOut = async () => {
    await createSupabaseBrowserClient().auth.signOut();
    onClose();
  };
  return (
      <section className="profile-menu" role="dialog" aria-label="Hồ sơ">
        <div className="profile-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : name.charAt(0).toUpperCase()}</div>
        <div className="profile-menu-copy"><strong>{name}</strong><small>{user.email}</small></div>
        {profile?.role === "admin" && <a className="profile-menu-link" href="/admin">Quản trị</a>}
        <button className="profile-menu-link danger-link" onClick={signOut}>Đăng xuất</button>
      </section>
  );
}

function PostCard({ post, index, onOpen }: { post: Post; index: number; onOpen: () => void }) {
  return (
    <article className={`post-card card-${index % 3}`}>
      <button className="card-image" onClick={onOpen} aria-label={`Đọc ${post.title}`}><img src={post.image} alt="" /><span>{String(index + 1).padStart(2, "0")}</span></button>
      <div className="post-meta"><span>{post.category}</span><span>{post.date} · {post.read}</span></div>
      <h3><button onClick={onOpen}>{post.title}</button></h3><p>{post.excerpt}</p>
      <button className="arrow-btn" onClick={onOpen} aria-label="Đọc bài viết">↗</button>
    </article>
  );
}

function ArticleView({ post, posts, user, profile, accountButton, onBack, onRelated }: {
  post: Post; posts: Post[]; user: User | null; profile: Profile | null; accountButton: React.ReactNode;
  onBack: () => void; onRelated: (post: Post) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [reactionCount, setReactionCount] = useState(post.likes);
  const isDatabasePost = !post.id.startsWith("local-");

  const loadSocial = async () => {
    if (!isDatabasePost) return;
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.from("comments").select("id,content,created_at,profiles(full_name,avatar_url)").eq("post_id", post.id).eq("is_approved", true).order("created_at");
    setComments((data ?? []) as unknown as Comment[]);
    if (user) {
      const { data: like } = await supabase.from("post_likes").select("post_id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle();
      setLiked(Boolean(like));
    }
  };

  useEffect(() => {
    const refresh = async () => {
      await loadSocial();
    };
    void refresh();
    // loadSocial intentionally reloads whenever the active post or signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, user?.id]);

  const toggleLike = async () => {
    if (!user || !isDatabasePost) return;
    const supabase = createSupabaseBrowserClient();
    if (liked) {
      const { error } = await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      if (!error) { setLiked(false); setReactionCount((value) => Math.max(0, value - 1)); }
    } else {
      const { error } = await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      if (!error) { setLiked(true); setReactionCount((value) => value + 1); }
    }
  };

  const addComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !comment.trim() || !isDatabasePost) return;
    const { error } = await createSupabaseBrowserClient().from("comments").insert({ post_id: post.id, author_id: user.id, content: comment.trim() });
    if (!error) { setComment(""); await loadSocial(); }
  };

  return (
    <main className="article-page">
      <header className="article-header">
        <button className="brand" onClick={onBack}><img src="/logo-original-font.png" alt="random story." /></button>
        <button className="back-btn" onClick={onBack}>← Trở về trang chủ</button>
        {accountButton}
      </header>
      <article>
        <div className="article-intro"><span className="eyebrow">{post.category}</span><h1>{post.title}</h1><p>{post.excerpt}</p><div className="author-row"><div className="avatar">HM</div><div><strong>Hùng Mạnh</strong><span>{post.date} · {post.read}</span></div></div></div>
        <img className="article-cover" src={post.image} alt="" />
        <div className="article-body">
          {post.content.split(/\n\n+/).map((paragraph, index) => paragraph.startsWith("## ") ? <h2 key={index}>{paragraph.slice(3)}</h2> : <p className={index === 0 ? "lead" : ""} key={index}>{paragraph}</p>)}
          {user && isDatabasePost && (
            <>
              <div className="article-actions"><button className={liked ? "liked" : ""} onClick={toggleLike}>{liked ? "♥" : "♡"} {reactionCount} lượt thích</button><button onClick={() => navigator.clipboard?.writeText(window.location.href)}>↗ Chia sẻ</button></div>
              <section className="comments">
                <span className="eyebrow">Trò chuyện</span><h2>Để lại một suy nghĩ</h2>
                <form className="comment-form" onSubmit={addComment}><textarea required maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={`Chia sẻ suy nghĩ của bạn, ${profile?.full_name || "bạn"}...`} /><button className="primary-btn">Gửi bình luận</button></form>
                <div className="comment-list">{comments.map((item) => <article key={item.id}><strong>{item.profiles?.full_name || "Độc giả"}</strong><time>{new Date(item.created_at).toLocaleDateString("vi-VN")}</time><p>{item.content}</p></article>)}</div>
              </section>
            </>
          )}
        </div>
      </article>
      <section className="related"><div className="section-heading"><div><span className="eyebrow">Đọc tiếp</span><h2>Có thể bạn sẽ thích</h2></div></div><div className="post-grid">{posts.filter((item) => item.id !== post.id).slice(0, 3).map((item, index) => <PostCard key={item.id} post={item} index={index} onOpen={() => onRelated(item)} />)}</div></section>
      <Footer />
    </main>
  );
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setMessage("");
    const supabase = createSupabaseBrowserClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, name: fullName } } });
    setLoading(false);
    if (result.error) return setMessage(result.error.message);
    if (result.data.user && !result.data.session) return setMessage("Hãy kiểm tra email để xác nhận tài khoản.");
    onClose();
  };

  const loginWithGoogle = async () => {
    setLoading(true); setMessage("");
    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/`, queryParams: { access_type: "offline", prompt: "select_account" } },
    });
    if (error) { setLoading(false); setMessage(error.message); }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="login-modal" role="dialog" aria-modal="true" aria-label={mode === "login" ? "Đăng nhập Random Story" : "Tạo tài khoản Random Story"} onMouseDown={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Đóng">×</button>
        <img className="modal-logo" src="/logo-original-font.png" alt="random story." />
        <form onSubmit={submit}>
          {mode === "signup" && <label>Họ và tên<input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tên của bạn" /></label>}
          <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" /></label>
          <label>Mật khẩu<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label>
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Đang xử lý..." : "Tiếp tục"}</button>
        </form>
        <div className="modal-divider"><span>hoặc</span></div>
        <button className="google-btn" onClick={loginWithGoogle} disabled={loading}>G&nbsp;&nbsp; {loading ? "Đang chuyển hướng..." : "Tiếp tục với Google"}</button>
        <small>{mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"} <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Đăng ký miễn phí" : "Đăng nhập"}</button></small>
      </div>
    </div>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const subscribe = async (event: FormEvent) => {
    event.preventDefault();
    const { error } = await createSupabaseBrowserClient().from("newsletter_subscribers").upsert({ email });
    if (!error) setSent(true);
  };
  return <section className="newsletter"><span className="eyebrow">Thư từ Random Story</span><h2>Một lá thư nhỏ,<br />thỉnh thoảng thôi.</h2><p>Nhận những bài viết mới và vài điều hay ho được chúng tôi nhặt nhạnh trên đường.</p>{sent ? <div className="thanks">Cảm ơn bạn. Hẹn gặp trong lá thư tới! ✦</div> : <form onSubmit={subscribe}><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email của bạn" /><button>Đăng ký ↗</button></form>}</section>;
}

function Footer() {
  return <footer><a className="brand footer-brand" href="#top"><img src="/logo-original-font.png" alt="random story." /></a><p>Ghi lại điều đáng nhớ.<br />Chia sẻ điều đáng nghĩ.</p><div><a href="#stories">Bài viết</a><a href="#topics">Chủ đề</a><a href="#about">Về chúng tôi</a></div><div><a href="#">Instagram</a><a href="#">Threads</a><a href="mailto:hello@randomstory.vn">Email</a></div><small>© 2026 Random Story</small></footer>;
}
