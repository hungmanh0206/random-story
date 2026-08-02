"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import Link from "next/link";
import dynamic from "next/dynamic";
import { firebaseAuth, firestore } from "../../lib/firebase";

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

const createSlug = (value: string) => value
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\u0111/g, "d")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

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
    try {
      const snapshot = await getDocs(collection(firestore, "posts"));
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AdminPost));
      rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      setPosts(rows);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tải bài viết."); }
  };

  const loadCategories = async () => {
    try {
      const snapshot = await getDocs(collection(firestore, "categories"));
      setCategories(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Category)).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tải chủ đề."); }
  };

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (!currentUser) { setAuthorized(false); return; }
      setUser(currentUser);
      const profile = await getDoc(doc(firestore, "users", currentUser.uid));
      const isAdmin = profile.data()?.role === "admin";
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

  const changePostTitle = (title: string) => {
    setForm((current) => ({
      ...current,
      title,
      slug: !current.slug || current.slug === createSlug(current.title) ? createSlug(title) : current.slug,
    }));
  };

  const changeCategoryName = (name: string) => {
    setCategoryForm((current) => ({
      ...current,
      name,
      slug: !current.slug || current.slug === createSlug(current.name) ? createSlug(name) : current.slug,
    }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (form.cover_url) {
      try {
        const imageUrl = new URL(form.cover_url);
        if (["unsplash.com", "www.unsplash.com"].includes(imageUrl.hostname)) {
          setMessage("Đây là URL trang Unsplash, không phải URL file ảnh. Hãy mở ảnh và sao chép địa chỉ hình ảnh trực tiếp (images.unsplash.com).");
          return;
        }
      } catch {
        setMessage("URL ảnh bìa không hợp lệ.");
        return;
      }
    }
    const payload = {
      ...form,
      slug: createSlug(form.slug || form.title),
      cover_url: form.cover_url || null,
      author_id: user.uid,
      published_at: form.status === "published" ? editing?.published_at || new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    try {
      if (editing) await updateDoc(doc(firestore, "posts", editing.id), payload);
      else await addDoc(collection(firestore, "posts"), { ...payload, created_at: new Date().toISOString(), createdAt: serverTimestamp() });
      setFormOpen(false); await loadPosts();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể lưu bài viết."); }
  };

  const remove = async (post: AdminPost) => {
    if (!window.confirm(`Xóa bài “${post.title}”? Hành động này không thể hoàn tác.`)) return;
    try { await deleteDoc(doc(firestore, "posts", post.id)); await loadPosts(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Không thể xóa bài viết."); }
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
    const payload = {
      ...categoryForm,
      slug: createSlug(categoryForm.slug || categoryForm.name),
      updated_at: new Date().toISOString(),
    };
    try {
      if (editingCategory) await updateDoc(doc(firestore, "categories", editingCategory.id), payload);
      else await addDoc(collection(firestore, "categories"), { ...payload, created_at: new Date().toISOString(), createdAt: serverTimestamp() });
      setCategoryFormOpen(false); await Promise.all([loadCategories(), loadPosts()]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể lưu chủ đề."); }
  };

  const removeCategory = async (category: Category) => {
    if (!window.confirm(`Xóa chủ đề “${category.name}”?`)) return;
    if (posts.some((post) => post.category === category.name)) return setMessage("Không thể xóa chủ đề đang được bài viết sử dụng.");
    try { await deleteDoc(doc(firestore, "categories", category.id)); await loadCategories(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Không thể xóa chủ đề."); }
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
            {posts.map((post) => <tr key={post.id}><td data-label="Tiêu đề"><strong>{post.title}</strong><small className="admin-slug">/{post.slug}</small></td><td data-label="Chủ đề">{post.category}</td><td data-label="Trạng thái"><span className="status">{post.status === "published" ? "Đã xuất bản" : post.status === "draft" ? "Bản nháp" : "Lưu trữ"}</span></td><td data-label="Cập nhật">{new Date(post.created_at).toLocaleDateString("vi-VN")}</td><td data-label="Thao tác"><div className="admin-actions"><button onClick={() => openEdit(post)}>Sửa</button><button className="danger-btn" onClick={() => remove(post)}>Xóa</button></div></td></tr>)}
          </tbody></table>
        </div></> : <div className="admin-card table-card admin-data-block">
          <div className="card-title"><h2>Tất cả chủ đề</h2><span>{categories.length} chủ đề</span></div>
          <table><thead><tr><th>Tên chủ đề</th><th>Slug</th><th>Mô tả</th><th>Thao tác</th></tr></thead><tbody>
            {categories.map((category) => <tr key={category.id}><td data-label="Tên chủ đề"><strong>{category.name}</strong></td><td data-label="Slug">/{category.slug}</td><td data-label="Mô tả">{category.description || "—"}</td><td data-label="Thao tác"><div className="admin-actions"><button onClick={() => openCategoryEdit(category)}>Sửa</button><button className="danger-btn" onClick={() => removeCategory(category)}>Xóa</button></div></td></tr>)}
          </tbody></table>
        </div>}
      </section>
      {formOpen && <div className="modal-backdrop" onMouseDown={() => setFormOpen(false)}><section className="post-editor" onMouseDown={(e) => e.stopPropagation()}><button className="close-btn" onClick={() => setFormOpen(false)}>×</button><h2>{editing ? "Sửa bài viết" : "Bài viết mới"}</h2><form onSubmit={save}>
        <label>Tiêu đề<input required value={form.title} onChange={(e) => changePostTitle(e.target.value)} /></label>
        <div className="editor-grid"><label>Slug<input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Tự tạo từ tiêu đề" /></label><label>Chủ đề<select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label></div>
        <label>Tóm tắt<textarea required value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></label>
        <label>Nội dung<div className="tinymce-wrap"><TinyEditor value={form.content} onChange={(content) => setForm({ ...form, content })} /></div></label>
        <label>URL ảnh bìa<input type="url" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://images.example.com/anh-bia.jpg" /></label>
        <label>Trạng thái<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}><option value="draft">Bản nháp</option><option value="published">Xuất bản</option><option value="archived">Lưu trữ</option></select></label>
        {message && <p className="auth-message">{message}</p>}<button className="primary-btn">{editing ? "Lưu thay đổi" : "Tạo bài viết"}</button>
      </form></section></div>}
      {categoryFormOpen && <div className="modal-backdrop" onMouseDown={() => setCategoryFormOpen(false)}><section className="category-editor" onMouseDown={(e) => e.stopPropagation()}><button className="close-btn" onClick={() => setCategoryFormOpen(false)}>×</button><h2>{editingCategory ? "Sửa chủ đề" : "Chủ đề mới"}</h2><form onSubmit={saveCategory}>
        <label>Tên chủ đề<input required value={categoryForm.name} onChange={(e) => changeCategoryName(e.target.value)} /></label>
        <label>Slug<input value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} placeholder="Tự tạo từ tên" /></label>
        <label>Mô tả<textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} /></label>
        {message && <p className="auth-message">{message}</p>}<button className="primary-btn">{editingCategory ? "Lưu thay đổi" : "Tạo chủ đề"}</button>
      </form></section></div>}
    </div>
  );
}
