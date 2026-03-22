# 📊 Dashboard Personal

Un dashboard personal minimalista, rápido y hermoso para gestionar tus finanzas y hábitos. Optimizado para funcionar en cualquier lugar, desde tu navegador hasta servidores ligeros.

## ✨ Características

### 💰 Finanzas
- **Registro de Ingresos** - Añade fuentes de ingreso con fecha
- **Control de Gastos** - Categoriza tus gastos para un mejor seguimiento
- **Gestión de Deudas** - Mantén un registro de tus pagos pendientes
- **Gráficos CSS** - Visualizaciones rápidas y ligeras (sin Chart.js)
- **Exportación CSV** - Descarga tus datos para Excel/Google Sheets

### 🎯 Hábitos
- **Crear Hábitos** - Con nombre, categoría, frecuencia y notas
- **Seguimiento de Rachas** - Visualiza tu progreso con 🔥
- **Heatmap de 7 días** - Verifica tu cumplimiento semanal
- **Editar/Archivar/Eliminar** - Control total sobre tus hábitos

### 🎨 Diseño
- **CSS Puro** - Sin dependencias externas
- **Dark/Light Mode** - Cambia entre temas con un clic
- **Responsive** - Funciona perfecto en móvil, tablet y desktop
- **Animaciones suaves** - Interacciones fluidas

## 🚀 Despliegue

### GitHub Pages (Gratis)

1. **Crea un repositorio** en [GitHub](https://github.com)
2. **Sube los archivos:**
   - `index.html`
   - `habits.html`
   - `styles.css`
   - `app.js`
3. **Ve a Settings → Pages**
4. **Selecciona "main" branch** y guarda
5. ¡Listo! Tu dashboard estará en `https://tu-usuario.github.io/repo-name`

### Netlify (Gratis + SSL)

1. **Ve a** [Netlify Drop](https://app.netlify.com/drop)
2. **Arrastra la carpeta** con los 4 archivos
3. ¡Deploy instantáneo con SSL incluido!

### VPS / Raspberry Pi

```bash
# Copia los archivos a /var/www/html/
scp *.html *.css *.js user@tu-servidor:/var/www/html/

# O usa un servidor Python
cd /ruta/a/tus/archivos
python3 -m http.server 80
```

## 📱 Uso en Móvil

La interfaz está optimizada para dispositivos móviles:
- Bottom navigation para acceso rápido
- Touch targets grandes (44px mínimo)
- Todo el contenido accesible sin scroll horizontal

## 🔧 Personalización

### Cambiar Colores

Edita las variables CSS en `styles.css`:

```css
:root {
  --primary: #3B82F6;    /* Azul principal */
  --secondary: #10B981;  /* Verde éxito */
  --danger: #EF4444;     /* Rojo peligro */
  --warning: #F59E0B;     /* Amarillo警告 */
}
```

### Añadir Más Categorías

Las categorías se guardan en localStorage. Puedes:
1. Usar el formulario en la app
2. Editar directamente en la consola del navegador:
   ```javascript
   const db = JSON.parse(localStorage.getItem('personalDashboardDB'));
   db.categories.expenses.push('Nueva Categoría');
   localStorage.setItem('personalDashboardDB', JSON.stringify(db));
   location.reload();
   ```

## 📂 Estructura del Proyecto

```
dashboard/
├── index.html      # Dashboard principal (finanzas)
├── habits.html     # Página de gestión de hábitos
├── styles.css      # Estilos CSS (sistema de diseño)
├── app.js          # Lógica JavaScript
└── README.md       # Este archivo
```

## 💾 Persistencia de Datos

Todos los datos se guardan en **localStorage** del navegador:
- Ingresos, gastos, deudas
- Hábitos con historial
- Categorías personalizadas
- Preferencia de tema

> ⚠️ **Nota:** Si borras los datos del navegador o cambias de dispositivo, perderás la información. Usa el botón "Exportar CSV" regularmente para hacer backups.

## 🎯 Roadmap

- [ ] Sincronización con base de datos (Firebase/Supabase)
- [ ] Notificaciones para hábitos
- [ ] Más tipos de gráficos CSS
- [ ] Tema personalizado por usuario
- [ ] App nativa (Electron/Capacitor)

## 📄 Licencia

MIT License - Libre para usar, modificar y distribute.

---

Hecho con 💙 y CSS puro
