import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Settings } from "lucide-react";
import { useAccount } from "../../contexts/AccountContext";
import { useLayout } from "../../contexts/LayoutContext";
import { Menu } from "lucide-react";

const iconBtn = {
  width: 40, height: 40, borderRadius: 11, background: "#f1f3f6",
  border: "1px solid rgba(15,23,42,.08)", display: "flex", alignItems: "center",
  justifyContent: "center", color: "rgba(15,23,42,.55)", cursor: "pointer",
};

/**
 * Header padrão de todas as telas.
 * @param {string} [crumb]    trecho do breadcrumb (default: title em maiúsculas)
 * @param {string} title
 * @param {string} [subtitle]
 * @param {ReactNode} [actions]  botões específicos da página (antes do sino)
 */
export default function Topbar({ crumb, title, subtitle, actions }) {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const { avisos, iniciais, conta } = useAccount();
  const { isMobile, abrirMenu } = useLayout();
  const [notifs, setNotifs] = useState([]);
  useEffect(() => { setNotifs(avisos); }, [avisos]);
  const panelRef = useRef(null);
  const unreadCount = notifs.filter((n) => n.unread).length;
  const crumbLabel = crumb || (title ? title.toUpperCase() : "");
  const initials = iniciais;

  useEffect(() => {
    const close = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setNotifOpen(false);
    };
    if (notifOpen) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [notifOpen]);

  const markAllRead = () => setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })));

  return (
    <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", flexWrap: isMobile ? "wrap" : "nowrap", gap: isMobile ? 10 : 16, padding: isMobile ? "10px 16px" : "12px 28px", borderBottom: "1px solid rgba(15,23,42,.08)", flexShrink: 0, background: "#fff" }}>
      {isMobile && (
        <button
          onClick={abrirMenu}
          aria-label="Abrir menu"
          style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(15,23,42,.1)", background: "#fff", color: "rgba(15,23,42,.65)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          <Menu size={18} />
        </button>
      )}

      {/* Left: breadcrumb + title + subtitle */}
      <div style={{ flexShrink: 1, minWidth: 0 }}>
        {crumbLabel && (
          <div style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace", color: "rgba(15,23,42,.4)", letterSpacing: ".04em", marginBottom: 3 }}>
            ndocs <span style={{ opacity: 0.5 }}>/</span> {crumbLabel}
          </div>
        )}
        {title && (
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 19, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{title}</h2>
        )}
        {subtitle && <p style={{ fontSize: 12, color: "rgba(15,23,42,.45)", marginTop: 2 }}>{subtitle}</p>}
      </div>

      <div style={{ flex: 1 }} />

      {/* Page-specific actions */}
      {actions && <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{actions}</div>}

      {/* Notifications */}
      <div style={{ position: "relative" }} ref={panelRef}>
        <button
          onClick={() => setNotifOpen((o) => !o)}
          style={{ ...iconBtn, position: "relative", background: notifOpen ? "#e6e9ee" : "#f1f3f6" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#e6e9ee")}
          onMouseLeave={(e) => (e.currentTarget.style.background = notifOpen ? "#e6e9ee" : "#f1f3f6")}
        >
          <Bell size={17} strokeWidth={1.9} />
          {unreadCount > 0 && (
            <span style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: "50%", background: "#2563EB", border: "2px solid #fff" }} />
          )}
        </button>

        {notifOpen && (
          <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 340, background: "#fff", border: "1px solid rgba(15,23,42,.1)", borderRadius: 16, boxShadow: "0 16px 48px rgba(15,23,42,.18)", overflow: "hidden", animation: "fadeUp .18s ease-out", zIndex: 500 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid rgba(15,23,42,.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Notificações</span>
                {unreadCount > 0 && (
                  <span style={{ background: "#2563EB", color: "#fff", borderRadius: 999, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{unreadCount}</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ fontSize: 12, color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {notifs.length === 0 && (
              <div style={{ padding: "26px 18px", textAlign: "center", fontSize: 13, color: "rgba(15,23,42,.45)" }}>
                Nenhuma geração ainda.
              </div>
            )}

            {notifs.map((n) => (
              <div
                key={n.id}
                onClick={() => setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))}
                style={{ display: "flex", gap: 12, padding: "14px 18px", borderBottom: "1px solid rgba(15,23,42,.05)", cursor: "pointer", background: n.unread ? "rgba(37,99,235,.04)" : "transparent", transition: "background .1s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = n.unread ? "rgba(37,99,235,.07)" : "rgba(15,23,42,.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = n.unread ? "rgba(37,99,235,.04)" : "transparent")}
              >
                <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{n.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13.5, fontWeight: n.unread ? 600 : 400 }}>{n.title}</span>
                    {n.unread && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563EB", flexShrink: 0 }} />}
                  </div>
                  <div style={{ fontSize: 12.5, color: "rgba(15,23,42,.5)", lineHeight: 1.4 }}>{n.desc}</div>
                  <div style={{ fontSize: 11, color: "rgba(15,23,42,.35)", marginTop: 4 }}>{n.time}</div>
                </div>
              </div>
            ))}

            <div style={{ padding: "12px 18px", textAlign: "center" }}>
              <button onClick={() => { setNotifOpen(false); navigate("/history"); }} style={{ fontSize: 13, color: "rgba(15,23,42,.5)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                Ver histórico completo →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <button onClick={() => navigate("/settings")} style={iconBtn}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#e6e9ee")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f3f6")}>
        <Settings size={17} strokeWidth={1.9} />
      </button>

      {/* Avatar */}
      <div onClick={() => navigate("/settings")} style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#2563EB,#3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", flexShrink: 0 }}>
        {/^https?:\/\//.test(conta.avatar || '')
          ? <img src={conta.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
          : initials}
      </div>
    </div>
  );
}
