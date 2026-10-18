import type { Metadata } from 'next';
import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';
export const metadata: Metadata = {
  title: 'Quản lý trật tự xây dựng · Sơn La',
  description: 'Bản đầu quản lý GPXD và phản ánh trên bản đồ tỉnh Sơn La.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="vi"><body>{children}<em style={{position:'fixed',left:'max(6px, env(safe-area-inset-left))',bottom:'max(2px, env(safe-area-inset-bottom))',zIndex:20,fontSize:10,lineHeight:'12px',fontWeight:400,color:'#475569',background:'rgba(255,255,255,.92)',padding:'1px 5px',borderRadius:3,pointerEvents:'none'}}>Create by Vn24h.bnb</em></body></html>;
}
