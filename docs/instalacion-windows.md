# Instalar BIGGER Ágil en el PC de la caja (Windows)

Guía para quien instala el sistema en la cafetería. No hace falta saber programar.

## Qué se necesita

- Un PC con **Windows 10 u 11 de 64 bits**, que quede **encendido y fijo** en el local (es el «servidor»).
- Estar conectado a la **misma red Wi-Fi o cable** que las tablets y celulares.
- Recomendado: en el router, **reservar una IP fija** para este PC, así la dirección que usan las tablets no cambia.
- Permisos de administrador en el PC para instalar.
- No hace falta instalar Node, bases de datos ni nada más: todo viene dentro del instalador.

## Descargar el instalador

El instalador se llama `Instalar-BIGGER-Agil-<versión>.exe`. Hay dos lugares para bajarlo:

- **Releases** del repositorio en GitHub (pestaña «Releases»): versiones oficiales, la opción recomendada.
- **Actions**: abrir la ejecución más reciente del flujo «Instalador Windows» y bajar el artefacto `Instalar-BIGGER-Agil` (es un .zip con el .exe dentro). Sirve para probar versiones que aún no son oficiales.

## Pasos del asistente

1. Haga doble clic en el `.exe` y acepte el aviso de administrador. Si Windows muestra «SmartScreen», elija _Más información → Ejecutar de todas formas_.
2. Elija el idioma (Español) y deje la carpeta de instalación que se propone (`C:\Program Files\BIGGER Agil`).
3. **Configuración inicial** (solo la primera vez):
   - **PIN del encargado**: de 4 a 12 números. Hay que escribirlo dos veces. Anótelo en un lugar seguro: protege la configuración, los reportes y los respaldos.
   - **Puerto de la impresora** (opcional): por ejemplo `COM5`. Déjelo vacío si no hay impresora todavía.
   - **Cargar la carta de BIGGER**: déjelo marcado para que el sistema parta con la carta real (sin pedidos de ejemplo).
4. Marque si quiere el ícono en el escritorio y pulse _Instalar_.
5. Al terminar, deje marcado **Abrir BIGGER Ágil ahora**. Se abre una ventana propia del sistema (usa Microsoft Edge en modo aplicación; si no hay Edge, se abre en el navegador).

El sistema queda instalado como **servicio de Windows**: arranca solo cuando se enciende el PC, aunque nadie inicie sesión, y se reinicia si falla.

En el menú Inicio, carpeta «BIGGER Ágil», hay accesos a **BIGGER Ágil**, **Conectar tablets y celulares** y **Carpeta de respaldos**.

## Conectar tablets y celulares

1. En el PC, abra el menú Inicio → **Conectar tablets y celulares** (o entre a _Configuración → Conectar equipos_ con el PIN del encargado).
2. Aparece cada dirección (por ejemplo `http://192.168.1.20:3000`) con su código QR.
3. En la tablet o el celular, conectado al mismo Wi-Fi, escanee el QR o escriba la dirección en el navegador. Puede agregarla a la pantalla de inicio como si fuera una aplicación.

Si la dirección cambia al reiniciar el router, reserve una IP fija para el PC (ver «Qué se necesita»).

## Impresora de comandas

El puerto se pide durante la instalación. Para cambiarlo después, vuelva a ejecutar el instalador, escriba el nuevo puerto (por ejemplo `COM7`) y termine el asistente: se conservan los datos y el PIN. Para saber el número de puerto: _Administrador de dispositivos → Puertos (COM y LPT)_.

## Respaldos

- El sistema hace un **respaldo automático diario** de la base de datos y conserva los últimos 14.
- Están en `C:\ProgramData\BIGGER\respaldos` (también desde Inicio → **Carpeta de respaldos**).
- Copie de vez en cuando esa carpeta a un pendrive o a la nube.

### Restaurar un respaldo

1. Abra `services.msc`, busque **BIGGER Ágil**, clic derecho → **Detener**.
2. En `C:\ProgramData\BIGGER`, guarde una copia de `bigger.db` con otro nombre (por si acaso).
3. Copie el archivo de respaldo elegido a `C:\ProgramData\BIGGER` y renómbrelo a `bigger.db`, reemplazando el actual. Si junto a `bigger.db` hay archivos `bigger.db-wal` y `bigger.db-shm`, bórrelos.
4. Vuelva a `services.msc`, clic derecho en **BIGGER Ágil** → **Iniciar**.

## Actualizar a una versión nueva

Ejecute el nuevo `Instalar-BIGGER-Agil-<versión>.exe`. Detiene el servicio, reemplaza el programa y lo vuelve a iniciar. **Conserva** los datos, la carta, los respaldos y el PIN (no los vuelve a pedir). No hace falta desinstalar antes.

## Desinstalar

_Configuración de Windows → Aplicaciones → BIGGER Ágil → Desinstalar_. Se detiene y elimina el servicio y la regla del firewall. **Los datos no se borran**: siguen en `C:\ProgramData\BIGGER`. Si reinstala, se recuperan. Para borrarlos de verdad, elimine esa carpeta a mano (haga antes un respaldo).

## Solución de problemas

**La tablet no abre la dirección.**

- Compruebe que la tablet está en el mismo Wi-Fi que el PC y que la dirección es la que muestra _Conectar tablets y celulares_.
- Revise el firewall: en una consola de administrador, `netsh advfirewall firewall show rule name="BIGGER Agil"`. Si no existe, créela con `netsh advfirewall firewall add rule name="BIGGER Agil" dir=in action=allow protocol=TCP localport=3000 profile=private,domain`.
- Si Windows clasificó la red como «Pública», cámbiela a «Privada» (_Configuración → Red e Internet → propiedades de la red_).

**El puerto 3000 está ocupado.** Otro programa usa el puerto; el servicio no inicia. Averigüe cuál con `netstat -ano | findstr :3000` y ciérrelo, o reinicie el PC.

**Ver los registros.** Están en `C:\ProgramData\BIGGER\logs` (el más reciente tiene el nombre `BIGGER-Agil.out.log` o similar). Envíe los últimos al soporte si hay un error.

**Reiniciar el servicio.** `services.msc` → **BIGGER Ágil** → clic derecho → **Reiniciar**. Si se ve «Detenido», elija **Iniciar**.

**El ícono abre una página en blanco o un error.** El servicio puede estar iniciando; espere unos segundos y recargue (F5). Si sigue, revise que el servicio esté «En ejecución» y los registros.

**Olvidé el PIN.** Pida a quien instaló el sistema que lo restablezca (vuelva a ejecutar el instalador no lo cambia; requiere ejecutar el programa de configuración con un nuevo PIN).
