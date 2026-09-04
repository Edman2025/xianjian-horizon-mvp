import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '先见 Horizon · AI 预测网络',
  description: 'AI 主动送题、独立首判、社交化参与与可验证预测记录。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
