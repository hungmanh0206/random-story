"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut as firebaseSignOut, updateProfile } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query as firestoreQuery, serverTimestamp, setDoc, where } from "firebase/firestore";
import { firebaseAuth, firestore } from "../lib/firebase";
import { StageIcon } from "./StageIcon";

export type Post = {
  id: string;
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  date: string;
  read: string;
  likes: number;
  sortDate: number;
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
  author_id: string;
  parent_id: string | null;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

const fallbackPosts: Post[] = [
  {
    id: "local-1",
    slug: "hoc-cach-o-yen-giua-mot-the-gioi-luon-voi",
    category: "Sống chậm",
    title: "Học cách ở yên giữa một thế giới luôn vội",
    excerpt: "Đôi khi, tiến về phía trước bắt đầu bằng việc cho mình được dừng lại và lắng nghe.",
    content: "Có những ngày ta đi qua mọi thứ thật nhanh. Nhanh đến mức quên mất một tách trà cũng cần thời gian để ngấm, một câu chuyện cũng cần khoảng lặng để được hiểu.\n\nTôi từng nghĩ bận rộn là bằng chứng của một cuộc sống có ý nghĩa. Nhưng có một ranh giới mỏng giữa chuyển động và trưởng thành.\n\n## Khoảng trống không phải là lãng phí\n\nKhi thôi lấp đầy mọi phút giây, ta bắt đầu nghe thấy những điều rất nhỏ. Sự tĩnh lặng dọn một chỗ đủ rộng để câu trả lời có thể xuất hiện.",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
    date: "24.07.2026",
    read: "8 phút đọc",
    likes: 128,
    sortDate: new Date("2026-07-24").getTime(),
    featured: true,
  },
  {
    id: "local-2",
    slug: "ai-khong-lay-di-su-sang-tao",
    category: "Công nghệ",
    title: "AI không lấy đi sự sáng tạo — nó đổi cách ta bắt đầu",
    excerpt: "Một góc nhìn bình tĩnh hơn về công cụ, ý tưởng và phần việc vẫn thuộc về con người.",
    content: "Công cụ mới không thay thế sự tò mò. Nó giúp ta thử nhanh hơn, nhưng lựa chọn điều gì đáng kể vẫn là công việc của con người.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3f06f85e504b3?auto=format&fit=crop&w=1200&q=85",
    date: "20.07.2026",
    read: "6 phút đọc",
    likes: 96,
    sortDate: new Date("2026-07-20").getTime(),
  },
  {
    id: "local-3",
    slug: "5-cuon-sach-cho-mot-khoang-tho",
    category: "Sách",
    title: "5 cuốn sách để đọc trong những ngày cần một khoảng thở",
    excerpt: "Những trang viết dịu dàng, không hứa giải quyết tất cả nhưng biết cách ngồi cạnh bạn.",
    content: "Một cuốn sách hay đôi khi không đưa ra câu trả lời. Nó chỉ ở cạnh ta đủ lâu để câu hỏi trở nên sáng rõ hơn.",
    image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1200&q=85",
    date: "17.07.2026",
    read: "5 phút đọc",
    likes: 74,
    sortDate: new Date("2026-07-17").getTime(),
  },
];

const fallbackCategories = ["Tất cả", "Công nghệ", "Sách", "Du lịch", "Sống chậm", "Ghi chép"];

function mapPost(row: Record<string, unknown>): Post {
  const rawPublished = row.publishedAt ?? row.published_at ?? row.createdAt ?? row.created_at;
  const published = rawPublished && typeof rawPublished === "object" && "toDate" in rawPublished
    ? (rawPublished as { toDate: () => Date }).toDate()
    : new Date(String(rawPublished ?? Date.now()));
  const content = String(row.content ?? "");
  return {
    id: String(row.id),
    slug: String(row.slug ?? row.id),
    category: String(row.category ?? "Ghi chép"),
    title: String(row.title),
    excerpt: String(row.excerpt ?? ""),
    content,
    image: String(row.cover_url ?? row.coverUrl ?? "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1400&q=85"),
    date: published.toLocaleDateString("vi-VN"),
    read: `${Math.max(1, Math.ceil(content.split(/\s+/).length / 220))} phút đọc`,
    likes: Number(row.likeCount ?? row.like_count ?? 0),
    sortDate: published.getTime(),
  };
}

export function BlogExperience() {
  const [category, setCategory] = useState("Tất cả");
  const [categories, setCategories] = useState(fallbackCategories);
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [posts, setPosts] = useState<Post[]>(fallbackPosts);
  const [active, setActive] = useState<Post | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const loadUser = async (nextUser: User | null) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        return;
      }
      try {
        const snapshot = await getDoc(doc(firestore, "users", nextUser.uid));
        setProfile(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Profile) : null);
      } catch {
        setProfile(null);
      }
    };

    const unsubscribe = onAuthStateChanged(firebaseAuth, loadUser);
    Promise.all([getDocs(firestoreQuery(collection(firestore, "posts"), where("status", "==", "published"))), getDocs(collection(firestore, "categories")), getDocs(collection(firestore, "likes")).catch(() => null)])
      .then(([postSnapshot, categorySnapshot, likeSnapshot]) => {
        if (!postSnapshot.empty) {
          const likeCounts = (likeSnapshot?.docs ?? []).reduce<Record<string, number>>((counts, item) => {
            const postId = String(item.data().postId ?? "");
            if (postId) counts[postId] = (counts[postId] ?? 0) + 1;
            return counts;
          }, {});
          const rows = postSnapshot.docs.map((item) => ({ ...mapPost({ id: item.id, ...item.data() }), likes: likeCounts[item.id] ?? 0 }));
          rows.sort((a, b) => b.date.localeCompare(a.date));
          setPosts(rows);
        }
        if (!categorySnapshot.empty) {
          const names = categorySnapshot.docs.map((item) => String(item.data().name).trim()).filter((name) => name && name !== "Tất cả");
          setCategories(["Tất cả", ...Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, "vi"))]);
        }
      })
      .catch(() => undefined);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const syncFeaturedLikes = (event: Event) => {
      const detail = (event as CustomEvent<{ postId: string; count: number }>).detail;
      setPosts((current) => current.map((post) => post.id === detail.postId ? { ...post, likes: detail.count } : post));
    };
    window.addEventListener("randomstory:like", syncFeaturedLikes);
    return () => window.removeEventListener("randomstory:like", syncFeaturedLikes);
  }, []);

  useEffect(() => {
    const closeTopicMenu = (event: PointerEvent) => {
      if (!(event.target as Element).closest(".nav-dropdown")) setTopicMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeTopicMenu);
    return () => document.removeEventListener("pointerdown", closeTopicMenu);
  }, []);

  useEffect(() => {
    const syncPostFromUrl = () => {
      const slug = new URLSearchParams(window.location.search).get("post");
      setActive(slug ? posts.find((post) => post.slug === slug) ?? null : null);
    };
    syncPostFromUrl();
    window.addEventListener("popstate", syncPostFromUrl);
    return () => window.removeEventListener("popstate", syncPostFromUrl);
  }, [posts]);

  useEffect(() => {
    const sessionId = sessionStorage.getItem("randomstory_session") || crypto.randomUUID();
    sessionStorage.setItem("randomstory_session", sessionId);
    const heartbeat = () => fetch("/api/analytics/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "presence", sessionId, userId: user?.uid ?? null }), keepalive: true }).catch(() => undefined);
    heartbeat();
    const timer = window.setInterval(heartbeat, 60_000);
    return () => window.clearInterval(timer);
  }, [user?.uid]);

  useEffect(() => {
    if (!active || active.id.startsWith("local-")) return;
    const viewKey = `randomstory_viewed_${active.id}`;
    if (sessionStorage.getItem(viewKey)) return;
    sessionStorage.setItem(viewKey, "1");
    fetch("/api/analytics/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "view", sessionId: sessionStorage.getItem("randomstory_session"), postId: active.id, title: active.title, category: active.category }), keepalive: true })
      .then((response) => { if (!response.ok) sessionStorage.removeItem(viewKey); })
      .catch(() => sessionStorage.removeItem(viewKey));
  }, [active]);

  const openPost = (post: Post) => {
    setActive(post);
    window.history.pushState({}, "", `/?post=${encodeURIComponent(post.slug)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closePost = () => {
    setActive(null);
    window.history.pushState({}, "", "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const chooseCategory = (item: string) => {
    setCategory(item);
    setTopicMenuOpen(false);
    setMenuOpen(false);
    window.setTimeout(() => document.getElementById("stories")?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory = category === "Tất cả" || post.category === category;
      return matchesCategory && (!value || `${post.title} ${post.excerpt} ${post.category}`.toLowerCase().includes(value));
    }).sort((a, b) => {
      if (sortOrder === "az") return a.title.localeCompare(b.title, "vi");
      if (sortOrder === "za") return b.title.localeCompare(a.title, "vi");
      return sortOrder === "oldest" ? a.sortDate - b.sortDate : b.sortDate - a.sortDate;
    });
  }, [category, posts, query, sortOrder]);

  const postsPerPage = 6;
  const pageCount = Math.max(1, Math.ceil(filtered.length / postsPerPage));
  const visiblePosts = filtered.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);

  useEffect(() => setCurrentPage(1), [category, query, sortOrder]);
  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const changePage = (page: number) => {
    setCurrentPage(page);
    document.getElementById("stories")?.scrollIntoView({ behavior: "smooth" });
  };

  const accountControl = (
    <div className={`account-menu-wrap ${user ? "authenticated" : "guest"}`}>
      <AccountButton
        user={user}
        profile={profile}
        onClick={() => user ? setProfileOpen((open) => !open) : setLoginOpen(true)}
      />
      {profileOpen && <button className="profile-dismiss" onClick={() => setProfileOpen(false)} aria-label="Đóng menu hồ sơ" />}
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
          onBack={closePost}
          onRelated={openPost}
        />
        {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
      </>
    );
  }

  const featured = posts.reduce((mostLiked, post) => post.likes > mostLiked.likes ? post : mostLiked, posts[0]);
  return (
    <main>
      {menuOpen && <button className="mobile-nav-dismiss" aria-label="Đóng menu nền" onClick={() => { setMenuOpen(false); setTopicMenuOpen(false); }} />}
      <header className="site-header">
        <a className="brand header-brand" href="#top" aria-label="Random Story"><picture><source media="(max-width: 620px)" srcSet="/icon.jpg" /><img src="/logo-original-font.png" alt="random story." /></picture></a>
        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Điều hướng chính">
          <a href="#stories" onClick={() => setMenuOpen(false)}>Bài viết</a>
          <div className={topicMenuOpen ? "nav-dropdown open" : "nav-dropdown"}>
            <button className="nav-link nav-dropdown-trigger" aria-haspopup="true" aria-expanded={topicMenuOpen} onClick={() => setTopicMenuOpen((open) => !open)}>Chủ đề <StageIcon name="chevron-down" /></button>
            <div className="nav-dropdown-menu">
              {categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => chooseCategory(item)}>{item}</button>)}
            </div>
          </div>
          <a href="#about" onClick={() => setMenuOpen(false)}>Về chúng tôi</a>
          <label className="mobile-nav-search"><StageIcon name="search" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm bài viết..." aria-label="Tìm bài viết trên mobile" /></label>
        </nav>
        <div className="header-actions">
          <label className="search"><StageIcon name="search" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm bài viết..." aria-label="Tìm bài viết" /></label>
          {accountControl}
          <button className={menuOpen ? "menu-btn open" : "menu-btn"} onClick={() => { setMenuOpen(!menuOpen); setTopicMenuOpen(false); setProfileOpen(false); }} aria-label={menuOpen ? "Đóng menu" : "Mở menu"}><StageIcon name={menuOpen ? "close" : "menu"} /></button>
        </div>
      </header>

      <section id="top" className="hero">
        <div className="hero-image" style={{ backgroundImage: `url(${featured.image})` }} role="img" aria-label={`Ảnh bìa ${featured.title}`} />
        <div className="hero-overlay" />
        <div className="hero-copy">
          <span className="eyebrow light">Bài viết nổi bật · {featured.category}</span>
          <h1>{featured.title}</h1>
          <p>{featured.excerpt}</p>
          <button className="text-link light-link" onClick={() => openPost(featured)}>Đọc câu chuyện <StageIcon name="arrow-right" /></button>
        </div>
      </section>

      <section id="stories" className="content-section">
        <div className="section-heading">
          <div><span className="eyebrow">Mới trên Random Story</span><h2>Những câu chuyện gần đây</h2></div>
          <p>Từ những dấu mốc lịch sử đến các khám phá khoa học và những điều kỳ thú trong cuộc sống — mỗi bài viết là một hành trình mở rộng hiểu biết.</p>
        </div>
        <div className="story-filter-bar">
          <StoryCombobox icon="story" value={category} options={categories.map((item) => ({ value: item, label: item }))} onChange={chooseCategory} ariaLabel="Lọc bài viết theo chủ đề" />
          <StoryCombobox icon="progress" value={sortOrder} options={[{ value: "latest", label: "Mới nhất" }, { value: "oldest", label: "Cũ nhất" }, { value: "az", label: "A–Z" }, { value: "za", label: "Z–A" }]} onChange={setSortOrder} ariaLabel="Sắp xếp bài viết" compact />
        </div>
        {filtered.length ? <><div className="post-grid">{visiblePosts.map((post, index) => <PostCard key={post.id} post={post} index={(currentPage - 1) * postsPerPage + index} user={user} onRequireLogin={() => setLoginOpen(true)} onOpen={() => openPost(post)} />)}</div>
          {pageCount > 1 && <nav className="pagination" aria-label="Phân trang bài viết">
            <button className="pagination-step pagination-prev" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1} aria-label="Trang trước"><StageIcon name="arrow-right" /> <span>Trước</span></button>
            <div>{Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => <button key={page} className={currentPage === page ? "active" : ""} aria-current={currentPage === page ? "page" : undefined} onClick={() => changePage(page)}>{page}</button>)}</div>
            <button className="pagination-step" onClick={() => changePage(currentPage + 1)} disabled={currentPage === pageCount} aria-label="Trang sau"><span>Sau</span> <StageIcon name="arrow-right" /></button>
          </nav>}
        </> : (
          <div className="empty-state"><StageIcon name="search" /><h3>Chưa tìm thấy câu chuyện phù hợp</h3><p>Thử một từ khóa hoặc chủ đề khác nhé.</p></div>
        )}
      </section>

      <section id="about" className="about-section">
        <img className="about-mark" src="/icon.jpg" alt="Random Story" />
        <div><span className="eyebrow light">Về Random Story</span><h2>Thế giới rộng lớn.<br />Câu chuyện thì vô tận.</h2></div>
        <div className="about-copy"><p>Random Story kể lại lịch sử, giải thích khoa học và khám phá những chủ đề gần gũi bằng ngôn ngữ dễ hiểu. Chúng tôi tin rằng kiến thức trở nên đáng nhớ nhất khi được kể thành một câu chuyện hay.</p></div>
      </section>

      <Newsletter />
      <Footer />
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </main>
  );
}

function StoryCombobox({ icon, value, options, onChange, ariaLabel, compact = false }: {
  icon: "story" | "progress";
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return (
    <div className={`story-combobox ${compact ? "is-compact" : ""} ${open ? "is-open" : ""}`} ref={rootRef}>
      <button type="button" className="story-combobox-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <StageIcon name={icon} /><span>{selected?.label}</span><StageIcon name="chevron-down" />
      </button>
      {open && <div className="story-combobox-menu" role="listbox" aria-label={ariaLabel}>
        {options.map((option) => <button type="button" key={option.value} role="option" aria-selected={option.value === value} className={option.value === value ? "selected" : ""} onClick={() => { onChange(option.value); setOpen(false); }}><span>{option.label}</span>{option.value === value && <StageIcon name="check" />}</button>)}
      </div>}
    </div>
  );
}

function AccountButton({ user, profile, onClick }: { user: User | null; profile: Profile | null; onClick: () => void }) {
  if (!user) return <button className="login-btn" onClick={onClick}>Đăng nhập</button>;
  const name = profile?.full_name || user.displayName || user.email?.split("@")[0] || "Bạn";
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <button className="account-chip" onClick={onClick}>
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{initial}</span>}
      <strong>Xin chào! {name}</strong>
      <StageIcon name="chevron-down" />
    </button>
  );
}

function ProfileMenu({ user, profile, onClose }: { user: User; profile: Profile | null; onClose: () => void }) {
  const name = profile?.full_name || user.displayName || user.email?.split("@")[0] || "Bạn";
  const signOut = async () => {
    await firebaseSignOut(firebaseAuth);
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

function PostCard({ post, index, user, onRequireLogin, onOpen }: { post: Post; index: number; user: User | null; onRequireLogin: () => void; onOpen: () => void }) {
  return (
    <article className={`post-card card-${index % 3}`}>
      <button className="card-image" onClick={onOpen} aria-label={`Đọc ${post.title}`}><img src={post.image} alt="" /></button>
      <LikeButton post={post} user={user} onRequireLogin={onRequireLogin} variant="card" />
      <div className="post-card-body">
        <div className="post-meta"><span>{post.category}</span><span>{post.date} · {post.read}</span></div>
        <h3><button onClick={onOpen}>{post.title}</button></h3><p>{post.excerpt}</p>
        <button className="card-read-link" onClick={onOpen}>Đọc bài viết <StageIcon name="arrow-right" /></button>
      </div>
    </article>
  );
}

function ArticleView({ post, posts, user, profile, accountButton, onBack, onRelated }: {
  post: Post; posts: Post[]; user: User | null; profile: Profile | null; accountButton: React.ReactNode;
  onBack: () => void; onRelated: (post: Post) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [commentPendingDelete, setCommentPendingDelete] = useState<Comment | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const isDatabasePost = !post.id.startsWith("local-");

  const loadSocial = async () => {
    if (!isDatabasePost) return;
    const commentSnapshot = await getDocs(firestoreQuery(collection(firestore, "comments"), where("postId", "==", post.id), where("approved", "==", true)));
    const rows = commentSnapshot.docs.map((item) => {
      const data = item.data();
      return { id: item.id, content: data.content, created_at: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(), author_id: data.authorId ?? "", parent_id: data.parentId ?? null, profiles: { full_name: data.authorName ?? null, avatar_url: data.authorAvatar ?? null } } as Comment;
    }).sort((a, b) => a.created_at.localeCompare(b.created_at));
    setComments(rows);
  };

  useEffect(() => {
    const refresh = async () => {
      await loadSocial();
    };
    void refresh();
    // loadSocial intentionally reloads whenever the active post or signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, user?.uid]);

  const addComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !comment.trim() || !isDatabasePost) return;
    await addDoc(collection(firestore, "comments"), { postId: post.id, authorId: user.uid, authorName: profile?.full_name || user.displayName || user.email?.split("@")[0] || "Độc giả", authorAvatar: profile?.avatar_url || user.photoURL || null, content: comment.trim(), approved: true, createdAt: serverTimestamp() });
    setComment(""); await loadSocial();
  };

  const saveComment = async (item: Comment) => {
    if (!user || item.author_id !== user.uid || !editingComment.trim()) return;
    await setDoc(doc(firestore, "comments", item.id), { content: editingComment.trim(), updatedAt: serverTimestamp() }, { merge: true });
    setEditingCommentId(null); setEditingComment(""); await loadSocial();
  };

  const addReply = async (event: FormEvent, item: Comment) => {
    event.preventDefault();
    if (!user || !reply.trim()) return;
    const parentId = item.parent_id || item.id;
    await addDoc(collection(firestore, "comments"), { postId: post.id, parentId, authorId: user.uid, authorName: profile?.full_name || user.displayName || user.email?.split("@")[0] || "Độc giả", authorAvatar: profile?.avatar_url || user.photoURL || null, content: reply.trim(), approved: true, createdAt: serverTimestamp() });
    setReplyingTo(null); setReply(""); await loadSocial();
  };

  const removeComment = async (item: Comment) => {
    if (!user || (item.author_id !== user.uid && profile?.role !== "admin")) return;
    setDeletingComment(true);
    try {
      const childComments = comments.filter((commentItem) => commentItem.parent_id === item.id);
      await Promise.all([deleteDoc(doc(firestore, "comments", item.id)), ...childComments.map((child) => deleteDoc(doc(firestore, "comments", child.id)))]);
      setCommentPendingDelete(null); await loadSocial();
    } finally {
      setDeletingComment(false);
    }
  };

  const renderComment = (item: Comment, isReply = false) => <article key={item.id} className={isReply ? "comment-reply" : ""}>
    <div className="comment-head"><strong>{item.profiles?.full_name || "Độc giả"}</strong><time>{new Date(item.created_at).toLocaleDateString("vi-VN")}</time></div>
    {editingCommentId === item.id ? <div className="comment-edit"><input autoFocus maxLength={500} value={editingComment} onChange={(event) => setEditingComment(event.target.value)} /><button onClick={() => void saveComment(item)}>Lưu</button><button onClick={() => { setEditingCommentId(null); setEditingComment(""); }}>Hủy</button></div> : <p>{item.content}</p>}
    {editingCommentId !== item.id && <div className="comment-actions"><button onClick={() => { setReplyingTo(item.id); setReply(""); }}>Trả lời</button>{item.author_id === user?.uid && <button onClick={() => { setEditingCommentId(item.id); setEditingComment(item.content); }}>Sửa</button>}{(item.author_id === user?.uid || profile?.role === "admin") && <button className="danger" onClick={() => setCommentPendingDelete(item)}>Xóa</button>}</div>}
    {replyingTo === item.id && <form className="reply-form" onSubmit={(event) => void addReply(event, item)}><input autoFocus required maxLength={500} value={reply} onChange={(event) => setReply(event.target.value)} placeholder={`Trả lời ${item.profiles?.full_name || "Độc giả"}...`} /><button>Gửi</button><button type="button" onClick={() => { setReplyingTo(null); setReply(""); }}>Hủy</button></form>}
    {!isReply && <div className="comment-replies">{comments.filter((replyItem) => replyItem.parent_id === item.id).map((replyItem) => renderComment(replyItem, true))}</div>}
  </article>;

  return (
    <main className="article-page">
      <header className="article-header">
        <button className="brand header-brand" onClick={onBack}><picture><source media="(max-width: 620px)" srcSet="/icon.jpg" /><img src="/logo-original-font.png" alt="random story." /></picture></button>
        <button className="back-btn" onClick={onBack} aria-label="Trở về trang chủ"><StageIcon name="arrow-right" /><span>Trở về trang chủ</span></button>
        <div className="header-actions article-header-actions">{accountButton}<ArticleMobileMenu onBack={onBack} /></div>
      </header>
      <article>
        <div className="article-intro"><span className="eyebrow">{post.category}</span><h1>{post.title}</h1><p>{post.excerpt}</p><div className="author-row"><div className="avatar">HM</div><div><strong>Hùng Mạnh</strong><span>{post.date} · {post.read}</span></div></div></div>
        <img className="article-cover" src={post.image} alt="" />
        <div className="article-body">
          {/<[a-z][\s\S]*>/i.test(post.content)
            ? <div className="rich-article-content" dangerouslySetInnerHTML={{ __html: post.content }} />
            : post.content.split(/\n\n+/).map((paragraph, index) => paragraph.startsWith("## ") ? <h2 key={index}>{paragraph.slice(3)}</h2> : <p className={index === 0 ? "lead" : ""} key={index}>{paragraph}</p>)}
          <div className="article-actions">{user && isDatabasePost && <LikeButton post={post} user={user} variant="article" />}<div className="article-action-tools"><ShareMenu /></div></div>
          {user && isDatabasePost && (
              <section className="comments">
                <div className="comments-heading"><h2>Bình luận</h2><p>Chia sẻ suy nghĩ của bạn về câu chuyện này.</p></div>
                <form className="comment-form" onSubmit={addComment}><input required maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={`Viết bình luận, ${profile?.full_name || "bạn"}...`} /><button className="primary-btn">Gửi</button></form>
                <div className="comment-list">{comments.filter((item) => !item.parent_id).map((item) => renderComment(item))}</div>
              </section>
          )}
        </div>
      </article>
      <section className="related"><div className="section-heading"><div><span className="eyebrow">Đọc tiếp</span><h2>Có thể bạn sẽ thích</h2></div></div><div className="post-grid">{posts.filter((item) => item.id !== post.id).slice(0, 3).map((item, index) => <PostCard key={item.id} post={item} index={index} user={user} onRequireLogin={() => undefined} onOpen={() => onRelated(item)} />)}</div></section>
      <Footer />
      {commentPendingDelete && <div className="confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletingComment) setCommentPendingDelete(null); }}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-comment-title"><div className="confirm-icon">!</div><h2 id="delete-comment-title">Xóa bình luận?</h2><p>Bình luận này{comments.some((item) => item.parent_id === commentPendingDelete.id) ? " và các câu trả lời bên dưới" : ""} sẽ bị xóa vĩnh viễn.</p><div className="confirm-actions"><button disabled={deletingComment} onClick={() => setCommentPendingDelete(null)}>Hủy</button><button className="confirm-danger" disabled={deletingComment} onClick={() => void removeComment(commentPendingDelete)}>{deletingComment ? "Đang xóa..." : "Xóa bình luận"}</button></div></section></div>}
    </main>
  );
}

function ArticleMobileMenu({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState(false);
  return <div className="article-mobile-menu">
    {open && <button className="article-menu-dismiss" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
    <button className={`article-menu-trigger ${open ? "open" : ""}`} aria-label={open ? "Đóng menu" : "Mở menu"} aria-expanded={open} onClick={() => setOpen((value) => !value)}><StageIcon name={open ? "close" : "menu"} /></button>
    {open && <nav className="article-menu-panel" aria-label="Điều hướng bài viết"><button onClick={onBack}>Trang chủ</button><a href="/#stories">Bài viết</a><a href="/#about">Về chúng tôi</a></nav>}
  </div>;
}

function ShareMenu() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "facebook-share", "width=720,height=620,noopener,noreferrer");
    setOpen(false);
  };

  return <div className="share-menu" ref={rootRef}>
    <button className="share-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span>Chia sẻ</span><StageIcon name="chevron-down" /></button>
    {open && <div className="share-options" role="menu"><button role="menuitem" onClick={() => void copyLink()}>{copied ? "Đã sao chép" : "Sao chép liên kết"}</button><button role="menuitem" onClick={shareFacebook}>Chia sẻ lên Facebook</button></div>}
  </div>;
}

function LikeButton({ post, user, variant, onRequireLogin }: { post: Post; user: User | null; variant: "card" | "article"; onRequireLogin?: () => void }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(post.likes);
  const isDatabasePost = !post.id.startsWith("local-");

  useEffect(() => {
    if (!isDatabasePost) return;
    getDocs(firestoreQuery(collection(firestore, "likes"), where("postId", "==", post.id))).then((snapshot) => setCount(snapshot.size));
    if (user) getDoc(doc(firestore, "likes", `${post.id}_${user.uid}`)).then((snapshot) => setLiked(snapshot.exists()));
    else setLiked(false);
  }, [isDatabasePost, post.id, user]);

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ postId: string; liked: boolean; count: number }>).detail;
      if (detail.postId === post.id) {
        setLiked(detail.liked);
        setCount(detail.count);
      }
    };
    window.addEventListener("randomstory:like", sync);
    return () => window.removeEventListener("randomstory:like", sync);
  }, [post.id]);

  const toggle = async () => {
    if (!user) {
      onRequireLogin?.();
      return;
    }
    if (!isDatabasePost) return;
    const nextLiked = !liked;
    const nextCount = Math.max(0, count + (nextLiked ? 1 : -1));
    const likeRef = doc(firestore, "likes", `${post.id}_${user.uid}`);
    if (nextLiked) await setDoc(likeRef, { postId: post.id, userId: user.uid, createdAt: serverTimestamp() });
    else await deleteDoc(likeRef);
    window.dispatchEvent(new CustomEvent("randomstory:like", { detail: { postId: post.id, liked: nextLiked, count: nextCount } }));
  };

  return (
    <button className={`like-button ${variant === "card" ? "card-like" : "article-like"} ${liked ? "liked" : ""}`} onClick={toggle} aria-label={`${liked ? "Bỏ thích" : "Thích"} bài viết ${post.title}`} aria-pressed={liked}>
      <span aria-hidden="true">{liked ? "♥" : "♡"}</span><b>{count}</b>{variant === "article" && <em>lượt thích</em>}
    </button>
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
    try {
      if (mode === "login") await signInWithEmailAndPassword(firebaseAuth, email, password);
      else {
        const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        await updateProfile(result.user, { displayName: fullName });
        await setDoc(doc(firestore, "users", result.user.uid), { email, full_name: fullName, avatar_url: null, role: "reader", createdAt: serverTimestamp() });
      }
      onClose();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể đăng nhập."); }
    finally { setLoading(false); }
  };

  const loginWithGoogle = async () => {
    setLoading(true); setMessage("");
    try {
      const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      const ref = doc(firestore, "users", result.user.uid);
      if (!(await getDoc(ref)).exists()) await setDoc(ref, { email: result.user.email, full_name: result.user.displayName, avatar_url: result.user.photoURL, role: "reader", createdAt: serverTimestamp() });
      onClose();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể đăng nhập với Google."); setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="login-modal" role="dialog" aria-modal="true" aria-label={mode === "login" ? "Đăng nhập Random Story" : "Tạo tài khoản Random Story"} onMouseDown={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Đóng"><StageIcon name="close" /></button>
        <img className="modal-logo" src="/logo-original-font.png" alt="random story." />
        <form onSubmit={submit}>
          {mode === "signup" && <label>Họ và tên<input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tên của bạn" /></label>}
          <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" /></label>
          <label>Mật khẩu<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label>
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Đang xử lý..." : "Tiếp tục"}</button>
        </form>
        <div className="modal-divider"><span>hoặc</span></div>
        <button className="google-btn" onClick={loginWithGoogle} disabled={loading}><span className="google-mark">G</span><span>{loading ? "Đang chuyển hướng..." : "Tiếp tục với Google"}</span></button>
        <small>{mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"} <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Đăng ký miễn phí" : "Đăng nhập"}</button></small>
      </div>
    </div>
  );
}

function Newsletter() {
  return <section className="newsletter"><span className="eyebrow">Khám phá cùng Random Story</span><h2>Mỗi câu chuyện,<br />mở ra một góc nhìn mới.</h2><p>Lịch sử, khoa học và thế giới quanh ta luôn có những điều đáng để tìm hiểu. Chọn một câu chuyện và bắt đầu hành trình khám phá của bạn.</p><a className="newsletter-cta" href="#stories">Khám phá bài viết <StageIcon name="arrow-right" /></a></section>;
}

function Footer() {
  return <footer><a className="brand footer-brand" href="#top"><img src="/logo-original-font.png" alt="random story." /></a><p>Kể chuyện để hiểu quá khứ.<br />Khám phá để nhìn rộng tương lai.</p><div><a href="#stories">Bài viết</a><a href="#topics">Chủ đề</a><a href="#about">Về chúng tôi</a></div><div><a href="https://www.facebook.com/randomstory0206" target="_blank" rel="noreferrer">Facebook · Random Story <StageIcon name="arrow-right" /></a><a href="https://www.facebook.com/randombook0206" target="_blank" rel="noreferrer">Facebook · Random Book <StageIcon name="arrow-right" /></a></div><small>© 2026 Random Story</small></footer>;
}
