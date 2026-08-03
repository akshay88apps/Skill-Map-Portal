import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { ink:'#12211b', forest:'#173f32', moss:'#487864', mint:'#dff3e8', cream:'#f6f5ef', gold:'#d7a94b' }, boxShadow:{soft:'0 14px 45px rgba(18,33,27,.09)'} } }, plugins: [] } satisfies Config;
