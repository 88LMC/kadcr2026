
# Plan para Arreglar el Sistema de Asignación de Actividades

## Problema Identificado

La migración que debía crear la **foreign key** entre `activities.assigned_to` y `user_profiles.id` fue cancelada y nunca se ejecutó. El código actual intenta hacer un JOIN usando esta relación inexistente:

```typescript
assigned_user:user_profiles!activities_assigned_to_fkey (full_name, role)
```

Esto causa errores de TypeScript porque Supabase no puede encontrar la relación.

## Solución en 2 Pasos

### Paso 1: Crear la Foreign Key (Migración SQL)

Ejecutar una migración para agregar la constraint:

```sql
ALTER TABLE public.activities 
ADD CONSTRAINT activities_assigned_to_fkey 
FOREIGN KEY (assigned_to) 
REFERENCES public.user_profiles(id);
```

### Paso 2: Actualizar Temporalmente el Código (Mientras se aplica la FK)

Si prefieres una solución inmediata sin esperar la FK, podemos cambiar las queries para usar un enfoque manual:

1. Hacer la query de activities sin el JOIN
2. Obtener los user_profiles por separado
3. Combinar los datos en el frontend

Sin embargo, la solución correcta es **crear la foreign key** ya que:
- Garantiza integridad referencial
- Permite JOINs automáticos en Supabase
- Mejora el rendimiento

## Cambios Técnicos

### Base de Datos
| Cambio | Descripción |
|--------|-------------|
| Agregar FK | `activities.assigned_to` -> `user_profiles.id` |

### Código (sin cambios necesarios)
El código en `useActivities.ts` ya está correcto y funcionará una vez que exista la foreign key.

## Resultado Esperado

Una vez creada la foreign key:
- Las queries con `user_profiles!activities_assigned_to_fkey` funcionarán
- Los errores de TypeScript desaparecerán
- El dashboard mostrará las actividades filtradas por rol
- La columna "Asignado a" mostrará el nombre del usuario

## Siguiente Paso

Aprobar la migración para crear la foreign key entre `activities` y `user_profiles`.
