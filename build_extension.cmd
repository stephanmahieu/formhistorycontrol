@echo off

set XPI_FILE=formhistory_12100.xpi


rem --(check if xpi exist)-------------------------------------
if not exist %XPI_FILE% goto continue
echo.
echo -------------------------------------------
echo XPI file (%XPI_FILE%) exists!!!
echo -------------------------------------------
echo.
echo Hit CTRL-C to abort, Enter to continue...
pause > nul
del %XPI_FILE%
:continue

7z.exe a -r -xr!.svn %XPI_FILE% chrome.manifest install.rdf chrome components defaults
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