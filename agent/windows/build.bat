@echo off
setlocal

set CC=cl.exe
set RC=rc.exe
set SRC=event_forwarder.c
set RES=resource.res
set RCFILE=resource.rc
set ICO=app.ico
set OUT=EventForwardingAggregator.exe

echo ========================================
echo Event Forwarding Aggregator - Build
echo TechvSOC XDR Platform
echo ========================================
echo.

where cl.exe >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: cl.exe not found. Please run from Visual Studio Developer Command Prompt.
    echo.
    echo To set up build environment:
    echo   "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" x64
    echo.
    pause
    exit /b 1
)

REM Check for app.ico - if present, compile resource file
set HAS_RES=0
if exist "%ICO%" (
    echo [INFO] Found %ICO%, compiling resources...
    rc.exe /fo "%RES%" "%RCFILE%"
    if %ERRORLEVEL% NEQ 0 (
        echo [WARN] Resource compilation failed, building without custom icon.
        set HAS_RES=0
    ) else (
        set HAS_RES=1
    )
) else (
    echo [INFO] %ICO% not found, skipping resource compilation.
    echo [INFO] The application will use the default system shield icon.
)

echo.
echo Compiling EventForwardingAggregator.exe ...
echo.

if "%HAS_RES%"=="1" (
    echo [INFO] Compiling with custom icon resource...
    cl.exe /W4 /O2 /D "NDEBUG" /D "_WINDOWS" /D "UNICODE" /D "_UNICODE" /Fe:%OUT% %SRC% %RES% wevtapi.lib ws2_32.lib comctl32.lib user32.lib gdi32.lib advapi32.lib shell32.lib /link /SUBSYSTEM:WINDOWS
) else (
    echo [INFO] Compiling without custom icon resource...
    cl.exe /W4 /O2 /D "NDEBUG" /D "_WINDOWS" /D "UNICODE" /D "_UNICODE" /Fe:%OUT% %SRC% wevtapi.lib ws2_32.lib comctl32.lib user32.lib gdi32.lib advapi32.lib shell32.lib /link /SUBSYSTEM:WINDOWS
)

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Compilation successful!
    echo Executable: %OUT%
    echo.
    echo Copy event_forwarder.ini to the same directory before running.
) else (
    echo.
    echo Compilation failed!
)

pause
endlocal
