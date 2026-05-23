# FlowCash 💸

Aplicación web de gestión de finanzas personales. Registrá ingresos, gastos y billeteras digitales.

## URL pública

Una vez configurado, tu FlowCash va a estar en:
```
https://[tu-usuario].github.io/flowcash/
```

---

## Cómo configurarlo (una sola vez)

### Paso 1 — Crear el repositorio en GitHub

1. Entrá a **github.com** e iniciá sesión
2. Click en **"New repository"** (botón verde arriba a la derecha)
3. Nombre del repositorio: `flowcash` (en minúsculas, sin espacios)
4. Dejalo en **Public** (GitHub Pages gratis solo funciona con repos públicos)
5. **NO** marques "Add a README file"
6. Click en **"Create repository"**

### Paso 2 — Subir el código por primera vez

Abrí la terminal en la carpeta `flowcash-web` y ejecutá estos comandos uno por uno:

```bash
# Inicializar git en la carpeta
git init

# Conectar con tu repositorio de GitHub
# Reemplazá TU-USUARIO con tu nombre de usuario de GitHub
git remote add origin https://github.com/TU-USUARIO/flowcash.git

# Agregar todos los archivos
git add .

# Primer commit
git commit -m "FlowCash v1.0 — lanzamiento inicial"

# Subir a GitHub
git push -u origin main
```

### Paso 3 — Activar GitHub Pages

1. En tu repositorio de GitHub, andá a **Settings** (engranaje)
2. En el menú lateral, click en **Pages**
3. En "Source", seleccioná **"GitHub Actions"**
4. Guardá

### Paso 4 — Esperar el primer deploy

1. Andá a la pestaña **Actions** de tu repositorio
2. Vas a ver un workflow corriendo ("Deploy FlowCash a GitHub Pages")
3. Esperá ~2 minutos hasta que aparezca el tilde verde ✅
4. Tu app está en: `https://TU-USUARIO.github.io/flowcash/`

---

## Cómo actualizar la app en el futuro

Cada vez que quieras subir cambios (por ejemplo, cuando te manden una versión nueva de FlowCash):

1. Reemplazá el archivo `src/FlowCash.jsx` con el nuevo
2. Abrí la terminal en la carpeta y ejecutá:

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

3. GitHub Actions construye y publica automáticamente en ~2 minutos
4. Recargá la URL y ya está actualizado

---

## Si cambiás el nombre del repositorio

Tenés que actualizar una línea en `vite.config.js`:

```js
base: '/nombre-de-tu-repo/',   // ← este valor
```

Si tu repo se llama `mis-finanzas`, cambialo a `/mis-finanzas/`.

---

## Estructura del proyecto

```
flowcash-web/
├── src/
│   ├── main.jsx          ← punto de entrada de React
│   └── FlowCash.jsx      ← la app completa (este es el que reemplazás cuando hay updates)
├── .github/
│   └── workflows/
│       └── deploy.yml    ← automatización del deploy
├── index.html            ← HTML base
├── vite.config.js        ← configuración del build
├── package.json          ← dependencias
└── .gitignore            ← archivos que no se suben
```
