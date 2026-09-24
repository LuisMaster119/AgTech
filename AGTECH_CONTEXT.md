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

### Punto de continuación — 23 de septiembre de 2026

Eliminación solicitada — 24 de septiembre de 2026: se eliminó de Firestore
ag-tech la parcela «El Aguacate», ID 350b8a26-e16e-42aa-ac8c-0c2e1829265e.
Se verificó coincidencia única, productor demo y ausencia de análisis asociados;
el borrado se condicionó a la versión leída y se comprobó después su ausencia.
Copia local en backups/deleted-el-aguacate-350b8a26.json, excluida de Git.

Terminología de interfaz — 24 de septiembre de 2026: se usa «Productor» en
lugar de «Proveedor» en los textos visibles del catálogo, acceso, Mis parcelas,
alta y mensajes del micrositio. Las referencias históricas de este documento
conservan su terminología anterior. Se mantienen /proveedor.html, vista=proveedor,
endpoints /providers, identificadores internos y credenciales demo para preservar
compatibilidad. Es un cambio de presentación, sin cambios de roles ni permisos.
Verificado: pruebas de navegador del catálogo y dashboard con datos simulados,
sintaxis del micrositio y revisión del diff.

Ajuste de espaciado del proveedor — 24 de septiembre de 2026: la columna de
datos comienza más a la izquierda y reserva espacio adicional antes de la imagen.
Se conserva la distribución móvil. Verificado con la prueba de navegador del
dashboard y revisión de captura de escritorio; sin cambios de comportamiento.

Tarjetas directas del proveedor — 24 de septiembre de 2026: reemplazan el
desplegable anterior por nombre, actividad económica/municipio/estado/país en
la columna central e imagen a la derecha. «Ver parcela» sustituye «Mostrar
información». Pulsar la tarjeta abre el micrositio con vista=proveedor; el enlace
de atribución de Esri sigue independiente. En móvil los datos quedan debajo del
nombre y la imagen a la derecha. Los datos ausentes indican «No disponible».
Verificado con navegador Edge y datos simulados: posición, cuatro campos,
navegación por teclado y clic sobre imagen, móvil, imagen fallida, estados de
carga y sesión; sintaxis, diff y capturas revisados. No cambia backend, análisis,
buffer ni la información almacenada; historia y demás detalles se ven en el perfil.

Fotos del proveedor — 24 de septiembre de 2026: las tarjetas de Mis parcelas
reutilizan ParcelPreview con imagen satelital y polígono a la derecha, sin buffer.
«Mostrar información» aparece pequeño bajo el nombre y cambia a «Ocultar
información» al desplegar. Se conserva el acceso por teclado, los datos, el enlace
al perfil con vista=proveedor y la sesión existente. La imagen permanece a la
derecha en móvil; contempla geometría ausente y fallos del servicio.
Verificado: prueba Edge de escritorio/móvil con datos e imágenes simulados,
posición, desplegado por clic/teclado, errores, navegación, sesión vencida y sin
peticiones de buffer/análisis ni escrituras; tres pruebas de ParcelPreview,
sintaxis y capturas revisadas. No cambia backend ni análisis ambiental.

Fotos del catálogo — 24 de septiembre de 2026: se retira la sección «Una mirada
al territorio», su enlace y los botones «Ver en mapa». Cada tarjeta incorpora
una imagen estática de Esri World Imagery, encuadrada en la geometría propia,
con contorno menta y relleno tenue; sin capa ni consulta del buffer de 500 m.
Imagen y contorno SVG usan la misma extensión Web Mercator y relación 16:9.
Se conservan filtros, datos y enlace al perfil; carga diferida, atribución y
mensajes ante geometría ausente o imagen fallida. No cambia el mapa del perfil,
el alta, endpoints ni el análisis ambiental. La imagen es cartografía de referencia,
no una captura del análisis Sentinel-2 ni una promesa de fecha de adquisición.
Verificado: siete pruebas unitarias de catálogo/encuadre/geometrías; navegador
Edge en escritorio y móvil con imágenes y parcelas simuladas, errores, filtros,
navegación y ausencia de peticiones de buffer/análisis. Capturas revisadas.
Consulta real a Esri con el polígono ficticio del test: HTTP 200, image/jpeg.
No se consultaron ni escribieron parcelas reales durante las verificaciones.

Ubicación al confirmar — 24 de septiembre de 2026: Agregar parcela consulta
Nominatim desde el navegador al confirmar el polígono y completa ciudad, estado,
país y municipio cuando existe. Usa el primer vértice como referencia aproximada,
igual que el servicio del servidor, y permite revisar y corregir los resultados.
Conserva campos manuales; al redibujar elimina solo valores automáticos e ignora
respuestas anteriores. Espera la consulta antes de permitir guardar; fallos o
datos parciales permiten completar manualmente. La consulta tiene timeout de 15 s,
caché de 30 ubicaciones y comparte cola/separación con el buscador del mapa.
Este flujo no depende de GEOCODING_ENABLED; la configuración y el enriquecimiento
opcional del servidor al guardar siguen intactos. No cambia endpoints ni análisis.
Verificación: cuatro pruebas aisladas de ubicación y cuatro de catálogo correctas,
sintaxis JavaScript y diff revisados. Prueba Edge ampliada pero no completada:
el mapa externo no quedó disponible antes del timeout; pendiente verificación
con mapa y servicio reales. No se escribieron datos en Firestore.

Visibilidad de evaluación — 24 de septiembre de 2026: el bloque de criterios
Tlalli inicia oculto y solo se muestra con `vista=proveedor` desde Mis parcelas
y una sesión vigente cuya lista incluya la parcela. Catálogo, enlaces directos
y QR no agregan ese parámetro y mantienen el bloque oculto, también al imprimir.
Se revalida al recuperar la pestaña y periódicamente fuera de una ejecución.
Es una regla de presentación, no autenticación real ni protección del endpoint
público existente de evaluación. Verificación de navegador y commit pendientes
por fallo de revisión automática de permisos (límite de uso).

Tarjetas espectrales — 24 de septiembre de 2026: la tabla del micrositio se
reemplaza por tres tarjetas NDVI/NDMI/NDBI con paleta Tlalli. Muestran línea base,
valor reciente, impacto, diferencial e interpretación almacenados; los valores
del entorno siguen disponibles en desplegables. No se recalcula ni se inventa
una valoración si falta el desglose. Se conserva el resto de los módulos.
Verificación inicial de navegador: tres tarjetas, cero, móvil y regresión del
micrositio con datos de prueba. Las aserciones adicionales de diferencial e
interpretación quedaron pendientes por fallo de revisión automática de permisos.

Buscador de localidades — 24 de septiembre de 2026: Agregar parcela incorpora
un control arriba a la derecha dentro del mapa. Reutiliza Nominatim mediante
API.searchNominatim, con envío explícito (sin autocompletado), timeout de 15 s,
atribución, caché de hasta 30 consultas por pantalla y separación de peticiones.
Seleccionar un resultado centra el mapa sin modificar el polígono ni completar
el formulario. La disponibilidad depende del servicio externo. Verificación de
navegador con búsqueda interceptada, selección, caché y regresión de dibujo/guardado.

Traslado del análisis — 24 de septiembre de 2026: se retira el botón de ejecución
de Mis parcelas y se coloca en Información ambiental del micrositio. Se muestra
si existe sesión y la parcela figura en `/providers/me/farms`, comprobación que
se repite al pulsarlo. Es visibilidad de interfaz, no nueva autorización backend;
el endpoint histórico conserva sus permisos y la sesión sigue siendo demo.
La respuesta del POST se muestra directamente en el mismo bloque, sin navegación.
Se conservan espera de tres minutos, bloqueo de doble clic, errores y reconsulta
del resultado almacenado. Visitantes consultan sin ejecutar; no hay ejecución
automática. Historia, mapa, criterios y cálculos permanecen sin cambios.
Verificado con pruebas de navegador de ejecución, dashboard y micrositio con mocks.

Módulo de criterios — 24 de septiembre de 2026: se sustituye únicamente el bloque
«Evaluación preliminar AgTech» por «Evaluación de criterios Tlalli». Tres tarjetas:
gestión y trazabilidad (completitud del perfil mediante el endpoint existente),
gestión ambiental y seguridad/condiciones de trabajo (criterios ilustrativos,
evidencias esperadas y observaciones de ejemplo, sin documentos cargados).
Los detalles son desplegables y el resultado permanece pendiente de revisión.
No se atribuye cumplimiento a ISO: normas, correspondencias y reglas de emisión
siguen pendientes de confirmación y validación. No hay carga documental ni revisor.
Se mantienen intactos historia, información, mapa, análisis y contratos backend.
El documento imprimible reutiliza este bloque, como ya hacía con la evaluación.
La verificación de los 500 m fue reportada como correcta por el usuario.

Ajuste visual — 24 de septiembre de 2026: se retiraron las etiquetas de demostración
junto al nombre de las parcelas en catálogo, Mis parcelas y perfil público, y las
flechas horizontales de los enlaces y botones. Se conserva la flecha diagonal del
acceso de proveedores. El campo esDemostracion y los avisos de análisis, evaluación
y sesión permanecen sin cambios; este ajuste solo afecta la presentación. Los scripts de catálogo, perfil y dashboard
usan una versión en su URL para renovar la caché al recargar.

Cambio de marca — 24 de septiembre de 2026: la marca pública de las páginas pasa
a ser Tlalli, de Quetzalcode. Se actualizaron títulos, encabezados, pies, metadatos,
acceso y encabezado del documento imprimible. Se conservan el diseño, los nombres
de los sellos AgTech y los identificadores técnicos existentes. Las menciones
históricas a TerraSync en este documento describen la marca anterior.


Actualización puntual — 24 de septiembre de 2026: «Mis parcelas» reemplaza el
aviso de sesión de demostración por un bloque visual «Alertas de parcelas», con
textos fijos de posible sequía para La Esperanza y pérdida de cobertura arbórea
para El Encino. Por decisión de Luis, el bloque no lleva etiquetas de demo ni
de funcionalidad futura. Es un mock de interfaz: no consulta condiciones reales,
no depende de las parcelas registradas y no implementa detección ni notificaciones.
No cambia el análisis ambiental ni la autenticación. No se crearon registros en
Firestore; Luis registrará las parcelas mediante el formulario existente.

Limpieza del login — 24 de septiembre de 2026: por solicitud de Luis, se retira
de `acceso.html` el bloque «Acceso de demostración» con la explicación y las
credenciales visibles. El formulario, las credenciales aceptadas y el mecanismo
de sesión existente no cambian; la autenticación real sigue pendiente.

Luis pidió guardar el contexto y las instrucciones del agente para continuar
desde otro dispositivo. No hay una implementación nueva en curso.

Estado actual:
- Etapas 1 a 6 implementadas: perfiles, catálogo, micrositio, acceso demo,
  Mis parcelas y alta mediante dibujo. El proveedor ya puede ejecutar el
  análisis existente y consultar el resultado guardado en el perfil público.
- Etapa 7: Base significa «Perfil documentado»; comprueba completitud, no
  veracidad ni desempeño ambiental. Export y Regenerativo no se otorgan.
- Etapa 8: documento imprimible de preevaluación y QR hacia el perfil actual.
  No hay certificación oficial, firma digital ni archivo histórico certificado.
- Últimos commits funcionales: `772f188` (Base), `f6887dd` (ejecución de análisis),
  `9233b8e` (documento y QR).

Validación: Luis informó que realizó las pruebas y que todo parece funcionar
correctamente. Es validación manual reportada por el usuario; no detalló cada
caso ni aportó registros. No atribuir al agente una ejecución real de Earth Engine,
Firestore o escaneo físico del QR. La última verificación automatizada del agente
fue de 55 pruebas Python y pruebas de navegador con datos interceptados.

Etapa 9 iniciada: el micrositio muestra el entorno de 500 m en ámbar con rayas
diagonales y control de visibilidad. Humedad y recomendaciones
requieren criterios concretos antes de implementarse. No modificar NDVI, NDMI,
NDBI, scoring ni el buffer utilizado por el análisis. Este registro no autoriza
iniciar automáticamente esa etapa: atender el siguiente prompt de Luis.

Para retomar en otro equipo:
1. Clonar o actualizar `https://github.com/LuisMaster119/AgTech.git`, rama `main`,
   y comprobar que incluye los commits funcionales anteriores y este contexto.
2. Abrir la carpeta del proyecto y leer AGENTS.md y este documento.
3. Crear un entorno local (no copiar `venv`): `python -m venv venv`, activar con
   `.\venv\Scripts\Activate.ps1` e instalar `python -m pip install -r requirements.txt`.
4. Configurar `.env` y las credenciales de Google Cloud por un medio seguro:
   `GOOGLE_APPLICATION_CREDENTIALS` apunta a la ruta local del JSON autorizado;
   mantener `FIRESTORE_DATABASE_ID=ag-tech`. Estos archivos no están en Git.
5. Para el acceso MVP usar `DEMO_AUTH_ENABLED=true`. Credenciales públicas demo:
   `proveedor@demo.test` / `demo123`. La sesión se pierde al reiniciar el servidor;
   utilizar un solo worker. Esto no protege datos privados reales.
6. Revisar `PUBLIC_BASE_URL` para el QR (origen HTTP(S) accesible, sin ruta).
   Localhost no sirve para abrir el perfil desde otro dispositivo. La geocodificación
   sigue desactivada por defecto; activarla solo con su configuración existente.
7. Ejecutar `uvicorn app.main:app --reload --port 8000` y abrir
   `http://127.0.0.1:8000/`. No se requiere el parámetro `?v=...`.

El contexto persistente del agente está en estos archivos versionados, no en
una sesión demo ni en el entorno virtual. Los registros de parcelas y análisis
permanecen en Firestore, no se trasladan al clonar el repositorio. No cargar de
nuevo semillas ni sobrescribir datos para retomar el trabajo.

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

Mantener la identidad Tlalli, de Quetzalcode, y el diseño visual existente.

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

El Nivel I Base comprueba completitud del perfil (etapa 7). Export y Regenerativo siguen pendientes. La etapa 8 incorpora un documento imprimible de preevaluación y QR al perfil, sin certificación oficial ni emisión histórica. Se preserva el endpoint existente.

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
la evaluación del perfil se incorpora en la etapa 7 y no modifica cálculos. Un 404 de análisis se muestra como
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

Complemento implementado: en «Mis parcelas», cada desplegable ofrece «Ejecutar
análisis». Comprueba la sesión demo antes de enviar `POST /farms/{farm_id}/analyze`
con los periodos predeterminados del motor existente. No se cambiaron el endpoint,
sus permisos ni los cálculos. Este flujo no añade autenticación real ni control
de propiedad al endpoint histórico.

Muestra espera sin porcentaje (el backend no informa progreso), bloquea los botones
de análisis mientras responde y permite hasta tres minutos de espera. Las comprobaciones
periódicas de sesión se posponen durante esa petición para evitar ocultar el panel
si el procesamiento ocupa el servidor. Al terminar muestra score, riesgo, resumen
y periodos, con enlace al perfil público y su último análisis guardado. No ejecuta
análisis automáticamente al guardar parcelas ni concede sellos ambientales.

Un error de conexión, timeout o guardado pide consultar el perfil antes de repetir:
el servidor puede continuar trabajando aunque el navegador deje de esperar. No hay
cancelación de trabajo ni deduplicación entre pestañas o recargas. El caso demo
conserva su etiqueta; el botón ejecuta el motor existente, no inventa resultados.

Verificación del complemento: 49 pruebas Python, incluyendo guardado y lectura del
mismo resultado con servicios sustituidos; pruebas Edge del análisis y regresión
del dashboard (doble clic, éxito, errores, sesión vencida y móvil). No se ejecutó
Earth Engine real ni se escribieron análisis en Firestore durante las pruebas.

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

Implementado: evaluación preliminar de Nivel I Base «Perfil documentado» mediante
`GET /farms/{farm_id}/seal`, sin escrituras ni cambios en contratos anteriores.
Comprueba presencia de nombre, productor, historia, actividad económica, municipio,
estado, país y estructura de un Polygon cerrado, con coordenadas finitas en rango
y anillos no degenerados. No verifica topología, catastro, veracidad ni titularidad.
Ciudad es opcional. Devuelve criterios individuales, cumple/faltan_datos, versión
`perfil-base-1.0` y fecha de consulta; no emite ni almacena certificados.
El score ambiental no interviene. Export y Regenerativo aparecen como niveles
previstos pendientes de criterios, evidencia y revisión, nunca otorgados.

El micrositio muestra la evaluación y sus faltantes, con errores recuperables.
Los perfiles demo se presentan como «Caso de demostración» y su evaluación como
«Evaluación preliminar AgTech» con datos de ejemplo. Esta marca describe el perfil,
no determina la procedencia de un análisis satelital almacenado. No se agregan
resultados ambientales ficticios. El acceso se denomina «Acceso de demostración»
y conserva el aviso de que no es autenticación real.

Verificación: 49 pruebas Python con base de datos sustituida por mocks; casos de
perfil completo, antiguo, faltantes, geometría inválida, independencia del score,
lecturas sin escrituras y errores. No se repitieron los casos reales de Bacalar.
Prueba del micrositio en Edge: criterios, marca demo, perfil antiguo, error y
reintento de evaluación, análisis separado y ancho móvil, con respuestas de prueba.


- Definir criterios verificables para los sellos.
- Relacionar resultados existentes con los niveles.
- Probar con los casos de referencia disponibles.

No modificar el algoritmo base de análisis.

### 8. certificate-and-qr

Implementado: el micrositio ofrece «Imprimir / Guardar como PDF» cuando están
disponibles el análisis almacenado con ID, la evaluación del perfil y el QR.
La impresión incluye perfil, marca demo, estado y criterios de Base, versión,
fecha de evaluación, ID y fecha del análisis, score, periodos e índices registrados.
Base puede indicar faltantes; no se convierte un perfil incompleto en un sello otorgado.
No es certificación oficial, aprobación de exportación ni documento firmado.
No se emiten snapshots persistentes ni se recalcula el análisis.

`GET /farms/{farm_id}/share` comprueba existencia y genera enlace y QR SVG con
`qrcode==8.2`, localmente y sin escrituras o servicios externos. El QR abre el
perfil actualizado, no verifica una copia histórica. El endpoint anterior
`/certificate` mantiene su contrato y se consume sin cambios.

`PUBLIC_BASE_URL` opcional fija el origen HTTP(S) accesible de la aplicación;
sin configurarlo se utiliza la dirección de la petición. Se rechazan rutas,
credenciales y parámetros en esa configuración. Localhost muestra una advertencia:
para escanear desde otro equipo se requiere una dirección alcanzable. Este cambio
no publica el servidor ni configura acceso de red.

Verificación: 55 pruebas Python, enlace codificado y estructura SVG, configuración,
404/503 sin escrituras; navegador con datos interceptados, generación QR real,
habilitación de impresión, ausencia de análisis, errores/reintentos, modo impresión
y móvil. Inspección visual del modo impresión. No se probó un escaneo físico,
Earth Engine ni Firestore reales. No hay descarga PDF del servidor: se usa el diálogo
de impresión del navegador.

- Ampliar la funcionalidad de certificado existente.
- Incorporar sello y criterios aplicables.
- Generar QR hacia el micrositio público.

No crear otro sistema de autenticación.

### 9. buffer-zone-and-moisture

Implementado: capa de consulta en el micrositio público, color ámbar y textura
diagonal diferenciados del verde de la parcela. Incluye leyenda, control para
mostrar/ocultar, encuadre del entorno y error con reintento sin ocultar el perfil.
`GET /farms/{farm_id}/buffer` lee la parcela y consulta exclusivamente su geometría
en Earth Engine: `buffer(500).difference(farm, maxError=1)`, igual que el motor.
Admite Polygon y MultiPolygon de respuesta. No calcula índices, escribe datos
ni modifica earth_engine.py o scoring. La consulta requiere credenciales y acceso
a Earth Engine; si falla, no se dibuja una geometría aproximada ni inventada.
La capa se excluye de impresión junto con el mapa existente.

Verificación: 57 pruebas Python; navegador con geometría de prueba para rayado,
visibilidad, error/reintento y regresión del micrositio en móvil. No se consultó
Earth Engine real durante estas pruebas. Humedad y recomendaciones siguen pendientes.

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
