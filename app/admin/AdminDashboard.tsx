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

type Member = {
  id: string;
  email: string;
  full_name: string | null;
  role: "reader" | "admin";
  createdAt?: { toDate?: () => Date } | string;
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
  const [activeTab, setActiveTab] = useState<"posts" | "categories" | "members">("posts");
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [editing, setEditing] = useState<AdminPost | null>(null);
  const [form, setForm] = useState<PostForm>(emptyPost);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [postSearch, setPostSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [postCategory, setPostCategory] = useState("all");
  const [postStatus, setPostStatus] = useState("all");
  const [postSort, setPostSort] = useState("latest");
  const [memberRole, setMemberRole] = useState("all");

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

  const loadMembers = async () => {
    try {
      const snapshot = await getDocs(collection(firestore, "users"));
      setMembers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Member)).sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email)));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tải thành viên."); }
  };

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (!currentUser) { setAuthorized(false); return; }
      setUser(currentUser);
      const profile = await getDoc(doc(firestore, "users", currentUser.uid));
      const isAdmin = profile.data()?.role === "admin";
      setAuthorized(isAdmin);
      if (isAdmin) await Promise.all([loadPosts(), loadCategories(), loadMembers()]);
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

  const filteredPosts = posts.filter((post) => {
    const value = postSearch.trim().toLowerCase();
    return (postCategory === "all" || post.category === postCategory)
      && (postStatus === "all" || post.status === postStatus)
      && (!value || `${post.title} ${post.slug} ${post.category} ${post.status}`.toLowerCase().includes(value));
  }).sort((a, b) => {
    if (postSort === "az") return a.title.localeCompare(b.title, "vi");
    if (postSort === "za") return b.title.localeCompare(a.title, "vi");
    const aTime = new Date(a.created_at || a.published_at || 0).getTime();
    const bTime = new Date(b.created_at || b.published_at || 0).getTime();
    return postSort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  const filteredCategories = categories.filter((category) => {
    const value = categorySearch.trim().toLowerCase();
    return !value || `${category.name} ${category.slug} ${category.description}`.toLowerCase().includes(value);
  });

  const filteredMembers = members.filter((member) => {
    const value = memberSearch.trim().toLowerCase();
    return (memberRole === "all" || member.role === memberRole)
      && (!value || `${member.full_name || ""} ${member.email} ${member.role}`.toLowerCase().includes(value));
  });

  if (authorized === null) return <main className="admin-access"><p>Đang kiểm tra quyền quản trị…</p></main>;
  if (!authorized) return <main className="admin-access"><img src="/logo-original-font.png" alt="random story." /><h1>Không có quyền truy cập</h1><p>Hãy đăng nhập bằng tài khoản quản trị.</p><Link className="primary-btn" href="/">Về trang chủ</Link></main>;

  return (
    <div className="admin-shell">
      <aside><Link className="brand admin-brand" href="/"><picture><source media="(max-width: 620px)" srcSet="/icon.jpg" /><img src="/logo-original-font.png" alt="random story." /></picture></Link><p>Trang quản trị</p><nav><button className={activeTab === "posts" ? "active" : ""} onClick={() => setActiveTab("posts")}>Bài viết</button><button className={activeTab === "categories" ? "active" : ""} onClick={() => setActiveTab("categories")}>Chủ đề</button><button className={activeTab === "members" ? "active" : ""} onClick={() => setActiveTab("members")}>Thành viên</button></nav><Link className="admin-exit" href="/">← Xem trang blog</Link></aside>
      <section className="admin-main">
        <header><div><span className="eyebrow">Random Story CMS</span><h1>{activeTab === "posts" ? "Quản lý bài viết" : activeTab === "categories" ? "Quản lý chủ đề" : "Quản lý thành viên"}</h1></div>{activeTab !== "members" && <button className="primary-btn" onClick={activeTab === "posts" ? openCreate : openCategoryCreate}>+ {activeTab === "posts" ? "Bài viết mới" : "Chủ đề mới"}</button>}</header>
        {message && <p className="auth-message">{message}</p>}
        {activeTab === "posts" ? <><div className="stat-grid"><div><span>Tổng bài viết</span><strong>{posts.length}</strong><small>{posts.filter((p) => p.status === "published").length} đã xuất bản</small></div><div><span>Bản nháp</span><strong>{posts.filter((p) => p.status === "draft").length}</strong><small>Đang biên tập</small></div><div><span>Đã lưu trữ</span><strong>{posts.filter((p) => p.status === "archived").length}</strong><small>Không hiển thị</small></div></div>
        <div className="admin-card table-card admin-data-block">
          <div className="card-title"><div><h2>Tất cả bài viết</h2><small>{filteredPosts.length}/{posts.length} bài viết</small></div><div className="admin-controls"><label className="admin-search"><span>⌕</span><input type="search" value={postSearch} onChange={(event) => setPostSearch(event.target.value)} placeholder="Tìm bài viết..." aria-label="Tìm bài viết" /></label><label className="admin-select"><select value={postCategory} onChange={(e) => setPostCategory(e.target.value)} aria-label="Lọc chủ đề"><option value="all">Mọi chủ đề</option>{categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select><span>⌄</span></label><label className="admin-select"><select value={postStatus} onChange={(e) => setPostStatus(e.target.value)} aria-label="Lọc trạng thái"><option value="all">Mọi trạng thái</option><option value="published">Đã xuất bản</option><option value="draft">Bản nháp</option><option value="archived">Lưu trữ</option></select><span>⌄</span></label><label className="admin-select"><select value={postSort} onChange={(e) => setPostSort(e.target.value)} aria-label="Sắp xếp bài viết"><option value="latest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="az">A–Z</option><option value="za">Z–A</option></select><span>⌄</span></label></div></div>
          <table><thead><tr><th>STT</th><th>Tiêu đề</th><th>Chủ đề</th><th>Trạng thái</th><th>Cập nhật</th><th>Thao tác</th></tr></thead><tbody>
            {filteredPosts.map((post, index) => <tr key={post.id}><td data-label="STT">{index + 1}</td><td data-label="Tiêu đề"><strong>{post.title}</strong><small className="admin-slug">/{post.slug}</small></td><td data-label="Chủ đề">{post.category}</td><td data-label="Trạng thái"><span className="status">{post.status === "published" ? "Đã xuất bản" : post.status === "draft" ? "Bản nháp" : "Lưu trữ"}</span></td><td data-label="Cập nhật">{new Date(post.created_at).toLocaleDateString("vi-VN")}</td><td data-label="Thao tác"><div className="admin-actions"><button onClick={() => openEdit(post)}>Sửa</button><button className="danger-btn" onClick={() => remove(post)}>Xóa</button></div></td></tr>)}
            {!filteredPosts.length && <tr className="admin-no-results"><td colSpan={6}>Không tìm thấy bài viết phù hợp.</td></tr>}
          </tbody></table>
        </div></> : activeTab === "categories" ? <div className="admin-card table-card admin-data-block">
          <div className="card-title"><div><h2>Tất cả chủ đề</h2><small>{filteredCategories.length}/{categories.length} chủ đề</small></div><label className="admin-search"><span>⌕</span><input type="search" value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Tìm chủ đề..." aria-label="Tìm chủ đề" /></label></div>
          <table><thead><tr><th>STT</th><th>Tên chủ đề</th><th>Slug</th><th>Mô tả</th><th>Thao tác</th></tr></thead><tbody>
            {filteredCategories.map((category, index) => <tr key={category.id}><td data-label="STT">{index + 1}</td><td data-label="Tên chủ đề"><strong>{category.name}</strong></td><td data-label="Slug">/{category.slug}</td><td data-label="Mô tả">{category.description || "—"}</td><td data-label="Thao tác"><div className="admin-actions"><button onClick={() => openCategoryEdit(category)}>Sửa</button><button className="danger-btn" onClick={() => removeCategory(category)}>Xóa</button></div></td></tr>)}
            {!filteredCategories.length && <tr className="admin-no-results"><td colSpan={5}>Không tìm thấy chủ đề phù hợp.</td></tr>}
          </tbody></table>
        </div> : <div className="admin-card table-card admin-data-block">
          <div className="card-title"><div><h2>Tất cả thành viên</h2><small>{filteredMembers.length}/{members.length} thành viên</small></div><div className="admin-controls"><label className="admin-search"><span>⌕</span><input type="search" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Tìm thành viên..." aria-label="Tìm thành viên" /></label><label className="admin-select"><select value={memberRole} onChange={(e) => setMemberRole(e.target.value)} aria-label="Lọc vai trò"><option value="all">Mọi vai trò</option><option value="admin">Quản trị viên</option><option value="reader">Thành viên</option></select><span>⌄</span></label></div></div>
          <table><thead><tr><th>STT</th><th>Thành viên</th><th>Email</th><th>Vai trò</th></tr></thead><tbody>
            {filteredMembers.map((member, index) => <tr key={member.id}><td data-label="STT">{index + 1}</td><td data-label="Thành viên"><strong>{member.full_name || "Chưa cập nhật tên"}</strong>{member.id === user?.uid && <small className="admin-slug">Tài khoản của bạn</small>}</td><td data-label="Email">{member.email}</td><td data-label="Vai trò"><span className="status">{member.role === "admin" ? "Quản trị viên" : "Thành viên"}</span></td></tr>)}
            {!filteredMembers.length && <tr className="admin-no-results"><td colSpan={4}>Không tìm thấy thành viên phù hợp.</td></tr>}
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
