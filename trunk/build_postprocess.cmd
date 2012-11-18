@echo off

set XPI_FILE=formhistory_1303.xpi


rem --(check if xpi exist)-------------------------------------
if exist %XPI_FILE% goto continue
echo.
echo -------------------------------------------
echo XPI file not found (%XPI_FILE%)!!!
echo -------------------------------------------
echo.
goto error
:continue

rem --(delete incomplete locales)-------------------------------
7z.exe d %XPI_FILE% ^
          chrome\locale\bg-BG ^
          chrome\locale\hu ^
          chrome\locale\it ^
          chrome\locale\ru ^
          chrome\locale\sk-SK ^
          chrome\locale\sv-SE ^
          chrome\locale\zh-CN
if errorlevel 1 goto error

rem --(delete all amo.properties)-------------------------------
7z.exe d -r %XPI_FILE% amo.properties
if errorlevel 1 goto error

rem --(delete leftover files)-----------------------------------
7z.exe d -r %XPI_FILE% *.7z
if errorlevel 1 goto error

goto okay
:error
echo.
echo ===============
echo Error detected!
echo ===============
pause
goto end

:okay
echo.
echo --------
echo Finished
echo --------
echo.
:end