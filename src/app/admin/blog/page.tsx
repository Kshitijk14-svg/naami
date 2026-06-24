"use client";

import { useEffect, useState } from "react";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  coverImage?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  createdAt: string;
}

const EMPTY_FORM = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  isPublished: false,
};

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = () => {
    setLoading(true);
    fetch("/api/admin/blog")
      .then((r) => r.json())
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPosts(); }, []);

  const openCreate = () => {
    setEditingPost(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      content: post.content,
      coverImage: post.coverImage ?? "",
      isPublished: post.isPublished,
    });
    setError(null);
    setShowModal(true);
  };

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: editingPost ? prev.slug : slugify(title),
    }));
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = editingPost ? `/api/admin/blog/${editingPost.id}` : "/api/admin/blog";
      const method = editingPost ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      setShowModal(false);
      fetchPosts();
    } catch { setError("An error occurred."); } finally { setSaving(false); }
  };

  const deletePost = async (id: number) => {
    if (!confirm("Delete this post permanently?")) return;
    await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    fetchPosts();
  };

  const inputStyle = {
    width: "100%",
    backgroundColor: "#F4F0E6",
    border: "1px solid rgba(139,26,26,0.15)",
    padding: "10px 14px",
    fontSize: "13px",
    color: "#111",
    outline: "none",
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    fontSize: "8px",
    fontFamily: "sans-serif",
    fontWeight: "700",
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    color: "rgba(17,17,17,0.45)",
    marginBottom: "6px",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <span className="font-sans font-bold uppercase tracking-[0.3em] block mb-2" style={{ fontSize: "9px", color: "#8B1A1A" }}>
            NAAMI // JOURNAL
          </span>
          <h1 className="font-serif font-light uppercase" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", color: "#111", letterSpacing: "0.02em" }}>
            Blog Posts
          </h1>
        </div>
        <button
          onClick={openCreate}
          className="font-sans font-bold uppercase tracking-[0.2em] px-6 py-3 hover:opacity-80 transition-opacity cursor-pointer"
          style={{ fontSize: "9px", backgroundColor: "#8B1A1A", color: "#F4F0E6", border: "none" }}
        >
          + New Post
        </button>
      </div>

      {loading ? (
        <p className="font-sans" style={{ fontSize: "13px", color: "rgba(17,17,17,0.5)" }}>Loading…</p>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-serif font-light italic" style={{ fontSize: "1.1rem", color: "rgba(17,17,17,0.4)" }}>
            No blog posts yet. Create your first story.
          </p>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Title", "Status", "Published", "Actions"].map((h) => (
                <th key={h} className="font-sans font-bold uppercase text-left" style={{ fontSize: "8px", letterSpacing: "0.2em", color: "#8B1A1A", padding: "0 12px 12px 0", borderBottom: "1px solid rgba(139,26,26,0.12)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(17,17,17,0.04)" }}>
                  <p className="font-serif font-light" style={{ fontSize: "14px", color: "#111" }}>{post.title}</p>
                  <p className="font-sans" style={{ fontSize: "10px", color: "rgba(17,17,17,0.4)", marginTop: "2px" }}>/journal/{post.slug}</p>
                </td>
                <td style={{ padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(17,17,17,0.04)" }}>
                  <span
                    className="font-sans font-bold uppercase tracking-[0.15em]"
                    style={{
                      fontSize: "8px",
                      padding: "3px 8px",
                      backgroundColor: post.isPublished ? "rgba(46,107,58,0.1)" : "rgba(17,17,17,0.07)",
                      color: post.isPublished ? "#2E6B3A" : "rgba(17,17,17,0.5)",
                    }}
                  >
                    {post.isPublished ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="font-sans" style={{ fontSize: "11px", color: "rgba(17,17,17,0.5)", padding: "14px 12px 14px 0", borderBottom: "1px solid rgba(17,17,17,0.04)" }}>
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-IN") : "—"}
                </td>
                <td style={{ padding: "14px 0 14px 0", borderBottom: "1px solid rgba(17,17,17,0.04)" }}>
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(post)} className="font-sans font-bold uppercase tracking-[0.15em] hover:opacity-50 cursor-pointer transition-opacity" style={{ fontSize: "8px", color: "#111", background: "none", border: "none" }}>Edit</button>
                    <button onClick={() => deletePost(post.id)} className="font-sans font-bold uppercase tracking-[0.15em] hover:opacity-50 cursor-pointer transition-opacity" style={{ fontSize: "8px", color: "#8B1A1A", background: "none", border: "none" }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-start justify-center overflow-y-auto py-8 px-4" style={{ backgroundColor: "rgba(17,17,17,0.5)", zIndex: 100 }} onClick={() => setShowModal(false)}>
          <div
            className="w-full max-w-2xl"
            style={{ backgroundColor: "#F4F0E6", borderTop: "3px solid #8B1A1A", padding: "32px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif font-light uppercase mb-6" style={{ fontSize: "1.4rem", color: "#111" }}>
              {editingPost ? "Edit Post" : "New Post"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Slug *</label>
                <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Excerpt</label>
                <textarea value={form.excerpt} onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div>
                <label style={labelStyle}>Content * (HTML or plain text)</label>
                <textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={10} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div>
                <label style={labelStyle}>Cover Image URL</label>
                <input value={form.coverImage} onChange={(e) => setForm((p) => ({ ...p, coverImage: e.target.value }))} style={inputStyle} placeholder="/images/..." />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))} />
                <span style={{ fontSize: "12px", fontFamily: "sans-serif", color: "#111" }}>Publish immediately</span>
              </label>
            </div>

            {error && <p className="mt-4 font-sans" style={{ fontSize: "12px", color: "#8B1A1A" }}>{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={save}
                disabled={saving}
                className="font-sans font-bold uppercase tracking-[0.2em] px-8 py-3 hover:opacity-80 cursor-pointer disabled:opacity-50"
                style={{ fontSize: "9px", backgroundColor: "#8B1A1A", color: "#F4F0E6", border: "none" }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setShowModal(false)} className="font-sans font-bold uppercase tracking-[0.15em] px-6 py-3 hover:opacity-50 cursor-pointer" style={{ fontSize: "9px", border: "1px solid rgba(17,17,17,0.2)", background: "none" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
