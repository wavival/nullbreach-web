import { FaWhatsapp } from "react-icons/fa";

const WHATSAPP_URL =
  import.meta.env.VITE_WHATSAPP_URL ??
  "https://wa.me/573116865766?text=Hello%2C+I%27d+love+to+build+such+an+amazing+thing+as+NullBreach.+Help+me+out";

export function WhatsAppButton() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      title="Chat on WhatsApp"
      className={[
        "fixed z-40",
        "bottom-[16px] right-[16px] md:bottom-[24px] md:right-[24px]",
        "inline-flex items-center justify-center",
        "size-14 rounded-full",
        "bg-[#25D366] text-white",
        "shadow-[0_8px_24px_-6px_rgba(37,211,102,0.6)]",
        "transition-all duration-hover ease-hover",
        "hover:scale-110 hover:shadow-[0_12px_28px_-4px_rgba(37,211,102,0.75)]",
        "active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
      ].join(" ")}
    >
      <FaWhatsapp size={32} aria-hidden="true" />
    </a>
  );
}
