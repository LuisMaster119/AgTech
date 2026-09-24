# Contexto del proyecto — AgTech

## 1. Comunicación y entorno

- Responder siempre en español, con pasos cortos y concretos.
- El responsable del proyecto es Luis.
- Entorno local: Windows con PowerShell.
- Ruta del proyecto:
  C:\Users\Luis Rodriguez\Documents\Proyectos\AgTech
- Desarrollo asistido con Codex.
- Google Cloud se gestiona con apoyo de Google Antigravity.
- Proyecto de hackathon: priorizar un MVP funcional y cambios pequeños.
- Explicar qué se modifica, con qué objetivo y cómo se verifica.
- Trabajar mediante prompts directos, sin depender de OpenSpec.

## 2. Cómo interpretar este documento

Este documento reúne el contexto, las decisiones y la dirección del producto.

Las secciones de funcionalidades describen el comportamiento previsto.
No significan que todo esté implementado ni autorizan construirlo
en una sola tarea.

Antes de modificar código:
- revisar la implementación existente;
- identificar el alcance solicitado en el prompt;
- distinguir lo existente de lo pendiente;
- respetar las restricciones de este documento.

Las instrucciones explícitas del usuario pueden actualizar estas decisiones.
Si cambia una decisión permanente, actualizar también este documento.

## 3. Qué es AgTech

AgTech es una PWA orientada a productores agrícolas que necesitan
mostrar información de trazabilidad e indicadores ambientales
de sus parcelas, incluyendo productores interesados en exportación.

Utiliza análisis satelital para evaluar parcelas y mostrar
información ambiental.

Los resultados de AgTech no deben presentarse como prueba automática
de cumplimiento regulatorio ni como certificación oficial externa.

## 4. Flujo principal

Flujo público:

Visitante
→ Catálogo público
→ Micrositio público de una parcela

Flujo de proveedor:

Catálogo público
→ Iniciar sesión como proveedor
→ Mis parcelas
→ Agregar parcela
→ Dibujar polígono en el mapa
→ Completar información
→ Guardar parcela
→ Ejecutar el análisis existente cuando se solicite

Reglas:
- El catálogo público es la entrada principal de la aplicación.
- Los visitantes consultan sin crear una cuenta.
- No crear un portal separado para visitantes.
- No implementar funciones específicas para analistas.
- La administración de parcelas pertenece al flujo de proveedor.

## 5. Catálogo público

Debe permitir:
- listar parcelas públicas;
- buscar y filtrar;
- seleccionar una parcela;
- abrir su micrositio;
- consultar productor, ubicación y actividad económica;
- visualizar geometría e información ambiental disponible.

El catálogo es de solo lectura.
No permite crear, editar ni eliminar parcelas.

La búsqueda, los filtros y otros elementos se implementarán
en la etapa correspondiente, sin adelantarlos a cambios de datos
que no los requieran.

## 6. Perfil y micrositio público de parcela

El modelo público contempla:
- nombre de la parcela;
- nombre del agricultor/productor;
- historia de la parcela o granja;
- actividad económica;
- ciudad;
- municipio;
- estado;
- país;
- coordenadas y polígono;
- análisis e indicadores disponibles;
- sello o insignia cuando exista;
- certificado cuando exista;
- información de trazabilidad disponible.

Reglas:
- Exponer únicamente los campos destinados a consulta pública.
- No publicar datos privados innecesarios del proveedor.
- No inventar análisis, sellos, certificados ni información faltante.
- Diferenciar los datos de demostración de los datos reales.
- Conservar compatibilidad con registros existentes que todavía
  no tengan todos los campos nuevos.

### Ubicación

Obtener ciudad, municipio, estado y país mediante geocodificación
inversa cuando corresponda y existan coordenadas válidas.

- No asumir que el servicio siempre devuelve todos los niveles.
- No inventar valores cuando la ubicación sea parcial.
- Definir el comportamiento ante fallos en el cambio que implemente
  la integración.
- No sobrescribir información existente sin una regla explícita.

## 7. Proveedor y autenticación

El proveedor es quien administra sus propias parcelas.

Su área privada debe permitir, por etapas:
- consultar Mis parcelas;
- desplegar información de cada parcela;
- agregar parcelas;
- editar información permitida;
- consultar análisis, sellos y certificados disponibles.

Crear el modelo de proveedor no implica implementar autenticación
en el mismo cambio.

Si se solicita un login simulado para el MVP:
- identificarlo como mecanismo de demostración;
- aislarlo para permitir su sustitución por Firebase Auth;
- no presentarlo como protección real de datos privados.

La autenticación y la autorización se implementan en su etapa.
No agregar otros tipos de usuarios sin una necesidad explícita.

## 8. Alta de parcela y mapa

El alta de parcelas está prevista para el proveedor autenticado.

Flujo:
1. Abrir Agregar parcela.
2. Dibujar el polígono.
3. Obtener sus coordenadas.
4. Completar la información.
5. Guardar la parcela.
6. Permitir ejecutar el análisis existente.

### Mapa público

Permite visualizar, seleccionar y consultar.
No permite modificar geometrías.

### Mapa de proveedor

Reutiliza la identidad visual y el concepto del mapa existente.
Agrega herramientas para dibujar y confirmar el polígono.

No crear una experiencia visual completamente diferente
para el alta de parcelas.

### Importaciones

Orden previsto:
1. Dibujo de polígonos.
2. Importación GeoJSON.
3. Importación KML.

No implementar importaciones hasta que se soliciten.
La representación de geometría que ya utilice el backend debe
respetarse; mantenerla no equivale a implementar un importador.

## 9. Backend existente

Stack informado:
- Python;
- FastAPI;
- Google Earth Engine;
- Sentinel-2;
- Firestore Enterprise;
- database ID: ag-tech.

Existen endpoints para:
- crear parcela;
- ejecutar análisis;
- obtener certificado.

Verificar los contratos concretos en el código antes de modificarlos.

Los cambios deben mantener compatibles:
- endpoints existentes;
- solicitudes y respuestas utilizadas por clientes actuales;
- registros almacenados;
- servicios de análisis.

No sustituir la arquitectura ni realizar refactorizaciones
generales para resolver un cambio puntual.

## 10. Análisis ambiental protegido

El análisis existente utiliza:
- NDVI;
- NDMI;
- NDBI;
- comparación de la parcela contra un buffer de 500 metros.

Reglas críticas:
- No modificar el cálculo actual.
- No cambiar el algoritmo de riesgo.
- No cambiar los índices ni el buffer de 500 metros.
- Consumir el análisis mediante sus interfaces existentes
  o mediante extensiones claramente separadas.
- Los cambios de catálogo, interfaz, autenticación y administración
  no autorizan cambios en el cálculo.

Modificar el cálculo requiere una solicitud explícita
con ese alcance.

### Referencias de validación

Según las pruebas reportadas del proyecto, se utilizaron casos
de Global Forest Watch cerca de Bacalar, Quintana Roo:

- bosque intacto: riesgo bajo;
- parcela deforestada entre 2021 y 2023: 22.77/100, riesgo alto.

Conservar estas referencias.
No afirmar que fueron verificadas nuevamente si no se ejecutaron
las pruebas correspondientes.

## 11. Identidad visual

Mantener la identidad TerraSync/AgTech.

Colores:
- Primary: #012d1d
- Secondary: #116c4a
- Primary container: #1b4332
- Secondary container: #a1f4c8
- Fondos crema claros.
- Superficies blancas o crema.
- Textos oscuros y gris verdoso.

Tipografías:
- Plus Jakarta Sans para interfaz y contenido.
- JetBrains Mono para métricas y datos técnicos.

Elementos:
- Material Symbols;
- tarjetas limpias;
- bordes redondeados;
- sombras suaves;
- verde como color de acción;
- indicadores de estado.

El catálogo público y el área del proveedor deben sentirse
como partes de la misma aplicación.

Usar los diseños existentes del explorador, mapa y acceso
como referencia cuando estén disponibles.

No introducir otra paleta ni rediseñar la interfaz durante
un cambio funcional que no lo solicite.

## 12. Sellos y certificados

Niveles propios previstos:
- Nivel I — Base.
- Nivel II — Export.
- Élite — Regenerativo.

Los nombres de niveles no acreditan por sí mismos cumplimiento,
autorización de exportación ni neutralidad de carbono.

Reglas:
- Los sellos y certificados son propios de AgTech.
- Nunca presentar AgTech como certificación oficial ISO.
- Usar “alineado con criterios de” al mencionar criterios
  de ISO 9001, ISO 14001 o ISO 45001, cuando exista sustento.
- Verificar las referencias “ISO 2000” y “SS005” antes
  de utilizarlas formalmente.
- No presentar afirmaciones sobre FDA, Unión Europea,
  acreditación global o neutralidad de carbono como verificadas
  sin criterios y evidencia definidos.

El motor de sellos y la ampliación de certificados corresponden
a cambios posteriores. Preservar el endpoint existente.

## 13. Orden de implementación

Realizar los cambios uno por uno, salvo instrucción explícita
para ajustar el orden.

### 1. parcel-profile-data

Estado implementado en código (septiembre de 2026): modelo `Provider` en
`providers`, referencia opcional `providerId` en parcelas y campos públicos
opcionales de productor, historia, actividad económica y ubicación. Los GET
existentes `/farms` y `/farms/{farm_id}` sirven el perfil y geometría sin exponer
la referencia interna del proveedor ni campos privados adicionales.

La geocodificación inversa Nominatim es configurable y está desactivada por
defecto. Al activarla completa ubicación faltante durante la creación usando
el primer vértice del perímetro como referencia aproximada. No sobrescribe
valores manuales; fallos y resultados parciales conservan los datos disponibles.
No hay geocodificación ni escrituras durante las consultas públicas. El servicio
público requiere un solo worker y respetar su límite de consumo total.

`python -m scripts.seed_demo` crea manualmente un proveedor y dos parcelas
ficticias marcadas como demostración. No ejecuta análisis ni sobrescribe
documentos existentes. No implica que las semillas hayan sido cargadas en nube.
Se mantienen los registros antiguos sin migración obligatoria. Autenticación real y
edición del proveedor sigue pendiente; el catálogo público se describe
en la siguiente etapa.

Backend:
- modelo de proveedor;
- ampliación del modelo de parcela;
- productor, historia y actividad económica;
- ubicación y geocodificación inversa;
- endpoints públicos de listado y detalle;
- datos públicos y geometría;
- datos semilla de demostración.

Excluir:
- autenticación;
- frontend del catálogo;
- dashboard de proveedor;
- dibujo e importación de polígonos;
- nuevos sellos y certificados;
- modificaciones del análisis.

### 2. public-catalog

Estado implementado en código (septiembre de 2026): `/` muestra el catálogo
público TerraSync/AgTech con tarjetas conectadas a `GET /farms`, búsqueda por
nombre, productor, actividad y ubicación sin distinguir acentos, filtros
combinables por estado y actividad, y etiquetas de demostración. Los registros
antiguos muestran mensajes de información no disponible.

Se reutiliza el mapa Leaflet/Esri existente en modo de solo lectura, con
polígonos filtrados y selección desde mapa o tarjeta. La portada ya no carga
el controlador anterior de dibujo, registro y análisis. Sus módulos permanecen
en el repositorio para etapas posteriores; no se agregó una ruta administrativa.

Se contemplan carga, catálogo vacío, búsqueda sin resultados, error y reintento.
Las tarjetas enlazan al micrositio implementado en la etapa siguiente.
El acceso de proveedor enlaza al login de demostración de la etapa 4;
no hay autenticación real.
Las pruebas de navegador usan respuestas simuladas sin escribir en Firestore.

Frontend:
- catálogo público;
- tarjetas;
- búsqueda y filtros;
- acceso al micrositio;
- botón Iniciar sesión como proveedor.

No implementar todavía autenticación funcional.

### 3. parcel-microsite

Estado implementado en código (septiembre de 2026): cada tarjeta ofrece
«Conocer parcela», que abre `/parcela.html?id=<farmId>`. El enlace permite
acceso directo y recarga. La página consulta `GET /farms/{farm_id}` y muestra
nombre, productor, historia, actividad, ubicación y polígono en el mapa de
solo lectura, manteniendo la identidad visual del catálogo y el regreso a él.

Consulta el último análisis guardado mediante el endpoint existente
`GET /farms/{farm_id}/certificate`, mostrando score, riesgo, fecha, periodos,
resumen e índices de parcela y entorno. No genera análisis ni certificados,
no presenta sellos y no modifica cálculos. Un 404 de análisis se muestra como
ausencia de resultados; otros errores permiten reintentar sin ocultar el perfil.
Se contemplan enlace sin ID, parcela inexistente, perfil antiguo, datos
faltantes y fallos de mapa. Las lecturas tienen un timeout de 15 segundos.

Verificación: navegador en escritorio y móvil con respuestas de prueba,
regresión del catálogo y suite Python. No equivale a validar datos reales
de Firestore ni a repetir los casos ambientales de Bacalar.

Frontend:
- detalle público;
- información de la parcela;
- mapa y polígono;
- análisis disponible;
- visualización de sello cuando exista.

No implementar el motor de sellos.

### 4. provider-login

Estado implementado en código (septiembre de 2026): por elección explícita del
usuario, acceso simulado para el MVP. `/acceso.html` ofrece un formulario de correo y
contraseña con las credenciales públicas `proveedor@demo.test` / `demo123`, validadas en el backend. Sin ellas no se crea sesión. Todos entran como `demo-provider-001`, el mismo proveedor ficticio.
`/proveedor.html` valida la sesión con `GET /providers/me`, muestra su nombre
y permite cerrar sesión; ahora contiene «Mis parcelas», descrito en la etapa 5.

La sesión demo se crea con `POST /auth/demo/session` y se revoca con
`DELETE /auth/demo/session`. Se usan tokens aleatorios almacenados en memoria
del servidor, con vencimiento de una hora, y `sessionStorage` en el navegador.
Las sesiones se pierden al reiniciar el servidor; usar un solo worker.
El adaptador frontend `ProviderAuth` y la dependencia backend `require_provider`
mantienen separado el mecanismo para su futura sustitución por Firebase Auth.

`DEMO_AUTH_ENABLED` está desactivado por defecto; se activó en el `.env` local
para esta demostración. El endpoint `/providers/me` exige sesión vigente; el
HTML es una plantilla pública sin datos privados que redirige al acceso si no
hay sesión. Esto no constituye protección real: cualquiera puede iniciar una
sesión demo. Los endpoints anteriores de parcelas y análisis no cambian sus
permisos en esta etapa. No se escribe en Firestore ni se crean proveedores
persistentes al entrar. El ID coincide con el de las semillas existentes.

Verificado con pruebas de sesiones ausentes, inválidas, vencidas, cierre y modo
desactivado, y navegador con el backend demo real en memoria. No se implementan
autenticación Firebase, registro de usuarios ni alta de parcelas en esta etapa.

- Login de proveedor.
- Sesión.
- Rutas protegidas.
- Acceso desde el catálogo.
- Mecanismo sustituible por Firebase Auth si se utiliza simulación.

### 5. provider-dashboard

Implementado: `/proveedor.html` muestra «Mis parcelas» después del login mock.
`GET /providers/me/farms` exige sesión vigente y consulta Firestore filtrando
`providerId` por la identidad de la sesión, nunca por un parámetro del cliente.
Ordena por fecha descendente y reutiliza el esquema de respuesta de parcelas.
Los registros sin proveedor o de otro proveedor no se incluyen ni se reasignan.

Cada parcela tiene información desplegable de productor, actividad, ubicación
e historia, con enlace al perfil público y su análisis disponible. Se muestran
datos faltantes, carga, listado vacío y errores con reintento. Una sesión vencida
redirige al formulario. El botón «Agregar parcela» abre el flujo de la etapa 6.

Verificado con 37 pruebas Python y prueba de navegador con datos simulados en
escritorio y móvil. No se cargaron semillas ni se modificaron datos de Firestore.
El acceso sigue siendo una demostración, no autenticación real.

- Mis parcelas.
- Listado de parcelas propias.
- Información desplegable.
- Botón Agregar parcela.

No implementar todavía el flujo completo de dibujo.

### 6. add-parcel-flow

Implementado: `/agregar-parcela.html` exige la sesión demo y reutiliza el mapa
Leaflet/Esri y Leaflet.draw existentes. Permite dibujar, descartar y confirmar
un polígono, consultar sus coordenadas y completar nombre, productor, historia,
actividad y ubicación. El nombre y la geometría son obligatorios. Redibujar
invalida la confirmación anterior. No hay importación ni exportación.

`POST /providers/me/farms` valida el modelo existente, asigna `providerId` y
`esDemostracion` desde la sesión, completa ubicación mediante el servicio
existente cuando está habilitado y guarda en `farms` de `ag-tech`. La identidad
demo es la de la sesión: no requiere haber cargado las semillas ni crea un
documento de proveedor al guardar. Los registros aparecen en Mis parcelas y
en el catálogo público; no cambia el endpoint anterior `POST /farms`.

Durante el guardado se bloquean los controles; un fallo conserva el formulario
y pide revisar Mis parcelas antes de repetir una operación cuyo resultado no
se pudo confirmar. El guardado no es idempotente entre reintentos. Tras éxito
ofrece volver al listado o abrir el perfil público. No ejecuta análisis ni
modifica el motor ambiental. Ejecución de análisis desde esta nueva pantalla,
edición y autenticación real quedan fuera de este cambio.

Verificación: 40 pruebas Python, dibujo mediante clics en navegador, confirmación,
guardado simulado, error/reintento, vista móvil y navegación del dashboard.
No se escribieron parcelas de prueba en Firestore ni se ejecutó Earth Engine.

- Mapa para alta.
- Dibujo y confirmación del polígono.
- Obtención de coordenadas.
- Formulario.
- Guardado.
- Reutilización del diseño visual existente.

GeoJSON y KML quedan como extensiones posteriores.

### 7. seal-engine

- Definir criterios verificables para los sellos.
- Relacionar resultados existentes con los niveles.
- Probar con los casos de referencia disponibles.

No modificar el algoritmo base de análisis.

### 8. certificate-and-qr

- Ampliar la funcionalidad de certificado existente.
- Incorporar sello y criterios aplicables.
- Generar QR hacia el micrositio público.

No crear otro sistema de autenticación.

### 9. buffer-zone-and-moisture

- Visualización de zona limítrofe.
- Funcionalidades adicionales de humedad.
- Recomendaciones con criterios definidos.

Mantener separado de autenticación y administración de parcelas.
Esta etapa no autoriza modificar el buffer del análisis existente.

## 14. Funciones futuras fuera del alcance por defecto

- Recomendaciones de riego.
- Clima.
- Automatización de certificaciones para exportación.
- Nuevos productos.
- Intercambio de recursos.
- Convenios con productores ganaderos.
- Funciones para analistas.

Humedad, QR, sellos, certificados e importaciones solo se incorporan
cuando el cambio solicitado los incluya.

## 15. Proceso de trabajo mediante prompts

No se requiere OpenSpec.

Cada solicitud debe precisar:
- objetivo;
- comportamiento esperado;
- alcance;
- exclusiones;
- criterios de aceptación cuando sean necesarios.

Si se solicita planificación:
- revisar el código;
- proponer archivos y cambios;
- explicar decisiones relevantes;
- definir tareas y verificaciones;
- no implementar hasta recibir la instrucción correspondiente.

Si se solicita implementación:
- realizar el trabajo autorizado;
- mantener el alcance;
- ejecutar verificaciones pertinentes;
- informar resultados y limitaciones.

No exigir otra aprobación de un plan cuando el prompt
ya autoriza implementar.

Preguntar únicamente cuando falte una decisión que afecte
materialmente el resultado. Resolver detalles menores
con los patrones existentes.

## 16. Cierre de cada cambio

Al finalizar:
- resumir archivos y comportamiento modificados;
- indicar pruebas ejecutadas y resultados;
- señalar verificaciones que no pudieron realizarse;
- registrar pendientes reales;
- actualizar este contexto si cambiaron decisiones permanentes;
- realizar un commit del cambio terminado antes de comenzar
  el siguiente, sin incluir modificaciones ajenas.

No declarar una funcionalidad terminada si faltan requisitos
del alcance acordado.
