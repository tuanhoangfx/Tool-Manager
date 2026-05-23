import type { ReactNode } from "react";
import { Bell, Cookie, Key, Shield, User } from "lucide-react";
import { Glass } from "../../../theme/p0008";
import { PageHeader } from "./PageHeader";

function SettingRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 py-3 last:border-0">
      <div className="min-w-[10rem] flex-1">
        <div className="text-[13px] font-medium">{label}</div>
        {desc ? <div className="text-[11px] text-[var(--muted)]">{desc}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsScreen() {
  return (
    <div className="anim-fade">
      <PageHeader title="Cài đặt" desc="Extension, sync, bảo mật và tài khoản — mock cho review trước Sprint 1." />

      <div className="space-y-4">
        <Glass tone="indigo" label="Tài khoản" icon={<User size={12} />}>
          <SettingRow label="Email" desc="Supabase auth">
            <span className="text-[12px] text-[var(--muted)]">hello@example.com</span>
          </SettingRow>
          <SettingRow label="Đăng xuất">
            <button type="button" className="btn-ghost btn text-[12px]">
              Sign out
            </button>
          </SettingRow>
        </Glass>

        <Glass tone="amber" label="Cookie sync (extension)" icon={<Cookie size={12} />}>
          <SettingRow label="Extension bridge" desc="P0020-cookie-bridge">
            <span className="badge border border-emerald-500/40 bg-emerald-500/20 text-emerald-200">Connected</span>
          </SettingRow>
          <SettingRow label="Chu kỳ sync" desc="chrome.alarms">
            <select className="field w-32 text-[12px]" defaultValue="60" disabled>
              <option value="30">30 phút</option>
              <option value="60">60 phút</option>
              <option value="120">2 giờ</option>
            </select>
          </SettingRow>
          <SettingRow label="Mã hóa snapshot" desc="AES-GCM trước khi lưu DB">
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" defaultChecked readOnly />
              Bật
            </label>
          </SettingRow>
          <SettingRow label="Mật khẩu export" desc="PBKDF2 — chỉ trên máy bạn">
            <button type="button" className="btn-ghost btn text-[12px]">
              <Key size={12} />
              Đổi password
            </button>
          </SettingRow>
        </Glass>

        <Glass tone="purple" label="Share mặc định" icon={<Shield size={12} />}>
          <SettingRow label="TTL link share" desc="Hết hạn tự động">
            <select className="field w-32 text-[12px]" defaultValue="7" disabled>
              <option value="1">1 ngày</option>
              <option value="7">7 ngày</option>
              <option value="30">30 ngày</option>
            </select>
          </SettingRow>
          <SettingRow label="Yêu cầu password" desc="Người nhận link phải nhập">
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" defaultChecked readOnly />
              Bật
            </label>
          </SettingRow>
        </Glass>

        <Glass tone="slate" label="Thông báo" icon={<Bell size={12} />}>
          <SettingRow label="Sync thất bại" desc="Browser notification">
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" defaultChecked readOnly />
              Bật
            </label>
          </SettingRow>
          <SettingRow label="Cookie sắp hết hạn">
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" readOnly />
              Tắt
            </label>
          </SettingRow>
        </Glass>
      </div>
    </div>
  );
}
