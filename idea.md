Bootcamp de integración y detección de fraude en tiempo real

1. Objetivo del laboratorio

Durante el bootcamp, los participantes construirán un flujo de datos en tiempo real para identificar y consultar transacciones potencialmente fraudulentas.

El laboratorio integrará las siguientes tecnologías:

* Confluent Cloud
* Apache Kafka
* Schema Registry / Data Contracts
* Apache Flink
* IBM watsonx.data integration
* StreamSets Data Collector
* IBM watsonx Orchestrate

El flujo completo será:

Generador de transacciones → Tópico de entrada en Confluent → Procesamiento en StreamSets → Tópico de salida asignado → Agente en watsonx Orchestrate

La actividad tendrá dos líneas de trabajo:

* Línea IBM: infraestructura, configuraciones base y demostraciones guiadas.
* Línea Partner: construcción del pipeline, procesamiento de datos, conexión al tópico asignado y despliegue del agente.

⸻

Etapa 0: Introducción y preparación

Paso -1. Presentación de la arquitectura y del caso de uso

Responsable: IBM
Tipo: Explicación general

IBM presentará:

* La arquitectura completa del laboratorio.
* Las plataformas que se utilizarán.
* El flujo de los datos entre Confluent e IBM Cloud.
* Los componentes que ya estarán preconfigurados.
* Las actividades que ejecutará cada participante.
* Los slides del caso de uso de detección de fraude.

Caso de uso

Una máquina virtual generará miles de transacciones durante todo el bootcamp. Dentro del flujo existirán:

* Transacciones normales.
* Transacciones sospechosas.
* Transacciones fraudulentas.

Los participantes deberán procesar estas transacciones, calcular indicadores de fraude y disponibilizar los resultados para que puedan ser consultados mediante un agente.

Resultado esperado

Todos los participantes comprenden:

* La arquitectura.
* El caso de uso.
* El flujo completo del laboratorio.
* La separación entre las tareas de IBM y las tareas de los partners.

⸻

Paso 0. Acceso a las plataformas

Responsable: IBM y participantes
Tipo: Actividad conjunta

Cada participante realizará el inicio de sesión y validará su acceso a las herramientas.

Accesos requeridos

1. Confluent Cloud
    * Cuenta de Confluent.
    * Acceso al ambiente definido para el bootcamp.
    * Credenciales entregadas por IBM.
2. IBM Cloud
    * IBMid asociado al correo del participante.
    * Acceso al ambiente de IBM Cloud.
    * Acceso al TechZone preparado para el laboratorio.
3. Servicios de IBM
    * Proyecto de watsonx.data integration.
    * Ambiente de StreamSets.
    * Instancia de watsonx Orchestrate.

Resultado esperado

Todos los participantes pueden ingresar correctamente a Confluent Cloud, IBM Cloud y los servicios requeridos para el laboratorio.

⸻

Etapa 1: Generación y publicación de transacciones

Paso 1. Activación del generador de transacciones

Responsable: IBM
Tipo: Preconfigurado y demostrado

IBM dispondrá de una máquina virtual configurada para generar y enviar transacciones de forma continua.

La máquina virtual enviará miles de eventos durante todo el bootcamp hacia un tópico de Kafka en Confluent.

Los eventos incluirán diferentes patrones:

* Operaciones normales.
* Operaciones sospechosas.
* Operaciones que cumplen condiciones de fraude.

IBM mostrará brevemente:

* El generador de transacciones.
* La estructura general de los eventos.
* La forma en que las transacciones son enviadas a Kafka.
* La cantidad y frecuencia aproximada de los eventos.

Resultado esperado

Existe un flujo continuo de transacciones disponible para todas las actividades del laboratorio.

⸻

Etapa 2: Configuración de Confluent

Paso 2. Revisión del clúster de Confluent

Responsable: IBM
Tipo: Preconfigurado y demostrado

IBM mostrará el clúster creado para el bootcamp:

Nombre del clúster: Beetech

Durante esta etapa se explicará:

* Qué es un clúster de Kafka.
* Cómo se encuentra organizado el ambiente.
* Qué recursos compartirán los participantes.
* Qué componentes estarán separados por grupo o participante.

Resultado esperado

Los participantes identifican el clúster donde se ejecutará el laboratorio y comprenden su función dentro de la arquitectura.

⸻

Paso 3. Revisión del tópico de entrada

Responsable: IBM
Tipo: Preconfigurado y demostrado

IBM mostrará el tópico donde la máquina virtual está publicando las transacciones.

Durante la demostración se revisará:

* Nombre del tópico.
* Particiones configuradas.
* Formato de los mensajes.
* Flujo de eventos en tiempo real.
* Ejemplos de transacciones normales y sospechosas.

Este será el tópico de entrada que posteriormente consumirá StreamSets.

Resultado esperado

Los participantes identifican el tópico de origen y pueden visualizar las transacciones que están llegando en tiempo real.

⸻

Paso 4. Configuración del Schema Registry o Data Contract

Responsable: IBM
Tipo: Preconfigurado y demostrado

IBM mostrará la configuración del esquema asociado al tópico de entrada.

El esquema definirá:

* Los campos de cada transacción.
* Los tipos de datos.
* Los campos obligatorios.
* La estructura que deberán respetar los mensajes.
* Las reglas de compatibilidad del esquema.

Ejemplos de campos que podría contener una transacción:

* Identificador de la transacción.
* Identificador del cliente.
* Fecha y hora.
* Monto.
* País o ubicación.
* Comercio.
* Tipo de operación.
* Dispositivo.
* Indicador inicial de riesgo.

Resultado esperado

Los participantes comprenden cómo Schema Registry o Data Contracts permite controlar la estructura y calidad de los eventos.

⸻

Paso 5. Configuración de permisos y credenciales

Responsable: IBM
Tipo: Preconfigurado y demostrado

IBM mostrará cómo se configuran los permisos necesarios para consumir y producir mensajes en Kafka.

La configuración incluirá:

* Creación o revisión de cuentas de servicio.
* Asignación de permisos sobre los tópicos.
* Configuración de ACL o RBAC, según corresponda.
* Generación de una API Key y un API Secret.
* Identificación del bootstrap server.
* Identificación del tópico que debe consumir cada participante.
* Identificación del tópico de salida asignado a cada participante.

Cada participante recibirá las credenciales necesarias para que su pipeline pueda:

1. Consumir las transacciones desde el tópico de entrada.
2. Escribir los resultados en su tópico de salida.

Consideración de seguridad

El API Secret debe utilizarse únicamente durante el laboratorio y no debe compartirse entre participantes.

Resultado esperado

Cada participante cuenta con:

* Bootstrap server.
* API Key.
* API Secret.
* Tópico de entrada.
* Tópico de salida asignado.

⸻

Paso 5.5. Demostración de procesamiento con Flink

Responsable: IBM
Tipo: Demostración

IBM realizará una demostración en vivo de Apache Flink dentro de Confluent Cloud.

La demostración permitirá mostrar:

* Cómo consultar eventos en tiempo real.
* Cómo aplicar transformaciones mediante Flink SQL.
* Cómo filtrar transacciones.
* Cómo calcular nuevos campos.
* Cómo detectar patrones sospechosos.
* Cómo escribir resultados en otro tópico.

Esta actividad tiene un propósito demostrativo. Los participantes no necesitarán construir su propia aplicación de Flink durante el laboratorio.

Resultado esperado

Los participantes comprenden el rol de Flink como herramienta de procesamiento y transformación de eventos en tiempo real.

⸻

Etapa 3: Construcción del pipeline en IBM watsonx.data integration

Paso 6. Acceso al proyecto de watsonx.data integration

Responsable: IBM y participantes
Tipo: Ambiente precreado y actividad práctica

IBM entregará acceso a un proyecto de watsonx.data integration previamente creado.

Dentro del proyecto existirá un pipeline de referencia:

Pipeline de referencia: Pipeline 0

Este pipeline utilizará StreamSets y un Data Collector desplegado en una máquina virtual.

IBM mostrará el pipeline de referencia antes de que cada participante construya o configure su propio pipeline.

Resultado esperado

Cada participante puede acceder al proyecto e identificar los recursos necesarios para comenzar el ejercicio.

⸻

Paso 7. Revisión de la conexión con Kafka

Responsable: IBM y participantes
Tipo: Demostración y configuración guiada

El Data Collector estará previamente conectado al tópico de entrada de Confluent.

IBM mostrará en vivo cómo se configuró la conexión, incluyendo:

* Bootstrap server.
* Mecanismo de autenticación.
* API Key y API Secret.
* Tópico de origen.
* Consumer group.
* Configuración de Schema Registry, cuando corresponda.
* Lectura y validación de los mensajes.

Los participantes utilizarán las credenciales entregadas para validar o completar su propia conexión.

Resultado esperado

El pipeline puede consumir correctamente las transacciones provenientes de Confluent.

⸻

Paso 8. Apertura y configuración del canvas

Responsable: Participantes, con acompañamiento de IBM
Tipo: Actividad práctica

Cada participante abrirá el canvas del pipeline en watsonx.data integration.

En el canvas se configurarán las etapas necesarias para:

1. Consumir las transacciones.
2. Interpretar la estructura de los mensajes.
3. Validar los campos recibidos.
4. Aplicar transformaciones.
5. Calcular indicadores de riesgo o fraude.
6. Preparar el resultado que se enviará al tópico de salida.

Resultado esperado

Cada participante tiene un pipeline funcional con las etapas necesarias para procesar los eventos.

⸻

Paso 9. Cálculo en tiempo real

Responsable: Participantes
Tipo: Actividad práctica

Los participantes configurarán las reglas de procesamiento del caso de uso.

El pipeline podrá calcular elementos como:

* Puntaje de riesgo.
* Clasificación de la transacción.
* Diferencia de tiempo entre operaciones.
* Distancia entre ubicaciones.
* Variación respecto del comportamiento habitual.
* Indicador de transacción sospechosa.
* Motivo de la alerta.
* Nivel de criticidad.

Una posible clasificación será:

* NORMAL
* SUSPICIOUS
* FRAUD

Resultado esperado

Cada evento de entrada genera un resultado enriquecido y clasificado en tiempo real.

⸻

Etapa 4: Escritura en los tópicos de salida

Paso 10. Conexión al tópico asignado

Responsable: Participantes
Tipo: Actividad práctica

IBM creará aproximadamente 20 tópicos de salida, uno para cada participante o grupo.

La nomenclatura podrá seguir el siguiente modelo:

* fraud-results-00
* fraud-results-01
* fraud-results-02
* …
* fraud-results-19

El pipeline de referencia utilizará:

* Pipeline 0
* Agente 0
* Tópico 0

Cada participante deberá configurar su pipeline para escribir exclusivamente en el tópico que le haya sido asignado.

Ejemplo

* Participante 0 → Tópico 0
* Participante 1 → Tópico 1
* Participante 2 → Tópico 2

Resultado esperado

Cada pipeline publica sus resultados procesados en un tópico independiente.

⸻

Paso 11. Ejecución y validación del pipeline

Responsable: Participantes
Tipo: Actividad práctica

Cada participante iniciará su pipeline y validará el procesamiento en tiempo real.

Se deberá comprobar:

* Que el pipeline se encuentra activo.
* Que está consumiendo mensajes.
* Que no existen errores de autenticación.
* Que las transformaciones se están ejecutando.
* Que los cálculos producen resultados válidos.
* Que los mensajes se están escribiendo en el tópico asignado.
* Que el tópico contiene datos actualizados.

Resultado esperado

El tópico asignado contiene un flujo continuo de transacciones procesadas y enriquecidas.

⸻

Etapa 5: Construcción y despliegue del agente

Paso 12. Importación del agente en watsonx Orchestrate

Responsable: Participantes, con acompañamiento de IBM
Tipo: Actividad práctica

En watsonx Orchestrate, cada participante importará un agente previamente preparado.

La nomenclatura seguirá el mismo número asignado al participante:

* Agente 0
* Agente 1
* Agente 2
* …
* Agente 19

El agente deberá conectarse, mediante la integración definida para el laboratorio, al tópico de salida correspondiente.

Ejemplo

* Agente 0 → Tópico 0
* Agente 1 → Tópico 1
* Agente 2 → Tópico 2

Resultado esperado

Cada agente puede acceder a los datos procesados por el pipeline correspondiente.

⸻

Paso 13. Despliegue del agente

Responsable: Participantes
Tipo: Actividad práctica

Cada participante desplegará su agente en watsonx Orchestrate.

Durante esta etapa se validará:

* La configuración del agente.
* La conexión con la fuente de datos.
* Las instrucciones del agente.
* Las acciones o herramientas importadas.
* La disponibilidad del agente para realizar consultas.

Resultado esperado

El agente se encuentra desplegado y disponible para interactuar con los datos del laboratorio.

⸻

Paso 14. Prueba del caso de uso

Responsable: Participantes
Tipo: Actividad práctica y cierre

Los participantes realizarán preguntas al agente utilizando la información que está siendo procesada en tiempo real.

Ejemplos de consultas:

* ¿Cuántas transacciones sospechosas se han detectado?
* ¿Cuáles son las últimas transacciones clasificadas como fraude?
* ¿Qué clientes presentan mayor nivel de riesgo?
* ¿Cuál es el motivo más frecuente de las alertas?
* ¿Qué transacciones tienen un monto superior al límite definido?
* ¿Desde qué países se están originando más operaciones sospechosas?
* ¿Cuál fue la última transacción fraudulenta detectada?
* Resume las principales alertas de los últimos minutos.

Resultado esperado

El agente responde preguntas basadas en los datos procesados por el pipeline y almacenados en el tópico correspondiente.

⸻

Resumen de responsabilidades

Etapa	Actividad	IBM	Partner
Introducción	Arquitectura y caso de uso	Sí	Participa
Accesos	Confluent, IBM Cloud y TechZone	Habilita	Valida
Generación de datos	Máquina virtual y transacciones	Sí	Observa
Clúster de Confluent	Creación y configuración	Sí	Observa
Tópico de entrada	Creación y configuración	Sí	Observa
Schema Registry	Configuración del esquema	Sí	Observa
Permisos	API Keys, secretos y accesos	Sí	Utiliza
Flink	Demostración de procesamiento	Sí	Observa
Proyecto de integración	Creación del proyecto base	Sí	Accede
Conexión Kafka	Configuración de referencia	Demuestra	Configura o valida
Pipeline StreamSets	Pipeline de referencia	Demuestra	Construye
Transformaciones	Reglas de fraude	Apoya	Configura
Tópicos de salida	Creación de 20 tópicos	Sí	Utiliza el asignado
Ejecución del pipeline	Monitoreo y troubleshooting	Apoya	Ejecuta
Agente	Agente de referencia	Prepara	Importa y configura
Despliegue	Publicación del agente	Apoya	Ejecuta
Pruebas	Consultas en tiempo real	Facilita	Ejecuta

⸻

Componentes preconfigurados por IBM

Antes del bootcamp, IBM deberá dejar preparados los siguientes elementos:

1. Máquina virtual generadora de transacciones.
2. Generador de transacciones activo o listo para ser iniciado.
3. Clúster Beetech.
4. Tópico de entrada.
5. Schema Registry o Data Contract.
6. Cuenta de servicio y credenciales.
7. Permisos de lectura y escritura.
8. Demostración de Flink.
9. Proyecto de watsonx.data integration.
10. StreamSets Data Collector desplegado.
11. Pipeline 0 de referencia.
12. Conexión de referencia con Confluent.
13. Veinte tópicos de salida.
14. Agente 0 de referencia.
15. Copias o plantillas de agentes para los participantes.
16. Accesos a IBM Cloud y TechZone.
17. Tabla de asignación de participantes, tópicos, pipelines y agentes.

⸻

Convención recomendada para el laboratorio

Participante	Pipeline	Tópico de salida	Agente
0	Pipeline 0	Tópico 0	Agente 0
1	Pipeline 1	Tópico 1	Agente 1
2	Pipeline 2	Tópico 2	Agente 2
…	…	…	…
19	Pipeline 19	Tópico 19	Agente 19

⸻

Criterios de éxito del bootcamp

El laboratorio se considerará completado cuando cada participante logre:

1. Ingresar a todas las plataformas.
2. Identificar el tópico de entrada.
3. Consumir transacciones desde Confluent.
4. Procesar los eventos mediante StreamSets.
5. Calcular un indicador de fraude.
6. Publicar los resultados en su tópico asignado.
7. Importar y desplegar su agente.
8. Conectar el agente con los datos procesados.
9. Realizar consultas sobre las transacciones en tiempo real.
10. Obtener respuestas coherentes basadas en los resultados de su pipeline.