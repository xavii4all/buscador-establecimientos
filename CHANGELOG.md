# Change Log

## [1.2.4-RC2] - 2019-04-12
- Agrega funcionalidad para que el título y la descripción de la página cambien cuando se entra al detalle de una escuela.

## [1.2.3-RC1] - 2019-02-14
- Se agregó la descripción en el meta para distintos elementos (link trello: https://trello.com/c/bKC5K0gL/942-meta-description-buscador-de-establecimientos-educativos)
- Se modificó la forma de acceder al detalle de cada establecimiento, ahora se accede mediante el href de los tags <a>, para permitir la apertura en distintas pestañas de cada establecimiento (link trello: https://trello.com/c/bKC5K0gL/942-meta-description-buscador-de-establecimientos-educativos)

## [1.2.2-RC1] - 2019-01-25
- Se realizaron modificaciones para que se actualicen el title y el link canonical de la página por cada establecimiento que se va consultando, para lograr el indexado de los buscadores.

## [1.2.1-RC1] - 2019-01-08
- Nueva funcionalidad de url dinámica para lograr correcto indexado por los buscadores

## [1.2.0-RC2] - 2018-12-17
- Se actualiza versión en archivo ".info"

## [1.2.0-RC1] - 2018-12-12
- Se reemplazó la librería del mapa de open layers por la de leaflet para mejorar la compatibilidad responsive con los dispositivos móviles.
- Ahora se muestran todos los resultados de la búsqueda (según los filtros aplicados) en el mapa, en lugar de hacerlo paginado. Manteniendo el paginado sólo para la solapa con los resultados en la tabla.
- El tooltip de cada establecimiento en el mapa ahora contiene un link que lleva al detalle del mismo 
- Mejoras varias en todo el módulo

## [1.1.1-RC1] - 2018-10-03
- Se quitó la posibilidad de buscar por "lugares" en el campo de búsqueda por cercanía dado que las coordenadas obtenidas eran incompatibles
- Al ejecutar una nueva búsqueda desde el detalle de un establecimiento, ya no se reinician los campos de busqueda y se vuelve a la pantalla anterior tal cual se había dejado

## [1.1.0-RC1] - 2018-10-02
- Fix bug que hacía que se reinicie la pagina al buscar establecimiento directo por id en url

## [1.0.4-RC1] - 2018-10-01
- Agregado de parámetro de búsqueda por dirección o cercanía
- Nueva solapa de mapa que presenta los establecimientos con sus coordenadas e información sobre el mismo
- Agregado de imágenes de cada establecimiento en la sección de detalles de cada uno según corresponda

## [1.0.3-RC1] - 2018-09-11
- Agregado de posibilidad de obtener detalle de un establecimiento mediante el id del mismo a través de la url como parámetro GET

## [1.0.2-RC1] - 2018-06-27
- Mejoramiento de selector jquery sobre label para el adjuntado de criterios de busqueda

## [1.0.1-RC1] - 2018-06-22
- agregado de preventDefault sobre boton de "realizar nueva busqueda" y sobre boton "buscar", que disparaban la recarga de la pagina en las nuevas versiones de drupal sobre homologacion y dev
- correccion estetica

## [1.0.0-RC1] - 2018-05-22
- Agregado de CUE+ANEXO en ficha del establecimiento, con el siguiente formato (ejemplo): 0200155-00.
- Corrección sobre mostrado de "títulos" y "orientaciones", no se mostraban todos los disponibles, se actualizó el parser para que contemple ambos casos.
- Búsqueda de establecimiento por coordenadas en lugar de usar el string de la dirección.

## [1.0.0] - 2018-05-08
- Alta inicial del módulo
