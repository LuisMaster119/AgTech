# Instrucciones de trabajo — AgTech

## Contexto y comunicación

- Leer AGTECH_CONTEXT.md antes de planear o modificar el proyecto.
- Al retomar en otro dispositivo, leer primero la sección «Punto de continuación»
  de AGTECH_CONTEXT.md. Comprobar el código y la configuración local antes de
  continuar; no repetir etapas completadas ni asumir que se copiaron credenciales.
- Responder siempre en español, con pasos cortos y concretos.
- Trabajar con Windows y PowerShell.
- Priorizar un MVP de hackathon con cambios pequeños.
- Explicar qué archivos se modifican y con qué objetivo.
- Revisar el código existente antes de proponer una solución.
- Distinguir entre funcionalidades existentes y funcionalidades previstas.
- El contexto describe la visión del producto; no autoriza implementar
  todas las funcionalidades en una sola tarea.

## Trabajo mediante prompts

- No utilizar OpenSpec ni sus comandos, habilidades o flujo de artefactos.
- El prompt del usuario define el alcance del cambio actual.
- Si el usuario solicita un plan, entregar el plan sin modificar código.
- Si solicita implementar, completar el cambio y sus verificaciones.
- No exigir un documento de planificación para cambios sencillos.
- Resolver detalles menores siguiendo los patrones existentes.
- Consultar cuando una ambigüedad afecte materialmente el alcance,
  la compatibilidad o el comportamiento esperado.
- No incorporar funcionalidades de etapas posteriores sin solicitarlas.

## Reglas de implementación

- Reutilizar componentes, modelos y servicios existentes cuando corresponda.
- Mantener compatibles los endpoints y los datos existentes.
- No realizar refactorizaciones ajenas al cambio.
- Indicar explícitamente qué queda fuera del alcance.
- Respetar el orden de implementación de AGTECH_CONTEXT.md,
  salvo instrucción explícita del usuario.

## Análisis ambiental protegido

- No modificar el cálculo actual del análisis ni el algoritmo de riesgo.
- No cambiar NDVI, NDMI, NDBI ni el buffer de 500 metros.
- Consumir el análisis mediante sus interfaces existentes.
- Cualquier modificación del cálculo requiere una solicitud explícita
  que autorice ese alcance.
- Conservar los casos validados como referencias de regresión.

## Arquitectura del producto

- El catálogo público es la entrada principal de la aplicación.
- Los visitantes consultan sin autenticación.
- El catálogo y el mapa públicos son de solo lectura.
- No crear un portal separado para visitantes ni funciones de analista.
- La administración de parcelas pertenece al flujo de proveedor.
- Reutilizar la identidad y el concepto del mapa existente para el alta.
- Implementar primero el dibujo de polígonos; después, la importación
  GeoJSON y, posteriormente, KML, cuando se soliciten.
- No exponer datos privados innecesarios del proveedor.

## Datos y backend

- Conservar Python, FastAPI, Google Earth Engine y Sentinel-2.
- Mantener Firestore Enterprise con database ID `ag-tech`.
- Los perfiles públicos contemplan productor, nombre de parcela,
  historia, actividad económica, ciudad, municipio, estado, país
  y coordenadas/polígono.
- Incorporar geocodificación inversa cuando corresponda al cambio.
- Mostrar análisis, sellos y certificados únicamente cuando existan
  y corresponda al alcance solicitado.

## Identidad visual

- Mantener la identidad Tlalli, de Quetzalcode, y el diseño visual existente.
- Conservar los colores #012d1d, #116c4a, #1b4332 y #a1f4c8.
- Usar fondos crema y superficies blancas o crema.
- Mantener Plus Jakarta Sans para interfaz y JetBrains Mono para métricas.
- Conservar Material Symbols, tarjetas limpias, bordes redondeados
  y sombras suaves.
- Mantener coherencia entre catálogo público y área del proveedor.

## Sellos y funcionalidades futuras

- Los sellos Nivel I Base, Nivel II Export y Élite Regenerativo
  son propios de AgTech.
- Nunca presentar AgTech como certificación oficial ISO.
- Usar “alineado con criterios de” para las referencias ISO.
- Verificar las referencias “ISO 2000” y “SS005” antes de utilizarlas.
- No implementar sellos, certificados, QR, humedad, recomendaciones,
  clima ni otros productos fuera del cambio solicitado.

## Verificación y cierre

- Ejecutar las pruebas pertinentes al cambio.
- Comprobar compatibilidad cuando se modifiquen modelos o endpoints.
- No afirmar que una verificación pasó si no se ejecutó.
- Informar qué cambió, qué se verificó y qué queda pendiente.
- Actualizar AGTECH_CONTEXT.md cuando cambien decisiones del proyecto,
  sin presentar funcionalidades pendientes como implementadas.
- Al cerrar cada cambio, realizar el commit correspondiente antes
  de comenzar el siguiente, incluyendo solo archivos de ese cambio.
