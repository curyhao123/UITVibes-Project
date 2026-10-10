#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Đặt static IP cho Wi-Fi để EXPO_PUBLIC_API_URL không bị đổi mỗi lần reconnect.

.DESCRIPTION
    Router DHCP thường cấp IP trong khoảng .100–.200. Mỗi lần router restart hoặc
    máy reconnect, IP có thể đổi → frontend trỏ vào IP cũ sẽ fail.

    Script này đặt static IP OUTSIDE DHCP pool để tránh conflict.
    Mặc định dùng .50 (thường nằm ngoài pool .100-.200 của router).

.PARAMETER InterfaceAlias
    Tên adapter. Mặc định "Wi-Fi".

.PARAMETER IPAddress
    IP tĩnh mong muốn. Mặc định 192.168.1.50

.PARAMETER PrefixLength
    Prefix length. Mặc định 24

.PARAMETER Gateway
    Gateway (router). Mặc định 192.168.1.1

.PARAMETER DnsServers
    DNS servers. Mặc định Google DNS + Cloudflare

.EXAMPLE
    .\scripts\set-static-ip.ps1
    .\scripts\set-static-ip.ps1 -IPAddress 192.168.1.50 -Gateway 192.168.1.1
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$InterfaceAlias = "Wi-Fi",
    [string]$IPAddress      = "192.168.1.50",
    [int]$PrefixLength      = 24,
    [string]$Gateway        = "192.168.1.1",
    [string[]]$DnsServers   = @("8.8.8.8", "1.1.1.1")
)

$ErrorActionPreference = "Stop"

# ── Validate interface exists ──────────────────────────────────────────────
$adapter = Get-NetAdapter -Name $InterfaceAlias -ErrorAction SilentlyContinue
if (-not $adapter) {
    Write-Error "Không tìm thấy adapter '$InterfaceAlias'. Chạy 'Get-NetAdapter' để xem danh sách."
}

# ── Validate IP is not inside common DHCP pools ────────────────────────────
$octet = [int]($IPAddress.Split('.')[-1])
if ($octet -ge 100 -and $octet -le 200) {
    Write-Warning "⚠️  IP $IPAddress có octet cuối trong khoảng DHCP pool phổ biến (100-200)."
    Write-Warning "    Có thể bị conflict khi router cấp cùng IP cho máy khác."
    Write-Warning "    Khuyến nghị dùng .10 / .20 / .50 thay vì .100-.200."
    if (-not $PSCmdlet.ShouldContinue("Vẫn tiếp tục với $IPAddress?", "Xác nhận IP")) {
        return
    }
}

# ── Capture current state for rollback ─────────────────────────────────────
$currentIp  = Get-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue
$currentRoute = Get-NetRoute -InterfaceIndex $adapter.InterfaceIndex -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue

Write-Host "=== Current configuration ===" -ForegroundColor Cyan
Write-Host "  Adapter : $InterfaceAlias (ifIndex $($adapter.InterfaceIndex))"
Write-Host "  Status  : $($adapter.Status)"
Write-Host "  IP      : $($currentIp.IPAddress)"
Write-Host "  Gateway : $($currentRoute.NextHop)"
Write-Host ""

# ── Apply static IP ───────────────────────────────────────────────────────
if ($PSCmdlet.ShouldProcess("$InterfaceAlias → $IPAddress/$PrefixLength (gw $Gateway)", "Set static IP")) {
    # Remove existing IPv4 config (DHCP-assigned)
    Get-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.PrefixOrigin -ne "WellKnown" } |
        Remove-NetIPAddress -Confirm:$false -ErrorAction SilentlyContinue

    # Disable DHCP then add static address
    Set-NetIPInterface -InterfaceIndex $adapter.InterfaceIndex -Dhcp Disabled -ErrorAction Stop
    New-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex `
        -IPAddress $IPAddress `
        -PrefixLength $PrefixLength `
        -DefaultGateway $Gateway `
        -ErrorAction Stop | Out-Null

    # DNS
    Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 `
        -ServerAddresses $DnsServers -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host "✅ Static IP applied." -ForegroundColor Green
    Write-Host "   IP      : $IPAddress"
    Write-Host "   Gateway : $Gateway"
    Write-Host "   DNS     : $($DnsServers -join ', ')"
    Write-Host ""
    Write-Host "⚠️  NẾU MẤT MẠNG sau bước này:" -ForegroundColor Yellow
    Write-Host "   Gateway sai! Chạy lệnh sau để rollback về DHCP:"
    Write-Host "   netsh interface ip set address name=`"$InterfaceAlias`" source=dhcp"
    Write-Host "   netsh interface dns set servers name=`"$InterfaceAlias`" source=dhcp"
    Write-Host ""
    Write-Host "📌 Cập nhật frontend/.env:" -ForegroundColor Cyan
    Write-Host "   EXPO_PUBLIC_API_URL=http://${IPAddress}:5512"
}

# ── Rollback helper ───────────────────────────────────────────────────────
# Nếu mất mạng, chạy trong PowerShell (Admin):
#   netsh interface ip set address name="Wi-Fi" source=dhcp
#   netsh interface dns set servers name="Wi-Fi" source=dhcp
#   ipconfig /renew "Wi-Fi"