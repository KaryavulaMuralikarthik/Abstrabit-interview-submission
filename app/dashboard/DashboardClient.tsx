/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback, useRef, FormEvent } from "react";
import { createClient } from "@/lib/client/supabaseClient";
import CustomButton from "@/Components/CustomButton";

interface Bookmark {
  id: string;
  url: string;
  user_id: string;
  created_at: string;
  name?: string | null;
  description?: string | null;
}

interface User {
  id: string;
  email?: string;
}

export default function DashboardClient({ user }: { user: User }) {
  const supabase = createClient();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelsRef = useRef<{ db: any; broadcast: any }>({
    db: null,
    broadcast: null,
  });
  const urlInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookmarks(data || []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching bookmarks:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, supabase]);

  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log("Realtime payload:", payload);

    switch (payload.eventType) {
      case "INSERT":
        setBookmarks((prev) => {
          const exists = prev.some((b) => b.id === payload.new.id);
          if (exists) return prev;
          return [payload.new, ...prev];
        });
        break;

      case "DELETE":
        setBookmarks((prev) => prev.filter((b) => b.id !== payload.old.id));
        break;

      case "UPDATE":
        setBookmarks((prev) =>
          prev.map((b) => (b.id === payload.new.id ? payload.new : b)),
        );
        break;
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();

    if (channelsRef.current.db) {
      supabase.removeChannel(channelsRef.current.db);
    }
    if (channelsRef.current.broadcast) {
      supabase.removeChannel(channelsRef.current.broadcast);
    }

    const dbChannel = supabase
      .channel(`db-changes-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${user.id}`,
        },
        handleRealtimeUpdate,
      )
      .subscribe((status, err) => {
        console.log(`DB Channel status (${user.id}):`, status);
        if (status === "CHANNEL_ERROR") {
          console.error("DB Channel error:", err);
          setError("Realtime connection failed");
        }
      });

    const broadcastChannel = supabase
      .channel(`broadcast-${user.id}`)
      .on("broadcast", { event: "bookmark-sync" }, ({ payload }) => {
        console.log("Broadcast received:", payload);

        switch (payload.type) {
          case "INSERT":
            setBookmarks((prev) => {
              const exists = prev.some((b) => b.id === payload.data.id);
              if (exists) return prev;
              return [payload.data, ...prev];
            });
            break;
          case "DELETE":
            setBookmarks((prev) =>
              prev.filter((b) => b.id !== payload.data.id),
            );
            break;
          case "REFRESH":
            fetchBookmarks();
            break;
        }
      })
      .subscribe((status) => {
        console.log(`Broadcast channel status (${user.id}):`, status);
      });

    channelsRef.current = { db: dbChannel, broadcast: broadcastChannel };

    return () => {
      if (channelsRef.current.db) {
        supabase.removeChannel(channelsRef.current.db);
      }
      if (channelsRef.current.broadcast) {
        supabase.removeChannel(channelsRef.current.broadcast);
      }
    };
  }, [user.id, fetchBookmarks, handleRealtimeUpdate, supabase]);
  const validateUrl = (
    url: string,
  ): { isValid: boolean; formattedUrl: string; error: string | null } => {
    if (!url.trim()) {
      return { isValid: false, formattedUrl: "", error: "URL is required" };
    }

    let formattedUrl = url.trim();

    if (
      !formattedUrl.startsWith("http://") &&
      !formattedUrl.startsWith("https://")
    ) {
      formattedUrl = "https://" + formattedUrl;
    }

    try {
      new URL(formattedUrl);
      return { isValid: true, formattedUrl, error: null };
    } catch {
      return {
        isValid: false,
        formattedUrl: "",
        error:
          "Please enter a valid URL (e.g., example.com or https://example.com)",
      };
    }
  };

  const addBookmark = async (e: FormEvent) => {
    e.preventDefault();

    setUrlError(null);

    const urlValue = urlInputRef.current?.value || "";
    const nameValue = nameInputRef.current?.value || null;
    const descriptionValue = descriptionInputRef.current?.value || null;

    const validation = validateUrl(urlValue);
    if (!validation.isValid) {
      setUrlError(validation.error);
      urlInputRef.current?.focus();
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const { data, error } = await supabase
        .from("bookmarks")
        .insert([
          {
            url: validation.formattedUrl,
            user_id: user.id,
            name: nameValue || null,
            description: descriptionValue || null,
          },
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setBookmarks((prev) => [data[0], ...prev]);

        try {
          const channel = supabase.channel(`broadcast-${user.id}`);
          await channel.send({
            type: "broadcast",
            event: "bookmark-sync",
            payload: {
              type: "INSERT",
              data: data[0],
            },
          });
        } catch (broadcastError) {
          console.log("Broadcast failed (non-critical):", broadcastError);
        }
      }

      // Clear form using refs
      if (urlInputRef.current) urlInputRef.current.value = "";
      if (nameInputRef.current) nameInputRef.current.value = "";
      if (descriptionInputRef.current) descriptionInputRef.current.value = "";

      setUrlError(null);
    } catch (err: any) {
      console.error("Error adding bookmark:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteBookmark = async (id: string) => {
    try {
      setError(null);

      setBookmarks((prev) => prev.filter((b) => b.id !== id));

      const { error } = await supabase.from("bookmarks").delete().eq("id", id);

      if (error) throw error;

      try {
        const channel = supabase.channel(`broadcast-${user.id}`);
        await channel.send({
          type: "broadcast",
          event: "bookmark-sync",
          payload: {
            type: "DELETE",
            data: { id },
          },
        });
      } catch (broadcastError) {
        console.log("Broadcast failed (non-critical):", broadcastError);
      }
    } catch (err: any) {
      console.error("Error deleting bookmark:", err);
      setError(err.message);
      fetchBookmarks();
    }
  };

  const retryConnection = () => {
    setError(null);
    fetchBookmarks();
  };

  if (isLoading && bookmarks.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
            <div className="absolute inset-0 bg-accent/5 rounded-full blur-xl animate-pulse" />
          </div>
          <p className="text-muted animate-pulse">Loading your bookmarks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-4xl font-light text-foreground">
            Your <span className="font-normal text-accent">collection</span>
          </h1>
          <p className="text-muted text-sm">
            {bookmarks.length}{" "}
            {bookmarks.length === 1 ? "treasure" : "treasures"} saved
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-700 px-6 py-4 rounded-2xl relative animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
              <button
                onClick={retryConnection}
                className="bg-red-100 hover:bg-red-200 text-red-800 font-medium px-4 py-2 rounded-xl text-sm transition-all hover:scale-105 active:scale-95"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Add Bookmark Form */}
        <form
          onSubmit={addBookmark}
          className="card p-6 rounded-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div className="space-y-4">
            {/* URL Input with Error */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101"
                  />
                </svg>
                URL <span className="text-red-500">*</span>
              </label>
              <input
                ref={urlInputRef}
                type="url"
                placeholder="https://example.com"
                className={`w-full px-4 py-3 bg-background/50 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  urlError
                    ? "border-red-300 focus:ring-red-200 focus:border-red-500"
                    : "border-border focus:ring-accent/20 focus:border-accent"
                }`}
                disabled={isSubmitting}
                aria-invalid={!!urlError}
                onChange={() => setUrlError(null)} // Clear error when user types
              />
              {urlError && (
                <p className="text-sm text-red-500 flex items-center gap-1.5 mt-1.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {urlError}
                </p>
              )}
            </div>

            {/* Name (Optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Name <span className="text-muted text-xs">(optional)</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                placeholder="e.g., My Favorite Article"
                className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                disabled={isSubmitting}
              />
            </div>

            {/* Description (Optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h7"
                  />
                </svg>
                Description{" "}
                <span className="text-muted text-xs">(optional)</span>
              </label>
              <textarea
                ref={descriptionInputRef}
                placeholder="Add a note or description..."
                rows={2}
                className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <CustomButton
            type="submit"
            disabled={isSubmitting}
            className="group cursor-pointer relative w-full overflow-hidden rounded-xl px-6 py-3.5 bg-accent text-white font-medium transition-all duration-300 hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Bookmark
                </>
              )}
            </span>
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </CustomButton>
        </form>

        {bookmarks.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-24 h-24 bg-accent/5 rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-accent/30 -rotate-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-light text-foreground mb-2">
              Your collection awaits
            </h3>
            <p className="text-muted text-sm">
              Add your first bookmark above to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {bookmarks.map((bookmark, index) => (
              <div
                key={bookmark.id}
                className="group relative card p-5 rounded-xl hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"
                      />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    {bookmark.name && (
                      <h3 className="font-medium text-foreground mb-1 truncate">
                        {bookmark.name}
                      </h3>
                    )}
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline text-sm block truncate"
                    >
                      {bookmark.url}
                    </a>
                    {bookmark.description && (
                      <p className="text-muted text-xs mt-2 line-clamp-2">
                        {bookmark.description}
                      </p>
                    )}
                    <p className="text-muted/50 text-xs mt-2">
                      Added{" "}
                      {new Date(bookmark.created_at).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </p>
                  </div>

                  <CustomButton
                    onClick={() => deleteBookmark(bookmark.id)}
                    className=" cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 text-muted hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                    aria-label="Delete bookmark"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </CustomButton>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Connection Status Indicator */}
        <div className="fixed bottom-4 right-4 flex items-center gap-2 text-xs text-muted/50 bg-surface/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${error ? "bg-red-400" : "bg-green-400"} opacity-75`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${error ? "bg-red-500" : "bg-green-500"}`}
            />
          </span>
          {error ? "Connection issues" : "Connected"}
        </div>
      </div>
    </div>
  );
}
