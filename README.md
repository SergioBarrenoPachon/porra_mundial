# ⚽ Porra Mundial 2026 - Aplicación Web Interactiva

Esta aplicación web interactiva es la migración completa del sistema de Excel de la Porra del Mundial 2026. Permite que los participantes se registren, inicien sesión, envíen y actualicen sus predicciones individuales con una fecha límite de cierre automatizada, y visualicen la clasificación en tiempo real con gráficos dinámicos de evolución de ranking.

---

## 🚀 Cómo Empezar Localmente

Asegúrate de tener instalado **Node.js** (versión 18 o superior).

1. **Instalar Dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar el Servidor:**
   ```bash
   npm start
   ```
   *El servidor se iniciará en [http://localhost:3000](http://localhost:3000)*

3. **Acceder como Administrador:**
   * **Usuario:** `admin`
   * **Contraseña:** `admin123`
   *(Puedes cambiar estos datos en el archivo de base de datos `data.json` o mediante los formularios de administración).*

---

## 🔗 Cómo Subir a tu Cuenta de GitHub (Repositorio Público)

Para compartir la aplicación con tus amigos, puedes subirla a tu cuenta de GitHub siguiendo estos pasos:

1. **Crea un repositorio público vacío** en tu cuenta de GitHub (por ejemplo, con el nombre `porra-mundial-2026`). **No** lo inicialices con un README, `.gitignore` o licencia.
2. Abre la terminal en el directorio del proyecto y ejecuta los siguientes comandos para enlazar y subir el código:
   ```bash
   # Enlaza tu repositorio de GitHub como origen remoto (reemplaza con tu URL real)
   git remote add origin https://github.com/TU_USUARIO_DE_GITHUB/porra-mundial-2026.git
   
   # Renombra la rama por defecto a 'main'
   git branch -M main
   
   # Sube el código a GitHub
   git push -u origin main
   ```
3. ¡Listo! Tus amigos podrán descargar el código o podrás desplegarlo directamente desde GitHub.

---

## 🌐 Cómo Compartir la Web con tus Amigos (Opciones de Despliegue)

Dado que la aplicación cuenta con un servidor backend para autenticar usuarios y guardar las predicciones, tienes varias opciones excelentes y gratuitas para alojarla en internet:

### Opción A: Despliegue en la Nube (Recomendado y 100% Gratuito)
Puedes conectar tu repositorio de GitHub directamente a servicios de hosting en la nube que detectan Node.js de forma automática:
1. **Render (https://render.com):**
   * Crea una cuenta gratuita, haz clic en **New +** y selecciona **Web Service**.
   * Conecta tu cuenta de GitHub y elige el repositorio `porra-mundial-2026`.
   * Configura el comando de inicio como `npm start`. Render te dará una URL pública del tipo `https://tu-app.onrender.com` que podrás pasarle a tus amigos.
2. **Railway (https://railway.app):**
   * Despliegue instantáneo con un par de clics directamente desde tu GitHub.

### Opción B: Compartir desde tu Propio Ordenador (Ideal para Pruebas Rápidas)
Si deseas ejecutar el servidor en tu ordenador y abrir un "túnel" temporal seguro para que tus amigos entren, puedes usar:
* **ngrok (https://ngrok.com):**
   1. Inicia el servidor localmente (`npm start`).
   2. Abre otra terminal y ejecuta: `ngrok http 3000`.
   3. Copia la URL segura temporal (`https://xxxx.ngrok-free.app`) y compártela.

---

## 📂 Estructura de Archivos del Proyecto

* `server.js`: Servidor Express que aloja la API REST para el cálculo del leaderboard en tiempo real, gestión de sesiones y control del cronómetro de cierre.
* `data.json`: Base de datos ligera e independiente de binarios que guarda la información de los usuarios, predicciones y marcadores.
* `public/`:
  * `index.html`: Acceso y registro de usuarios.
  * `predictions.html` & `js/predictions.js`: Cuadro interactivo. Cuando los usuarios rellenan la fase de grupos, el frontend calcula automáticamente los clasificados y los 8 mejores terceros avanzando las selecciones por las eliminatorias.
  * `dashboard.html` & `js/dashboard.js`: Leaderboard general y matriz comparativa de todos los participantes. Carga **Chart.js** desde un CDN para dibujar el gráfico de líneas con la evolución del ranking partido a partido.
  * `admin.html` & `js/admin.js`: Panel de gestión exclusivo de administrador para ingresar marcadores reales del mundial y registrar ganadores de premios individuales.
