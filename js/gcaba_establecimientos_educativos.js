var $ = jQuery.noConflict();

var datos_establecimientos = {}, establecimientos_paginados, total_results;
let isMobile;
var html_coltit_resultados, html_col_mobile;

// Variables para utilizar la funcionalidad de obtener detalles de un establecimiento segun un id
var url_busqueda = window.location.search;
var flag_url_parametros = false;
var url_base_params = ['educacion','buscador-de-establecimientos-educativos'];
var title_orig, desc_orig, url_orig;

// ----------- variables MAPA USIG y ubicación ---------------- //
var mapa; // Dejamos global esta variable sobre la cual se creara el objeto del mapa usig, para poder resolver el problema de renderizado con el metodo updateSize().
var radio_metros = 1000;
var ubicacion    = {};
var coords_by_idest = {};
var icono_estatal;
var icono_privado;
let wgs84;
let origin;

var flag_usig_autocomplete_used = false;
var mensaje_error_ubicacion     = '<div id="error" class="alert alert-danger" style="display: none;"> Por favor ingrese una dirección con altura o cruce de calles </div>';
// ---------------------------------------------------------

// ------------ variables generales ------------------------ //
var limite_resultados       = 25; // Limite para resultados devueltos por cada pagina de la api al realizar busquedas
var limite_resultados_excel = 5000; // Limite para resultados devueltos por cada pagina de la api al realizar busquedas
var cant_paginas_paginacion = 9;
var info_paginacion         = {};
// -----------------------------------------------------------


// ----------------- ELEMENTOS HTML ------------- //
var elem_row_jornadas      ;
var elem_row_orientaciones ;
var elem_row_titulos       ;
var elem_row_all           ;

// Col
var elem_col_jornadas      ;
var elem_salas             ;

var div_head_contenido;
var div_imp_descargar;

var html_no_results = '<div id="resultados_warning" class="alert alert-warning" style="display: none;"> No se encontraron resultados para los criterios de búsqueda solicitados </div>';


// DIVS ID DE CRITERIOS DE BUSQUEDA PARA LA API
var id_gestion, id_ofertas, id_titulo, id_orientacion, id_jornada, id_sala,
    id_barrio, id_comuna, id_distrito_escolar, id_dependencia_funcional,
    id_tipo_establecimiento, id_palabra_clave, id_ubicacion, id_criterio_busqueda;
// ---------------------------------------------- //


// Para el excel de exportacion de datos
var wbout;

// ---------------------- JSONS --------------------------- //
// BARRIOS
var json_barrios  = [], json_tipo_est  = [];

var array_busqueda_api       = {};
// -------------------------------------------------------- //

// La siguiente funcion es equivalente y debería utilizarse en reemplazo del "$(document).ready", para que todo se ejecute como es esperado.
// Dado lo avanzado del modulo solo dejo asignado el scroll inicial al recargar la pagina
Drupal.behaviors.cargaInicial = {
    attach: function (context, settings) {
        // Code to be run on page load, and
        // on ajax load added here

        title_orig = $("meta[property=og\\:title]").attr('content');
        url_orig   = $("link[rel=canonical]").attr('href');
        desc_orig  = $("meta[name=description]").attr('content');

        div_head_contenido = $(".pane-gcaba-static-blocks-custom-node-title");
        div_imp_descargar  = $(".imprimir_descargar");

        // Chequeamos si existe una busqueda directa por id de establecimiento
        urlParamsCheck();



        // Agregamos la lupa de búsqueda para el input de búsqueda por cercanía
        $("#ubicacion_id").closest('.form-item-ubicacion').addClass('has-button');
        $("#ubicacion_id").closest('.form-item-ubicacion').append('<button class="btn"><span class="glyphicon glyphicon-search"></span></button>');


        icono_estatal = location.origin+'/'+Drupal.settings.gcaba_establecimientos_educativos.icono_estatal;
        icono_privado = location.origin+'/'+Drupal.settings.gcaba_establecimientos_educativos.icono_privado;


        // Preparamos el uso de la libreria proj4 para poder hacer uso de la conversión de coordenadas
        proj4.defs([
                    ['EPSG:221951', '+proj=tmerc +lat_0=-34.629269 +lon_0=-58.463300 +k=0.999998 +x_0=100000 +y_0=100000 +ellps=intl +units=m +no_defs'],
                    ['EPSG:7433', '+proj=tmerc +lat_0=-34.629269 +lon_0=-58.463300 +k=0.999998 +x_0=100000 +y_0=100000 +ellps=intl +units=m +no_defs'],
                    ['EPSG:97433', '+proj=tmerc +lat_0=-34.629269 +lon_0=-58.463300 +k=0.999998 +x_0=100000 +y_0=100085 +ellps=intl +units=m +no_defs']
        ]);

        wgs84  = "WGS84";
        origin = proj4("EPSG:7433");
        // ------------------------------------------------------------------------------------------


        // Chequeamos si se navega desde un dispositivo móbil
        isMobile = (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test((navigator.userAgent || '').toLowerCase())) || (/Mobi/i.test((navigator.userAgent || '').toLowerCase()));

        // Guardamos el html original de la tabla de resultados
        html_coltit_resultados = $("#tabla_resultados tr").html();
        html_col_mobile = '<th class="col-md-6">Tipo de establecimiento</th><th class="col-md-6">Nombre</th>';


        urlFriendlyParamsCheck();

        listenerPopState();
    }
};


/**
 * Funcionalidad para poder buscar detalles de un establecimiento directamente por URL
 * Comprobamos si existen parámetros de búsqueda por GET
 */
function urlParamsCheck(){
    if ( url_busqueda !== undefined && url_busqueda != '' ){

        var parametros_establecimiento = url_busqueda.substring(url_busqueda.indexOf('?')+1).split('=');

        // Si el parámetro es el esperado, realizamos la búsqueda, caso contrario, redireccionamos al sitio base
        if( parametros_establecimiento[0] === 'establecimiento_id' && !isNaN(parametros_establecimiento[1]) ){
            var id_establecimiento = parametros_establecimiento[1];

            flag_url_parametros = true;

            mostrarDetalleEstablecimiento(id_establecimiento);
        }
        else{ location.href= window.location.origin+window.location.pathname; }
    }
    // Si no hay parametros GET, mostramos el contenedor con el buscador original
    else{ $('#busqueda_alumno').removeClass('hidden'); flag_url_parametros = false; }
}

/**
 * Este método intenta obtener los detalles de un establecimiento según el nombre del mismo, suministrado en la url, ej: /buscador-de-establecimientos-educativos/MARIANO_MORENO
 * En caso de existir devuelve el detalle del establecimiento, caso contrario, se muestra un mensaje debajo del buscador
 */
function urlFriendlyParamsCheck(parametros){
    var parametros = parametros === null || parametros === undefined ? Drupal.settings.gcaba_establecimientos_educativos.php_parametros_get : parametros;

    if( parametros !== null ){

        var establecimiento_nombre = pathFilter(parametros,url_base_params, false)[0];

        array_busqueda_api['palabra_clave'] = decodeURI(establecimiento_nombre).replace(/-/g, ' ');

        // Primero obtenemos los establecimientos segun el campo "palabra_clave"
        let resultado_get_establecimientos = obtenerEstablecimientosByParametros(array_busqueda_api);

        resultado_get_establecimientos.done(function(data, textStatus, jqXHR){
            var est_encontrado = false;

            console.log(jqXHR);

            if( jqXHR.status === 200 && typeof data.data === 'object' ) {
                $.each(data.data, function (i, est) {

                    // Filtramos los resultados buscando exclusivamente por el nombre del establecimiento, e intentamos obtener los datos y mostrar el detalle
                    if (array_busqueda_api['palabra_clave'].toLowerCase() === est.establecimiento_nombre.toLowerCase()) {
                        mostrarDetalleEstablecimiento(est.establecimiento_id);

                        est_encontrado = true;
                        return false;
                    }
                });
            }

            // Si llegamos a este punto, es porque no existe el establecimiento buscado
            if(!est_encontrado){ mostrarMensajeNoResults(); }
        });
    }
}


$(document).ready(function($) {
    id_gestion               = "#"+Drupal.settings.gcaba_establecimientos_educativos.id_gestion;
    id_ofertas               = "#"+Drupal.settings.gcaba_establecimientos_educativos.id_ofertas;
    id_titulo                = "#"+Drupal.settings.gcaba_establecimientos_educativos.id_titulo;
    id_orientacion           = "#"+Drupal.settings.gcaba_establecimientos_educativos.id_orientacion;
    id_jornada               = "#"+Drupal.settings.gcaba_establecimientos_educativos.id_jornada;
    id_sala                  = "#"+Drupal.settings.gcaba_establecimientos_educativos.id_sala;
    id_barrio                = "#"+Drupal.settings.gcaba_establecimientos_educativos.id_barrio;
    id_comuna                = "#"+Drupal.settings.gcaba_establecimientos_educativos.id_comuna;
    id_distrito_escolar      = "#"+Drupal.settings.gcaba_establecimientos_educativos.id_distrito_escolar;
    id_dependencia_funcional = "#"+Drupal.settings.gcaba_establecimientos_educativos.id_dependencia_funcional;
    id_tipo_establecimiento  = "#"+Drupal.settings.gcaba_establecimientos_educativos.id_tipo_establecimiento;
    id_palabra_clave         = "#"+Drupal.settings.gcaba_establecimientos_educativos.id_palabra_clave;
    id_ubicacion             = "#"+Drupal.settings.gcaba_establecimientos_educativos.id_ubicacion;
    id_criterio_busqueda     = "#"+Drupal.settings.gcaba_establecimientos_educativos.id_criterio_busqueda;

    // Dividimos en 3 columnas dentro de una fila a los radios de "gestion"
    $("#edit-radios .radio").toggleClass('col-md-4', true);
    $("#criterio_busqueda_id .radio").toggleClass('col-md-6', true)

    // Corrección de estilos sobre los radio button
    $(id_gestion+" .form-item-gestion").addClass('col-md-4');

    // Rows
    elem_row_jornadas      = $(id_jornada).closest('.row');
    elem_row_orientaciones = $(id_orientacion).closest('.row');
    elem_row_titulos       = $(id_titulo).closest('.row');
    elem_row_all           = $([elem_row_orientaciones, elem_row_jornadas, elem_row_titulos]);

    // Cols
    elem_col_jornadas = $(id_jornada).closest('[class^="col-md-"]');
    elem_salas        = $(id_sala).closest('[class^="col-md-"]');


    // OCULTAMOS TODOS LOS ELEMENTOS QUE NO VAN POR DEFECTO
    elem_row_all.each(function () { $(this).hide(); });
    elem_salas.hide();
    $("#resultados").hide();
    $("#busqueda_escuela").hide();
    $("#final .row").hide('fast');


    // -------------- FUNCIONALIDAD SOBRE COMBOS (on-change) --------------- //
    var combo_barrios       = $(id_barrio);
    var combo_comuna        = $(id_comuna);
    var combo_dep_funcional = $(id_dependencia_funcional);
    var combo_tipo_est      = $(id_tipo_establecimiento);

    var flag_chosen_comuna = false;

    $("#busqueda_alumno select").change(function () {

        switch ("#"+$(this).attr('id')) {
            case id_ofertas:
                // MOSTRAMOS LAS FILAS SEGUN LA OFERTA SELECCIONADA
                mostrarFilas({"elem_actual": $(this), "elem_salas": elem_salas});
                break;

            // - COMBO BARRIOS => Al cambiar, setear el combo de comuna con su correspondiente
            case id_barrio:
                [, comuna] = combo_barrios.val().split('_');
                if( !flag_chosen_comuna ){ combo_comuna.val(comuna).trigger('chosen:updated'); }

                break;

            // - COMBO COMUNA   => Al cambiar, setear el combo de BARRIOS sólo con los barrios asociados a la misma
            case id_comuna:

                flag_chosen_comuna = (combo_comuna.val() != 0) ? true : false;

                // Si no existe, armamos el json de barrios en base al combo HTML actual
                if ( json_barrios.length === 0 ){ crearJSONbarriosFromHTML(combo_barrios); }


                // Filtramos los barrios para quedarnos sólo con los correspondientes a la comuna seleccionada
                var json_to_combo = ( combo_comuna.val() != 0 ) ? filtrarJSON('comunaId',combo_comuna.val(), json_barrios) : json_barrios;

                var str_barrios = ( combo_comuna.val() != 0 ) ? '<option value="0"> Todos </option>' : '';
                json_to_combo.forEach(function(data_combo){
                    if ( data_combo.comunaId === '0' ){
                        str_barrios += '<option value="0"> '+data_combo.nombre+' </option>';
                    }
                    else{
                        str_barrios += '<option value="'+data_combo.id+'_'+data_combo.comunaId+'"> '+data_combo.nombre+' </option>';
                    }
                });

                combo_barrios.html(str_barrios).trigger('chosen:updated');
                break;

            // - COMBO TIPO ESTABLECIMIENTO  => Al cambiar, setear el combo de DEPENDENCIA FUNCIONAL con su correspondiente
            case id_tipo_establecimiento:
                if ( combo_tipo_est.val() !== '0' ){
                    [, dep_func_id] = combo_tipo_est.val().split('_');
                }
                else{ dep_func_id = 0; }


                combo_dep_funcional.val(dep_func_id).trigger('chosen:updated');
                break;

            // - COMBO DEPENDENCIA FUNCIONAL => Al cambiar, setear el combo de TIPO DE ESTABLECIMIENTO sólo con los asociados a su dependencia
            case id_dependencia_funcional:

                // Si no existe, armamos el json de TIPOS DE ESTABLECIMIENTOS en base al combo HTML actual
                if ( json_tipo_est.length === 0 ){ crearJSONtipoEstablecimientoFromHTML(combo_tipo_est); }


                // Filtramos los barrios para quedarnos sólo con los correspondientes a la comuna seleccionada
                var json_to_combo = ( combo_dep_funcional.val() != 0 ) ? filtrarJSON('dependenciaFuncionalId',combo_dep_funcional.val(), json_tipo_est) : json_tipo_est;

                var str_tipo_est = ( combo_dep_funcional.val() != 0 ) ? '<option value="0"> Desconozco </option>' : '';

                json_to_combo.forEach(function(data_combo){
                    if ( data_combo.dependenciaFuncionalId === '0' ){
                        str_tipo_est += '<option value="0"> '+data_combo.nombre+' </option>';
                    }
                    else{
                        str_tipo_est += '<option value="'+data_combo.id+'_'+data_combo.dependenciaFuncionalId+'"> '+data_combo.nombre+' </option>';
                    }
                });

                combo_tipo_est.html(str_tipo_est).trigger('chosen:updated');

                break

            case id_criterio_busqueda:

                if( $(this).val() == 0 ){
                    $(id_barrio).closest('.row').show('fast');
                    $(id_ubicacion).closest('.row').hide('fast');
                }
                else{
                    $(id_ubicacion).closest('.row').show('fast');
                    $(id_barrio).closest('.row').hide('fast');
                }

                break;
        }
    });

    $("#criterio_busqueda_id :radio").change(function(){
        if( $(this).val() == 0 ){
            $(id_barrio).closest('.row').show('fast');
            $(id_ubicacion).closest('.row').hide('fast');
            $(id_ubicacion).val('');
        }
        else{
            // HACER FOCUS EN EL INPUT DE CERCANIA
            $(id_ubicacion).closest('.row').show('fast');
            $(id_barrio).closest('.row').hide('fast');
            $(id_ubicacion).focus();
        }
    });

    // --------------------------------------------------------------------- //


    // ---------------------- BOTONES ----------------- //
    // Mostramos el panel de resultados de busqueda
    $("#edit-buscar").click(function (e) {
        e.preventDefault();

        $("#busqueda_escuela").hide('fast');
        ejecutar_busqueda();
    });


    // IMPRIMIR
    $(".boton.imprimir button").click(function (event) {
        var est_visible =$("#busqueda_escuela").is(":visible"); // Chequeo si esta visible la seccion de detalle de establecimiento

        event.preventDefault(); // Para evitar la recarga de la pagina por tratarse de un tag "<button>"

        // Ocultamos el titulo principal para dejar como único titulo el de la seccion.
        $(".pane-gcaba-static-blocks-custom-node-title").toggleClass('ocultar_titulo', est_visible);

        // Clonamos el body para un mejor manejo de estilos para la vista de impresion
        clonarVistaImpresionTablaResultados(function(){ loadPrint(function(){ restituirVistaBodyOriginal('tabla_resultados'); hacerScroll(div_imp_descargar, 39); }); });
    });

    // NUEVA BUSQUEDA
    listenerNuevaBusqueda();

    listenerBotonesResultadosEstablecimientos();

    listenerAutocompleteUsig();

    listenerSearchUbicacionButton();
    // ---------------------------------------------------- //

    // LISTENER SOBRE TECLA "ENTER"
    $("input").keypress(function(e){
        var k = e.keyCode || e.which;

        // Si se presiona enter
        if (k == 13) {
            e.preventDefault();
            if( $(this).attr('id') === $(id_palabra_clave).attr('id') ) {
                $("#edit-buscar").click();
            }
        }
    });

    // Este fix fue agregado para poder visualizar el boton de "Ejecutar nueva busqueda" para los casos en los que se carga el detalle de un establecimiento directamente por id en la URL
    if(flag_url_parametros){ setTimeout(function(){ $(".final").show(); }, 300); }
});

// LISTENERS
function listenerNuevaBusqueda(){
    $(".nueva_busqueda").click(function (event) {
        event.preventDefault();
        // Verificamos si existen parámetros GET en la URL para hacer un redirect
        if( flag_url_parametros ){
            var url_actual = window.location;
            url_actual.replace(url_actual.origin+url_actual.pathname);
        }
        else{
            hacerScroll($("header .container").eq(1), 0);

            destruirMapa();

            // Mostramos y ocultamos
            $("#busqueda_escuela").hide('fast', function(){ $(this).html(''); });
            $("#busqueda_alumno").show('fast');
            $("#final .row").hide('fast');


            dibujarMapaResultadosPorPagina(datos_establecimientos, function(){

                // Lo siguiente es para asegurarse que se renderice y centre bien el mapa según los markeres
                var boton_activo = $("[id^=boton_].boton_activo");

                if ($(boton_activo).attr('id') === 'boton_mapa') {
                    $("#boton_lista").click();
                    setTimeout(function(){  $(boton_activo).click();    }, 300);
                }
            });


            var str_path = buildDynamicPath(pathFilter(url_base_params,url_base_params, true));

            history.pushState(null, null, location.origin+str_path);

            updateSEOcontext(title_orig);

            $('h1').html(title_orig);
            $('h2').html(desc_orig);


        }

        hacerScroll($(".pane-content").eq(0), 20);
    });
}

function listenerDescargar(){
    // DESCARGAR
    var boton_descargar = $(".boton.descargar");

    if( typeof boton_descargar.attr('disabled') !== undefined ){

        $(".boton.descargar button:not('.disabled')").on('click', function (event) {
            event.preventDefault(); // Para evitar la recarga de la pagina por tratarse de un tag "<button>"

            hacerScroll(div_head_contenido, 25);

            setTimeout(function () {
                $("#busqueda_alumno").hide('fast');
                $("#busqueda_escuela").hide('fast');
                $("#final, #final .row").show('fast');
            }, 300);

            // Funcionalidad para exportar a excel
            prepararExcel(array_busqueda_api);
        });
    }
}

/**
 * Funcionalidad sobre los botones de "Mapa" y "Lista" de la tabla de resultados de establecimientos
 */
function listenerBotonesResultadosEstablecimientos(){
    $("[id^=boton_]").on('click', function(){

        if( !$(this).hasClass('boton_activo') ){
            $(this).addClass('boton_activo');

            if( $(this).attr('id') === 'boton_lista' ){

                $(".imprimir_descargar").show('fast');
                $("#boton_mapa").removeClass('boton_activo');
                // Mostramos la lista de establecimientos y ocultamos el mapa
                $("#resultados_mapa").closest('.area_impresion').hide('fast');
                $("#tabla_resultados").closest('.area_impresion').show('fast');

                $(".pagination").show('fast');
            }
            else{
                $(".imprimir_descargar").hide('fast');
                $("#boton_lista").removeClass('boton_activo');


                // Ocultamos la tabla con la lista y mostramos el mapa
                $("#tabla_resultados").closest('.area_impresion').hide('fast');
                // Al finalizar el mostrado del mapa ejecutamos el callback para renderizar correctamente el mapa y ajustar el zoom
                $("#resultados_mapa").closest('.area_impresion').show('fast', function() {  centrarMarkers();   });
                $(".pagination").hide('fast');
            }
        }
    } );
}

/**
 * Autocompleter de direcciones de USIG, una vez seleccionada la direccion dentro de las sugerencias,
 * se establecen las coordenadas x e y más el radio en metros para obtener establecimientos basados en la ubicación suministrada
 */
function listenerAutocompleteUsig(){
    auto = new usig.AutoCompleter($(id_ubicacion).attr('id'), {
        afterGeoCoding: function(data){
            ubicacion.x_Usuario = data.x; ubicacion.y_Usuario = data.y; ubicacion.r_Usuario = radio_metros;

            // Chequeamos el formato de las coordenadas, si son negativas corresponden al formato "lonlat", que sería el caso de direcciones del tipo "lugares" dentro del componente de USIG
            // Ej: "Parque Lezama"
            if(data.x < 0 || data.y < 0){
                var data_coords = Coords.toGkba({x: parseFloat(data.x), y: parseFloat(data.y)});
                ubicacion.x_Usuario = data_coords.x;
                ubicacion.y_Usuario = data_coords.y;
            }
        },
        afterSelection: function(data){
            // Esto se dispara una vez que se selecciona una dirección de la lista
            flag_usig_autocomplete_used = true;
        },
        onInputChange:function(){
            // Esto se dispara una vez que se modifica cualquier caracter del input
            flag_usig_autocomplete_used = false;
        },
    });

    // Removemos la posibilidad de que el usuario elija lugares en lugar de direcciones
    // auto.removeSuggester('Lugares');
}

function listenerSearchUbicacionButton(){
    $(id_ubicacion).closest('.form-item-ubicacion').find('.btn').click(function(e){
        e.preventDefault();

        if( $(id_ubicacion).val() !== '' ){     ejecutar_busqueda();    }
    });
}

/**
 * Listener para capturar el evento disparado por los botones atras y adelante del navegador
 */
function listenerPopState(){
    window.addEventListener('popstate', e => {
        var path = getRelativePath();

        // Intentamos volver a obtener los detalles del establecimiento anterior en el historial
        if( path.length > 1 ){
            urlFriendlyParamsCheck(path); // Aplicamos decodeURI para que no se rompan los caracteres UTF-8
        }
        else{ location.reload(); }
    });
}

/**
 * Método que devuelve un string con la ruta relativa de establecimientos educativos, removiendo todo lo anterior.
 * Ej: ruta original: http://buenosaires.local/buscador-de-establecimientos-educativos/mariano_moreno
 *     ruta devuelta: buscador-de-establecimientos-educativos/mariano_moreno
 */
function getRelativePath(){
    var path = location.pathname;
    // path = path.substring(path.search('buscador-de-establecimientos-educativos'));

    path = path.split('/');

    return path.filter(e => e);
}

function buildDynamicPath(path){
    var str_path  = '';
    $.each(path, (i, aux) => { str_path += '/'+aux; } );

    return str_path;
}

/**
 * Método que filtra un array de origen, para filtrar usando como eje el array de path validos.
 * @param path_origen
 * @param path_validos
 * @param incluir
 * @returns {*}
 */
function pathFilter(path_origen, path_validos, incluir){
    // Armamos la ruta relativa limpia
    var array_path        = path_origen.filter( e => (path_validos.indexOf(e) != -1) === incluir ); // Filtramos las rutas que no son el módulo ni el og o area de correspondencia

    return array_path;
}

// ------------- FUNCIONALIDAD SOBRE MOSTRADO DE FILTROS DE BUSQUEDA ------- //
function mostrarFilas(elementos){
    elem_row_all.each(function(){ $(this).hide('fast'); });

    switch( elementos.elem_actual.val() ){

        case '100': $(id_criterio_busqueda).closest('.row').show(); $("#edit-criterio-busqueda-0").click();
        case '101':
            // Agregamos la columna de salas dentro de la fila de jornadas, actualizando las clases
            elem_col_jornadas.toggleClass('col-md-12', false).toggleClass('col-md-6', true);

            elem_row_jornadas.show('fast');
            elementos.elem_salas.show('fast');
            $(id_criterio_busqueda).closest('.row').show();
            $("#edit-criterio-busqueda-0").click();
            break;

        case '105':
            elem_col_jornadas.toggleClass('col-md-12', true).toggleClass('col-md-6', false);

            elem_row_jornadas.show('fast');
            elementos.elem_salas.hide('fast');
            $(id_criterio_busqueda).closest('.row').show();
            $("#edit-criterio-busqueda-0").click();

            break;

        case '111':
            elem_row_orientaciones.show('fast');
            $(id_barrio+", "+id_dependencia_funcional).closest('.row').show('fast');
            $(id_criterio_busqueda+", "+id_ubicacion).closest('.row').hide('fast');
            $(id_ubicacion).val('');
            break;

        case '115':
            elem_row_titulos.show('fast');
            $(id_barrio+", "+id_dependencia_funcional).closest('.row').show('fast');
            $(id_criterio_busqueda+", "+id_ubicacion).closest('.row').hide('fast');
            $(id_ubicacion).val('');
            break;

        default: $(id_barrio+", "+id_dependencia_funcional).closest('.row').show('fast');
                 $(id_criterio_busqueda+", "+id_ubicacion).closest('.row').hide('fast');
                 $(id_ubicacion).val('');
    }
}

function filtrarJSON(campo_filtrar, valor_filtrar, json){
    return json.filter(function(i){
        if ( i[campo_filtrar] !== undefined ){
            return i[campo_filtrar].trim() == valor_filtrar.trim();
        }
    });
}

function crearJSONbarriosFromHTML(combo_barrios){
    combo_barrios.find('option').each(function(){
        var barrio, comuna;

        if ( $(this).val() != '0' ){
            [barrio, comuna] = $(this).val().split('_');
        }
        else{ barrio = comuna = '0'; }

        json_barrios.push({
            id:       barrio,
            nombre:   $(this).html(),
            comunaId: comuna
        });
    });
}

function crearJSONtipoEstablecimientoFromHTML(combo_tipo_est){
    combo_tipo_est.find('option').each(function(){
        var tipo_est_id, dep_func_id;

        if ( $(this).val() != '0' ){
            [tipo_est_id, dep_func_id] = $(this).val().split('_');
        }
        else{ tipo_est_id = dep_func_id = '0'; }


        json_tipo_est.push({
            id:                     tipo_est_id,
            nombre:                 $(this).html(),
            dependenciaFuncionalId: dep_func_id
        });
    });
}
// ------------------------------------------------------------------------- //

/**
 * Metodo que ejecuta la busqueda llamando a los webservices correspondientes segun el criterio de busqueda seleccionado
 */
function ejecutar_busqueda() {

    // La idea es disparar la búsqueda sólo si se seleccionó una dirección de la lista de usig y además contiene un cruce de calles o una altura
    if( $(id_ubicacion).val() != '' && (!flag_usig_autocomplete_used || ubicacion.x_Usuario === null || ubicacion.y_Usuario === null || ubicacion.x_Usuario === undefined || ubicacion.y_Usuario === undefined) ){
        if( !$("#busqueda_alumno #error").length ){
            $(id_ubicacion).closest('.row').after(mensaje_error_ubicacion);
        }

        $("#resultados").hide();
        $("#busqueda_alumno #error").fadeIn('slow');
        return false;
    }
    else{   $("#busqueda_alumno #error").fadeOut('slow');   }


    var ult_busqueda_api = array_busqueda_api; array_busqueda_api = {};

    // AGRUPAMOS LOS ELEMENTOS SELECT Y LOS CHOSEN CONTAINER (SELECT) QUE GENERA DRUPAL
    var all_select = [];
    $(".criterio .chosen-container:visible").prev('select:not(id_ofertas)').each(function () {
        all_select.push($(this));
    });
    $(".criterio select:visible").each(function () {
        all_select.push($(this));
    });


    // Por cada combo vamos filtrando los json_establecimientos
    $(".criterio input:radio").each(function () {
        var gestion_val = $(this).val();

        if ($(this).prop('checked') && gestion_val !== '3') {
            array_busqueda_api['gestion_id'] = gestion_val;
        }
        // else{ delete array_busqueda_api.gestion_id; }
    });

    // Acciones específicas para obtener el valor de algunos combos
    $.each(all_select, function (i) {
        var id_filtro = $(this).attr('id');
        var valor_filtro = $(this).val();

        if (valor_filtro !== '0') {
            switch (id_filtro) {
                case 'tipo_establecimiento_id':
                case 'barrio_id'             :
                    [valor_filtro] = valor_filtro.split('_');
                    break;
            }

            // Agregamos el campo-valor al array de busqueda segun filtros
            array_busqueda_api[id_filtro] = valor_filtro;
        }
    });

    var input_palabra_clave = $(id_palabra_clave).val().trim();
    var input_ubicacion     = $(id_ubicacion).val().trim();
    (input_palabra_clave.length > 0) ? array_busqueda_api['palabra_clave'] = input_palabra_clave : '';

    if (input_ubicacion.length > 0){
        array_busqueda_api['x_Usuario'] = ubicacion.x_Usuario;
        array_busqueda_api['y_Usuario'] = ubicacion.y_Usuario;
        array_busqueda_api['r_Usuario'] = ubicacion.r_Usuario;
    }


    array_busqueda_api['page']  = 1; // Arrancamos con la 1er pagina de resultados
    array_busqueda_api['limit'] = 5000;


    // ----------------- VERIFICAMOS SI LA BUSQUEDA ES DIFERENTE A LA ANTERIOR ----------- //
    var search_ref, search_des, cant_bus_actual = Object.keys(array_busqueda_api).length, cant_bus_anterior = Object.keys(ult_busqueda_api).length;
    (cant_bus_actual > cant_bus_anterior) ? (
                                                search_ref = array_busqueda_api,
                                                search_des = ult_busqueda_api
                                            ) :
                                            (
                                                search_ref = ult_busqueda_api,
                                                search_des = array_busqueda_api
                                            );

    var nueva_request = false;
    $.each(search_ref, function(campo, val){
        if( search_des[campo] === undefined || search_des[campo] !== val ){
            nueva_request = true;
            return false;
        }
    });

    // SI NO HAY QUE EJECUTAR UNA NUEVA REQUEST, NO CONTINUAMOS CON LA EJECUCIÓN DEL CÓDIGO
    if( !nueva_request ){   return false;   }
    // ------------------------------------------------------------------------------------- //


    total_results   = [];
    coords_by_idest = {}; // Inicializamos el objeto que contendrá los pares de coordenadas en formato lat-long de cada establecimiento por su id

    // ------------------- OBTENCION DE ESTABLECIMIENTOS ------------------ //
    function realizarBusquedaYmostrarResultados(){
        $("#myModal h3").html("Buscando establecimientos, por favor espere...");
        $("#myModal").modal("show");
        $("#resultados").hide('fast');

        // Realizamos la busqueda en la api segun cada parametro solicitado
        var resultado_get_establecimientos = obtenerEstablecimientosByParametros(array_busqueda_api);

        // Una vez finalizado el ajax, ejecutamos el callback
        resultado_get_establecimientos.done(function(data, textStatus, jqXHR){

            // Si la API responde distinto de 200 mostramos un mensaje de alerta
            if( jqXHR.status != 200 || typeof data.data !== 'object' ){

                setTimeout(function(){
                    $("#myModal").modal("hide");
                    $("#resultados").hide();
                    mostrarMensajeNoResults();

                }, 1500);

                return false;
            }
            // Si existen datos, proseguimos con el mostrado de los mismos
            else{

                var criterios_busqueda    = {};

                criterios_busqueda.all_select          = all_select;
                criterios_busqueda.cantidad_resultados = 0;
                criterios_busqueda.palabras_clave      = input_palabra_clave;
                criterios_busqueda.ubicacion           = input_ubicacion;


                datos_establecimientos = total_results;

                criterios_busqueda.cantidad_resultados = data.pagination.count;

                // Agregamos todos los establecimientos a un mismo arreglo
                $.each(data.data, function(){   total_results.push(this);   });


                // Vamos realizando las request hasta que se hayan solicitado el total de páginas de la búsqueda (por eso la recursividad del método)
                if( data.pagination.page < data.pagination.pages ){
                    // if( data.pagination.page < 3 ){
                    array_busqueda_api.page  = ++data.pagination.page;

                    return realizarBusquedaYmostrarResultados();
                }

                datos_establecimientos.response_status = jqXHR.status;



                $("#busqueda_alumno #resultados_warning").fadeOut('slow');

                // Adjuntamos los criterios de búsqueda realizados al html
                adjuntarCriteriosBusqueda(criterios_busqueda);


                // ------------- ARMADO DE ARRAYS MAPA Y LISTADO ------------- //
                establecimientos_paginados = armarArrayListado(total_results);

                // Para el array del listado, pasamos la 1er pagina como indice inicial a mostrar ("establecimientos_paginados[1]")
                var establecimientos_obj = { array_mapa: total_results, array_listado: establecimientos_paginados[1] };
                // ----------------------------------------------------------- //


                // Populamos con HTML el mapa y la tabla de resultados de establecimientos por página
                dibujarSectorResultadosEstablecimientos(establecimientos_obj, function(){
                    $("#myModal").modal("hide");

                    $("#resultados").show('fast');
                    $("#boton_lista").click();

                    hacerScroll($("#edit-resultados .row").eq(0), 5);
                });


                actualizarDatosPaginacionSinRequest(data.pagination);


                // Si no tengo datos, inhabilitamos el boton de "Descargar"
                var flag_existencia_datos = Object.keys(datos_establecimientos).length > 0;

                if( !flag_existencia_datos ){ $("#edit-descargar").attr('disabled', 'disabled'); }
                else                        { $("#edit-descargar").removeAttr('disabled'); }

                $(".boton.descargar").toggleClass('disabled', !flag_existencia_datos);


                listenerDescargar();


                // ACCESO A LINK DE DETALLES DE CADA ESTABLECIMIENTO
                // $("#resultados table a").click(function(){  mostrarDetalleEstablecimiento($(this).closest('tr').find('input').val())} );
            }

        });
        // ------------------------------------------------------------------- //


        // Si sucede algun problema es capturado aca
        resultado_get_establecimientos.fail(function(a){ console.log(a); });
    }

    realizarBusquedaYmostrarResultados();
}

function mostrarMensajeNoResults(){
    if( !$("#busqueda_alumno #resultados_warning").length ){    $("#edit-buscar").closest('.row').after(html_no_results);   }
    $("#busqueda_alumno #resultados_warning").fadeIn('slow');
}

/**
 * Método que arma un array de resultados paginado, cuyo índice representa cada página de n cantidad de resultados.
 * La variable "limite_resultados" determina la cantidad de establecimientos a visualizar por cada página
 * @param total_results
 * @returns {Array}
 */
function armarArrayListado(total_results){
    var nro_fila            = 1;
    var pagina              = 1;
    var est_for_lista       = [];

    for( var i in total_results ){

        if( isNaN(parseFloat(i)) ){ continue; }

        if( nro_fila > limite_resultados ){
            nro_fila = 1;
            ++pagina;
        }

        if( est_for_lista[pagina] === undefined ){ est_for_lista[pagina] = []; }
        if( typeof(total_results[i]) === "object" ){ est_for_lista[pagina].push( Object.assign(total_results[i]) ); }

        ++nro_fila;
    }

    return est_for_lista;
}


// OBTENCION DE ESTABLECIMIENTOS POR AJAX A LA API
function obtenerEstablecimientosByParametros(parametros){
    var url_api_establecimientos = Drupal.settings.gcaba_establecimientos_educativos.php_url_api_establecimientos+'/establecimientos?'; // Obtenemos el valor de la variable estática;

    for( var campos = Object.keys(parametros), i = 0, end = campos.length-1; i <= end; i++ ){
        var parametro_busqueda = '';
        var campo              = campos[i], valor = parametros[campo];

        parametro_busqueda = (i < end) ? campo+'='+valor+'&' : campo+'='+valor;

        url_api_establecimientos += parametro_busqueda;
    }

    return $.ajax({type: 'GET', url : url_api_establecimientos});
}

function obtenerEstablecimientoDetalleById(establecimiento_id){
    var url_api_establecimientos = Drupal.settings.gcaba_establecimientos_educativos.php_url_api_establecimientos+'/establecimientos/'+establecimiento_id; // Obtenemos el valor de la variable estática;

    return $.ajax({type: 'GET', url : url_api_establecimientos,});
}



/**
 * Metodo que obtiene los datos de un establecimiento y luego muestra la pantalla con los detalles del mismo
 */
function mostrarDetalleEstablecimiento(establecimiento_id){
    var resultado_get_establecimiento_detalle = obtenerEstablecimientoDetalleById(establecimiento_id);

    // Ocultamos la vista de filtro y resultados generales y mostramos la vista de detalle
    setTimeout(function () {
        $("#busqueda_alumno").fadeOut(500);
        $("#busqueda_escuela").hide().fadeIn(1500);
    }, 20);

    // Una vez obtenidos los detalles del establecimiento, dibujamos el HTML
    resultado_get_establecimiento_detalle.done(function(data){
        var detalle_establecimiento = data.data[0];
        let est_nombre = detalle_establecimiento.establecimiento_nombre.replace(/ /g,'-');
        var path = buildDynamicPath(pathFilter(url_base_params,url_base_params, true))+'/'+est_nombre.toLowerCase();

        history.pushState(null, null, path);

        updateSEOcontext(est_nombre);

        dibujarDetalleEstablecimientoHTML(detalle_establecimiento, function(){ hacerScroll(div_head_contenido, 5); });
    });
}

function updateSEOcontext(new_title){
    var site_name         = $("meta[property=og\\:site_name]").attr('content');
    var texto_description = (new_title !== title_orig) ? `Conocé toda la información sobre ${new_title.replace(/-/g, " ")}, imprimila o realizá una nueva búsqueda.` : desc_orig;

    $("meta[property=og\\:title]").attr('content', new_title);
    document.title = new_title+' | '+site_name;

    var canonical = (new_title.toLowerCase().indexOf('establecimientos educativos') != (-1)) ? url_orig : url_orig+'/'+new_title;
    $("link[rel=canonical]").attr('href', canonical);

    $("meta[name=description], meta[property=og\\:description], meta[name=twitter\\:description]").attr('content', texto_description);
}

function doMap(arr) {
    var output = arr.map(function(d) {
        var ob = {};

        if (d.sub){ d.sub = doMap(d.sub); }

        ob[d.oferta_nombre][d.sala_nombre][d.jornada_nombre] = d;
        return ob;
    });
    return output;
};

function actualizarDatosPaginacion(data_paginacion){
    info_paginacion = data_paginacion;

    $('.pagination').pagination({
        items: data_paginacion.pages,
        itemOnPage: 3,
        displayedPages: cant_paginas_paginacion-3,
        currentPage: data_paginacion.page,
        prevText: '<span class="glyphicon glyphicon-chevron-left"  aria-hidden="true"></span>',
        nextText: '<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>',
        // onInit: function () {/* fire first page loading*/},
        onPageClick: function (page, evt) {

            // ------------------- OBTENCION DE ESTABLECIMIENTOS ------------------ //
            array_busqueda_api['page'] = page;

            // Realizamos la busqueda en la api segun cada parametro solicitado
            var resultado_get_establecimientos = obtenerEstablecimientosByParametros(array_busqueda_api);

            // Una vez finalizado el ajax, ejecutamos el callback
            resultado_get_establecimientos.done(function(data, textStatus, jqXHR){
                datos_establecimientos = data.data;

                datos_establecimientos.response_status = jqXHR.status;

                // Populamos con HTML el mapa y la tabla de resultados de establecimientos por página
                dibujarSectorResultadosEstablecimientos(datos_establecimientos);

                // ACCESO A LINK DE DETALLES DE CADA ESTABLECIMIENTO
                $("#resultados table a").click(function(){  mostrarDetalleEstablecimiento($(this).closest('tr').find('input').val())} );

                // Llamamos nuevamente a la misma funcion con los datos de la nueva pagina solicitada
                actualizarDatosPaginacion(data.pagination);
            });
            // ------------------------------------------------------------------- //
        }
    });

    // Ejecutamos lo siguiente para evitar que se modifique la url cada vez que cambiamos de pagina
    $(".pagination a").each(function(i, item){$(this).attr('href', 'javascript:void(0)');});
}
function actualizarDatosPaginacionSinRequest(data_paginacion){
    info_paginacion = data_paginacion;

    $('.pagination').pagination({
        items: establecimientos_paginados.length-1,
        itemOnPage: 3,
        displayedPages: cant_paginas_paginacion-3,
        currentPage: info_paginacion.page,
        prevText: '<span class="glyphicon glyphicon-chevron-left"  aria-hidden="true"></span>',
        nextText: '<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>',
        // onInit: function () {/* fire first page loading*/},
        onPageClick: function (page, evt) {

            var establecimientos_obj = { array_mapa: undefined, array_listado: establecimientos_paginados[page] };
            dibujarSectorResultadosEstablecimientos(establecimientos_obj);

            // ACCESO A LINK DE DETALLES DE CADA ESTABLECIMIENTO
            $("#resultados table a").click(function(){  mostrarDetalleEstablecimiento($(this).closest('tr').find('input').val())} );

            info_paginacion.page = page;

            // Llamamos nuevamente a la misma funcion con los datos de la nueva pagina solicitada
            actualizarDatosPaginacionSinRequest(info_paginacion);
        }
    });

    // Ejecutamos lo siguiente para evitar que se modifique la url cada vez que cambiamos de pagina
    $(".pagination a").each(function(i, item){$(this).attr('href', 'javascript:void(0)');});
}



// DIBUJADO DE HTML
function dibujarSectorResultadosEstablecimientos(datos_establecimiento, callback){
    if( datos_establecimiento.array_mapa !== undefined ){
        // Dibujamos el mapa con los puntos según las coordenadas de cada establecimiento presente en la página de resultados actual
        dibujarMapaResultadosPorPagina(datos_establecimiento.array_mapa, function(data){ if(callback){ callback(data); } } );
    }

    // Populamos la tabla de resultados de establecimientos por página, con la busqueda disparada con el boton "buscar"
    dibujarTablaResultadosPorPagina(datos_establecimiento.array_listado)

    $("#resultados_mapa").height(569);
}

function dibujarMapaResultadosPorPagina(datos_establecimiento, callback){

    // Preparamos el string para el tooltip de cada marker en el mapa
    $.each(datos_establecimiento, function(i, data){
        var html_aux = '';

        var contador = 0;
        $.each(data, function(j, data2){
            var cant_campos = Object.keys(data).length, flag_html_write = true;
            if(j !== 'establecimiento_id'){
                switch(j){
                    case 'establecimiento_nombre':      html_aux += '<label>Nombre: </label>';  break;
                    case 'establecimiento_direccion':   html_aux += '<label>Dirección: </label>';  break;
                    case 'barrio_nombre':               html_aux += '<label>Barrio: </label>';  break;
                    case 'gestion_nombre':              html_aux += '<label>Gestión: </label>';  break;
                    case 'tipo_establecimiento_nombre': html_aux += '<label>Tipo de establecimiento: </label>';  break;
                    default: flag_html_write = false; break;
                }

                (contador > 0 && contador < cant_campos && html_aux !== '' && flag_html_write) ? html_aux += '<br>' : '';

                if( flag_html_write ){
                    html_aux += (j !== 'establecimiento_nombre') ? '<div>'+data2+'</div>' :
                        '<div><a class="detalle" href="'+location.href+'/'+data.establecimiento_nombre+'" title="Click para ver detalle">'+data2+'</a></div>';
                }
                else{ html_aux += ''; }
            }
            else{
                html_aux += '<input type="hidden" value="'+data2+'"/>'; // Asignamos el id del establecimiento oculto (para asignarlo dentro del popup como link al detalle)
            }
            contador++;
        });

        datos_establecimiento[i].tooltip_html = '<div class="popup_establecimiento">'+html_aux+'</div>';
    });


    // $("#contenedor_mapa").hide();
    setTimeout(function(){

        traerMapaUsig(datos_establecimiento, 'resultados_mapa', function(){
            if( !$("#boton_mapa").hasClass('boton_activo') ){ $("#resultados_mapa").closest('.area_impresion').hide(); }

            if(callback){ callback(); }
        });
    }, 1000);
}

function dibujarTablaResultadosPorPagina(data_resultado){
    var str_tabla = '';

    $("#tabla_resultados tr").html((isMobile) ? html_col_mobile : html_coltit_resultados);

    // Comprobamos si no fueron encontrados resultados (3 posibles casos):
    // - Response code de request != 200
    // - Elemento != de un objeto (Cuando viene un "string" indicando que no hubo resultados)
    // - Arreglo de resultados vacio
    if ( typeof data_resultado[0] !== 'object' || Object.keys(data_resultado).length == 0 ){
        str_tabla += '<tr> ' +
            '<td style="padding-left: 2em;"> - </td> ' +
            '<td style="padding-left: 2em;"> - </td> ' +

            '<td style="padding-left: 2em;"> - </td> ' +
            '<td style="padding-left: 2em;"> - </td> ' +
            '<td style="padding-left: 2em;"> - </td> ' +
            '</tr>';

        $(".pagination").hide();
    }
    else{
        data_resultado.forEach(function(establecimiento){
            if(!isMobile){
                str_tabla += '<tr class="selector_fila"> ' +
                    '<td>'+establecimiento.gestion_nombre+'</td> ' +
                    '<td>'+establecimiento.tipo_establecimiento_nombre+'</td> ' +
                    '<td><a href="'+location.href+'/'+establecimiento.establecimiento_nombre+'">'+establecimiento.establecimiento_nombre+'</a></td>' +
                    '<td>'+establecimiento.establecimiento_direccion+'</td>' +
                    '<td>'+establecimiento.barrio_nombre+'</td>' +
                    '<input type="hidden" value="'+establecimiento.establecimiento_id+'" />'
                '</tr>';
            }
            else{
                str_tabla += '<tr class="selector_fila"> ' +
                    '<td>'+establecimiento.tipo_establecimiento_nombre+'</td> ' +
                    '<td><a href="'+location.href+'/'+establecimiento.establecimiento_nombre+'">'+establecimiento.establecimiento_nombre+'</a></td>' +
                    '<input type="hidden" value="'+establecimiento.establecimiento_id+'" />'
                '</tr>';
            }
            $(".pagination").show();
        });
    }

    $("#tabla_resultados tbody").hide().html(str_tabla).fadeIn('slow');
}

function dibujarDetalleEstablecimientoHTML(datos_establecimiento, callback){

    var nuevoTitulo = datos_establecimiento.establecimiento_nombre;
    $('h1').html(nuevoTitulo);
    
    $(".lead").replaceWith('<div class="lead"><h2 class="nuevoh2">Conocé toda la información sobre la ' + nuevoTitulo + ', imprimila o realizá una nueva búsqueda.</h2></div>');
    
    $('.nuevoh2').css({
        "font-family": "OpenSans, Helvetica, Arial, sans-serif",
        "font-size": "24px",
        "line-height": "32px",
        "font-weight": "normal"
    });
    
    var ofertas      = parsearOfertas(datos_establecimiento.ofertas);
    var html_ofertas = obtenerHTMLOfertas(ofertas);

    // Agregamos las imagenes del establecimiento a un array con el b64 encoding
    var imagenes   = [];
    if( datos_establecimiento.imagenes !== undefined ){
        $.each(datos_establecimiento.imagenes, function(i, imagen){
            imagenes.push('data:image/png;base64,'+imagen.imagen);
        });
    }

    var html_resultados = '<div class="row final mb-2" style="display: block;"> <hr>' +
        '<div class="col-md-12 boton" style="margin-bottom:20px">' +
        '<button class="btn btn-xl mb-2 btn-primary btn btn-default form-submit nueva_busqueda" name="op" value="Realizar nueva búsqueda" type="button" data-loading-text="<i class=\'fa fa-circle-o-notch fa-spin\'></i> Processing Order">Realizar nueva búsqueda</button>' +
        '</div><br>' +
        '</div>';

    // html_resultados += '<canvas id="pdf_area" width="1360" height="400">';
    html_resultados += '<div class="area_impresion mt-2" id="pdf_area">';
    /*
    html_resultados +='<div class="row titulo_print">' +
                            '<div class="col-md-12 text-left">' +
                                '<h2>'+datos_establecimiento.establecimiento_nombre+'</h2>' +
                            '</div>'+
                        '</div>';
    */
    // <!--FILA IMAGENES-->
    if( imagenes.length > 0 ){
        html_resultados += '<div class="row mt-2 mb-2 imagenes_escuela">';
        $.each(imagenes, function(i, img){
            html_resultados +=
                '<div class="col-md-6">'+
                '<img src="'+img+'" >'+
                '</div>';
        });
        html_resultados += '</div>';
    }


// <!--FILA CUE-->
    html_resultados+= '<div class="row mt-2">'+ // ROW
        '<div class="col-md-3">'+
        '<h5><strong>CUE</strong></h5>'+
        '<p class="ofertas_texto">'+datos_establecimiento.establecimiento_cue+'-'+datos_establecimiento.establecimiento_anexo+'</p>'+
        '</div>';



// <!-- Sólo aparece cuando corresponde, si no hay datos no se muestra -->
    var html_característica = (datos_establecimiento.establecimiento_caracteristica != '') ? 'Característica' : '';

    html_resultados += '<div class="col-md-3">' +
        '<h5><strong>'+html_característica+'</strong></h5>' +
        '<p class="ofertas_texto">'+datos_establecimiento.establecimiento_caracteristica+'</p>' +
        '</div>';


    html_resultados += '<div class="col-md-3">' +
        '<h5><strong>Comuna</strong></h5>' +
        '<p class="ofertas_texto">'+datos_establecimiento.comuna_nombre+'</p>' +
        '</div>';




    html_resultados += '<div class="col-md-3">' +
        '<h5><strong>D.E.:</strong></h5> ' +
        '<p class="ofertas_texto">'+datos_establecimiento.distrito_escolar_nombre+'</p> ' +
        '</div> ' +
        '</div>'; // ROW



// <!--FILA MAPA-->
    html_resultados +=  '<div class="row row-mbot-2"> ' +

        '<div class="col-md-6 form-top"> '+
        '<div id="mapa_interactivo"> </div>'+
        '<div id="mapa_fijo" style="display: none;"> </div>'+
        '</div>'+

        '<div class="col-md-6 form-top">'+
        '<h5><strong>Dirección</strong></h5>'+
        '<p class="ofertas_texto">'+datos_establecimiento.establecimiento_direccion+'</p>'+

        '<div class="row row-mbot-1">'+
        '<div class="col-md-6 contenedor-form-l">'+
        '<h5><strong>CP</strong></h5>'+
        '<p class="ofertas_texto">'+datos_establecimiento.establecimiento_cp+'</p>'+
        '</div>'+

        '<div class="col-md-6 nopad-l">'+
        '<h5><strong>Barrio</strong></h5>'+
        '<p class="ofertas_texto">'+datos_establecimiento.barrio_nombre+'</p>'+
        '</div>'+
        '</div>'+

        '<div class="row">'+
        '<div class="col-md-6 contenedor-form-l">'+
        '<h5><strong>CUI</strong></h5>'+
        '<p class="ofertas_texto">'+datos_establecimiento.establecimiento_cui+'</p>'+
        '</div>'+

        '<div class="col-md-6 nopad-l">'+
        '<h5><strong>Teléfono</strong></h5>'+
        '<p class="ofertas_texto">'+datos_establecimiento.establecimiento_telefono+'</p>'+
        '</div>'+
        '</div>'+

        '<div class="row">'+
        '<div class="col-md-12 form-top">'+
        '<h5><strong>Correo electrónico</strong></h5>'+
        '<a class="oculto_print" href="mailto:'+datos_establecimiento.establecimiento_email+'">'+datos_establecimiento.establecimiento_email+'</a>'+
        '<p class="visible_print">'+datos_establecimiento.establecimiento_email+'</p>'+
        '</div>'+
        '</div>'+

        '<div class="row">'+
            '<div class="col-md-12 form-top">'+
            '<h5><strong>Web</strong></h5>'+
            '<a style="word-wrap:break-word" "href="www.'+datos_establecimiento.establecimiento_web+'">'+datos_establecimiento.establecimiento_web+'</a>'+
            '</div>'+
        '</div>'+
        '</div>'+ // cierre de col pegada al mapa
        '</div>'+   // cierre de row de mapa + datos

        // -------------- ESTRUCTURA PARA IMPRESION DE FILA MAPA ---------- //

        // generarHTMLfilaMapaVistaImpresion(datos_establecimiento)+

        // ------------------------------------------------------------------- //



        //     <!--FILA OFERTAS-->
        '<div class="row">'+
        '<div class="col-md-12">'+
        '<h5><strong>Ofertas</strong></h5>'+
        '</div>'+
        '</div>'+


        '<div id="ofertas">'+
        html_ofertas+
        '</div>'+

        '<hr>'+

        // <!--FILA GESTION-->
        '<div class="row row-mbot-2">'+
        '<div class="col-md-6">'+
        '<h5><strong>Gestión</strong></h5>'+
        '<p class="ofertas_texto">'+datos_establecimiento.gestion_nombre+'</p>'+
        '</div>'+

        '<div class="col-md-6">'+
        '<h5><strong>Tipo de Establecimiento</strong></h5>'+
        '<p class="ofertas_texto">'+datos_establecimiento.tipo_establecimiento_nombre+'</p>'+
        '</div>'+
        '</div>'+

        // <!--FILA DEPENDENCIA-->
        '<div class="row row-mbot-2">'+
        '<div class="col-md-6">'+
        '<h5><strong>Dependencia</strong></h5>'+
        '<p class="ofertas_texto">'+datos_establecimiento.dependencia_funcional_nombre+'</p>'+
        '</div>'+

        '<div class="col-md-6">'+
        '<h5><strong>Dirección</strong></h5>'+
        '<p class="ofertas_texto">'+datos_establecimiento.dependencia_funcional_direccion+'</p>'+
        '</div>'+
        '</div>'+

        // <!--FILA TELEFONO-->
        '<div class="row row-mbot-2">'+
        '<div class="col-md-6">'+
        '<h5><strong>Teléfono</strong></h5>'+
        '<p class="ofertas_texto">'+datos_establecimiento.dependencia_funcional_telefono+'</p>'+
        '</div>'+

        '<div class="col-md-6">'+
        '<h5><strong>Correo electrónico</strong></h5>'+
        '<a class="oculto_print" href="mailto:'+datos_establecimiento.dependencia_funcional_email+'">'+datos_establecimiento.dependencia_funcional_email+'</a>'+
        '<p class="visible_print">'+datos_establecimiento.dependencia_funcional_email+'</p>'+
        '</div>'+
        '</div>'+

        // <!--FILA WEB-->
        '<div class="row row-mbot-1">'+
            '<div class="col-md-12">'+
            '<h5>Web</h5>'+
            '<a style="word-wrap: break-word" href="www.'+datos_establecimiento.dependencia_funcional_web+'" target="_blank">'+datos_establecimiento.dependencia_funcional_web+'</a>'+
            '</div>'+
        '</div>';

        html_resultados +=
        '<hr>'+

        '<div class="row row-mbot-3">'+
        '<div class="col-md-12">'+
        '<p class="text-center"><em>Información suministrada por la Unidad de Evaluación Integral de la Calidad y Equidad Educativa - Área de Investigación y Estadística</em></p>'+
        '</div>'+
        '</div>'+

        '</div>'+

        '<div class="row imprimir_descargar">'+

        '<div class="col-md-12 text-center boton imprimir">'+
        '<button class="btn btn-xl btn-primary" value="Imprimir">Imprimir </button>'+
        '</div>'+

        // '<div class="col-md-4 text-center boton descargar">'+
        //   '<button class="btn btn-xl btn-primary" value="Descargar">Descargar</button>'+
        // '</div>'+

        '</div>'+

        '<div id="canvas_container" style="display: none;"></div>'; // Contenedor para el canvas

    $("#busqueda_escuela").html(html_resultados);





    // Adjuntamos el listener para que funcione sobre el boton superior (esto está medio a las apuradas, debería estar mejor)
    listenerNuevaBusqueda();

    datos_establecimiento.tooltip_html = datos_establecimiento.establecimiento_direccion;

    var data_est = [datos_establecimiento];

    if( mapa !== undefined ){   destruirMapa(); }

    //Asignamos el mapa de usig según la dirección del establecimiento, impactandolo en el div de destino pasado como parámetro
    traerMapaUsig(data_est, 'mapa_interactivo', function(){
        centrarMarkers(); mapa.map.setZoom(15);
        // Ejecutamos nuevamente dado que hay ocasiones en las que no se renderiza bien el mapa
        setTimeout(function(){mapa.invalidateSize();}, 500)
    });

    // IMPRIMIR
    $("#busqueda_escuela .boton.imprimir button").click(function (event) {
        event.preventDefault(); // Para evitar la recarga de la pagina por tratarse de un tag "<button>"

        var datos_vista_impresion = { datos_establecimiento: data_est, metodo: loadPrint };

        efectuarVistaImpresionDescargaNew(datos_vista_impresion);
    });

    $("#final").show();

    $("#final .row").eq(1).show();
    $("#final .row").eq(1).find('hr').show();

    if( callback ){ callback(); }
}


/**
 * Metodo que adjunta los criterios de busqueda seleccionados al HTML del input de palabras clave
 */
function adjuntarCriteriosBusqueda(criterios){
    criterios_html = '';

    // Adjuntamos el total de resultados devuelto por la consulta
    $("#cant_resultados").html(criterios.cantidad_resultados);

    // Reiniciamos los criterios
    var tit_criterios = $("#criterios_busqueda strong")[0].outerHTML;

    $("#criterios_busqueda").html(tit_criterios);

    // GESTION
    var criterios_html = '<strong style="color: #9d9d9d;">Gestión</strong>: ';
    $(".criterio input:radio").each(function(){
        if ( $(this).prop('checked') ){ criterios_html += '<em>'+$("label[for='"+$(this).attr('id')+"']").text().trim()+'</em>'; }
    });

    $.each(criterios.all_select ,function(i){
        // TODOS LOS COMBOS
        if ( $(this).val() != '0' ){
            criterios_html += ', <strong style="color: #9d9d9d;">'+this.prev('label').text()+':</strong> ';
            criterios_html += '<em>'+$(this).find(':selected').text()+'</em>';
        }
    });

    criterios_html += (criterios.palabras_clave.length > 0) ? ', <strong style="color: #9d9d9d;">Palabras clave: </strong><em>'+criterios.palabras_clave+'</em>' : '';
    criterios_html += (criterios.ubicacion.length > 0)      ? ', <strong style="color: #9d9d9d;">Ubicación de referencia: </strong><em>'+criterios.ubicacion+'</em>' : '';


    $("#criterios_busqueda").append(criterios_html);
}

function destruirMapa(){
    if( Object.keys(mapa._markers).length > 0 ){
        mapa._markersLayerGroup.clearLayers();
        // $.each(mapa._markers, function(id){ mapa.removeMarker(id);  });
    }
    // mapa._markers = {};
    mapa.remove();

    delete mapa;
    mapa = {};
    mapa = undefined;
}

// ------------ IMPRESION Y DESCARGA ----------- //
/**
 * Metodo encargado de mostrar una imagen estatica del mapa usig y
 * desplegar la vista de impresion o descarga segun corresponda.
 * Se le puede pasar un callback para realizar acciones tras finalizar el metodo.
 */
function efectuarVistaImpresionDescarga(datos_vista, callback){

    // Traemos una imagen fija del mapa para poder visualizar en la pantalla de impresión
    var img         = traerMapaUsigEstatico(datos_vista.datos_establecimientos);
    var est_visible = $("#busqueda_escuela").is(":visible"); // Chequeo si esta visible la seccion de detalle de establecimiento


    // Ocultamos el titulo principal para dejar como único titulo el de la seccion.
    $(".pane-gcaba-static-blocks-custom-node-title").toggleClass('ocultar_titulo', est_visible);

    // Ocultamos el mapa interactivo y lo reemplazamos por uno estático para visualizar en la impresion
    $('#mapa_fijo').html(img);


    // Mostramos el mensaje de espera de vista de impresion
    $("#myModal h3").html("Preparando vista de impresión, por favor aguarde...");
    $("#myModal").modal("show");


    // Agregamos el listener sobre la imagen una vez que se termina de cargar en el HTML
    $("#mapa_fijo img")
        .one('load', function() {

            // console.log('se cargo el mapa fijo');

            $('#mapa_interactivo').hide();
            $('#mapa_fijo').show();


            // Damos tiempo a que se lea el mensaje de espera de impresion
            setTimeout(function(){
                $("#myModal").modal("hide");


                // console.log('termino el timeout del mensaje de espera');

                clonarVistaImpresionDetalleEstablecimiento();

                // Mandamos a imprimir o descargar, con el callback para volver a mostrar el mapa interactivo en lugar del fijo.
                datos_vista.metodo(function(){
                    // Callback de ejecución luego de cerrada la ventana de impresión


                    $('#mapa_fijo').hide();
                    $('#mapa_interactivo').show();

                    restituirVistaBodyOriginal();

                    hacerScroll($("#busqueda_escuela"), 4);


                    // console.log('sale el callback de "datos_vista.metodo"');

                    if (callback){ callback(); }
                });

            }, 2000);
        })
        .on('error', function() { console.log("error loading image"); });
}
function efectuarVistaImpresionDescargaNew(datos_vista, callback){

    // Traemos una imagen fija del mapa para poder visualizar en la pantalla de impresión
    var est_visible = $("#busqueda_escuela").is(":visible"); // Chequeo si esta visible la seccion de detalle de establecimiento

    // Ocultamos el titulo principal para dejar como único titulo el de la seccion.
    $(".pane-gcaba-static-blocks-custom-node-title").toggleClass('ocultar_titulo', est_visible);

    // Mostramos el mensaje de espera de vista de impresion
    $("#myModal h3").html("Preparando vista de impresión, por favor aguarde...");
    $("#myModal").modal("show");

    $('#mapa_interactivo').hide();
    $('#mapa_fijo').show();

    /**
     * Metodo que se encarga de armar una vista de impresion reducida del HTML
     *
     */
    function mostrarVistaImpresion(callback){
        // Damos tiempo a que se lea el mensaje de espera de impresion
        setTimeout(function(){
            $("#myModal").modal("hide");

            clonarVistaImpresionDetalleEstablecimiento();

            // Mandamos a imprimir o descargar, con el callback para volver a mostrar el mapa interactivo en lugar del fijo.
            datos_vista.metodo(function(){
                // Callback de ejecución luego de cerrada la ventana de impresión


                $('#mapa_fijo').hide();
                $('#mapa_interactivo').show();

                restituirVistaBodyOriginal();

                hacerScroll($("#busqueda_escuela"), 4);

                if (callback){ callback(); }
            });

        }, 2000);
    }


    traerMapaCanvasFijo(function() { // Obtenemos una imágen fija del mapa actual para poder visualizarlo correctamente en la vista de impresión
        mostrarVistaImpresion( function(){
            mapa.invalidateSize(); /* Re-renderizamos el mapa para evitar zonas incompletas del mismo, una vez cerrada la ventana de impresión*/
        });
    });
}
/**
 *  Metodo que dispara la impresion y permite la recepcion de un callback como parametro
 * @param callback (opcional para cuando la ventana de impresion es cerrada)
 */
function loadPrint(callback) {
    window.print();
    // Este timeout sirve para atrapar el momento en que se cierra la ventana de impresion
    setTimeout(function () { if (callback){ callback(); } }, 100);
}
function generarPDF(callback){

    html2canvas($("#pdf_area")[0]).then(function(canvas) {
            var img = canvas.toDataURL("image/png", 1);

            var new_window = window.open();


            $(new_window.document.body).html(canvas);


            // var doc = new jsPDF();
            // doc.addImage(img, 'JPEG', 5,2);
            // doc.save('test.pdf');

            if (callback){ callback(); }
        }
    );

    // html2canvas($("#pdf_area")[0],{
    //   allowTaint: true,
    //   logging:true,
    //   type: boolean,
    //   default: false,
    //   onrendered: function(canvas) {
    //     console.log(canvas);
    //
    //     var img = canvas.toDataURL("image/png");
    //
    //     $('body').appendChild(canvas);
    //
    //     // var doc = new jsPDF();
    //     // doc.addImage(img, 'JPEG', 5,0);
    //     // doc.save('test.pdf');
    //
    //     if (callback) {callback();}
    //   }
    // });
}
// --------------------------------------------- //

// FUNCIONALIDAD MAPA USIG
/**
 * Método que se encarga de re-renderizar el mapa obteniendo los límites de los markers y centrando el mapa en el medio de esos límites obtenidos
 */
function centrarMarkers(){
    mapa.invalidateSize(); // Con este método evitamos que el mapa se muestre incompleto, re-renderizándolo

    var markerLayer       = mapa._markersLayerGroup;                 // Con esto obtengo la capa que contiene todos los markers.

    // Aplicamos el zoom relativo para visualizar todos los markers en pantalla
    mapa.map.fitBounds(markerLayer.getBounds());
}
function traerMapaUsig(datos_establecimientos, div_destino, callback){

    function agregarMarkerEstablecimientos(datos_establecimientos, mapa_obj, callback){
        var clave_est_coords = {};

            // Agrupamos los establecimientos por coordenadas, y vamos acumulando los datos para el tooltip html para los establecimientos que comparten dirección física
            $.each(datos_establecimientos, function (i, datos_establecimiento) {
                if( datos_establecimiento.establecimiento_point_x != 0 ) {

                    var clave = datos_establecimiento.establecimiento_point_x + ' - ' + datos_establecimiento.establecimiento_point_y;

                    if (typeof clave_est_coords[clave] == 'undefined') {
                        clave_est_coords[clave] = datos_establecimiento;
                    }
                    else {
                        clave_est_coords[clave].tooltip_html = clave_est_coords[clave].tooltip_html + '<hr>' + datos_establecimiento.tooltip_html;
                    }
                }
            });

            function agregarMarkerByLatLong(data, data_est){
                var icono = ( data_est.gestion_nombre === 'Privada' ) ? icono_privado : icono_estatal;
                // Al finalizar la conversión de coordenadas, agregamos los markers
                var markerId = mapa_obj.addMarker({
                    lat: data[0],
                    lng: data[1]
                }, true, false, false, false, true, {   iconUrl: icono });

                // Agregamos el tooltipHTML en cada marker
                mapa_obj._markers[markerId].off();
                mapa_obj._markers[markerId].bindPopup(data_est.tooltip_html, {maxHeight: 230, minWidth: 300});
            }

            // Recorremos los establecimientos por pares de coordenadas y agregamos por única vez el tooltip con todos los datos
            $.each(clave_est_coords, function (coord, data_est) {
                if( typeof coords_by_idest[data_est.establecimiento_id] === "undefined" ){

                    // Convertimos las coordenadas desde usig punto hacia formato lonlat
                    var data_coords = Coords.toLngLat({x: data_est.establecimiento_point_x, y: data_est.establecimiento_point_y});

                    agregarMarkerByLatLong(data_coords, data_est);

                        // Guardamos los pares de coordenadas en un nuevo arreglo para evitar realizar nuevamente la request para hacer la conversion de coordenadas
                    coords_by_idest[data_est.establecimiento_id] = data_coords;
                }
                else{ agregarMarkerByLatLong(coords_by_idest[data_est.establecimiento_id], data_est); }
            });

        if( callback ){ callback(); }
    }

    // Si no existe el mapa lo creamos
    if( mapa === undefined ){
        var centro = [-34.62, -58.44];

        mapa = new MapaInteractivo(div_destino, {center: centro, preferCanvas: true, attributionControl: true});
    }
    else{
        mapa._markersLayerGroup.clearLayers();
    }

    agregarMarkerEstablecimientos(datos_establecimientos, mapa, function(){   if( callback ){ callback(); }   });
}
function traerMapaUsigEstatico(datos_establecimiento){
    var img = usig.MapaEstatico({
        // dir: establecimiento_direccion,
        punto: new usig.Punto(datos_establecimiento.establecimiento_point_x,datos_establecimiento.establecimiento_point_y),
        marcarPunto: true,
        width: 450,
        height: 325,
    });

    return img;
}

/**
 * Método que obtiene una versión fija del mapa interactivo actual
 * y la renderiza dentro de un nuevo elemento
 */
function traerMapaCanvasFijo(callback) {
    mapa.getStaticImage().then(function(canvas) {
        var img = document.createElement('img');
        var dimensions = mapa.getMapa().getSize();
        img.width = dimensions.x;
        img.height = dimensions.y;
        img.src = canvas.toDataURL();
        document.getElementById('mapa_fijo').innerHTML = '';
        document.getElementById('mapa_fijo').appendChild(img);
        if( callback ){ callback(); }
    });
}

function convertirCoordenadasUSIG(ubicacion, formato){
    var url_api_coords = 'https://ws.usig.buenosaires.gob.ar/rest/convertir_coordenadas?x='+ubicacion.x+'&y='+ubicacion.y+'&output='+formato;

    // Realizamos el ajax preparado para la request crossdomain para evitar el error del navegador
    return $.ajax({
                type: 'GET',
                url : url_api_coords,
                crossDomain: true,
                dataType: 'jsonp'
            });
}

/**
 * Metodo que adjunta los criterios de busqueda seleccionados al HTML del input de palabras clave
 */


function hacerScroll(div_scrollto, porcentaje){
    porcentaje = porcentaje/100;

    $('html, body').stop().animate({scrollTop: div_scrollto.offset().top-(div_scrollto.offset().top*porcentaje)}, 500);
}

function prepararExcel(array_busqueda_api){
    var wb = XLSX.utils.book_new();

    // ------------------ LISTADO ESTABLECIMIENTOS ---------------- //
    // Obtenemos el listado completo de establecimientos segun el filtrado
    array_busqueda_api['page']  = 1; // Si no forzamos a la 1er pagina, la busqueda no devuelve resultados
    array_busqueda_api['limit'] = limite_resultados_excel;
    var resultado_get_establecimientos = obtenerEstablecimientosByParametros(array_busqueda_api);
    // ----------------------------------------------------------- //

    // Una vez finalizado el ajax, ejecutamos el callback
    resultado_get_establecimientos.done(function(data){
        var data_establecimientos = data.data;

        wb.SheetNames.push("Listado Establecimientos");

        // ----------------- OBTENER CRITERIOS DE BUSQUEDA -------------- //
        var all_select = [];
        $(".chosen-container:visible").prev('select:not(id_ofertas)').each(function () {
            all_select.push($(this));
        });
        $("select:visible").each(function () {
            all_select.push($(this));
        });


        var criterios_html = 'Gestión: ';
        $(".criterio input:radio").each(function(){
            if ( $(this).prop('checked') ){ criterios_html += $("label[for='"+$(this).attr('id')+"']").text().trim()+' | '; }
        });

        $.each(all_select ,function(i){
            // TODOS LOS COMBOS

            criterios_html += this.prev('label').text()+': ';
            criterios_html += this.find(':selected').text();
            criterios_html += ( i < ($(".criterio select").length-1) ) ? ' | ' : '';

        });
        // -------------------------------------------------------------- //


        // ------------- LLENADO DE FILAS Y CELDAS ----------------------- //
        // Creamos el array con el contenido de las celdas
        var ws_data = [['Resultados de búsqueda', data.pagination.count]];

        // ws_data.push(['Criterios de búsqueda', (Object.keys(data.search_criteria).length > 0) ? data.search_criteria : '']);
        ws_data.push(['Criterios de búsqueda', criterios_html]);
        ws_data.push([]); // Generamos una fila en blanco
        ws_data.push(['Gestión' , 'Tipo de establecimiento', 'Nombre', 'Dirección', 'Barrio']);



        // Agregamos a cada fila los datos de cada establecimiento
        data_establecimientos.forEach(function(establecimiento){
            ws_data.push([establecimiento.gestion_nombre,
                establecimiento.tipo_establecimiento_nombre,
                establecimiento.establecimiento_nombre,
                establecimiento.establecimiento_direccion,
                establecimiento.barrio_nombre]);
        });
        // -------------------------------------------------------------- //


        // Creamos la hoja segun el array
        var ws = XLSX.utils.aoa_to_sheet(ws_data);

        // Asigno el objeto Hoja al array de hojas del libro
        wb.Sheets["Listado Establecimientos"] = ws;

        wbout = XLSX.write(wb, {bookType:'xlsx',  type: 'binary'});

        saveAs(new Blob([s2ab(wbout)],{type:"application/octet-stream"}), 'listado_establecimientos.xlsx');
    });
}

function s2ab(s) {
    var buf = new ArrayBuffer(s.length); //convert s to arrayBuffer
    var view = new Uint8Array(buf);  //create uint8array as viewer
    for (var i=0; i<s.length; i++) view[i] = s.charCodeAt(i) & 0xFF; //convert to octet
    return buf;
}

// ------------------ PARSEADOR DE OFERTAS -------------------- //
// JSON OFERTAS AGRUPADAS
function parsearOfertas(ofertas_establecimeinto){
    var parseSalasPara = function (oferta_id_p, ofertas_establecimeinto) {
        var salas = [];
        $.each(ofertas_establecimeinto, function (index, oferta) {
            if (oferta.oferta_id == oferta_id_p && salas.indexOf(oferta.sala_nombre) == -1) {
                salas.push(oferta.sala_nombre)
            };
        });
        return salas;
    }

    var parseTitulosPara = function (oferta_id_p, ofertas_establecimeinto) {
        var titulos = [];
        $.each(ofertas_establecimeinto, function (index, oferta) {
            if (oferta.oferta_id == oferta_id_p && titulos.indexOf(oferta.titulo_nombre) == -1) {
                titulos.push(oferta.titulo_nombre)
            };
        });
        return titulos;
    }

    var parseOrientacionesPara = function (oferta_id_p, ofertas_establecimeinto) {
        var orientaciones = [];
        $.each(ofertas_establecimeinto, function (index, oferta) {
            if (oferta.oferta_id == oferta_id_p && orientaciones.indexOf(oferta.orientacion_nombre) == -1) {
                orientaciones.push(oferta.orientacion_nombre)
            };
        });
        return orientaciones;
    }

    var parseJornadasPara = function (oferta_id_p, sala_nombre_p, ofertas_establecimeinto) {
        var jornadas = [];
        $.each(ofertas_establecimeinto, function (index, oferta) {
            if (oferta.oferta_id == oferta_id_p && oferta.sala_nombre == sala_nombre_p &&
                oferta.jornada_nombre) {
                jornadas.push(oferta.jornada_nombre)
            };
        });

        return jornadas;
    }

    var existeOferta = function (ofertaParam, ofertasParser) {
        var veces = 0;


        $.each(ofertasParser, function (index, oferta) {
            //console.log( index + ' - ' + oferta.oferta_id);
            //console.log(oferta.oferta_id +" - "+ ofertaParam.oferta_id)
            if (oferta.oferta_id == ofertaParam.oferta_id) {
                veces = veces + 1
            }
        });

        return veces > 0;
    }

    var agruparOfertas = function (ofertas_establecimeinto) {
        var ofertasParser = []; //resultado parseado

        $.each(ofertas_establecimeinto, function (index, oferta) {
            if (!existeOferta(oferta, ofertasParser)) ofertasParser.push(oferta);
        });
        return ofertasParser;
    }


    var ofertas = agruparOfertas(ofertas_establecimeinto);

    $.each(ofertas, function (index, oferta) {

        // Parseamos las salas con sus respectivas jornadas
        var salas = parseSalasPara(oferta.oferta_id, ofertas_establecimeinto);
        oferta.salas_list = [];
        $.each(salas, function (index, sala) {
            if (sala){
                oferta.salas_list.push ({
                    "sala_nombre": sala,
                    "jornadas": parseJornadasPara(oferta.oferta_id, sala, ofertas_establecimeinto)
                })}
        });

        if (oferta.salas_list.length > 0 ) oferta.jornada_nombre = "";

        // Parseamos los titulos de la oferta
        var titulos = parseTitulosPara(oferta.oferta_id, ofertas_establecimeinto);
        oferta.titulos_list = [];
        $.each(titulos, function (index, titulo) {
            if (titulo){
                oferta.titulos_list.push ({
                    "titulo_nombre": titulo
                })}
        });

        // Parseamos las orientaciones de la oferta
        var orientaciones = parseOrientacionesPara(oferta.oferta_id, ofertas_establecimeinto);
        oferta.orientaciones_list = [];
        $.each(orientaciones, function (index, orientacion) {
            if (orientacion){
                oferta.orientaciones_list.push ({
                    "orientacion_nombre": orientacion
                })}
        });

    });

    return ofertas;
}
function obtenerHTMLOfertas(ofertas){

    var html_ofertas = '';

    $.each(ofertas, function(i, oferta){
        var jornadas = [];
        var fila_par = i%2 == 0;

        if (fila_par){ html_ofertas += '<div class="row row-mbot-1">'; }


// HTML del nivel
        html_ofertas += '<div class="col-md-6">';
        html_ofertas +=   '<div class="ofertas_texto"><strong>'+oferta.oferta_nombre+'</strong></div>';


// HTML de SALAS
        var html_salas = '', html_jornadas = '';
        if(oferta.sala_nombre){
            html_salas += '<div class="ofertas_texto">';

            $.each(oferta.salas_list, function(j, sala){
                html_salas += (j < oferta.salas_list.length-1) ? sala.sala_nombre+', ' : sala.sala_nombre+'.</div>';

                // Armamos un arreglo general de jornadas en comun para todas las salas
                $.each(sala.jornadas, function(h, jornada){
                    if( jornadas.indexOf(jornada) == (-1) ){ jornadas.push(jornada); }
                });
            });

            // HTML de JORNADAS
            $.each(jornadas, function(h, jornada){
                var ultima_jornada =  h == jornadas.length-1;

                html_jornadas     += (h == 0) ? '<div class="ofertas_texto">' : '';
                html_jornadas     += (ultima_jornada) ? jornada+'</div>' : jornada+' - ';
            });
            // ---------------------------------------------------------
        }

        if( oferta.salas_list.length == 0 && oferta.jornada_nombre !== null ){ html_jornadas = '<div class="ofertas_texto">'+oferta.jornada_nombre+'</div>'; }

        // if( oferta.orientacion_nombre !== null ){ html_jornadas = '<div class="ofertas_texto">'+oferta.orientacion_nombre+'</div>'; }


        // HTML DE TITULOS
        var html_titulos = '';
        if( oferta.titulo_nombre !== null )     {
            html_titulos += '<div class="ofertas_texto">Títulos:<br> ';

            $.each(oferta.titulos_list, function(j, titulo){
                // html_titulos += (j < oferta.titulos_list.length-1) ? titulo.titulo_nombre+' <strong>-</strong> ' : titulo.titulo_nombre+'.</div>';
                html_titulos += (j < oferta.titulos_list.length-1) ? titulo.titulo_nombre+' <br>' : titulo.titulo_nombre+'.</div>';
            });
            // ---------------------------------------------------------
        }


        // HTML DE ORIENTACIONES
        var html_orientaciones = '';
        if( oferta.orientacion_nombre !== null )     {
            html_orientaciones += '<div class="ofertas_texto">Orientaciones: ';

            $.each(oferta.orientaciones_list, function(j, orientacion){
                html_orientaciones += (j < oferta.orientaciones_list.length-1) ? orientacion.orientacion_nombre+', ' : orientacion.orientacion_nombre+'.</div>';
            });
            // ---------------------------------------------------------
        }



        // Concatenamos todo el HTML
        html_ofertas += html_salas + html_jornadas + html_titulos + html_orientaciones;

        html_ofertas += '</div>';

        if (!fila_par || i == ofertas.length-1 ){ html_ofertas += '</div>'; }

    });

    return html_ofertas;
}
// ------------------------------------------------------------ //

// -------------- ARMAR VISTAS DE IMPRESION ------------------- //
function clonarVistaImpresionTablaResultados(callback){
    $("body").append( '<div class="vista_impresion">'+ $("#resultados").html() + '</div>' );
    $("body").children(':visible:not(.vista_impresion)').addClass('hide_temp').hide();
    $("body").addClass('body_temp');
    // $("body").toggleClass('toolbar', false).toggleClass('toolbar-drawer', false); // Removemos algunos padding top, asociados a la clase, para quitar margen superior de impresion

    if( callback ){ callback(); }
}
function clonarVistaImpresionDetalleEstablecimiento(){
    $("body").append( '<div class="vista_impresion">'+ $("#pdf_area").html() + '</div>' );
    $("body").children(':visible:not(.vista_impresion)').addClass('hide_temp').hide();
    $("body").addClass('body_temp');
    $("body").toggleClass('toolbar', false).toggleClass('toolbar-drawer', false)
}
function restituirVistaBodyOriginal(origen){
    // RESTITUIMOS LA VISTA ORIGINAL
    $(".hide_temp").show();
    $(".vista_impresion").remove();
    $("body").removeClass('body_temp');

    // $("body").toggleClass('toolbar', true).toggleClass('toolbar-drawer', true);

}
// ------------------------------------------------------------ //



// Funcionalidad para conversion de coordenadas usig
// ------------------------------------------------------------------------------------------- //
const Coords = {
    /**
     Convierte coordenadas GKBA en coordenadas geogrÃ¡ficas WGS84
     @param {Array|usig.Punto|usig.Location|geolocation|Object} coords Coordenadas GKBA
     @return {Array|Object} Coordenadas WGS84
     */
    toLngLat: function(coords, returnObject) {
        const p = proj4(origin, wgs84, coords.x ? [parseFloat(coords.x), parseFloat(coords.y)] : coords);
        return returnObject ? {x: p[0], y: p[1]} : [p[1], p[0]];
    },

    /**
     Convierte coordenadas geogrÃ¡ficas WGS84 en coordenadas GKBA
     @param {Array|usig.Punto|usig.Location|geolocation} coords Coordenadas geogrÃ¡ficas WGS84
     @return {Array|Object} Coordenadas GKBA
     */
    toGkba: function(coords) {
        // Asumo que son 4326
        const p = proj4('EPSG:4326', 'EPSG:7433', coords);
        if (p[0]) return {x: p[0], y: p[1]};
        return p;
    }
}
// ------------------------------------------------------------------------------------------- //