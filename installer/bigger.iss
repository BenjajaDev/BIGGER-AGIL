; BIGGER Ágil - instalador de Windows (Inno Setup 6.3 o superior).
; Compilar:  ISCC.exe /DAppVersion=1.0.0 installer\bigger.iss   (lo hace installer\build.ps1)
; Requiere que installer\build\{node,api,web,service} ya existan (ver build.ps1).

#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
#define AppName "BIGGER Ágil"
#define ServiceExe "BIGGER-Agil.exe"
#define AppUrl "http://localhost:3000"

[Setup]
; GUID fijo: identifica la aplicación para actualizar/desinstalar. No cambiar.
AppId={{B16E2A4C-5D3F-4A7B-9C1E-7F2D8A6B0E34}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher=Mesa Abierta
DefaultDirName={autopf}\BIGGER Agil
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
OutputDir=Output
OutputBaseFilename=Instalar-BIGGER-Agil-{#AppVersion}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName={#AppName}
UninstallDisplayIcon={app}\bigger.ico
CloseApplications=no
#if FileExists("assets\bigger.ico")
SetupIconFile=assets\bigger.ico
#endif

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear un ícono de {#AppName} en el escritorio"; GroupDescription: "Accesos directos:"

[Dirs]
; Carpetas de datos: nunca se borran al desinstalar.
Name: "{commonappdata}\BIGGER"; Flags: uninsneveruninstall
Name: "{commonappdata}\BIGGER\respaldos"; Flags: uninsneveruninstall
Name: "{commonappdata}\BIGGER\logs"; Flags: uninsneveruninstall

[Files]
Source: "build\node\*"; DestDir: "{app}\node"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "build\api\*"; DestDir: "{app}\api"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "build\web\*"; DestDir: "{app}\web"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "build\service\*"; DestDir: "{app}\service"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "assets\bigger.ico"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

[Icons]
; Con Microsoft Edge: ventana de aplicación (sin barra de direcciones).
Name: "{autodesktop}\{#AppName}"; Filename: "{code:GetEdgePath}"; Parameters: "--app={#AppUrl}"; IconFilename: "{app}\bigger.ico"; Tasks: desktopicon; Check: HasEdge
Name: "{group}\{#AppName}"; Filename: "{code:GetEdgePath}"; Parameters: "--app={#AppUrl}"; IconFilename: "{app}\bigger.ico"; Check: HasEdge
Name: "{group}\Conectar tablets y celulares"; Filename: "{code:GetEdgePath}"; Parameters: "--app={#AppUrl}/configuracion/equipos"; IconFilename: "{app}\bigger.ico"; Check: HasEdge
Name: "{group}\Carpeta de respaldos"; Filename: "{win}\explorer.exe"; Parameters: """{commonappdata}\BIGGER\respaldos"""

[INI]
; Sin Edge: accesos directos de Internet al navegador predeterminado.
Filename: "{autodesktop}\{#AppName}.url"; Section: "InternetShortcut"; Key: "URL"; String: "{#AppUrl}"; Tasks: desktopicon; Check: not HasEdge
Filename: "{autodesktop}\{#AppName}.url"; Section: "InternetShortcut"; Key: "IconFile"; String: "{app}\bigger.ico"; Tasks: desktopicon; Check: not HasEdge
Filename: "{autodesktop}\{#AppName}.url"; Section: "InternetShortcut"; Key: "IconIndex"; String: "0"; Tasks: desktopicon; Check: not HasEdge
Filename: "{group}\{#AppName}.url"; Section: "InternetShortcut"; Key: "URL"; String: "{#AppUrl}"; Check: not HasEdge
Filename: "{group}\{#AppName}.url"; Section: "InternetShortcut"; Key: "IconFile"; String: "{app}\bigger.ico"; Check: not HasEdge
Filename: "{group}\{#AppName}.url"; Section: "InternetShortcut"; Key: "IconIndex"; String: "0"; Check: not HasEdge
Filename: "{group}\Conectar tablets y celulares.url"; Section: "InternetShortcut"; Key: "URL"; String: "{#AppUrl}/configuracion/equipos"; Check: not HasEdge

[UninstallDelete]
Type: files; Name: "{autodesktop}\{#AppName}.url"
Type: files; Name: "{group}\{#AppName}.url"
Type: files; Name: "{group}\Conectar tablets y celulares.url"
Type: dirifempty; Name: "{app}"

[Run]
; Se ejecutan al terminar, como el usuario original (no como administrador).
Filename: "{code:GetEdgePath}"; Parameters: "--app={#AppUrl}"; Description: "Abrir {#AppName} ahora"; Flags: nowait postinstall skipifsilent runasoriginaluser; Check: HasEdge
Filename: "{#AppUrl}"; Description: "Abrir {#AppName} ahora"; Flags: shellexec nowait postinstall skipifsilent runasoriginaluser; Check: not HasEdge

[Code]
var
  OptionsPage: TWizardPage;
  FirstInstall: Boolean;
  PinLabel, PinConfirmLabel, PinHint, PrinterLabel, PrinterHint: TNewStaticText;
  PinEdit, PinConfirmEdit: TPasswordEdit;
  PrinterEdit: TNewEdit;
  SeedCheck: TNewCheckBox;

function ConfigPath: String;
begin
  Result := ExpandConstant('{commonappdata}\BIGGER\config.env');
end;

function ServiceExePath: String;
begin
  Result := ExpandConstant('{app}\service\{#ServiceExe}');
end;

{ ---- Microsoft Edge ---- }

function GetEdgePath(Param: String): String;
var
  P: String;
begin
  Result := '';
  if RegQueryStringValue(HKLM64, 'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe', '', P) then
    if FileExists(P) then
    begin
      Result := P;
      Exit;
    end;
  P := ExpandConstant('{pf32}\Microsoft\Edge\Application\msedge.exe');
  if FileExists(P) then
    Result := P;
end;

function HasEdge: Boolean;
begin
  Result := GetEdgePath('') <> '';
end;

{ ---- Página de opciones ---- }

function IsDigitsOnly(const S: String): Boolean;
var
  I: Integer;
begin
  Result := Length(S) > 0;
  for I := 1 to Length(S) do
    if (S[I] < '0') or (S[I] > '9') then
    begin
      Result := False;
      Exit;
    end;
end;

procedure InitializeWizard;
var
  Y: Integer;
begin
  FirstInstall := not FileExists(ConfigPath);

  if FirstInstall then
    OptionsPage := CreateCustomPage(wpSelectDir, 'Configuración inicial',
      'Elija el PIN del encargado y las opciones de la primera instalación.')
  else
    OptionsPage := CreateCustomPage(wpSelectDir, 'Opciones de la actualización',
      'Se conservan los datos, la carta y el PIN actuales.');

  Y := 0;
  if FirstInstall then
  begin
    PinLabel := TNewStaticText.Create(OptionsPage);
    PinLabel.Parent := OptionsPage.Surface;
    PinLabel.Caption := 'PIN del encargado (entre 4 y 12 dígitos):';
    PinLabel.Top := Y;
    PinLabel.Left := 0;

    PinEdit := TPasswordEdit.Create(OptionsPage);
    PinEdit.Parent := OptionsPage.Surface;
    PinEdit.Top := Y + ScaleY(18);
    PinEdit.Left := 0;
    PinEdit.Width := ScaleX(160);
    PinEdit.MaxLength := 12;

    PinConfirmLabel := TNewStaticText.Create(OptionsPage);
    PinConfirmLabel.Parent := OptionsPage.Surface;
    PinConfirmLabel.Caption := 'Repita el PIN:';
    PinConfirmLabel.Top := Y + ScaleY(50);
    PinConfirmLabel.Left := 0;

    PinConfirmEdit := TPasswordEdit.Create(OptionsPage);
    PinConfirmEdit.Parent := OptionsPage.Surface;
    PinConfirmEdit.Top := Y + ScaleY(68);
    PinConfirmEdit.Left := 0;
    PinConfirmEdit.Width := ScaleX(160);
    PinConfirmEdit.MaxLength := 12;

    PinHint := TNewStaticText.Create(OptionsPage);
    PinHint.Parent := OptionsPage.Surface;
    PinHint.Caption := 'Este PIN protege la configuración, los reportes y los respaldos.';
    PinHint.Top := Y + ScaleY(96);
    PinHint.Left := 0;
    PinHint.AutoSize := True;

    Y := Y + ScaleY(124);
  end;

  PrinterLabel := TNewStaticText.Create(OptionsPage);
  PrinterLabel.Parent := OptionsPage.Surface;
  PrinterLabel.Caption := 'Puerto de la impresora de comandas (opcional):';
  PrinterLabel.Top := Y;
  PrinterLabel.Left := 0;

  PrinterEdit := TNewEdit.Create(OptionsPage);
  PrinterEdit.Parent := OptionsPage.Surface;
  PrinterEdit.Top := Y + ScaleY(18);
  PrinterEdit.Left := 0;
  PrinterEdit.Width := ScaleX(160);

  PrinterHint := TNewStaticText.Create(OptionsPage);
  PrinterHint.Parent := OptionsPage.Surface;
  if FirstInstall then
    PrinterHint.Caption := 'Por ejemplo COM5. Déjelo vacío si no hay impresora.'
  else
    PrinterHint.Caption := 'Déjelo vacío para no cambiar la impresora actual.';
  PrinterHint.Top := Y + ScaleY(44);
  PrinterHint.Left := 0;
  PrinterHint.AutoSize := True;

  SeedCheck := TNewCheckBox.Create(OptionsPage);
  SeedCheck.Parent := OptionsPage.Surface;
  SeedCheck.Caption := 'Cargar la carta de BIGGER';
  SeedCheck.Top := Y + ScaleY(78);
  SeedCheck.Left := 0;
  SeedCheck.Width := OptionsPage.SurfaceWidth;
  SeedCheck.Checked := FirstInstall;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  P: String;
begin
  Result := True;
  if (OptionsPage <> nil) and (CurPageID = OptionsPage.ID) then
  begin
    if FirstInstall then
    begin
      P := PinEdit.Text;
      if (Length(P) < 4) or (Length(P) > 12) or (not IsDigitsOnly(P)) then
      begin
        MsgBox('El PIN debe tener entre 4 y 12 dígitos (solo números).', mbError, MB_OK);
        Result := False;
        Exit;
      end;
      if P <> PinConfirmEdit.Text then
      begin
        MsgBox('Los dos PIN no coinciden. Escríbalos de nuevo.', mbError, MB_OK);
        Result := False;
        Exit;
      end;
    end;
    P := Trim(PrinterEdit.Text);
    if (P <> '') and (Pos('"', P) > 0) then
    begin
      MsgBox('El puerto de la impresora no es válido. Use un valor como COM5.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

{ ---- Servicio ---- }

function RunHidden(const FileName, Params: String; var ResultCode: Integer): Boolean;
begin
  Result := Exec(FileName, Params, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

function ServiceExists: Boolean;
var
  RC: Integer;
begin
  Result := RunHidden(ExpandConstant('{sys}\sc.exe'), 'query BIGGER-Agil', RC) and (RC = 0);
end;

{ En una actualización hay que detener el servicio antes de copiar archivos. }
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  RC: Integer;
begin
  Result := '';
  if FileExists(ServiceExePath) then
  begin
    RunHidden(ServiceExePath, 'stop', RC); { se ignora el error: puede no estar instalado o ya detenido }
    Sleep(1500);
  end;
end;

procedure ConfigureAndStart;
var
  RC: Integer;
  Params, PinFile, Printer, Node, Failure: String;
begin
  Node := ExpandConstant('{app}\node\node.exe');
  PinFile := ExpandConstant('{tmp}\bigger-pin.txt');
  Params := '"' + ExpandConstant('{app}\api\dist\setup.js') + '"' +
    ' --config "' + ConfigPath + '"' +
    ' --data-dir "' + ExpandConstant('{commonappdata}\BIGGER') + '"' +
    ' --web-dir "' + ExpandConstant('{app}\web') + '"';

  if FirstInstall and (PinEdit.Text <> '') then
  begin
    SaveStringToFile(PinFile, PinEdit.Text, False);
    Params := Params + ' --pin-file "' + PinFile + '"';
  end;
  Printer := Trim(PrinterEdit.Text);
  if Printer <> '' then
    Params := Params + ' --printer-path "' + Printer + '"';
  if SeedCheck.Checked then
    Params := Params + ' --seed-catalog';

  WizardForm.StatusLabel.Caption := 'Preparando la base de datos y la configuración...';
  Failure := '';
  if not Exec(Node, Params, ExpandConstant('{app}\api'), SW_HIDE, ewWaitUntilTerminated, RC) then
    Failure := 'No se pudo ejecutar el programa de configuración (' + SysErrorMessage(RC) + ').'
  else if RC <> 0 then
    Failure := 'El programa de configuración terminó con el código ' + IntToStr(RC) + '.';
  DeleteFile(PinFile);

  if Failure <> '' then
  begin
    MsgBox('No se pudo terminar la instalación de {#AppName}.' + #13#10#13#10 + Failure + #13#10#13#10 +
      'Se deshará la instalación. Sus datos en ' + ExpandConstant('{commonappdata}\BIGGER') +
      ' no se tocan. Revise que el PIN tenga entre 4 y 12 dígitos y vuelva a ejecutar el instalador; ' +
      'si el problema sigue, avise a quien le dio el instalador.', mbCriticalError, MB_OK);
    Abort;
  end;

  WizardForm.StatusLabel.Caption := 'Instalando el servicio de Windows...';
  if not ServiceExists then
  begin
    if (not RunHidden(ServiceExePath, 'install', RC)) or (RC <> 0) then
    begin
      MsgBox('No se pudo instalar el servicio de Windows (código ' + IntToStr(RC) + ').' + #13#10 +
        'Se deshará la instalación. Ejecute el instalador de nuevo como administrador.', mbCriticalError, MB_OK);
      Abort;
    end;
  end;

  WizardForm.StatusLabel.Caption := 'Abriendo el puerto 3000 en el firewall...';
  RunHidden(ExpandConstant('{sys}\netsh.exe'), 'advfirewall firewall delete rule name="BIGGER Agil"', RC);
  if (not RunHidden(ExpandConstant('{sys}\netsh.exe'),
      'advfirewall firewall add rule name="BIGGER Agil" dir=in action=allow protocol=TCP localport=3000 profile=private,domain', RC))
     or (RC <> 0) then
    MsgBox('No se pudo abrir el puerto 3000 en el firewall. Las tablets podrían no conectarse; ' +
      'vea docs/instalacion-windows.md (solución de problemas).', mbInformation, MB_OK);

  WizardForm.StatusLabel.Caption := 'Iniciando {#AppName}...';
  if (not RunHidden(ServiceExePath, 'start', RC)) or (RC <> 0) then
    MsgBox('El servicio se instaló pero no pudo iniciarse (código ' + IntToStr(RC) + ').' + #13#10 +
      'Reinicie el PC o inícielo desde services.msc ("BIGGER Ágil"). Los registros están en ' +
      ExpandConstant('{commonappdata}\BIGGER\logs') + '.', mbInformation, MB_OK)
  else
    Sleep(3000); { da tiempo a que el servidor responda antes de abrir la ventana }
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    ConfigureAndStart;
end;

{ ---- Desinstalación ---- }

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  RC: Integer;
  Svc: String;
begin
  if CurUninstallStep = usUninstall then
  begin
    Svc := ExpandConstant('{app}\service\{#ServiceExe}');
    if FileExists(Svc) then
    begin
      Exec(Svc, 'stop', '', SW_HIDE, ewWaitUntilTerminated, RC);
      Sleep(1500);
      Exec(Svc, 'uninstall', '', SW_HIDE, ewWaitUntilTerminated, RC);
    end;
    Exec(ExpandConstant('{sys}\netsh.exe'), 'advfirewall firewall delete rule name="BIGGER Agil"', '', SW_HIDE, ewWaitUntilTerminated, RC);
  end;
  if CurUninstallStep = usPostUninstall then
  begin
    if not UninstallSilent then
      MsgBox('{#AppName} se desinstaló.' + #13#10#13#10 +
        'Sus datos (pedidos, carta, respaldos y configuración) NO se borraron y siguen en:' + #13#10 +
        ExpandConstant('{commonappdata}\BIGGER') + #13#10#13#10 +
        'Si reinstala el sistema, esos datos se recuperan solos.', mbInformation, MB_OK);
  end;
end;
