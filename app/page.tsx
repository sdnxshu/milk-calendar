"use client";

import { useState, useEffect, CSSProperties } from "react";

const PRICE_PER_LITRE = 75;

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

type MilkData = Record<string, number>;

interface ModalState {
    day: number;
    key: string;
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

function fmt(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function MilkTrackerPage() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const [milkData, setMilkData] = useState<MilkData>({});
    const [modal, setModal] = useState<ModalState | null>(null);
    const [inputVal, setInputVal] = useState<string>("");
    const [showSummary, setShowSummary] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);

    const todayKey = fmt(year, month, today.getDate());
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    // Persist to localStorage
    useEffect(() => {
        setMounted(true);
        try {
            const saved = localStorage.getItem("milk-tracker-data");
            if (saved) setMilkData(JSON.parse(saved));
        } catch { }
    }, []);

    useEffect(() => {
        if (!mounted) return;
        try {
            localStorage.setItem("milk-tracker-data", JSON.stringify(milkData));
        } catch { }
    }, [milkData, mounted]);

    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

    const totalLitres = Object.entries(milkData)
        .filter(([key]) => key.startsWith(monthPrefix))
        .reduce((sum, [, v]) => sum + v, 0);

    const totalCost = totalLitres * PRICE_PER_LITRE;

    function openModal(day: number): void {
        const key = fmt(year, month, day);
        if (key !== todayKey) return;
        setInputVal(milkData[key] !== undefined ? String(milkData[key]) : "");
        setModal({ day, key });
    }

    function saveEntry(): void {
        if (!modal) return;
        const val = parseFloat(inputVal);
        if (isNaN(val) || val < 0) return;

        const updated: MilkData = { ...milkData, [modal.key]: val };
        setMilkData(updated);
        setModal(null);

        const allNowFilled = Array.from({ length: daysInMonth }, (_, i) => i + 1).every((d) => {
            const key = fmt(year, month, d);
            return updated[key] !== undefined;
        });
        if (allNowFilled) setTimeout(() => setShowSummary(true), 300);
    }

    interface DateState {
        key: string;
        isToday: boolean;
        isPast: boolean;
        isFuture: boolean;
        hasMilk: boolean;
    }

    function getDateState(day: number): DateState {
        const key = fmt(year, month, day);
        const date = new Date(year, month, day);
        const todayDate = new Date(year, month, today.getDate());
        const isToday = key === todayKey;
        const isPast = date < todayDate;
        const isFuture = date > todayDate;
        const hasMilk = milkData[key] !== undefined;
        return { key, isToday, isPast, isFuture, hasMilk };
    }

    const blanks = Array.from({ length: firstDay });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Styles
    const s = {
        page: {
            minHeight: "100vh",
            background: "#fdf6ee",
            fontFamily: "'Georgia', serif",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "40px 16px 60px",
        } as CSSProperties,

        header: {
            textAlign: "center",
            marginBottom: 32,
        } as CSSProperties,

        h1: {
            fontSize: 28,
            fontWeight: "bold",
            color: "#2d1a0e",
            margin: "8px 0 0",
            letterSpacing: "-0.5px",
        } as CSSProperties,

        subtitle: {
            color: "#8b6245",
            fontSize: 14,
            marginTop: 6,
        } as CSSProperties,

        card: {
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 4px 40px rgba(100,60,20,0.12)",
            padding: "28px 24px",
            width: "100%",
            maxWidth: 420,
        } as CSSProperties,

        dayLabels: {
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            marginBottom: 10,
        } as CSSProperties,

        dayLabel: {
            textAlign: "center",
            fontSize: 11,
            fontWeight: "bold",
            color: "#c4a882",
            padding: "4px 0",
            letterSpacing: 1,
        } as CSSProperties,

        grid: {
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
        } as CSSProperties,

        statsCard: {
            marginTop: 24,
            background: "#fff",
            borderRadius: 16,
            padding: "18px 24px",
            width: "100%",
            maxWidth: 420,
            boxShadow: "0 2px 20px rgba(100,60,20,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
        } as CSSProperties,

        overlay: {
            position: "fixed",
            inset: 0,
            background: "rgba(45,26,14,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            backdropFilter: "blur(4px)",
        } as CSSProperties,

        modalBox: {
            background: "#fff",
            borderRadius: 20,
            padding: "32px 28px",
            width: 300,
            boxShadow: "0 20px 60px rgba(45,26,14,0.25)",
            textAlign: "center",
        } as CSSProperties,

        input: {
            flex: 1,
            padding: "12px 14px",
            borderRadius: 12,
            border: "2px solid #e8c98a",
            fontSize: 20,
            textAlign: "center",
            fontFamily: "Georgia, serif",
            color: "#2d1a0e",
            outline: "none",
            background: "#fdf6ee",
        } as CSSProperties,

        btn: {
            width: "100%",
            padding: "13px",
            borderRadius: 12,
            border: "none",
            background: "#2d1a0e",
            color: "#fff",
            fontSize: 15,
            fontFamily: "Georgia, serif",
            cursor: "pointer",
            fontWeight: "bold",
            letterSpacing: 0.5,
        } as CSSProperties,
    };

    if (!mounted) return null;

    return (
        <div style={s.page}>
            {/* ── Header ── */}
            <div style={s.header}>
                <div style={{ fontSize: 40 }}>🥛</div>
                <h1 style={s.h1}>Milk Tracker</h1>
                <p style={s.subtitle}>
                    {MONTH_NAMES[month]} {year} · ₹{PRICE_PER_LITRE}/litre
                </p>
            </div>

            {/* ── Calendar ── */}
            <div style={s.card}>
                {/* Day-of-week labels */}
                <div style={s.dayLabels}>
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                        <div key={d} style={s.dayLabel}>{d}</div>
                    ))}
                </div>

                {/* Date grid */}
                <div style={s.grid}>
                    {blanks.map((_, i) => <div key={`blank-${i}`} />)}

                    {days.map((day) => {
                        const { key, isToday, isPast, isFuture, hasMilk } = getDateState(day);
                        const litres = milkData[key];

                        const cellStyle: CSSProperties = {
                            borderRadius: 10,
                            padding: "8px 4px 6px",
                            textAlign: "center",
                            cursor: isToday ? "pointer" : "default",
                            background: isToday ? "#2d1a0e" : hasMilk ? "#fff8ee" : isPast ? "#fdf6ee" : "#fafafa",
                            border: isToday
                                ? "2px solid #2d1a0e"
                                : hasMilk
                                    ? "1.5px solid #e8c98a"
                                    : "1.5px solid transparent",
                            transition: "all 0.15s ease",
                            minHeight: 60,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 2,
                            opacity: isFuture ? 0.35 : 1,
                        };

                        return (
                            <div key={day} style={cellStyle} onClick={() => openModal(day)}>
                                <span style={{
                                    fontSize: 13,
                                    fontWeight: isToday ? "bold" : "normal",
                                    color: isToday ? "#fff" : "#2d1a0e",
                                }}>
                                    {day}
                                </span>

                                {hasMilk && (
                                    <span style={{
                                        fontSize: 10,
                                        color: isToday ? "#f5d898" : "#b07d3a",
                                        fontWeight: "bold",
                                        lineHeight: 1,
                                    }}>
                                        {litres}L
                                    </span>
                                )}

                                {isToday && !hasMilk && (
                                    <span style={{ fontSize: 14, color: "#fff" }}>+</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Monthly Stats ── */}
            <div style={s.statsCard}>
                <div>
                    <p style={{ margin: 0, color: "#8b6245", fontSize: 12 }}>This month so far</p>
                    <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: "bold", color: "#2d1a0e" }}>
                        {totalLitres.toFixed(1)}{" "}
                        <span style={{ fontSize: 14, color: "#8b6245" }}>litres</span>
                    </p>
                </div>
                <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, color: "#8b6245", fontSize: 12 }}>Estimated cost</p>
                    <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: "bold", color: "#2d1a0e" }}>
                        ₹{totalCost.toFixed(0)}
                    </p>
                </div>
            </div>

            {/* ── Legend ── */}
            <div style={{ marginTop: 16, display: "flex", gap: 20, fontSize: 12, color: "#8b6245" }}>
                <span>🟫 Today (tap to log)</span>
                <span style={{ color: "#b07d3a" }}>🟡 Logged</span>
                <span style={{ opacity: 0.4 }}>◻ Future</span>
            </div>

            {/* ── Input Modal ── */}
            {modal && (
                <div style={s.overlay} onClick={() => setModal(null)}>
                    <div style={s.modalBox} onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>🥛</div>
                        <h2 style={{ margin: "0 0 4px", fontSize: 18, color: "#2d1a0e" }}>
                            Today&apos;s Milk
                        </h2>
                        <p style={{ margin: "0 0 20px", color: "#8b6245", fontSize: 13 }}>
                            {MONTH_NAMES[month]} {modal.day}, {year}
                        </p>

                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                            <input
                                autoFocus
                                type="number"
                                min={0}
                                step={0.5}
                                value={inputVal}
                                onChange={(e) => setInputVal(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && saveEntry()}
                                placeholder="e.g. 2"
                                style={s.input}
                            />
                            <span style={{ fontSize: 18, color: "#8b6245", fontWeight: "bold" }}>L</span>
                        </div>

                        <button style={s.btn} onClick={saveEntry}>
                            Save
                        </button>
                    </div>
                </div>
            )}

            {/* ── Month Summary Modal ── */}
            {showSummary && (
                <div style={s.overlay}>
                    <div style={{ ...s.modalBox, width: 320, padding: "40px 32px" }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                        <h2 style={{ fontSize: 20, color: "#2d1a0e", margin: "0 0 6px" }}>
                            Month Complete!
                        </h2>
                        <p style={{ color: "#8b6245", fontSize: 13, margin: "0 0 28px" }}>
                            Your milk summary for {MONTH_NAMES[month]} {year}
                        </p>

                        <div style={{
                            background: "#fdf6ee",
                            borderRadius: 16,
                            padding: "20px",
                            marginBottom: 24,
                        }}>
                            <div style={{ marginBottom: 16 }}>
                                <p style={{ margin: 0, color: "#8b6245", fontSize: 12 }}>Total Milk Bought</p>
                                <p style={{ margin: "4px 0 0", fontSize: 32, fontWeight: "bold", color: "#2d1a0e" }}>
                                    {totalLitres.toFixed(1)}{" "}
                                    <span style={{ fontSize: 16 }}>litres</span>
                                </p>
                            </div>
                            <div style={{ height: 1, background: "#e8c98a", margin: "0 0 16px" }} />
                            <div>
                                <p style={{ margin: 0, color: "#8b6245", fontSize: 12 }}>Total Cost</p>
                                <p style={{ margin: "4px 0 0", fontSize: 32, fontWeight: "bold", color: "#2d1a0e" }}>
                                    ₹{totalCost.toFixed(0)}
                                </p>
                                <p style={{ margin: "4px 0 0", color: "#c4a882", fontSize: 11 }}>
                                    @ ₹{PRICE_PER_LITRE}/litre
                                </p>
                            </div>
                        </div>

                        <button style={s.btn} onClick={() => setShowSummary(false)}>
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}