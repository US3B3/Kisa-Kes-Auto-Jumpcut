@echo off
rem Kisa Kes Premiere Pro eklentisini kurar (cift tiklayin)
set "SOURCE=%~dp0.."
set "TARGET=%APPDATA%\Adobe\CEP\extensions\com.kisakes.panel"

rem Imzasiz eklentilere izin ver (Premiere 2020 ve sonrasi)
for %%v in (9 10 11 12) do reg add "HKCU\Software\Adobe\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul

if exist "%TARGET%" rmdir /s /q "%TARGET%"
xcopy "%SOURCE%\CSXS" "%TARGET%\CSXS\" /e /i /q /y >nul
xcopy "%SOURCE%\jsx" "%TARGET%\jsx\" /e /i /q /y >nul
xcopy "%SOURCE%\panel" "%TARGET%\panel\" /e /i /q /y >nul

echo.
echo Kisa Kes kuruldu. Premiere Pro'yu yeniden baslatin:
echo Pencere ^> Uzantilar ^> Kisa Kes
echo.
pause
