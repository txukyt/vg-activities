import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig(({ command }) => {
  
  const contextPath = '/m01-10s';
  const outDir = 'D:\\DEV-WAS8\\WS\\WEB\\m01-10s-war\\src\\main\\webapp\\spa\\';

  // 1. CONFIGURACIÓN COMÚN
  const commonConfig = {
    plugins: [
      {
        name: 'generate-jsp',
        closeBundle() {
          const htmlPath = path.resolve(outDir, 'index.html');
          const jspPath = path.resolve(outDir, 'index.jsp');
          
          if (fs.existsSync(htmlPath)) {
            // 1. Leemos el HTML que generó Vite
            const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

            // 2. Definimos la cabecera JSP
            const jspHeader = '<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>\n';

            // 3. Escribimos el nuevo archivo .jsp uniendo la cabecera y el HTML
            fs.writeFileSync(jspPath, jspHeader + htmlContent);

            // 4. Borramos el .html original para no dejar basura en el servidor
            fs.unlinkSync(htmlPath);

            console.log('✅ index.jsp generado con directivas de Java en: ' + jspPath);
          }
        }
      }
    ],
    // Ajusta 'terser' si lo necesitas, aunque Vite por defecto usa Esbuild que es más rápido
    build: {
      minify: false,
      terserOptions: {
        compress: {
          drop_console: false, // Limpia los console.log en el build de Java
        },
      },
    }
  };

  // 2. MODO DESARROLLO (npm run dev)
  if (command === 'serve') {
    return {
      ...commonConfig,
      server: {
        port: 3000,
        host: true,
        open: true,
        proxy: {
          // Redirige las llamadas a la API hacia tu Tomcat
          // Ejemplo: fetch('/api/login.do') -> http://localhost:8080/tu-app/login.do
          '/api': {
            target: 'http://localhost:8080/nombre-de-tu-contexto-java',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, '')
          }
        }
      }
    };
  }

  // 3. MODO BUILD PARA JAVA (npm run build)
  return {
    ...commonConfig,
    // El 'base' asegura que los archivos JS/CSS se busquen en la subcarpeta 'dist' de tu app Java
    base: '/m01-10s/spa',
    build: {
      ...commonConfig.build,
      // RUTA DE SALIDA: Ajusta esta ruta para que apunte a tu carpeta web de Java
      outDir: 'D:\\DEV-WAS8\\WS\\WEB\\m01-10s-war\\src\\main\\webapp\\spa\\', 
      emptyOutDir: true,
      assetsDir: 'assets',
      // Genera un manifest.json que puede ser útil si quieres debuguear en el servidor
      manifest: true,      
    }
  };
});