import { Download, Clock, Star } from "lucide-react";

interface BundleCardProps {
  name: string;
  description: string;
  tags: string[];
  installs: string;
  time: string;
  color: string;
  onInstall: () => void;
}

export default function BundleCard({
  name, description, tags, installs, time, color, onInstall,
}: BundleCardProps) {
  return (
    <div className="group relative rounded-2xl border border-[#1e2024] bg-[#0f1012] p-5 hover:border-[#2a2d35] transition-all duration-200">

      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[13px] font-semibold text-[#e8e9f0] mb-1 font-mono">{name}</div>
          <div className="text-[11px] text-[#4a4d5a] leading-relaxed">{description}</div>
        </div>
        <button
          onClick={onInstall}
          className="flex-shrink-0 ml-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
          style={{
            background: `${color}18`,
            color,
            border: `1px solid ${color}30`,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${color}28`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${color}18`;
          }}
        >
          <Download size={11} />
          Use bundle
        </button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tags.map(tag => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e2024] text-[#6b7280] font-mono border border-[#2a2d35]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-4 text-[10px] text-[#4a4d5a]">
        <div className="flex items-center gap-1">
          <Download size={10} />
          <span>{installs} installs</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={10} />
          <span>Ready in {time}</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Star size={10} className="fill-[#4a4d5a]" />
          <span>Official</span>
        </div>
      </div>
    </div>
  );
}