"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Bar, Line } from "react-chartjs-2";
import { BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { firestore } from "../../lib/firebase";
import { StageIcon } from "../StageIcon";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

type DashboardPost = { id: string; title: string; category: string; status: string; created_at: string; published_at: string | null; author_id?: string };
type DashboardMember = { id: string; email: string; full_name: string | null };
type ViewRow = { postId: string; title: string; category: string; viewedAt: string; date: string; hour: number };
type CommentRow = { approved?: boolean; createdAt?: { toDate?: () => Date } | string };
type PresenceRow = { lastSeen: string };

const CACHE_KEY = "randomstory_admin_analytics_v1";
const CACHE_MS = 5 * 60 * 1000;

export function AnalyticsDashboard({ posts, members }: { posts: DashboardPost[]; members: DashboardMember[] }) {
  const [views, setViews] = useState<ViewRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [presence, setPresence] = useState<PresenceRow[]>([]);
  const [range, setRange] = useState<"day" | "week" | "month">("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { savedAt: number; views: ViewRow[]; comments: CommentRow[]; presence: PresenceRow[] };
        if (Date.now() - parsed.savedAt < CACHE_MS) {
          setViews(parsed.views); setComments(parsed.comments); setPresence(parsed.presence); setLoading(false); return;
        }
      } catch { localStorage.removeItem(CACHE_KEY); }
    }
    Promise.all([getDocs(collection(firestore, "analytics_views")), getDocs(collection(firestore, "comments")), getDocs(collection(firestore, "analytics_presence"))])
      .then(([viewSnapshot, commentSnapshot, presenceSnapshot]) => {
        const nextViews = viewSnapshot.docs.map((item) => item.data() as ViewRow);
        const nextComments = commentSnapshot.docs.map((item) => item.data() as CommentRow);
        const nextPresence = presenceSnapshot.docs.map((item) => item.data() as PresenceRow);
        setViews(nextViews); setComments(nextComments); setPresence(nextPresence);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), views: nextViews, comments: nextComments, presence: nextPresence }));
      }).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const start = new Date(now);
  if (range === "day") start.setHours(0, 0, 0, 0);
  else if (range === "week") start.setDate(now.getDate() - 6), start.setHours(0, 0, 0, 0);
  else start.setDate(now.getDate() - 29), start.setHours(0, 0, 0, 0);
  const rangedViews = views.filter((view) => new Date(view.viewedAt).getTime() >= start.getTime());
  const today = now.toISOString().slice(0, 10);
  const publishedToday = posts.filter((post) => post.status === "published" && String(post.published_at || post.created_at).slice(0, 10) === today).length;
  const pendingComments = comments.filter((comment) => comment.approved !== true).length;
  const online = presence.filter((item) => Date.now() - new Date(item.lastSeen).getTime() < 5 * 60 * 1000).length;

  const chart = useMemo(() => {
    const labels: string[] = [];
    const values: number[] = [];
    if (range === "day") {
      for (let hour = 0; hour < 24; hour += 1) { labels.push(`${String(hour).padStart(2, "0")}:00`); values.push(rangedViews.filter((view) => view.hour === hour).length); }
    } else {
      const days = range === "week" ? 7 : 30;
      for (let offset = days - 1; offset >= 0; offset -= 1) {
        const date = new Date(); date.setDate(date.getDate() - offset);
        const key = date.toISOString().slice(0, 10);
        labels.push(date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }));
        values.push(rangedViews.filter((view) => view.date === key).length);
      }
    }
    return { labels, values };
  }, [range, rangedViews]);

  const postById = new Map(posts.map((post) => [post.id, post]));
  const knownCategories = Array.from(new Set(posts.filter((post) => post.status === "published").map((post) => post.category))).sort((a, b) => a.localeCompare(b, "vi"));
  const categoryCounts = rangedViews.reduce<Record<string, number>>((result, view) => {
    const currentCategory = postById.get(view.postId)?.category;
    if (!currentCategory) return result;
    result[currentCategory] = (result[currentCategory] ?? 0) + 1;
    return result;
  }, Object.fromEntries(knownCategories.map((category) => [category, 0])));
  const categories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"));
  const postCounts = rangedViews.reduce<Record<string, { title: string; count: number }>>((result, view) => {
    const currentPost = postById.get(view.postId);
    if (!currentPost) return result;
    result[view.postId] = { title: currentPost.title, count: (result[view.postId]?.count ?? 0) + 1 };
    return result;
  }, {});
  const topPosts = Object.values(postCounts).sort((a, b) => b.count - a.count).slice(0, 10);
  const productivity = members.map((member) => ({ name: member.full_name || member.email, count: posts.filter((post) => post.status === "published" && post.author_id === member.id).length })).sort((a, b) => b.count - a.count).slice(0, 10);
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } } as const;

  return <div className="analytics-dashboard">
    <div className="analytics-toolbar"><p>Dữ liệu được lưu đệm 5 phút để Dashboard tải nhanh hơn.</p><label className="admin-select"><select value={range} onChange={(event) => setRange(event.target.value as typeof range)}><option value="day">Hôm nay</option><option value="week">7 ngày</option><option value="month">30 ngày</option></select><StageIcon name="chevron-down" /></label></div>
    <div className="kpi-grid"><Kpi label="Tổng lượt xem" value={rangedViews.length} note={range === "day" ? "Trong hôm nay" : range === "week" ? "Trong 7 ngày" : "Trong 30 ngày"} icon="chart" /><Kpi label="Bài viết mới" value={publishedToday} note="Xuất bản hôm nay" icon="file-text" /><Kpi label="Bình luận mới" value={pendingComments} note="Đang chờ kiểm duyệt" icon="message" /><Kpi label="Thành viên online" value={online} note="Hoạt động trong 5 phút" icon="users" /></div>
    <div className="analytics-chart-grid"><section className="analytics-panel analytics-wide"><PanelTitle title="Lượng truy cập" subtitle={range === "day" ? "Theo từng giờ" : "Theo từng ngày"} /><div className="chart-canvas">{loading ? <p>Đang tải dữ liệu…</p> : <Line options={chartOptions} data={{ labels: chart.labels, datasets: [{ data: chart.values, borderColor: "#6d4774", backgroundColor: "rgba(109,71,116,.13)", fill: true, tension: .35, pointRadius: 3 }] }} />}</div></section><section className="analytics-panel"><PanelTitle title="Lượt xem theo chủ đề" subtitle="So sánh chuyên mục" /><div className="chart-canvas">{loading ? <p>Đang tải dữ liệu…</p> : <Bar options={chartOptions} data={{ labels: categories.map(([name]) => name), datasets: [{ data: categories.map(([, count]) => count), backgroundColor: ["#503357", "#735078", "#96709a", "#b798ba", "#d2bdd4"] }] }} />}</div></section></div>
    <div className="analytics-list-grid"><Ranking title="Bài viết xem nhiều" rows={topPosts.map((item) => [item.title, `${item.count} lượt xem`])} /><Ranking title="Chuyên mục Hot" rows={categories.map(([name, count]) => [name, `${rangedViews.length ? Math.round(count / rangedViews.length * 100) : 0}%`]).slice(0, 10)} /><Ranking title="Năng suất thành viên" rows={productivity.map((item) => [item.name, `${item.count} bài`])} /></div>
  </div>;
}

function Kpi({ label, value, note, icon }: { label: string; value: number; note: string; icon: "chart" | "file-text" | "message" | "users" }) { return <section className="kpi-card"><div><span>{label}</span><strong>{value.toLocaleString("vi-VN")}</strong><small>{note}</small></div><i><StageIcon name={icon} /></i></section>; }
function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) { return <header className="analytics-panel-title"><div><h2>{title}</h2><small>{subtitle}</small></div></header>; }
function Ranking({ title, rows }: { title: string; rows: string[][] }) { return <section className="analytics-panel ranking"><PanelTitle title={title} subtitle={`Top ${Math.min(10, rows.length)}`} />{rows.length ? <ol>{rows.map(([name, value], index) => <li key={`${name}-${index}`}><b>{index + 1}</b><span>{name}</span><strong>{value}</strong></li>)}</ol> : <p className="analytics-empty">Chưa có dữ liệu.</p>}</section>; }
