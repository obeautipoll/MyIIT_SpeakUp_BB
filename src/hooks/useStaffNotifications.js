import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../contexts/authContext";

const LS_KEY = "staff_notifications_last_seen";

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
  try {
    if (typeof val?.toDate === "function") {
      const t = val.toDate()?.getTime?.();
      return Number.isFinite(t) ? t : 0;
    }
  } catch {}
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const t = Date.parse(val);
  return Number.isFinite(t) ? t : 0;
};

export function useStaffNotifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSeenAt, setLastSeenAt] = useState(getLastSeen());

  const prevRef = useRef(new Map());
  const initialLoadRef = useRef(true);
  const [staffRole, setStaffRole] = useState("");
  const [staffEmail, setStaffEmail] = useState("");

  // Determine staff role from localStorage ("staff" or "kasama")
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const storedRole = (user?.role || "").toLowerCase();
      if (storedRole === "staff" || storedRole === "kasama") {
        setStaffRole(storedRole);
      } else if (currentUser?.role && ["staff", "kasama"].includes(currentUser.role.toLowerCase())) {
        setStaffRole(currentUser.role.toLowerCase());
      } else {
        setStaffRole("");
      }

      const resolvedEmail =
        (user?.email || currentUser?.email || "").trim().toLowerCase();
      setStaffEmail(resolvedEmail);
    } catch {
      setStaffRole("");
      setStaffEmail("");
    }
  }, [currentUser]);

  useEffect(() => {
    setLoading(true);
    setNotifications([]);
    prevRef.current = new Map();
    initialLoadRef.current = true;

    const normalizedEmail = (staffEmail || "").trim().toLowerCase();
    if (!staffRole || !normalizedEmail) { setLoading(false); return; }

    const qRole = query(collection(db, "complaints"), where("assignedRole", "==", staffRole));
    const unsub = onSnapshot(qRole, (snapshot) => {
      const isStatusFromSelf = (data = {}) => {
        const updatedBy = data.statusUpdatedBy;
        const updatedByRole = (data.statusUpdatedByRole || "").toLowerCase();
        const isByUser =
          !!updatedBy &&
          (updatedBy === currentUser?.uid || updatedBy === currentUser?.email);
        const isByRole = staffRole && updatedByRole === staffRole;
        return Boolean(isByUser || isByRole);
      };

      // Initial load: backfill assignment + feedback since last seen
      if (initialLoadRef.current) {
        const since = getLastSeen();
        const initial = [];
        snapshot.docs.forEach((doc) => {
          const d = doc.data() || {};
          if ((d.assignedTo || "").toLowerCase() !== normalizedEmail) {
            prevRef.current.delete(doc.id);
            return;
          }
          const assignmentMs = toMs(d.assignmentUpdatedAt);
          if (assignmentMs > 0) {
            initial.push({
              id: `${doc.id}::assignment::${assignmentMs}`,
              type: "assignment",
              complaintId: doc.id,
              category: d.category || "",
              title: "New assigned complaint",
              date: assignmentMs,
            });
          }

          // Backfill latest status update if available
          const statusMs = toMs(d.statusUpdatedAt);
          if (d.status && statusMs > 0 && !isStatusFromSelf(d)) {
            initial.push({
              id: `${doc.id}::status::${d.status}-${statusMs}`,
              type: "status",
              complaintId: doc.id,
              category: d.category || "",
              title: `Status updated to ${d.status}`,
              date: statusMs,
            });
          }

          const feedbackHistory = Array.isArray(d.feedbackHistory) ? d.feedbackHistory : [];
          let lastFeedbackMs = 0;
          let lastFeedbackItem = null;
          if (feedbackHistory.length) {
            lastFeedbackItem = feedbackHistory[feedbackHistory.length - 1];
            lastFeedbackMs = toMs(lastFeedbackItem?.date);
          }
          const feedbackMs = Math.max(lastFeedbackMs, toMs(d.feedbackUpdatedAt));
          const ownUid = currentUser?.uid;
          const ownEmail = currentUser?.email;
          const authoredBySelf = lastFeedbackItem?.adminId && (lastFeedbackItem.adminId === ownUid || lastFeedbackItem.adminId === ownEmail);
          if ((d.Feedback || feedbackHistory.length > 0) && feedbackMs > 0 && !authoredBySelf) {
            initial.push({
              id: `${doc.id}::feedback::${feedbackMs}`,
              type: "feedback",
              complaintId: doc.id,
              category: d.category || "",
              title: "New feedback from admin",
              date: feedbackMs,
            });
          }

          prevRef.current.set(doc.id, {
            feedbackCount: feedbackHistory.length,
            assignedRole: d.assignedRole,
            feedbackValue: d.Feedback || "",
            status: d.status,
          });
        });

        if (initial.length) {
          initial.sort((a,b)=>b.date-a.date);
          setNotifications(initial.slice(0, 100));
        }
        initialLoadRef.current = false;
        setLoading(false);
        return;
      }

      // Realtime changes
      const newNotifs = [];
      snapshot.docChanges().forEach((change) => {
        const id = change.doc.id;
        const d = change.doc.data() || {};
        if ((d.assignedTo || "").toLowerCase() !== normalizedEmail) {
          prevRef.current.delete(id);
          return;
        }
        const prev = prevRef.current.get(id) || { feedbackCount: 0, assignedRole: undefined, feedbackValue: "", status: undefined };

        const nowMs = Date.now();

        // Treat ADDED as a new assignment into this role
        if (change.type === "added") {
          newNotifs.push({
            id: `${id}::assignment::${nowMs}`,
            type: "assignment",
            complaintId: id,
            category: d.category || "",
            title: "New assigned complaint",
            date: nowMs,
          });
        }

        // Status change
        if (
          change.type === "modified" &&
          d.status &&
          d.status !== prev.status &&
          !isStatusFromSelf(d)
        ) {
          const statusMs = toMs(d.statusUpdatedAt) || nowMs;
          newNotifs.push({
            id: `${id}::status::${d.status}-${statusMs}`,
            type: "status",
            complaintId: id,
            category: d.category || "",
            title: `Status updated to ${d.status}`,
            date: statusMs,
          });
        }

        // Feedback change
        const feedbackHistory = Array.isArray(d.feedbackHistory) ? d.feedbackHistory : [];
        const feedbackCount = feedbackHistory.length;
        const feedbackValue = d.Feedback || "";
        if (
          change.type === "modified" &&
          (feedbackCount > (prev.feedbackCount || 0) || (feedbackValue && feedbackValue !== (prev.feedbackValue || "")))
        ) {
          let dateMs = nowMs;
          const last = feedbackHistory[feedbackHistory.length - 1];
          if (last?.date) {
            const t = Date.parse(last.date);
            if (Number.isFinite(t)) dateMs = t;
          }
          const ownUid = currentUser?.uid;
          const ownEmail = currentUser?.email;
          const authoredBySelf = last?.adminId && (last.adminId === ownUid || last.adminId === ownEmail);
          if (!authoredBySelf) {
            newNotifs.push({
              id: `${id}::feedback::${feedbackCount}-${dateMs}`,
              type: "feedback",
              complaintId: id,
              category: d.category || "",
              title: "New feedback from admin",
              date: dateMs,
            });
          }
        }

        prevRef.current.set(id, { feedbackCount, assignedRole: d.assignedRole, feedbackValue, status: d.status });
      });

      if (newNotifs.length) {
        setNotifications((prev) => {
          const merged = [...newNotifs, ...prev];
          return merged
            .sort((a,b)=> b.date - a.date)
            .slice(0, 100);
        });
      }
    }, () => setLoading(false));

    return () => { try { unsub && unsub(); } catch {} };
  }, [staffRole, staffEmail, currentUser?.uid, currentUser?.email]);

  const unreadCount = useMemo(() => notifications.reduce((acc,n)=> (n.date>lastSeenAt?acc+1:acc), 0), [notifications, lastSeenAt]);

  const markAllSeen = () => {
    const now = Date.now();
    setLastSeen(now);
    setLastSeenAt((p)=> Math.max(p, now));
  };
  const markSeenUpTo = (ms) => {
    const v = Number(ms)||0;
    setLastSeen(v);
    setLastSeenAt((p)=> Math.max(p, v));
  };

  return { notifications, loading, unreadCount, lastSeenAt, markAllSeen, markSeenUpTo };
}

export default useStaffNotifications;
