# Run this script in PowerShell AS ADMINISTRATOR
# Enables TCP/IP for SQL Server Express so Node.js (mssql) can connect

$ErrorActionPreference = "Stop"
$instance = "MSSQL17.SQLEXPRESS"
$port = "14330"
$base = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$instance\MSSQLServer\SuperSocketNetLib\Tcp"

Write-Host "Enabling TCP/IP on port $port for $instance ..."

Set-ItemProperty -Path $base -Name "Enabled" -Value 1
Set-ItemProperty -Path "$base\IPAll" -Name "TcpPort" -Value $port
Set-ItemProperty -Path "$base\IPAll" -Name "TcpDynamicPorts" -Value ""

Restart-Service "MSSQL`$SQLEXPRESS" -Force
Start-Sleep -Seconds 4

Write-Host "Done. Update backend/.env:"
Write-Host "  DB_SERVER=localhost"
Write-Host "  DB_PORT=$port"
Write-Host "  (remove or leave DB_INSTANCE empty)"
Write-Host ""
Write-Host "Then run: npm run dev"
