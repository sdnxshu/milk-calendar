"use client";

import { useState, useEffect, CSSProperties } from "react";

const PRICE_PER_LITRE = 75;
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// -1 = skipped
type MilkData = Record<string, number>;
type EditLog = Record<string, string>; // key → ISO timestamp of last edit
interface ModalState { day: number; key: string; isEditing: boolean }
interface DateState {
    key: string; isToday: boolean; isPast: boolean;
    isFuture: boolean; hasMilk: boolean; isSkipped: boolean;
}

const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
const fmt = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const mkPfx = (y: number, m: number) =>
    `${y}-${String(m + 1).padStart(2, "0")}`;

export default function MilkTrackerPage() {
    const today = new Date();
    const realYear = today.getFullYear();
    const realMonth = today.getMonth();

    const [viewYear, setViewYear] = useState(realYear);
    const [viewMonth, setViewMonth] = useState(realMonth);
    const [milkData, setMilkData] = useState<MilkData>({});
    const [editLog, setEditLog] = useState<EditLog>({});
    const [modal, setModal] = useState<ModalState | null>(null);
    const [inputVal, setInputVal] = useState("");
    const [showSummary, setShowSummary] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [mounted, setMounted] = useState(false);

    const isCurrentMonth = viewYear === realYear && viewMonth === realMonth;
    const todayKey = fmt(realYear, realMonth, today.getDate());
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const totalRows = Math.ceil((firstDay + daysInMonth) / 7);
    const canGoNext = !isCurrentMonth;

    useEffect(() => {
        setMounted(true);
        try { const s = localStorage.getItem("milk-data"); if (s) setMilkData(JSON.parse(s)); } catch { }
        try { const e = localStorage.getItem("milk-edits"); if (e) setEditLog(JSON.parse(e)); } catch { }
    }, []);
    useEffect(() => {
        if (!mounted) return;
        try { localStorage.setItem("milk-data", JSON.stringify(milkData)); } catch { }
        try { localStorage.setItem("milk-edits", JSON.stringify(editLog)); } catch { }
    }, [milkData, editLog, mounted]);

    const prefix = mkPfx(viewYear, viewMonth);
    const totalLitres = Object.entries(milkData).filter(([k, v]) => k.startsWith(prefix) && v > 0).reduce((s, [, v]) => s + v, 0);
    const totalCost = totalLitres * PRICE_PER_LITRE;

    const historyMonths: { year: number; month: number }[] = [];
    const seen = new Set<string>();
    Object.keys(milkData).forEach(key => {
        const p = key.slice(0, 7);
        if (!seen.has(p)) {
            seen.add(p);
            const [y, m] = p.split("-").map(Number);
            historyMonths.push({ year: y, month: m - 1 });
        }
    });
    historyMonths.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (!canGoNext) return;
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };

    const openModal = (day: number) => {
        const key = fmt(viewYear, viewMonth, day);
        const date = new Date(viewYear, viewMonth, day);
        const ref = new Date(realYear, realMonth, today.getDate());
        if (date > ref) return; // no future days
        const isEditing = key !== todayKey; // past days are "editing"
        setInputVal(milkData[key] != null && milkData[key] > 0 ? String(milkData[key]) : "");
        setModal({ day, key, isEditing });
    };

    const commitEntry = (val: number) => {
        if (!modal) return;
        const updated = { ...milkData, [modal.key]: val };
        setMilkData(updated);
        // Record edit time for past-day edits
        if (modal.isEditing) {
            setEditLog(prev => ({ ...prev, [modal.key]: new Date().toISOString() }));
        }
        setModal(null);
        const allFilled = Array.from({ length: daysInMonth }, (_, i) => i + 1)
            .every(d => updated[fmt(viewYear, viewMonth, d)] !== undefined);
        if (allFilled && isCurrentMonth) setTimeout(() => setShowSummary(true), 300);
    };

    const saveEntry = () => { const v = parseFloat(inputVal); if (!isNaN(v) && v >= 0) commitEntry(v); };
    const skipToday = () => commitEntry(-1);

    const getDateState = (day: number): DateState => {
        const key = fmt(viewYear, viewMonth, day);
        const date = new Date(viewYear, viewMonth, day);
        const ref = new Date(realYear, realMonth, today.getDate());
        const val = milkData[key];
        return {
            key,
            isToday: key === todayKey,
            isPast: date < ref,
            isFuture: date > ref,
            hasMilk: val != null && val > 0,
            isSkipped: val === -1,
        };
    };

    const blanks = Array.from({ length: firstDay });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    if (!mounted) return null;

    /* ── Design tokens ── */
    const T = {
        bg: "#f9f8f6",
        white: "#ffffff",
        ink: "#1a1a1a",
        mid: "#6b6b6b",
        faint: "#b0b0b0",
        line: "#e8e6e1",
        hover: "#f2f1ee",
        milkDot: "#1a1a1a",
        skipDot: "#d0cec9",
        accent: "#1a1a1a",
    };

    const overlayStyle: CSSProperties = {
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(249,248,246,0.85)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
    };

    const cardStyle: CSSProperties = {
        background: T.white,
        border: `1px solid ${T.line}`,
        borderRadius: 16,
        boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
    };

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Playfair+Display:ital@1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f9f8f6; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        .dc:hover { background: #f2f1ee !important; }
        .mc:hover { background: #d6ecd6 !important; }
        .tc { background: #1a1a1a !important; }
        .tc:hover { background: #2e2e2e !important; }
        .btn-p:hover { background: #2e2e2e !important; }
        .btn-g:hover { background: #f2f1ee !important; }
        .hr:hover { background: #f9f8f6 !important; }
      `}</style>

            {/* ── Shell ── */}
            <div style={{
                height: "100dvh", width: "100vw", overflow: "hidden",
                background: T.bg,
                fontFamily: "'DM Sans', sans-serif",
                display: "flex", flexDirection: "column",
                padding: "24px 24px 18px", gap: 0,
                color: T.ink,
            }}>

                {/* ── Top bar ── */}
                <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
                    <div>
                        <div style={{ fontSize: 10, color: T.faint, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>
                            Milk Tracker
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 26, color: T.ink, lineHeight: 1 }}>
                            {MONTH_NAMES[viewMonth]} {viewYear}
                        </div>
                    </div>

                    <button
                        className="btn-g"
                        onClick={() => setShowHistory(true)}
                        style={{
                            background: "transparent", border: `1px solid ${T.line}`,
                            borderRadius: 8, padding: "7px 14px",
                            fontSize: 10, color: T.mid, cursor: "pointer",
                            fontFamily: "'DM Sans', sans-serif",
                            letterSpacing: 1, textTransform: "uppercase",
                            transition: "background 0.15s",
                        }}
                    >
                        History
                    </button>
                </div>

                {/* ── Month nav ── */}
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                    <button
                        onClick={prevMonth}
                        style={{ background: "none", border: "none", color: T.faint, fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1, transition: "color 0.15s" }}
                    >
                        ←
                    </button>
                    <div style={{ flex: 1, height: 1, background: T.line }} />
                    {isCurrentMonth && (
                        <span style={{ fontSize: 9, color: T.faint, letterSpacing: 2, textTransform: "uppercase" }}>today</span>
                    )}
                    <div style={{ flex: 1, height: 1, background: T.line }} />
                    <button
                        onClick={nextMonth}
                        style={{ background: "none", border: "none", color: canGoNext ? T.faint : T.line, fontSize: 16, cursor: canGoNext ? "pointer" : "default", padding: 0, lineHeight: 1 }}
                    >
                        →
                    </button>
                </div>

                {/* ── Calendar ── */}
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>

                    {/* Day labels */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8, flexShrink: 0 }}>
                        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                            <div key={i} style={{ textAlign: "center", fontSize: 9, color: T.faint, letterSpacing: 1.5, textTransform: "uppercase" }}>
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Date grid */}
                    <div style={{
                        flex: 1, minHeight: 0,
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        gridTemplateRows: `repeat(${totalRows}, 1fr)`,
                        gap: 3,
                    }}>
                        {blanks.map((_, i) => <div key={`b-${i}`} />)}

                        {days.map(day => {
                            const { key, isToday, isPast, isFuture, hasMilk, isSkipped } = getDateState(day);
                            const litres = milkData[key];

                            return (
                                <div
                                    key={day}
                                    onClick={() => openModal(day)}
                                    className={isToday ? "tc" : hasMilk ? "mc" : "dc"}
                                    style={{
                                        borderRadius: 10,
                                        cursor: isFuture ? "default" : "pointer",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 3,
                                        opacity: isFuture ? 0.25 : 1,
                                        transition: "background 0.12s",
                                        position: "relative",
                                        background: isToday
                                            ? "#1a1a1a"
                                            : hasMilk
                                                ? "#e6f3e6"
                                                : isSkipped
                                                    ? "#f4f3f1"
                                                    : "transparent",
                                        border: hasMilk && !isToday
                                            ? "1.5px solid #b8ddb8"
                                            : isSkipped
                                                ? "1.5px dashed #d8d6d2"
                                                : "1.5px solid transparent",
                                    }}
                                >
                                    {/* Date number */}
                                    <span style={{
                                        fontSize: 12,
                                        fontWeight: isPast || isToday ? 500 : 300,
                                        color: isToday ? "#ffffff" : isSkipped ? T.faint : T.ink,
                                        lineHeight: 1,
                                    }}>
                                        {day}
                                    </span>

                                    {/* Milk dot or skip dash */}
                                    {hasMilk && (
                                        <span style={{
                                            fontSize: 8,
                                            fontWeight: 500,
                                            color: isToday ? "rgba(255,255,255,0.7)" : "#4a8a4a",
                                            lineHeight: 1,
                                            letterSpacing: -0.5,
                                        }}>
                                            {litres}L
                                        </span>
                                    )}
                                    {isSkipped && (
                                        <span style={{ width: 12, height: 1.5, background: T.skipDot, borderRadius: 2, display: "block" }} />
                                    )}
                                    {isToday && !hasMilk && !isSkipped && (
                                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.5)", display: "block" }} />
                                    )}
                                    {/* edited indicator */}
                                    {editLog[key] && (
                                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#b0b0b0", display: "block", position: "absolute", top: 5, right: 5 }} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Stats row ── */}
                <div style={{ flexShrink: 0, display: "flex", gap: 10, marginTop: 18 }}>
                    {[
                        { label: isCurrentMonth ? "This month" : MONTH_NAMES[viewMonth], value: `${totalLitres.toFixed(1)} L` },
                        { label: "Total cost", value: `₹${totalCost.toFixed(0)}` },
                    ].map(({ label, value }) => (
                        <div
                            key={label}
                            style={{
                                flex: 1,
                                background: T.white,
                                border: `1px solid ${T.line}`,
                                borderRadius: 12,
                                padding: "12px 16px",
                            }}
                        >
                            <div style={{ fontSize: 9, color: T.faint, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
                                {label}
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 500, color: T.ink, letterSpacing: -0.5 }}>
                                {value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Legend ── */}
                <div style={{ flexShrink: 0, display: "flex", gap: 16, marginTop: 12, fontSize: 9, color: T.faint, letterSpacing: 1, textTransform: "uppercase" }}>
                    <span>■ Today</span>
                    <span style={{ color: "#4a8a4a" }}>■ Logged</span>
                    <span>— Skipped</span>
                </div>
            </div>

            {/* ── Input Modal ── */}
            {modal && (
                <div style={overlayStyle} onClick={() => setModal(null)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{ ...cardStyle, padding: "36px 32px", width: 320, textAlign: "center" }}
                    >
                        <div style={{ fontSize: 9, color: T.faint, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>
                            {MONTH_NAMES[viewMonth]} {modal.day}
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 15, color: T.mid, marginBottom: modal.isEditing && editLog[modal.key] ? 6 : 28 }}>
                            {modal.isEditing ? "Edit this day" : "How much milk today?"}
                        </div>
                        {modal.isEditing && editLog[modal.key] && (
                            <div style={{ fontSize: 9, color: T.faint, letterSpacing: 1, marginBottom: 28 }}>
                                last edited {new Date(editLog[modal.key]).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </div>
                        )}

                        <div style={{ position: "relative", marginBottom: 8 }}>
                            <input
                                autoFocus
                                type="number"
                                min={0}
                                step={0.5}
                                value={inputVal}
                                onChange={e => setInputVal(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && saveEntry()}
                                placeholder="0"
                                style={{
                                    width: "100%", padding: "16px 40px 16px 16px", borderRadius: 10,
                                    border: `1px solid ${T.line}`,
                                    background: T.bg,
                                    fontSize: 36, textAlign: "center",
                                    letterSpacing: -1,
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontWeight: 300,
                                    color: T.ink,
                                    outline: "none",
                                    transition: "border-color 0.15s",
                                } as CSSProperties}
                            />
                            <span style={{
                                position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                                fontSize: 12, color: T.faint, letterSpacing: 1, pointerEvents: "none",
                            }}>L</span>
                        </div>

                        <div style={{ fontSize: 9, color: T.faint, letterSpacing: 1, marginBottom: 24 }}>
                            ₹{(parseFloat(inputVal || "0") * PRICE_PER_LITRE).toFixed(0)} {modal.isEditing ? "that day" : "today"}
                        </div>

                        <button
                            className="btn-p"
                            onClick={saveEntry}
                            style={{
                                width: "100%", padding: "13px", borderRadius: 10, border: "none",
                                background: T.ink, color: "#fff",
                                fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                                cursor: "pointer", letterSpacing: 2,
                                textTransform: "uppercase", fontWeight: 500,
                                transition: "background 0.15s", marginBottom: 10,
                            }}
                        >
                            Save
                        </button>

                        <button
                            className="btn-g"
                            onClick={skipToday}
                            style={{
                                width: "100%", padding: "11px", borderRadius: 10,
                                border: `1px solid ${T.line}`, background: "transparent",
                                color: T.faint, fontSize: 10,
                                fontFamily: "'DM Sans', sans-serif",
                                cursor: "pointer", letterSpacing: 2,
                                textTransform: "uppercase",
                                transition: "background 0.15s",
                            }}
                        >
                            Didn&apos;t buy {modal.isEditing ? "that day" : "today"}
                        </button>
                    </div>
                </div>
            )}

            {/* ── History Modal ── */}
            {showHistory && (
                <div style={overlayStyle} onClick={() => setShowHistory(false)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{ ...cardStyle, padding: "32px 28px", width: 340, maxHeight: "78dvh", display: "flex", flexDirection: "column" }}
                    >
                        <div style={{ fontSize: 9, color: T.faint, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6, textAlign: "center" }}>
                            History
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 15, color: T.mid, marginBottom: 24, textAlign: "center" }}>
                            Previous months
                        </div>

                        {historyMonths.length === 0 ? (
                            <p style={{ textAlign: "center", color: T.faint, fontSize: 12, margin: "20px 0" }}>
                                No data yet.
                            </p>
                        ) : (
                            <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                                {historyMonths.map(({ year: y, month: m }) => {
                                    const pfx = mkPfx(y, m);
                                    const litres = Object.entries(milkData).filter(([k, v]) => k.startsWith(pfx) && v > 0).reduce((s, [, v]) => s + v, 0);
                                    const cost = litres * PRICE_PER_LITRE;
                                    const isCurr = y === realYear && m === realMonth;
                                    const isView = y === viewYear && m === viewMonth;

                                    return (
                                        <div
                                            key={pfx}
                                            className="hr"
                                            onClick={() => { setViewYear(y); setViewMonth(m); setShowHistory(false); }}
                                            style={{
                                                borderRadius: 10,
                                                padding: "12px 14px",
                                                background: isView ? T.hover : "transparent",
                                                cursor: "pointer",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                transition: "background 0.1s",
                                                border: `1px solid ${isView ? T.line : "transparent"}`,
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>
                                                    {MONTH_NAMES[m]} {y}
                                                    {isCurr && (
                                                        <span style={{ marginLeft: 8, fontSize: 8, color: T.faint, letterSpacing: 1.5, textTransform: "uppercase" }}>now</span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 10, color: T.faint, marginTop: 2 }}>
                                                    {litres.toFixed(1)} L · ₹{cost.toFixed(0)}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: 11, color: T.faint }}>→</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <button
                            className="btn-g"
                            onClick={() => setShowHistory(false)}
                            style={{
                                marginTop: 20, width: "100%", padding: "11px", borderRadius: 10,
                                border: `1px solid ${T.line}`, background: "transparent",
                                color: T.faint, fontSize: 10,
                                fontFamily: "'DM Sans', sans-serif",
                                cursor: "pointer", letterSpacing: 2,
                                textTransform: "uppercase", transition: "background 0.15s",
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* ── Month Summary Modal ── */}
            {showSummary && (
                <div style={overlayStyle}>
                    <div style={{ ...cardStyle, padding: "44px 36px", width: 320, textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: T.faint, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>
                            Month complete
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 18, color: T.mid, marginBottom: 36 }}>
                            {MONTH_NAMES[viewMonth]} {viewYear}
                        </div>

                        <div style={{ borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, padding: "28px 0", marginBottom: 32 }}>
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ fontSize: 9, color: T.faint, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
                                    Total purchased
                                </div>
                                <div style={{ fontSize: 44, fontWeight: 300, color: T.ink, letterSpacing: -2, lineHeight: 1 }}>
                                    {totalLitres.toFixed(1)}
                                    <span style={{ fontSize: 16, color: T.faint, marginLeft: 6, fontWeight: 400 }}>L</span>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 9, color: T.faint, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
                                    Total cost
                                </div>
                                <div style={{ fontSize: 44, fontWeight: 300, color: T.ink, letterSpacing: -2, lineHeight: 1 }}>
                                    ₹{totalCost.toFixed(0)}
                                </div>
                                <div style={{ fontSize: 9, color: T.faint, marginTop: 6, letterSpacing: 1 }}>
                                    @ ₹{PRICE_PER_LITRE} per litre
                                </div>
                            </div>
                        </div>

                        <button
                            className="btn-p"
                            onClick={() => setShowSummary(false)}
                            style={{
                                width: "100%", padding: "13px", borderRadius: 10, border: "none",
                                background: T.ink, color: "#fff",
                                fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                                cursor: "pointer", letterSpacing: 2,
                                textTransform: "uppercase", fontWeight: 500,
                                transition: "background 0.15s",
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}