@echo off
:: This script opens ports 8081 (Expo) and 2026 (Backend) in the Windows Firewall.
:: PORT 2026 is critical for mobile connectivity to the data server.
:: MUST BE RUN AS ADMINISTRATOR.

echo ----------------------------------------------------
echo [Zolo Chat] Opening ports for Mobile Connection...
echo ----------------------------------------------------

netsh advfirewall firewall add rule name="ZoloChat_Expo_8081" dir=in action=allow protocol=TCP localport=8081
netsh advfirewall firewall add rule name="ZoloChat_Backend_2026" dir=in action=allow protocol=TCP localport=2026

echo.
echo [DONE] Ports 8081 and 2026 are now open.
echo [INFO] Please ensure your phone and PC are on the same Wi-Fi.
echo [INFO] Current IP for Expo Go: exp://172.27.130.18:8081
echo ----------------------------------------------------
pause
