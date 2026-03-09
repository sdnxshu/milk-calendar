"use client";

import { useState, useEffect, CSSProperties } from "react";

const PRICE_PER_LITRE = 75;

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

type MilkData = Record<string, number>;
interface ModalState { day: number; key: string }
interface DateState {
    key: string; isToday: boolean;
    isPast: boolean; isFuture: boolean; hasMilk: boolean;
}

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}
function fmt(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function MilkTrackerPage() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const [milkData, setMilkData] = useState<MilkData>({});
    const [modal, setModal] = useState<ModalState | null>(null);
    const [inputVal, setInputVal] = useState("");
    const [showSummary, setShowSummary] = useState(false);
    const [mounted, setMounted] = useState(false);

    const todayKey = fmt(year, month, today.getDate());
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const totalRows = Math.ceil((firstDay + daysInMonth) / 7);

    useEffect(() => {
        setMounted(true);
        try {
            const saved = localStorage.getItem("milk-tracker-data");
            if (saved) setMilkData(JSON.parse(saved));
        } catch { }
    }, []);

    useEffect(() => {
        if (!mounted) return;
        try { localStorage.setItem("milk-tracker-data", JSON.stringify(milkData)); } catch { }
    }, [milkData, mounted]);

    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const totalLitres = Object.entries(milkData)
        .filter(([k]) => k.startsWith(monthPrefix))
        .reduce((s, [, v]) => s + v, 0);
    const totalCost = totalLitres * PRICE_PER_LITRE;

    function openModal(day: number) {
        const key = fmt(year, month, day);
        if (key !== todayKey) return;
        setInputVal(milkData[key] !== undefined ? String(milkData[key]) : "");
        setModal({ day, key });
    }

    function saveEntry() {
        if (!modal) return;
        const val = parseFloat(inputVal);
        if (isNaN(val) || val < 0) return;
        const updated = { ...milkData, [modal.key]: val };
        setMilkData(updated);
        setModal(null);
        const allFilled = Array.from({ length: daysInMonth }, (_, i) => i + 1)
            .every((d) => updated[fmt(year, month, d)] !== undefined);
        if (allFilled) setTimeout(() => setShowSummary(true), 300);
    }

    function getDateState(day: number): DateState {
        const key = fmt(year, month, day);
        const date = new Date(year, month, day);
        const todayDate = new Date(year, month, today.getDate());
        return {
            key,
            isToday: key === todayKey,
            isPast: date < todayDate,
            isFuture: date > todayDate,
            hasMilk: milkData[key] !== undefined,
        };
    }

    const blanks = Array.from({ length: firstDay });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    if (!mounted) return null;

    const primaryBtn: CSSProperties = {
        width: "100%", padding: "12px", borderRadius: 12, border: "none",
        background: "#2d1a0e", color: "#fff", fontSize: 15,
        fontFamily: "Georgia, serif", cursor: "pointer", fontWeight: "bold",
    };

    return (
        <>
            {/* ── Full-viewport shell – no scroll ── */}
            <div style={{
                height: "100dvh",
                width: "100vw",
                overflow: "hidden",
                background: "#fdf6ee",
                fontFamily: "'Georgia', serif",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
                padding: "14px 16px 12px",
                gap: 10,
            }}>

                {/* Header */}
                <header style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 26, lineHeight: 1 }}>🥛</span>
                    <div>
                        <h1 style={{
                            margin: 0, fontSize: 18, fontWeight: "bold",
                            color: "#2d1a0e", letterSpacing: "-0.3px",
                        }}>
                            Milk Tracker
                        </h1>
                        <p style={{ margin: 0, fontSize: 11, color: "#8b6245" }}>
                            {MONTH_NAMES[month]} {year} · ₹{PRICE_PER_LITRE}/litre
                        </p>
                    </div>
                </header>

                {/* Calendar card — flex:1 so it absorbs all remaining height */}
                <div style={{
                    flex: 1,
                    minHeight: 0,
                    background: "#fff",
                    borderRadius: 16,
                    boxShadow: "0 4px 24px rgba(100,60,20,0.10)",
                    padding: "10px 10px 8px",
                    display: "flex",
                    flexDirection: "column",
                }}>
                    {/* Day labels */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        flexShrink: 0,
                        marginBottom: 4,
                    }}>
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                            <div key={d} style={{
                                textAlign: "center", fontSize: 10,
                                fontWeight: "bold", color: "#c4a882", letterSpacing: 0.8,
                            }}>
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Date grid */}
                    <div style={{
                        flex: 1,
                        minHeight: 0,
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        gridTemplateRows: `repeat(${totalRows}, 1fr)`,
                        gap: 4,
                    }}>
                        {blanks.map((_, i) => <div key={`b-${i}`} />)}

                        {days.map((day) => {
                            const { key, isToday, isPast, isFuture, hasMilk } = getDateState(day);
                            const litres = milkData[key];

                            return (
                                <div
                                    key={day}
                                    onClick={() => openModal(day)}
                                    style={{
                                        borderRadius: 8,
                                        cursor: isToday ? "pointer" : "default",
                                        background: isToday ? "#2d1a0e" : hasMilk ? "#fff8ee" : isPast ? "#fdf6ee" : "#fafafa",
                                        border: isToday
                                            ? "2px solid #2d1a0e"
                                            : hasMilk ? "1.5px solid #e8c98a" : "1.5px solid transparent",
                                        transition: "background 0.15s ease",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 2,
                                        opacity: isFuture ? 0.3 : 1,
                                    }}
                                >
                                    <span style={{
                                        fontSize: 11, lineHeight: 1,
                                        fontWeight: isToday ? "bold" : "normal",
                                        color: isToday ? "#fff" : "#2d1a0e",
                                    }}>
                                        {day}
                                    </span>
                                    {hasMilk && (
                                        <span style={{
                                            fontSize: 9, lineHeight: 1, fontWeight: "bold",
                                            color: isToday ? "#f5d898" : "#b07d3a",
                                        }}>
                                            {litres}L
                                        </span>
                                    )}
                                    {isToday && !hasMilk && (
                                        <span style={{ fontSize: 12, color: "#fff", lineHeight: 1 }}>+</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Stats row */}
                <div style={{ flexShrink: 0, display: "flex", gap: 10 }}>
                    {[
                        { label: "This month", value: `${totalLitres.toFixed(1)} L` },
                        { label: "Total cost", value: `₹${totalCost.toFixed(0)}` },
                    ].map(({ label, value }) => (
                        <div key={label} style={{
                            flex: 1, background: "#fff", borderRadius: 12,
                            padding: "10px 14px",
                            boxShadow: "0 2px 12px rgba(100,60,20,0.08)",
                        }}>
                            <p style={{ margin: 0, color: "#8b6245", fontSize: 10 }}>{label}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: "bold", color: "#2d1a0e" }}>
                                {value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div style={{
                    flexShrink: 0, display: "flex", gap: 14,
                    fontSize: 10, color: "#8b6245",
                }}>
                    <span>🟫 Today — tap to log</span>
                    <span style={{ color: "#b07d3a" }}>🟡 Logged</span>
                    <span style={{ opacity: 0.4 }}>◻ Future</span>
                </div>
            </div>

            {/* Input modal */}
            {modal && (
                <div
                    onClick={() => setModal(null)}
                    style={{
                        position: "fixed", inset: 0, zIndex: 100,
                        background: "rgba(45,26,14,0.5)", backdropFilter: "blur(4px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "#fff", borderRadius: 20, padding: "32px 28px",
                            width: 300, textAlign: "center",
                            boxShadow: "0 20px 60px rgba(45,26,14,0.25)",
                        }}
                    >
                        <div style={{ fontSize: 36, marginBottom: 8 }}>🥛</div>
                        <h2 style={{ margin: "0 0 4px", fontSize: 18, color: "#2d1a0e" }}>
                            Today&apos;s Milk
                        </h2>
                        <p style={{ margin: "0 0 20px", color: "#8b6245", fontSize: 13 }}>
                            {MONTH_NAMES[month]} {modal.day}, {year}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                            <input
                                autoFocus type="number" min={0} step={0.5}
                                value={inputVal}
                                onChange={(e) => setInputVal(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && saveEntry()}
                                placeholder="e.g. 2"
                                style={{
                                    flex: 1, padding: "12px 14px", borderRadius: 12,
                                    border: "2px solid #e8c98a", fontSize: 20, textAlign: "center",
                                    fontFamily: "Georgia, serif", color: "#2d1a0e",
                                    outline: "none", background: "#fdf6ee",
                                } as CSSProperties}
                            />
                            <span style={{ fontSize: 18, color: "#8b6245", fontWeight: "bold" }}>L</span>
                        </div>
                        <button style={primaryBtn} onClick={saveEntry}>Save</button>
                    </div>
                </div>
            )}

            {/* Month summary modal */}
            {showSummary && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 100,
                    background: "rgba(45,26,14,0.6)", backdropFilter: "blur(6px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                    <div style={{
                        background: "#fff", borderRadius: 24, padding: "40px 32px",
                        width: 320, textAlign: "center",
                        boxShadow: "0 24px 80px rgba(45,26,14,0.3)",
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                        <h2 style={{ fontSize: 20, color: "#2d1a0e", margin: "0 0 6px" }}>
                            Month Complete!
                        </h2>
                        <p style={{ color: "#8b6245", fontSize: 13, margin: "0 0 28px" }}>
                            Your milk summary for {MONTH_NAMES[month]} {year}
                        </p>
                        <div style={{
                            background: "#fdf6ee", borderRadius: 16,
                            padding: "20px", marginBottom: 24,
                        }}>
                            <p style={{ margin: 0, color: "#8b6245", fontSize: 12 }}>Total Milk Bought</p>
                            <p style={{ margin: "4px 0 16px", fontSize: 32, fontWeight: "bold", color: "#2d1a0e" }}>
                                {totalLitres.toFixed(1)} <span style={{ fontSize: 16 }}>litres</span>
                            </p>
                            <div style={{ height: 1, background: "#e8c98a", marginBottom: 16 }} />
                            <p style={{ margin: 0, color: "#8b6245", fontSize: 12 }}>Total Cost</p>
                            <p style={{ margin: "4px 0 0", fontSize: 32, fontWeight: "bold", color: "#2d1a0e" }}>
                                ₹{totalCost.toFixed(0)}
                            </p>
                            <p style={{ margin: "4px 0 0", color: "#c4a882", fontSize: 11 }}>
                                @ ₹{PRICE_PER_LITRE}/litre
                            </p>
                        </div>
                        <button style={primaryBtn} onClick={() => setShowSummary(false)}>Done</button>
                    </div>
                </div>
            )}
        </>
    );
}