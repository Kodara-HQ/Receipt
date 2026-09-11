import { fileUrl } from "../api/client";
import { useSettings } from "../context/SettingsContext";

export default function BrandMark({ className = "h-16 w-16", light = false }) {
  const { settings } = useSettings();
  const src = fileUrl(settings?.logo);

  if (src) {
    return (
      <img
        src={src}
        alt={settings?.company_name || "EVERY FRAGRANCE"}
        className={`${className} object-contain`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full border-2 ${
        light ? "border-cream-100/40 text-cream-50" : "border-plum-700 text-plum-800"
      } ${className}`}
    >
      <span className="font-display text-xl tracking-widest">TFU</span>
    </div>
  );
}
