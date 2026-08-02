import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath) throw new Error("Thiếu FIREBASE_SERVICE_ACCOUNT_PATH");

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));
initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });

const adminAuth = getAuth();
const db = getFirestore();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function rows(table) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw error;
  return data ?? [];
}

const [profiles, posts, categories, comments, likes, subscribers] = await Promise.all([
  rows("profiles"), rows("posts"), rows("categories"), rows("comments"), rows("post_likes"), rows("newsletter_subscribers"),
]);

const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (authError) throw authError;
const userIdMap = new Map();

for (const oldUser of authData.users) {
  if (!oldUser.email) continue;
  let firebaseUser;
  try { firebaseUser = await adminAuth.getUserByEmail(oldUser.email); }
  catch {
    firebaseUser = await adminAuth.createUser({
      email: oldUser.email,
      displayName: oldUser.user_metadata?.full_name || oldUser.user_metadata?.name || undefined,
      emailVerified: Boolean(oldUser.email_confirmed_at),
      ...(oldUser.email === "hungmanh0206@gmail.com" && process.env.FIREBASE_ADMIN_PASSWORD
        ? { password: process.env.FIREBASE_ADMIN_PASSWORD }
        : {}),
    });
  }
  const profile = profiles.find((item) => item.id === oldUser.id);
  userIdMap.set(oldUser.id, firebaseUser.uid);
  await db.collection("users").doc(firebaseUser.uid).set({
    email: oldUser.email,
    full_name: profile?.full_name || firebaseUser.displayName || null,
    avatar_url: profile?.avatar_url || null,
    role: profile?.role || "reader",
    supabaseId: oldUser.id,
    migratedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  if (profile?.role === "admin") await adminAuth.setCustomUserClaims(firebaseUser.uid, { admin: true });
}

const categoryBatch = db.batch();
for (const item of categories) categoryBatch.set(db.collection("categories").doc(item.id), item);
await categoryBatch.commit();

const postBatch = db.batch();
for (const item of posts) postBatch.set(db.collection("posts").doc(item.id), { ...item, likeCount: likes.filter((like) => like.post_id === item.id).length });
await postBatch.commit();

const commentBatch = db.batch();
for (const item of comments) {
  const profile = profiles.find((entry) => entry.id === item.author_id);
  commentBatch.set(db.collection("comments").doc(item.id), {
    postId: item.post_id, authorId: userIdMap.get(item.author_id) || item.author_id, authorName: profile?.full_name || "Độc giả",
    authorAvatar: profile?.avatar_url || null, content: item.content, approved: item.is_approved,
    createdAt: new Date(item.created_at),
  });
}
await commentBatch.commit();

const likeBatch = db.batch();
for (const item of likes) {
  const firebaseUserId = userIdMap.get(item.user_id) || item.user_id;
  likeBatch.set(db.collection("likes").doc(`${item.post_id}_${firebaseUserId}`), { postId: item.post_id, userId: firebaseUserId, createdAt: new Date(item.created_at) });
}
await likeBatch.commit();

const newsletterBatch = db.batch();
for (const item of subscribers) newsletterBatch.set(db.collection("newsletter").doc(item.email.toLowerCase()), { email: item.email, active: item.is_active, subscribedAt: new Date(item.subscribed_at) });
await newsletterBatch.commit();

console.log(JSON.stringify({ users: authData.users.length, profiles: profiles.length, posts: posts.length, categories: categories.length, comments: comments.length, likes: likes.length, subscribers: subscribers.length }, null, 2));
