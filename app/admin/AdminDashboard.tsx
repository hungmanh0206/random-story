"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createSupabaseBrowserClient } from "../../lib/supabase";

const TinyEditor = dynamic(() => import("./TinyEditor").then((module) => module.TinyEditor), {
  ssr: false,
  loading: () => <div className="editor-loading">Đang tải trình soạn thảo…</div>,
});

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

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_at: string;
};

const emptyPost: PostForm = { title: "", slug: "", excerpt: "", content: "", category: "Ghi chép", cover_url: "", status: "draft" };
const emptyCategory = { name: "", slug: "", description: "" };

export function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "categories">("posts");
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<AdminPost | null>(null);
  const [form, setForm] = useState<PostForm>(emptyPost);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [message, setMessage] = useState("");

  const loadPosts = async () => {
    const { data, error } = await createSupabaseBrowserClient().from("posts").select("*").order("created_at", { ascending: false });
    if (error) setMessage(error.message); else setPosts((data ?? []) as AdminPost[]);
  };

  const loadCategories = async () => {
    const { data, error } = await createSupabaseBrowserClient().from("categories").select("*").order("name");
    if (error) setMessage(error.message); else setCategories((data ?? []) as Category[]);
  };

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setAuthorized(false); return; }
      setUser(data.user);
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      const isAdmin = profile?.role === "admin";
      setAuthorized(isAdmin);
      if (isAdmin) await Promise.all([loadPosts(), loadCategories()]);
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

  const openCategoryCreate = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategory);
    setCategoryFormOpen(true);
    setMessage("");
  };

  const openCategoryEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, slug: category.slug, description: category.description });
    setCategoryFormOpen(true);
    setMessage("");
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    const payload = {
      ...categoryForm,
      slug: categoryForm.slug || categoryForm.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      updated_at: new Date().toISOString(),
    };
    const result = editingCategory
      ? await supabase.from("categories").update(payload).eq("id", editingCategory.id)
      : await supabase.from("categories").insert(payload);
    if (result.error) return setMessage(result.error.message);
    setCategoryFormOpen(false);
    await Promise.all([loadCategories(), loadPosts()]);
  };

  const removeCategory = async (category: Category) => {
    if (!window.confirm(`Xóa chủ đề “${category.name}”?`)) return;
    const { error } = await createSupabaseBrowserClient().from("categories").delete().eq("id", category.id);
    if (error) setMessage(error.message); else await loadCategories();
  };

  if (authorized === null) return <main className="admin-access"><p>Đang kiểm tra quyền quản trị…</p></main>;
  if (!authorized) return <main className="admin-access"><img src="/logo-original-font.png" alt="random story." /><h1>Không có quyền truy cập</h1><p>Hãy đăng nhập bằng tài khoản quản trị.</p><Link className="primary-btn" href="/">Về trang chủ</Link></main>;

  return (
    <div className="admin-shell">
      <aside><Link className="brand admin-brand" href="/"><img src="/logo-original-font.png" alt="random story." /></Link><p>Trang quản trị</p><nav><button className={activeTab === "posts" ? "active" : ""} onClick={() => setActiveTab("posts")}>Bài viết</button><button className={activeTab === "categories" ? "active" : ""} onClick={() => setActiveTab("categories")}>Chủ đề</button></nav><Link className="admin-exit" href="/">← Xem trang blog</Link></aside>
      <section className="admin-main">
        <header><div><span className="eyebrow">Random Story CMS</span><h1>{activeTab === "posts" ? "Quản lý bài viết" : "Quản lý chủ đề"}</h1></div><button className="primary-btn" onClick={activeTab === "posts" ? openCreate : openCategoryCreate}>+ {activeTab === "posts" ? "Bài viết mới" : "Chủ đề mới"}</button></header>
        {message && <p className="auth-message">{message}</p>}
        {activeTab === "posts" ? <><div className="stat-grid"><div><span>Tổng bài viết</span><strong>{posts.length}</strong><small>{posts.filter((p) => p.status === "published").length} đã xuất bản</small></div><div><span>Bản nháp</span><strong>{posts.filter((p) => p.status === "draft").length}</strong><small>Đang biên tập</small></div><div><span>Đã lưu trữ</span><strong>{posts.filter((p) => p.status === "archived").length}</strong><small>Không hiển thị</small></div></div>
        <div className="admin-card table-card admin-data-block">
          <div className="card-title"><h2>Tất cả bài viết</h2></div>
          <table><thead><tr><th>Tiêu đề</th><th>Chủ đề</th><th>Trạng thái</th><th>Cập nhật</th><th>Thao tác</th></tr></thead><tbody>
            {posts.map((post) => <tr key={post.id}><td><strong>{post.title}</strong><small className="admin-slug">/{post.slug}</small></td><td>{post.category}</td><td><span className="status">{post.status === "published" ? "Đã xuất bản" : post.status === "draft" ? "Bản nháp" : "Lưu trữ"}</span></td><td>{new Date(post.created_at).toLocaleDateString("vi-VN")}</td><td><div className="admin-actions"><button onClick={() => openEdit(post)}>Sửa</button><button className="danger-btn" onClick={() => remove(post)}>Xóa</button></div></td></tr>)}
          </tbody></table>
        </div></> : <div className="admin-card table-card admin-data-block">
          <div className="card-title"><h2>Tất cả chủ đề</h2><span>{categories.length} chủ đề</span></div>
          <table><thead><tr><th>Tên chủ đề</th><th>Slug</th><th>Mô tả</th><th>Thao tác</th></tr></thead><tbody>
            {categories.map((category) => <tr key={category.id}><td><strong>{category.name}</strong></td><td>/{category.slug}</td><td>{category.description || "—"}</td><td><div className="admin-actions"><button onClick={() => openCategoryEdit(category)}>Sửa</button><button className="danger-btn" onClick={() => removeCategory(category)}>Xóa</button></div></td></tr>)}
          </tbody></table>
        </div>}
      </section>
      {formOpen && <div className="modal-backdrop" onMouseDown={() => setFormOpen(false)}><section className="post-editor" onMouseDown={(e) => e.stopPropagation()}><button className="close-btn" onClick={() => setFormOpen(false)}>×</button><h2>{editing ? "Sửa bài viết" : "Bài viết mới"}</h2><form onSubmit={save}>
        <label>Tiêu đề<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <div className="editor-grid"><label>Slug<input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Tự tạo từ tiêu đề" /></label><label>Chủ đề<select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label></div>
        <label>Tóm tắt<textarea required value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></label>
        <label>Nội dung<div className="tinymce-wrap"><TinyEditor value={form.content} onChange={(content) => setForm({ ...form, content })} /></div></label>
        <label>URL ảnh bìa<input type="url" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} /></label>
        <label>Trạng thái<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}><option value="draft">Bản nháp</option><option value="published">Xuất bản</option><option value="archived">Lưu trữ</option></select></label>
        {message && <p className="auth-message">{message}</p>}<button className="primary-btn">{editing ? "Lưu thay đổi" : "Tạo bài viết"}</button>
      </form></section></div>}
      {categoryFormOpen && <div className="modal-backdrop" onMouseDown={() => setCategoryFormOpen(false)}><section className="category-editor" onMouseDown={(e) => e.stopPropagation()}><button className="close-btn" onClick={() => setCategoryFormOpen(false)}>×</button><h2>{editingCategory ? "Sửa chủ đề" : "Chủ đề mới"}</h2><form onSubmit={saveCategory}>
        <label>Tên chủ đề<input required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} /></label>
        <label>Slug<input value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} placeholder="Tự tạo từ tên" /></label>
        <label>Mô tả<textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} /></label>
        {message && <p className="auth-message">{message}</p>}<button className="primary-btn">{editingCategory ? "Lưu thay đổi" : "Tạo chủ đề"}</button>
      </form></section></div>}
    </div>
  );
}
