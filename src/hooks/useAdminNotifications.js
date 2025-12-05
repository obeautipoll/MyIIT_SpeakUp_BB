import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/firebase";

const LS_KEY = "admin_notifications_last_seen";

const getLastSeen = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
};

const setLastSeen = (ms) => {
  try {
    const prev = getLastSeen();
    const next = Math.max(Number(prev) || 0, Number(ms) || 0);
    localStorage.setItem(LS_KEY, String(next));
  } catch {}
};

const toMs = (val) => {
  if (!val) return 0;
  try { if (typeof val?.toDate === "function") return val.toDate()?.getTime?.() || 0; } catch {}
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const t = Date.parse(val);
  return Number.isFinite(t) ? t : 0;
};

const isStaffRole = (role) => {
  const r = (role || "").toLowerCase();
  return r === "staff" || r === "kasama";
};

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSeenAt, setLastSeenAt] = useState(getLastSeen());

  const prevRef = useRef(new Map());
  const initialLoadRef = useRef(true);

  useEffect(() => {
    setLoading(true);
    setNotifications([]);
    prevRef.current = new Map();
    initialLoadRef.current = true;

    const qAll = query(collection(db, "complaints"), orderBy("submissionDate", "desc"));
    const unsub = onSnapshot(qAll, (snapshot) => {
      if (initialLoadRef.current) {
        const since = getLastSeen();
        const initial = [];
        snapshot.docs.forEach((doc) => {
          const d = doc.data() || {};
          const subMs = toMs(d.submissionDate);
          if (subMs > 0) {
            initial.push({
              id: `${doc.id}::new::${subMs}`,
              type: "new",
              title: "New complaint submitted",
              complaintId: doc.id,
              category: d.category || "",
              date: subMs,
            });
          }

          const statusMs = toMs(d.statusUpdatedAt);
          if (statusMs > 0 && isStaffRole(d.assignedRole)) {
            initial.push({
              id: `${doc.id}::status::${statusMs}`,
              type: "status",
              title: `Status updated${d.status ? `: ${d.status}` : ""}`,
              complaintId: doc.id,
              category: d.category || "",
              date: statusMs,
            });
          }

          const history = Array.isArray(d.feedbackHistory) ? d.feedbackHistory : [];
          const last = history[history.length - 1];
          const fbMs = Math.max(toMs(last?.date), toMs(d.feedbackUpdatedAt));
          if (fbMs > 0 && last && isStaffRole(last.adminRole)) {
            initial.push({
              id: `${doc.id}::feedback::${fbMs}`,
              type: "feedback",
              title: "New feedback from staff",
              complaintId: doc.id,
              category: d.category || "",
              date: fbMs,
            });
          }

          prevRef.current.set(doc.id, {
            status: d.status,
            feedbackCount: history.length,
            feedbackValue: d.Feedback || "",
            assignedRole: d.assignedRole,
          });
        });

        if (initial.length) {
          initial.sort((a, b) => b.date - a.date);
          setNotifications(initial.slice(0, 100));
        }
        initialLoadRef.current = false;
        setLoading(false);
        return;
      }

      const newNotifs = [];
      snapshot.docChanges().forEach((change) => {
        const id = change.doc.id;
        const d = change.doc.data() || {};
        const prev = prevRef.current.get(id) || { status: undefined, feedbackCount: 0, feedbackValue: "", assignedRole: undefined };
        const nowMs = Date.now();

        if (change.type === "added") {
          const subMs = toMs(d.submissionDate) || nowMs;
          newNotifs.push({ id: `${id}::new::${subMs}` , type: "new", title: "New complaint submitted", complaintId: id, category: d.category || "", date: subMs });
        }

        if (change.type === "modified" && d.status !== prev.status && isStaffRole(d.assignedRole)) {
          newNotifs.push({ id: `${id}::status::${nowMs}`, type: "status", title: `Status updated${d.status ? `: ${d.status}` : ""}`, complaintId: id, category: d.category || "", date: nowMs });
        }

        const history = Array.isArray(d.feedbackHistory) ? d.feedbackHistory : [];
        const feedbackCount = history.length;
        const feedbackValue = d.Feedback || "";
        if (change.type === "modified" && (feedbackCount > (prev.feedbackCount || 0) || (feedbackValue && feedbackValue !== (prev.feedbackValue || "")))) {
          const last = history[history.length - 1];
          const role = last?.adminRole || "";
          if (isStaffRole(role)) {
            let dateMs = toMs(last?.date) || nowMs;
            newNotifs.push({ id: `${id}::feedback::${feedbackCount}-${dateMs}`, type: "feedback", title: "New feedback from staff", complaintId: id, category: d.category || "", date: dateMs });
          }
        }

        prevRef.current.set(id, { status: d.status, feedbackCount, feedbackValue, assignedRole: d.assignedRole });
      });

      if (newNotifs.length) {
        setNotifications((prev) => {
          const merged = [...newNotifs, ...prev];
          return merged.slice(0, 100);
        });
      }
    }, () => setLoading(false));

    return () => { try { unsub && unsub(); } catch {} };
  }, []);

  const unreadCount = useMemo(() => notifications.reduce((acc, n) => (n.date > lastSeenAt ? acc + 1 : acc), 0), [notifications, lastSeenAt]);

  const markAllSeen = () => {
    const now = Date.now();
    setLastSeen(now);
    setLastSeenAt((p) => Math.max(p, now));
  };
  const markSeenUpTo = (ms) => {
    const v = Number(ms) || 0;
    setLastSeen(v);
    setLastSeenAt((p) => Math.max(p, v));
  };

  return { notifications, loading, unreadCount, lastSeenAt, markAllSeen, markSeenUpTo };
}

export default useAdminNotifications;