import React from "react";
import { ArrowRight, Zap } from "lucide-react";
import type { ToolId } from "../layouts/Sidebar";


interface AppCardProps {
  id: ToolId;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;          // accent color hex
  glowColor: string;      // rgba for glow
  status: "connected" | "disconnected" | "coming-soon";
  onOpen: (id: ToolId) => void;
}

export default function AppCard({
  id, title, description, icon, color, glowColor, status, onOpen,
}: AppCardProps) {
  const isComingSoon = status === "coming-soon";

  return (
    <button
      onClick={() => !isComingSoon && onOpen(id)}
      disabled={isComingSoon}
      className={`
        group relative w-full text-left rounded-2xl border p-5
        transition-all duration-200
        ${isComingSoon
          ? "border-[#1e2024] bg-[#0a0b0d] opacity-50 cursor-not-allowed"
          : "border-[#1e2024] bg-[#0f1012] hover:border-[#2a2d35] cursor-pointer"
        }
      `}
      style={!isComingSoon ? {
        ["--glow" as string]: glowColor,
      } : {}}
    >
      {/* Glow on hover */}
      {!isComingSoon && (
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 1px ${color}40` }}
        />
      )}

      {/* Status dot */}
      <div className="absolute top-4 right-4">
        {status === "connected" ? (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3dd68c] shadow-[0_0_6px_rgba(61,214,140,0.6)]" />
            <span className="text-[10px] text-[#3dd68c] font-medium">Connected</span>
          </div>
        ) : status === "coming-soon" ? (
          <span className="text-[10px] text-[#4a4d5a] bg-[#1e2024] px-2 py-0.5 rounded-full">Soon</span>
        ) : (
          <span className="text-[10px] text-[#4a4d5a]">Not connected</span>
        )}
      </div>

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${color}18`, color }}
      >
        {icon}
      </div>

      {/* Title + desc */}
      <div className="text-[13px] font-semibold text-[#e8e9f0] mb-1">{title}</div>
      <div className="text-[11px] text-[#4a4d5a] leading-relaxed">{description}</div>

      {/* Open arrow */}
      {!isComingSoon && (
        <div className="flex items-center gap-1 mt-4 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }}>
          <Zap size={11} />
          <span>Open</span>
          <ArrowRight size={11} />
        </div>
      )}
    </button>
  );
}