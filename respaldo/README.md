GCABA Establecimientos Educativos
=========================

DESCRIPCIÓN
-----------
Módulo que permite la búsqueda de establecimientos educativos, con 
opciones de descarga e impresión del listado de establecimientos, obtención de detalles sobre cada establecimiento e 
impresión de los detalles del mismo.

INSTALACIÓN
-----------
- Instalar el módulo
- Activarlo
- Insertar el siguiente bloque en el cuerpo del contenido donde se desea que 
se muestre el buscador: 

~~~
<?php 
$block = module_invoke('gcaba_establecimientos_educativos', 'block_view', 'viewEstablecimientosEducativos');  
print render($block['content']);
?>
~~~
NOTA: el **Formato de texto** debe ser "PHP Code".

ADMINISTRACIÓN
--------------
Desde el menú de adminstración del módulo se podrán configurar las siguientes variables:
- Url de API de Establecimientos       
- Url de mapas USIG

Para acceder al menú de admnistración ingresar al menú **Configuración** => 
bloque **GCABA Configurations** => **Establecimientos Educativos**, o directamente en:


~~~
admin/config/gcaba_configurations/gcaba_establecimientos_educativos/configuraciones
~~~
