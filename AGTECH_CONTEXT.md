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
Se mantienen los registros antiguos sin migración obligatoria. Autenticación,
administración del proveedor y frontend siguen pendientes.

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

Frontend:
- catálogo público;
- tarjetas;
- búsqueda y filtros;
- acceso al micrositio;
- botón Iniciar sesión como proveedor.

No implementar todavía autenticación funcional.

### 3. parcel-microsite

Frontend:
- detalle público;
- información de la parcela;
- mapa y polígono;
- análisis disponible;
- visualización de sello cuando exista.

No implementar el motor de sellos.

### 4. provider-login

- Login de proveedor.
- Sesión.
- Rutas protegidas.
- Acceso desde el catálogo.
- Mecanismo sustituible por Firebase Auth si se utiliza simulación.

### 5. provider-dashboard

- Mis parcelas.
- Listado de parcelas propias.
- Información desplegable.
- Botón Agregar parcela.

No implementar todavía el flujo completo de dibujo.

### 6. add-parcel-flow

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
