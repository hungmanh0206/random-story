"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../../lib/supabase";

type AdminPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  cover_url: string | null;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_at: string;
};

type PostForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  cover_url: string;
  status: AdminPost["status"];
};

const emptyPost: PostForm = { title: "", slug: "", excerpt: "", content: "", category: "Ghi chép", cover_url: "", status: "draft" };

export function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [editing, setEditing] = useState<AdminPost | null>(null);
  const [form, setForm] = useState<PostForm>(emptyPost);
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState("");

  const loadPosts = async () => {
    const { data, error } = await createSupabaseBrowserClient().from("posts").select("*").order("created_at", { ascending: false });
    if (error) setMessage(error.message); else setPosts((data ?? []) as AdminPost[]);
  };

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setAuthorized(false); return; }
      setUser(data.user);
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      const isAdmin = profile?.role === "admin";
      setAuthorized(isAdmin);
      if (isAdmin) await loadPosts();
    });
  }, []);

  const openCreate = () => { setEditing(null); setForm(emptyPost); setFormOpen(true); setMessage(""); };
  const openEdit = (post: AdminPost) => {
    setEditing(post);
    setForm({ title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, category: post.category, cover_url: post.cover_url ?? "", status: post.status });
    setFormOpen(true); setMessage("");
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const supabase = createSupabaseBrowserClient();
    const payload = {
      ...form,
      slug: form.slug || form.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      cover_url: form.cover_url || null,
      author_id: user.id,
      published_at: form.status === "published" ? editing?.published_at || new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const result = editing ? await supabase.from("posts").update(payload).eq("id", editing.id) : await supabase.from("posts").insert(payload);
    if (result.error) return setMessage(result.error.message);
    setFormOpen(false); await loadPosts();
  };

  const remove = async (post: AdminPost) => {
    if (!window.confirm(`Xóa bài “${post.title}”? Hành động này không thể hoàn tác.`)) return;
    const { error } = await createSupabaseBrowserClient().from("posts").delete().eq("id", post.id);
    if (error) setMessage(error.message); else await loadPosts();
  };

  if (authorized === null) return <main className="admin-access"><p>Đang kiểm tra quyền quản trị…</p></main>;
  if (!authorized) return <main className="admin-access"><img src="/logo-original-font.png" alt="random story." /><h1>Không có quyền truy cập</h1><p>Hãy đăng nhập bằng tài khoản quản trị.</p><Link className="primary-btn" href="/">Về trang chủ</Link></main>;

  return (
    <div className="admin-shell">
      <aside><Link className="brand admin-brand" href="/"><img src="/logo-original-font.png" alt="random story." /></Link><p>Trang quản trị</p><nav><button className="active">Bài viết</button></nav><Link className="admin-exit" href="/">← Xem trang blog</Link></aside>
      <section className="admin-main">
        <header><div><span className="eyebrow">Random Story CMS</span><h1>Quản lý bài viết</h1></div><button className="primary-btn" onClick={openCreate}>+ Bài viết mới</button></header>
        {message && <p className="auth-message">{message}</p>}
        <div className="stat-grid"><div><span>Tổng bài viết</span><strong>{posts.length}</strong><small>{posts.filter((p) => p.status === "published").length} đã xuất bản</small></div><div><span>Bản nháp</span><strong>{posts.filter((p) => p.status === "draft").length}</strong><small>Đang biên tập</small></div><div><span>Đã lưu trữ</span><strong>{posts.filter((p) => p.status === "archived").length}</strong><small>Không hiển thị</small></div></div>
        <div className="admin-card table-card">
          <div className="card-title"><h2>Tất cả bài viết</h2></div>
          <table><thead><tr><th>Tiêu đề</th><th>Chủ đề</th><th>Trạng thái</th><th>Cập nhật</th><th>Thao tác</th></tr></thead><tbody>
            {posts.map((post) => <tr key={post.id}><td><strong>{post.title}</strong><small className="admin-slug">/{post.slug}</small></td><td>{post.category}</td><td><span className="status">{post.status === "published" ? "Đã xuất bản" : post.status === "draft" ? "Bản nháp" : "Lưu trữ"}</span></td><td>{new Date(post.created_at).toLocaleDateString("vi-VN")}</td><td><div className="admin-actions"><button onClick={() => openEdit(post)}>Sửa</button><button className="danger-btn" onClick={() => remove(post)}>Xóa</button></div></td></tr>)}
          </tbody></table>
        </div>
      </section>
      {formOpen && <div className="modal-backdrop" onMouseDown={() => setFormOpen(false)}><section className="post-editor" onMouseDown={(e) => e.stopPropagation()}><button className="close-btn" onClick={() => setFormOpen(false)}>×</button><h2>{editing ? "Sửa bài viết" : "Bài viết mới"}</h2><form onSubmit={save}>
        <label>Tiêu đề<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <div className="editor-grid"><label>Slug<input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Tự tạo từ tiêu đề" /></label><label>Chủ đề<input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label></div>
        <label>Tóm tắt<textarea required value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></label>
        <label>Nội dung<textarea className="content-editor" required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></label>
        <label>URL ảnh bìa<input type="url" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} /></label>
        <label>Trạng thái<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}><option value="draft">Bản nháp</option><option value="published">Xuất bản</option><option value="archived">Lưu trữ</option></select></label>
        {message && <p className="auth-message">{message}</p>}<button className="primary-btn">{editing ? "Lưu thay đổi" : "Tạo bài viết"}</button>
      </form></section></div>}
    </div>
  );
}
