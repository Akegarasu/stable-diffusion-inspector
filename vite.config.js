import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import vue from "@vitejs/plugin-vue";
import unocss from "unocss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    unocss({}),
    VitePWA({
       includeAssets: ['favicon.ico','apple-touch-icon.png'],
       manifest: {
        name: 'Stable Diffusion 法术解析',
        short_name: 'stable-diffusion-inspector',
        description: '从 sd 生成的图片中读取 pnginfo 来获取生成的参数 / 解析 sd 模型',
        theme_color: 'floralwhite',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
});
