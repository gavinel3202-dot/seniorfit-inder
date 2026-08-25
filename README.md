# Senior Fitness Test INDER – Móvil + Nube

Versión simplificada de la aplicación para trabajar desde **celular, tableta o computador**.

## Arquitectura

**GitHub → Streamlit → Supabase**

- **GitHub** guarda el código y permite actualizar la aplicación.
- **Streamlit** publica la interfaz web responsive.
- **Supabase/PostgreSQL** guarda cada registro nuevo y cada modificación en la nube.
- Los datos de cada valoración se almacenan en una columna `JSONB`, lo que permite agregar
  campos nuevos sin modificar la estructura principal de la base de datos.

## Ventaja principal

Los campos visibles se leen desde la tabla `campos`. Desde el menú **Campos** puede:

- agregar campos;
- cambiar su nombre visible;
- hacerlos obligatorios u opcionales;
- cambiar el orden;
- activarlos o desactivarlos.

Esto significa que muchos cambios de formulario **no requieren editar Python ni volver a crear la base de datos**.

## Instalación en la nube

### 1. Crear el repositorio en GitHub

Suba a un repositorio todos los archivos de esta carpeta, excepto:

`.streamlit/secrets.toml`

Ese archivo está incluido en `.gitignore` para evitar subir claves privadas.

### 2. Crear la base de datos Supabase

Cree un proyecto en Supabase y ejecute el contenido de:

`supabase_setup.sql`

en el SQL Editor del proyecto.

### 3. Obtener credenciales

Necesita:

- `SUPABASE_URL`
- `SUPABASE_KEY` (service role, solo del lado servidor)
- una clave propia para `APP_PASSWORD`

### 4. Publicar la aplicación

Conecte el repositorio GitHub a un hosting compatible con Streamlit.
El archivo de entrada es:

`app.py`

En los secretos del hosting configure:

```toml
SUPABASE_URL = "..."
SUPABASE_KEY = "..."
APP_PASSWORD = "..."
```

### 5. Abrir en celular

Abra la URL publicada desde Chrome/Safari. Puede agregarla a la pantalla de inicio del teléfono
para acceder como si fuera una aplicación.

## Uso

La aplicación tiene solo cuatro pantallas:

1. **Nueva valoración** – registro móvil.
2. **Registros** – consulta de datos guardados en la nube.
3. **Editar registro** – modificar datos ya guardados.
4. **Campos** – cambiar el formulario sin tocar la base de datos.

## Baremos

Se conservan los archivos:

- `data/baremos_normal.csv`
- `data/criterios_mantenimiento.csv`

La aplicación interpreta automáticamente los campos SFT cuyas claves técnicas son conocidas.

## Seguridad

Esta versión usa una clave de acceso simple a la aplicación para reducir complejidad. Para una
implementación institucional con datos sensibles debe evaluarse autenticación individual,
roles, políticas de acceso de Supabase y lineamientos de protección de datos del INDER.

**Nunca suba `SUPABASE_KEY` a GitHub.**
